import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/api_client.dart';
import '../../core/osrm.dart';
import '../../core/theme.dart';
import '../../models/models.dart';

/// Live order tracking — a map with the vendor (pickup), the customer (drop)
/// and the partner's moving position, polled every 5 s.
class TrackOrderScreen extends ConsumerStatefulWidget {
  final String orderId;
  const TrackOrderScreen({super.key, required this.orderId});

  @override
  ConsumerState<TrackOrderScreen> createState() => _TrackOrderScreenState();
}

class _TrackOrderScreenState extends ConsumerState<TrackOrderScreen> {
  TrackInfo? _track;
  String? _error;
  Timer? _timer;
  OsrmRoute? _route;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final track = await ref.read(apiClientProvider).trackOrder(widget.orderId);
      if (!mounted) return;
      setState(() {
        _track = track;
        _error = null;
      });
      _loadRouteOnce(track);
    } catch (e) {
      if (mounted) setState(() => _error = ApiClient.errorMessage(e));
    }
  }

  // The vendor→customer route is static — fetch it once.
  Future<void> _loadRouteOnce(TrackInfo track) async {
    if (_route != null) return;
    final pickup = _latlng(track.pickupLat, track.pickupLng);
    final drop = _latlng(track.dropLat, track.dropLng);
    if (pickup == null || drop == null) return;
    try {
      final route = await fetchRoute(pickup, drop);
      if (mounted) setState(() => _route = route);
    } catch (_) {
      // Best-effort.
    }
  }

  LatLng? _latlng(double? lat, double? lng) =>
      (lat != null && lng != null) ? LatLng(lat, lng) : null;

  @override
  Widget build(BuildContext context) {
    final track = _track;
    return Scaffold(
      appBar: AppBar(title: const Text('Track order')),
      body: _error != null && track == null
          ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.rose)))
          : track == null
              ? const Center(child: CircularProgressIndicator())
              : _build(context, track),
    );
  }

  Widget _build(BuildContext context, TrackInfo track) {
    final pickup = _latlng(track.pickupLat, track.pickupLng);
    final drop = _latlng(track.dropLat, track.dropLng);
    final partnerPos = _latlng(track.partner?.currentLat, track.partner?.currentLng);
    final delivered = track.status == 'delivered';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status + partner banner
        NeumorphicBox(
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: (delivered ? AppTheme.leaf : AppTheme.rose).withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  delivered ? Icons.check_circle : Icons.local_shipping,
                  color: delivered ? AppTheme.leaf : AppTheme.rose,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(track.status.replaceAll('_', ' ').toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text('${track.vendorName} → ${track.dropAddress}',
                        style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                        maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (track.partner != null) ...[
          const SizedBox(height: 10),
          NeumorphicBox(
            pressed: true,
            child: Row(
              children: [
                const Icon(Icons.person_pin_circle, color: AppTheme.gold),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${track.partner!.name ?? 'Delivery partner'}'
                    '${track.partner!.vehicle != null ? ' · ${track.partner!.vehicle}' : ''}'
                    '${track.partner!.isOnline ? ' · On the way' : ' · Offline'}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),
        // Map
        Container(
          height: 380,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: AppTheme.softShadows,
          ),
          child: FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: drop ?? pickup ?? const LatLng(11.8745, 75.3704),
              initialZoom: 13,
              backgroundColor: AppTheme.background,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
              ),
              onMapReady: _fitBounds,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.onamflowers.customer_app',
              ),
              if (_route != null)
                PolylineLayer(
                  polylines: [
                    Polyline(points: _route!.points, strokeWidth: 5, color: AppTheme.rose),
                  ],
                ),
              MarkerLayer(
                markers: [
                  if (pickup != null) _marker(pickup, AppTheme.rose, Icons.storefront),
                  if (drop != null) _marker(drop, AppTheme.leaf, Icons.home),
                  if (partnerPos != null) _marker(partnerPos, const Color(0xFF2196F3), Icons.delivery_dining),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Center(
          child: Text('Updates automatically every few seconds',
              style: TextStyle(color: AppTheme.muted, fontSize: 12)),
        ),
      ],
    );
  }

  void _fitBounds() {
    final track = _track;
    if (track == null) return;
    final points = [
      _latlng(track.pickupLat, track.pickupLng),
      _latlng(track.dropLat, track.dropLng),
      _latlng(track.partner?.currentLat, track.partner?.currentLng),
    ].whereType<LatLng>().toList();
    if (points.length < 2) return;
    _mapController.fitCamera(
      CameraFit.bounds(bounds: LatLngBounds.fromPoints(points), padding: const EdgeInsets.all(48)),
    );
  }

  Marker _marker(LatLng point, Color color, IconData icon) {
    return Marker(
      point: point,
      width: 36,
      height: 36,
      child: Container(
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 2),
          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
        ),
        child: Icon(icon, color: Colors.white, size: 18),
      ),
    );
  }
}
