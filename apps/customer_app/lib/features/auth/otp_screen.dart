import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

/// Phone OTP login with mandatory DPDP consent.
class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  bool _consent = false;
  bool _otpSent = false;
  bool _busy = false;
  String? _error;
  String? _devOtp; // dev-mode only — production delivers via SMS

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (!_consent) {
      setState(() => _error = 'Please accept the privacy policy to continue.');
      return;
    }
    setState(() => _busy = true);
    try {
      final code = await ref.read(apiClientProvider).requestOtp(_phoneController.text.trim());
      setState(() {
        _otpSent = true;
        _devOtp = code; // dev-mode: surface the code for testing
        _error = null;
      });
    } catch (e) {
      setState(() => _error = ApiClient.errorMessage(e));
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() => _busy = true);
    try {
      final result = await ref.read(apiClientProvider).verifyOtp(
            _phoneController.text.trim(),
            _otpController.text.trim(),
            consent: _consent,
          );
      await ref.read(authProvider.notifier).login(result.token, phone: result.user.phone, name: result.user.name);
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _error = ApiClient.errorMessage(e));
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.local_florist, size: 64, color: AppTheme.rose),
                  const SizedBox(height: 12),
                  Text(
                    'OnamDelivery',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Fresh flowers, delivered',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppTheme.muted),
                  ),
                  const SizedBox(height: 32),
                  NeumorphicBox(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: _phoneController,
                          enabled: !_otpSent,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Phone number',
                            hintText: '98765 43210',
                            prefixIcon: Icon(Icons.phone),
                          ),
                        ),
                        if (_otpSent) ...[
                          const SizedBox(height: 16),
                          TextField(
                            controller: _otpController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'OTP code',
                              prefixIcon: Icon(Icons.lock_outline),
                            ),
                          ),
                          if (_devOtp != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                'Dev OTP: $_devOtp',
                                style: const TextStyle(color: AppTheme.leaf, fontWeight: FontWeight.w600),
                              ),
                            ),
                        ],
                        const SizedBox(height: 20),
                        // DPDP Act 2023 — explicit consent.
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Checkbox(
                              value: _consent,
                              activeColor: AppTheme.rose,
                              onChanged: (v) => setState(() => _consent = v ?? false),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: () => context.push('/privacy'),
                                child: const Text.rich(
                                  TextSpan(
                                    style: TextStyle(color: AppTheme.ink, height: 1.4),
                                    children: [
                                      TextSpan(text: 'I consent to the processing of my personal data as described in the '),
                                      TextSpan(
                                        text: 'Privacy Policy',
                                        style: TextStyle(color: AppTheme.rose, fontWeight: FontWeight.w600),
                                      ),
                                      TextSpan(text: ' (DPDP Act 2023, v${Constants.consentVersion}).'),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _busy ? null : (_otpSent ? _verify : _sendOtp),
                          child: Text(_busy ? 'Please wait…' : (_otpSent ? 'Verify & continue' : 'Send OTP')),
                        ),
                        if (_error != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: Text(_error!, style: const TextStyle(color: AppTheme.rose)),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
