/// App-wide constants.
class Constants {
  Constants._();

  /// Live backend base URL (Cloudflare Worker).
  static const String baseUrl = 'https://onam-flowers-api.aanandab44.workers.dev';

  /// DPDP Act 2023 — consent version shown in the privacy policy. Bump this
  /// whenever the policy changes so users re-consent to the new terms.
  static const String consentVersion = '1.0';

  /// Grievance officer fallback (also served from /api/settings).
  static const String grievanceEmail = 'aanandab44@gmail.com';
}
