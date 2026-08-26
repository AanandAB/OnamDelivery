import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/osrm.dart';
import '../../core/theme.dart';

/// Reusable delivery map — OSM tiles, pickup/drop markers, the partner's live
/// position, and the OSRM driving route. Auto-fits the camera to all points.
class DeliveryMap extends ConsumerStatefulWidget {
  final LatLng? pickup;
  final LatLng? drop;
  final LatLng? current;

  const DeliveryMap({super.key, this.pickup, this.drop, this.current});

  @override
  ConsumerState<DeliveryMap> createState() => _DeliveryMapState();
}

class _DeliveryMapState extends ConsumerState<DeliveryMap> {
  final MapController _mapController = MapController();
  OsrmRoute? _route;

  @override
  void initState() {
    super.initState();
    _loadRoute();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fitBounds());
  }

  @override
  void didUpdateWidget(DeliveryMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pickup != widget.pickup || oldWidget.drop != widget.drop) {
      _loadRoute();
      WidgetsBinding.instance.addPostFrameCallback((_) => _fitBounds());
    }
  }

  Future<void> _loadRoute() async {
    // Route from current → drop when we have a position, else pickup → drop.
    final from = widget.current ?? widget.pickup;
    final to = widget.drop;
    if (from == null || to == null) return;
    try {
      final route = await fetchRoute(from, to);
      if (mounted) setState(() => _route = route);
    } catch (_) {
      // Best-effort: markers still render without the route line.
    }
  }

  void _fitBounds() {
    final points = [widget.current, widget.pickup, widget.drop]
        .whereType<LatLng>()
        .toList();
    if (points.length < 2) return;
    _mapController.fitCamera(
      CameraFit.bounds(
        bounds: LatLngBounds.fromPoints(points),
        padding: const EdgeInsets.all(48),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final center = widget.current ??
        widget.drop ??
        widget.pickup ??
        const LatLng(11.8745, 75.3704); // Kannur fallback

    return Container(
      height: 280,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppTheme.softShadows,
      ),
      child: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: center,
          initialZoom: 13,
          backgroundColor: AppTheme.background,
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
          ),
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.onamflowers.delivery_app',
          ),
          if (_route != null)
            PolylineLayer(
              polylines: [
                Polyline(
                  points: _route!.points,
                  strokeWidth: 5,
                  color: AppTheme.rose,
                ),
              ],
            ),
          MarkerLayer(
            markers: [
              if (widget.pickup != null)
                _marker(widget.pickup!, AppTheme.rose, Icons.storefront),
              if (widget.drop != null)
                _marker(widget.drop!, AppTheme.leaf, Icons.home),
              if (widget.current != null)
                _marker(widget.current!, const Color(0xFF2196F3), Icons.delivery_dining),
            ],
          ),
        ],
      ),
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
