import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../core/api_client.dart';
import '../core/location_service.dart';

/// Live GPS state for the delivery partner.
///
/// While streaming, every position change (≥10 m) is pushed to the backend via
/// `PATCH /api/partner/me`, which also records a `partner_locations`
/// breadcrumb for live customer tracking.
class LocationState {
  final LatLng? position;
  final bool streaming;
  final String? error;

  const LocationState({this.position, this.streaming = false, this.error});

  LocationState copyWith({LatLng? position, bool? streaming, String? error}) =>
      LocationState(
        position: position ?? this.position,
        streaming: streaming ?? this.streaming,
        error: error ?? this.error,
      );
}

final locationProvider =
    NotifierProvider<LocationNotifier, LocationState>(LocationNotifier.new);

class LocationNotifier extends Notifier<LocationState> {
  StreamSubscription<LatLng>? _sub;

  @override
  LocationState build() => const LocationState();

  /// Start streaming position + sending breadcrumbs (idempotent).
  Future<void> start() async {
    if (state.streaming) return;
    state = state.copyWith(streaming: true, error: null);

    final service = ref.read(locationServiceProvider);
    final api = ref.read(apiClientProvider);

    // Send an immediate position so the customer sees us even before we move.
    final first = await service.currentPosition();
    if (first != null) {
      state = state.copyWith(position: first);
      await api.updateMe(lat: first.latitude, lng: first.longitude);
    } else {
      state = state.copyWith(
        error: 'Location unavailable — enable GPS and grant location permission.',
      );
      return;
    }

    _sub = service.positionStream().listen((pos) async {
      state = state.copyWith(position: pos);
      try {
        await api.updateMe(lat: pos.latitude, lng: pos.longitude);
      } catch (_) {
        // Breadcrumb send is best-effort; keep streaming.
      }
    });
  }

  /// Stop streaming + sending breadcrumbs.
  Future<void> stop() async {
    await _sub?.cancel();
    _sub = null;
    state = state.copyWith(streaming: false);
  }
}
