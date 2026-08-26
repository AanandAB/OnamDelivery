import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

/// Geolocation wrapper — permission handling, one-shot position, and a live
/// position stream (used to send breadcrumbs to the backend).
class LocationService {
  /// Ensure the location service + app permission are granted.
  Future<bool> ensurePermission() async {
    if (!await Geolocator.isLocationServiceEnabled()) return false;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  /// One-shot current position (null if permission is unavailable).
  Future<LatLng?> currentPosition() async {
    if (!await ensurePermission()) return null;
    try {
      final pos = await Geolocator.getCurrentPosition();
      return LatLng(pos.latitude, pos.longitude);
    } catch (_) {
      return null;
    }
  }

  /// Live position stream; emits when the device moves 10 m (distanceFilter).
  Stream<LatLng> positionStream() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).map((pos) => LatLng(pos.latitude, pos.longitude));
  }
}

final locationServiceProvider = Provider<LocationService>((ref) => LocationService());
