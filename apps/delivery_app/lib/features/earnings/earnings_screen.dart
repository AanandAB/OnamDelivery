import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/orders_provider.dart';

/// Earnings — total earned across delivered trips + the full order history.
class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(ordersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Earnings')),
      body: RefreshIndicator(
        onRefresh: () => ref.read(ordersProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            NeumorphicBox(
              pressed: true,
              child: Column(
                children: [
                  const Text('Total earned', style: TextStyle(color: AppTheme.muted, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(formatRupees(state.totalEarnings),
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 34, color: AppTheme.leaf)),
                  const SizedBox(height: 4),
                  Text('${state.mine.where((o) => o.status == 'delivered').length} deliveries completed',
                      style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            if (state.mine.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 60),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 56, color: AppTheme.muted),
                      SizedBox(height: 12),
                      Text('No deliveries yet', style: TextStyle(color: AppTheme.muted)),
                      SizedBox(height: 4),
                      Text('Accept an order from the Home tab to get started',
                          style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                    ],
                  ),
                ),
              )
            else
              ...state.mine.map((o) => _HistoryTile(order: o)),
          ],
        ),
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  final PartnerOrder order;
  const _HistoryTile({required this.order});

  @override
  Widget build(BuildContext context) {
    final delivered = order.status == 'delivered';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: NeumorphicBox(
        onTap: () => context.go('/order/${order.id}'),
        child: Row(
          children: [
            Icon(
              delivered ? Icons.check_circle : Icons.schedule,
              color: delivered ? AppTheme.leaf : AppTheme.gold,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(order.vendorName, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(order.statusLabel, style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(formatRupees(order.deliveryPay),
                    style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.leaf)),
                const SizedBox(height: 2),
                Text(order.id, style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
