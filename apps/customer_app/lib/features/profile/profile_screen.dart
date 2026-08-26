import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/catalog_provider.dart';

/// Profile tab — account info, grievance officer (DPDP), privacy, erasure, logout.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _deleteAccount(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete my account?'),
        content: const Text(
          'This erases your personal data (phone, name, addresses) as required by the '
          'DPDP Act 2023. Order records are retained for legal compliance.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: AppTheme.rose)),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref.read(apiClientProvider).deleteAccount();
      await ref.read(authProvider.notifier).logout();
      if (context.mounted) context.go('/login');
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ApiClient.errorMessage(e))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final settings = ref.watch(settingsProvider).value;
    final grievance = settings?.grievanceOfficer ?? const {};

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          NeumorphicBox(
            child: Row(
              children: [
                const CircleAvatar(radius: 28, backgroundColor: AppTheme.rose, child: Icon(Icons.person, color: Colors.white)),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(auth.name ?? 'Customer', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                      Text(auth.phone ?? '', style: const TextStyle(color: AppTheme.muted)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Grievance officer (DPDP s.8 / E-Commerce Rules).
          NeumorphicBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Grievance Officer', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text(grievance['name'] ?? '', style: const TextStyle(color: AppTheme.muted)),
                if ((grievance['email'] ?? '').isNotEmpty)
                  Text(grievance['email']!, style: const TextStyle(color: AppTheme.muted)),
                if ((grievance['phone'] ?? '').isNotEmpty)
                  Text(grievance['phone']!, style: const TextStyle(color: AppTheme.muted)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          NeumorphicBox(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined, color: AppTheme.rose),
                  title: const Text('Privacy Policy'),
                  trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
                  onTap: () => context.push('/privacy'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.delete_outline, color: AppTheme.rose),
                  title: const Text('Delete my account (DPDP)'),
                  onTap: () => _deleteAccount(context, ref),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.logout, color: AppTheme.muted),
                  title: const Text('Log out'),
                  onTap: () async {
                    await ref.read(authProvider.notifier).logout();
                    if (context.mounted) context.go('/login');
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
