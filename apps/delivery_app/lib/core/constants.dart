/// App-wide constants for the delivery partner app.
class Constants {
  Constants._();

  /// Live backend base URL (Cloudflare Worker).
  static const String baseUrl = 'https://onam-flowers-api.aanandab44.workers.dev';

  /// DPDP Act 2023 — consent version shown to partners at login. Bump whenever
  /// the privacy policy changes so partners re-consent to the new terms.
  static const String consentVersion = '1.0';

  /// Grievance officer fallback (also served from /api/settings).
  static const String grievanceEmail = 'aanandab44@gmail.com';
}

/// Format a rupee amount with Indian digit grouping (e.g. ₹1,234 → ₹12,345).
String formatRupees(num value) {
  final n = value.round();
  final s = n.abs().toString();
  String head = '';
  String last3 = s;
  if (s.length > 3) {
    last3 = s.substring(s.length - 3);
    head = s.substring(0, s.length - 3);
  }
  final groups = <String>[];
  var h = head;
  while (h.length > 2) {
    groups.insert(0, h.substring(h.length - 2));
    h = h.substring(0, h.length - 2);
  }
  if (h.isNotEmpty) groups.insert(0, h);
  final sign = n < 0 ? '-' : '';
  return '₹$sign${[...groups, last3].join(',')}';
}
