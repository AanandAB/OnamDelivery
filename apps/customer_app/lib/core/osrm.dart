import 'package:dio/dio.dart';
import 'package:latlong2/latlong.dart';

/// OSRM routing — fetches the driving route between two points from the public
/// OSRM demo server (used to draw the vendor→customer route on the track map).
/// Best-effort: the map still shows markers if the route call fails.
class OsrmRoute {
  final List<LatLng> points;
  final double distanceKm;
  final double durationMin;

  const OsrmRoute({
    required this.points,
    required this.distanceKm,
    required this.durationMin,
  });
}

Future<OsrmRoute> fetchRoute(LatLng from, LatLng to) async {
  final dio = Dio(BaseOptions(baseUrl: 'https://router.project-osrm.org'));
  final res = await dio.get(
    '/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}',
    queryParameters: {'overview': 'full', 'geometries': 'geojson'},
  );

  final route = (res.data['routes'] as List).first as Map<String, dynamic>;
  final geometry = route['geometry'] as Map<String, dynamic>;
  final points = (geometry['coordinates'] as List)
      .map((c) => LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble()))
      .toList();

  return OsrmRoute(
    points: points,
    distanceKm: (route['distance'] as num).toDouble() / 1000,
    durationMin: (route['duration'] as num).toDouble() / 60,
  );
}
