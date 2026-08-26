import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

/// Profile — partner identity, KYC status, and logout.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: AppTheme.rose,
              child: Icon(Icons.delivery_dining, size: 40, color: Colors.white),
            ),
          ),
          const SizedBox(height: 16),
          NeumorphicBox(
            child: Column(
              children: [
                _row(Icons.person_outline, 'Name', auth.name ?? '—'),
                const Divider(height: 20),
                _row(Icons.phone_outlined, 'Phone', auth.phone ?? '—'),
                const Divider(height: 20),
                _row(Icons.two_wheeler, 'Vehicle', auth.vehicle ?? '—'),
              ],
            ),
          ),
          const SizedBox(height: 16),
          NeumorphicBox(
            child: const Row(
              children: [
                Icon(Icons.verified_user_outlined, color: AppTheme.gold),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Earnings: ₹30 base + ₹10/km. You always earn more than fuel '
                    'cost (₹5.80/km).',
                    style: TextStyle(fontSize: 13, color: AppTheme.muted),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
            label: const Text('Log out'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.rose,
              side: const BorderSide(color: AppTheme.rose),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
          const SizedBox(height: 12),
          const Center(
            child: Text(
              'Grievance officer: ${Constants.grievanceEmail}',
              style: TextStyle(color: AppTheme.muted, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.muted, size: 20),
        const SizedBox(width: 12),
        Text(label, style: const TextStyle(color: AppTheme.muted)),
        const Spacer(),
        Flexible(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600))),
      ],
    );
  }
}
