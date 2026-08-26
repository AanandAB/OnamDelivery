import 'dart:math';

/// Geographic helpers (mirror the backend's haversine).

const double _earthRadiusKm = 6371;

double _toRad(double deg) => deg * pi / 180;

/// Great-circle distance between two lat/lng points, in kilometres.
double distanceKm(double lat1, double lng1, double lat2, double lng2) {
  final dLat = _toRad(lat2 - lat1);
  final dLng = _toRad(lng2 - lng1);
  final a = pow(sin(dLat / 2), 2) +
      cos(_toRad(lat1)) * cos(_toRad(lat2)) * pow(sin(dLng / 2), 2);
  return 2 * _earthRadiusKm * asin(sqrt(a));
}

/// Indian-style rupee formatting: ₹1,23,456
String formatRupees(num amount) {
  final s = amount.round().toString();
  final neg = s.startsWith('-');
  final digits = neg ? s.substring(1) : s;
  String out;
  if (digits.length <= 3) {
    out = digits;
  } else {
    final last3 = digits.substring(digits.length - 3);
    var rest = digits.substring(0, digits.length - 3);
    final groups = <String>[];
    while (rest.length > 2) {
      groups.insert(0, rest.substring(rest.length - 2));
      rest = rest.substring(0, rest.length - 2);
    }
    if (rest.isNotEmpty) groups.insert(0, rest);
    out = '${groups.join(',')},$last3';
  }
  return '₹${neg ? '-' : ''}$out';
}
