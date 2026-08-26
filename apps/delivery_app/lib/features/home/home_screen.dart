import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/orders_provider.dart';

/// Home — online toggle + the queue of unclaimed platform orders.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Load after the first frame so the router/shell is settled.
    Future.microtask(() => ref.read(ordersProvider.notifier).refresh());
  }

  Future<void> _accept(PartnerOrder order) async {
    final accepted = await ref.read(ordersProvider.notifier).accept(order.id);
    if (accepted != null && mounted) {
      context.go('/order/${accepted.id}');
    } else if (mounted && ref.read(ordersProvider).error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ref.read(ordersProvider).error!)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ordersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('OnamDelivery'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Row(
              children: [
                Text(state.isOnline ? 'Online' : 'Offline', style: const TextStyle(fontSize: 13)),
                Switch(
                  value: state.isOnline,
                  activeTrackColor: AppTheme.leaf,
                  onChanged: (v) => ref.read(ordersProvider.notifier).setOnline(v),
                ),
              ],
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(ordersProvider.notifier).refresh(),
        child: state.loading
            ? const Center(child: CircularProgressIndicator())
            : state.error != null && state.available.isEmpty
                ? _ErrorView(message: state.error!, onRetry: () => ref.read(ordersProvider.notifier).refresh())
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (!state.isOnline) ...[
                        const NeumorphicBox(
                          pressed: true,
                          child: Row(
                            children: [
                              Icon(Icons.power_settings_new, color: AppTheme.muted),
                              SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  "You're offline. Go online to receive delivery orders.",
                                  style: TextStyle(color: AppTheme.muted),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],
                      if (state.available.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(top: 80),
                          child: Center(
                            child: Column(
                              children: [
                                Icon(Icons.inbox_outlined, size: 56, color: AppTheme.muted),
                                SizedBox(height: 12),
                                Text('No orders available right now',
                                    style: TextStyle(color: AppTheme.muted)),
                                SizedBox(height: 4),
                                Text('Pull down to refresh', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                              ],
                            ),
                          ),
                        )
                      else ...[
                        Text('Available orders (${state.available.length})',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                        const SizedBox(height: 12),
                        ...state.available.map((o) => _OrderCard(order: o, onAccept: () => _accept(o))),
                      ],
                    ],
                  ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final PartnerOrder order;
  final VoidCallback onAccept;

  const _OrderCard({required this.order, required this.onAccept});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: NeumorphicBox(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(order.vendorName,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.leaf.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Earn ${formatRupees(order.deliveryPay)}',
                    style: const TextStyle(color: AppTheme.leaf, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.route_outlined, size: 16, color: AppTheme.muted),
                const SizedBox(width: 6),
                Text(
                  order.distanceKm != null
                      ? '${order.distanceKm!.toStringAsFixed(1)} km · ${order.items.length} item(s)'
                      : '${order.items.length} item(s)',
                  style: const TextStyle(color: AppTheme.muted),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_outlined, size: 16, color: AppTheme.rose),
                const SizedBox(width: 6),
                Expanded(child: Text(order.dropAddress, style: const TextStyle(fontSize: 14))),
              ],
            ),
            if (order.paymentMethod == 'cod') ...[
              const SizedBox(height: 6),
              Text('Collect ${formatRupees(order.subtotal)} (COD)',
                  style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.ink)),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(onPressed: onAccept, child: const Text('Accept order')),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 48, color: AppTheme.muted),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.rose)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
