import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

/// Partner login — phone OTP with a mandatory DPDP consent checkbox.
/// Two steps: (1) phone → OTP, (2) OTP + name/vehicle + consent → in.
class PartnerLoginScreen extends ConsumerStatefulWidget {
  const PartnerLoginScreen({super.key});

  @override
  ConsumerState<PartnerLoginScreen> createState() => _PartnerLoginScreenState();
}

class _PartnerLoginScreenState extends ConsumerState<PartnerLoginScreen> {
  final _phoneCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _vehicleCtrl = TextEditingController();
  bool _consent = false;
  bool _loading = false;
  bool _codeSent = false;
  String? _error;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _codeCtrl.dispose();
    _nameCtrl.dispose();
    _vehicleCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.length < 10) {
      setState(() => _error = 'Enter a valid 10-digit phone number');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final otp = await ref.read(apiClientProvider).requestOtp(phone);
      if (!mounted) return;
      // Dev-mode: the backend returns the code so we can test without SMS.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Dev OTP: $otp')),
      );
      setState(() => _codeSent = true);
    } catch (e) {
      setState(() => _error = ApiClient.errorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    if (!_consent) {
      setState(() => _error = 'Please accept the privacy policy to continue');
      return;
    }
    if (_codeCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Enter the OTP sent to your phone');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ref.read(apiClientProvider).verifyOtp(
            _phoneCtrl.text.trim(),
            _codeCtrl.text.trim(),
            consent: true,
            name: _nameCtrl.text.trim().isEmpty ? null : _nameCtrl.text.trim(),
            vehicle: _vehicleCtrl.text.trim().isEmpty ? null : _vehicleCtrl.text.trim(),
          );
      await ref.read(authProvider.notifier).login(
            result.token,
            phone: result.partner.phone,
            name: result.partner.name,
            vehicle: result.partner.vehicle,
          );
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _error = ApiClient.errorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 24),
            const Icon(Icons.delivery_dining, size: 64, color: AppTheme.rose),
            const SizedBox(height: 12),
            const Text(
              'OnamDelivery Partner',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            const Text(
              'Earn ₹30 + ₹10 per km on every delivery',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.muted),
            ),
            const SizedBox(height: 28),

            if (!_codeSent) ...[
              NeumorphicBox(
                child: TextField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone number',
                    prefixText: '+91 ',
                    border: InputBorder.none,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _loading ? null : _sendOtp,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Send OTP'),
              ),
            ] else ...[
              NeumorphicBox(
                child: TextField(
                  controller: _codeCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  decoration: const InputDecoration(
                    labelText: 'OTP code',
                    border: InputBorder.none,
                    counterText: '',
                  ),
                ),
              ),
              const SizedBox(height: 14),
              NeumorphicBox(
                child: TextField(
                  controller: _nameCtrl,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText: 'Your name (optional)',
                    border: InputBorder.none,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              NeumorphicBox(
                child: TextField(
                  controller: _vehicleCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Vehicle (e.g. Bike)',
                    border: InputBorder.none,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              // DPDP Act 2023 — explicit, recorded consent.
              CheckboxListTile(
                value: _consent,
                onChanged: (v) => setState(() => _consent = v ?? false),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
                title: const Text('I agree to the privacy policy'),
                subtitle: const Text(
                  'Your name, phone, vehicle and live location are processed to '
                  'fulfil deliveries (DPDP Act 2023, v${Constants.consentVersion}).',
                  style: TextStyle(fontSize: 12),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _loading ? null : _verify,
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.leaf),
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Verify & Start'),
              ),
              TextButton(
                onPressed: () => setState(() => _codeSent = false),
                child: const Text('Change phone number'),
              ),
            ],

            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.rose)),
            ],
          ],
        ),
      ),
    );
  }
}
