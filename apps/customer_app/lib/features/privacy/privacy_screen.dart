import 'package:flutter/material.dart';

import '../../core/theme.dart';

/// Static Privacy Policy — DPDP Act 2023 + Consumer Protection (E-Commerce) Rules 2020.
class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Policy')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Text('OnamDelivery — Privacy Policy', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          SizedBox(height: 12),
          _Section('1. Data we collect', 'Phone number (login identity), your name (optional), and delivery '
              'address + location (to fulfil delivery). We collect only what is needed to operate the service.'),
          _Section('2. Why we process it (purpose)', 'To verify your identity via OTP, deliver flowers to your '
              'address, and maintain order records for accounting and legal compliance.'),
          _Section('3. Consent (DPDP Act 2023)', 'By using the app you give explicit, informed consent to process '
              'the above data. You can withdraw consent at any time by deleting your account.'),
          _Section('4. Retention', 'Personal data is kept only as long as needed to fulfil orders and meet legal '
              'and accounting obligations. On deletion, your phone/name/address are erased.'),
          _Section('5. Your rights', 'You may request access, correction, or erasure of your personal data at any '
              'time. Use "Delete my account" in the app for erasure.'),
          _Section('6. Sharing', 'Your delivery address and phone are shared with the vendor and delivery partner '
              'solely to complete your order. We never sell your data.'),
          _Section('7. Grievance officer', 'For privacy or order complaints, contact the grievance officer listed in '
              'the Profile tab. We aim to resolve issues within 15 days as required by law.'),
          _Section('8. Security', 'Data is transmitted over HTTPS and stored in a secured database with '
              'reasonable safeguards as required by the IT Act 2000.'),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final String body;
  const _Section(this.title, this.body);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 4),
          Text(body, style: const TextStyle(color: AppTheme.muted, height: 1.5)),
        ],
      ),
    );
  }
}
