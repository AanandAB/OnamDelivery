import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/catalog_provider.dart';

/// Home tab — list of flower vendors (browse).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vendorsAsync = ref.watch(vendorsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Flower shops')),
      body: vendorsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorState(message: e.toString(), onRetry: () => ref.invalidate(vendorsProvider)),
        data: (vendors) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(vendorsProvider),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: vendors.length,
            itemBuilder: (context, i) => _VendorCard(vendor: vendors[i]),
          ),
        ),
      ),
    );
  }
}

class _VendorCard extends StatelessWidget {
  final Vendor vendor;
  const _VendorCard({required this.vendor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: NeumorphicBox(
        onTap: () => context.push('/vendor/${vendor.id}'),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppTheme.rose.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.local_florist, color: AppTheme.rose),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(vendor.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (vendor.ratingCount > 0)
                        Text('★ ${vendor.rating.toStringAsFixed(1)} · ', style: const TextStyle(color: AppTheme.gold)),
                      Text(
                        vendor.isOpen ? 'Open now' : 'Closed',
                        style: TextStyle(color: vendor.isOpen ? AppTheme.leaf : AppTheme.rose, fontSize: 13),
                      ),
                      if (vendor.distanceKm != null)
                        Text('  ·  ${vendor.distanceKm!.toStringAsFixed(1)} km',
                            style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppTheme.muted),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off, size: 48, color: AppTheme.muted),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.muted)),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}
