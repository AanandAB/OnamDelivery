import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/orders_provider.dart';

/// Home — online toggle, incoming auto-assigned OFFERS (nearest-partner), and
/// the open pool of unassigned orders. Offers refresh silently every ~10s so
/// the accept/decline countdown stays current.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    // Load after the first frame so the router/shell is settled.
    Future.microtask(() => ref.read(ordersProvider.notifier).refresh());
    _poll = Timer.periodic(const Duration(seconds: 10), (_) {
      ref.read(ordersProvider.notifier).poll();
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
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

  Future<void> _decline(PartnerOrder order) async {
    await ref.read(ordersProvider.notifier).decline(order.id);
    if (mounted && ref.read(ordersProvider).error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ref.read(ordersProvider).error!)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ordersProvider);
    final isEmpty = state.offers.isEmpty && state.pool.isEmpty;

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
            : state.error != null && isEmpty
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
                                  "You're offline. Go online to receive delivery offers.",
                                  style: TextStyle(color: AppTheme.muted),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // ---- Incoming offers (auto-assigned to me) ----
                      if (state.offers.isNotEmpty) ...[
                        const Row(
                          children: [
                            Icon(Icons.notifications_active, size: 18, color: AppTheme.rose),
                            SizedBox(width: 8),
                            Text('Incoming offers',
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text('Auto-assigned to you — respond before the timer runs out',
                            style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                        const SizedBox(height: 12),
                        ...state.offers.map((o) => _OrderCard(
                              order: o,
                              isOffer: true,
                              onAccept: () => _accept(o),
                              onDecline: () => _decline(o),
                            )),
                        const SizedBox(height: 8),
                      ],

                      // ---- Open pool ----
                      if (state.pool.isNotEmpty) ...[
                        Text('Open pool (${state.pool.length})',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                        const SizedBox(height: 4),
                        Text('Unassigned orders — first to accept gets them',
                            style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                        const SizedBox(height: 12),
                        ...state.pool.map((o) => _OrderCard(
                              order: o,
                              isOffer: false,
                              onAccept: () => _accept(o),
                            )),
                      ],

                      if (isEmpty)
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
                                Text('You\'ll be pinged when an order lands nearby',
                                    style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final PartnerOrder order;
  final bool isOffer;
  final VoidCallback onAccept;
  final VoidCallback? onDecline;

  const _OrderCard({
    required this.order,
    required this.isOffer,
    required this.onAccept,
    this.onDecline,
  });

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
            if (isOffer) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.timer_outlined, size: 16, color: order.offerExpiresIn != null && order.offerExpiresIn! <= 15 ? AppTheme.rose : AppTheme.muted),
                  const SizedBox(width: 6),
                  Text(
                    'Respond within ~${order.offerExpiresIn ?? 0}s',
                    style: TextStyle(
                      color: order.offerExpiresIn != null && order.offerExpiresIn! <= 15 ? AppTheme.rose : AppTheme.muted,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(onPressed: onAccept, child: const Text('Accept order')),
                ),
                if (isOffer) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onDecline,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.rose,
                        side: const BorderSide(color: AppTheme.rose),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text('Decline'),
                    ),
                  ),
                ],
              ],
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
