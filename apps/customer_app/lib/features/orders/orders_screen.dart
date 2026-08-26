import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/geo.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../core/api_client.dart';

/// Orders tab — the customer's order history with live money breakdown.
class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  List<Order>? _orders;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final orders = await ref.read(apiClientProvider).getOrders();
      if (mounted) setState(() => _orders = orders);
    } catch (e) {
      if (mounted) setState(() => _error = ApiClient.errorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My orders')),
      body: _error != null
          ? Center(child: Text(_error!, style: const TextStyle(color: AppTheme.rose)))
          : _orders == null
              ? const Center(child: CircularProgressIndicator())
              : _orders!.isEmpty
                  ? const Center(child: Text('No orders yet', style: TextStyle(color: AppTheme.muted)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders!.length,
                        itemBuilder: (context, i) => _OrderCard(order: _orders![i]),
                      ),
                    ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: NeumorphicBox(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(order.id, style: const TextStyle(fontWeight: FontWeight.w700)),
                _StatusChip(status: order.status),
              ],
            ),
            const SizedBox(height: 8),
            Text('Total: ${formatRupees(order.total)}', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.leaf)),
            Text('Delivery: ${formatRupees(order.deliveryFee)} · Fee: ${formatRupees(order.platformFee)}',
                style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
            if (order.otp != null)
              Text('OTP: ${order.otp}', style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.rose)),
            if (order.deliveryType == 'platform' &&
                order.status != 'delivered' &&
                order.status != 'cancelled')
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () => context.push('/track/${order.id}'),
                  icon: const Icon(Icons.location_on_outlined, size: 18),
                  label: const Text('Track live'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.rose,
                    padding: EdgeInsets.zero,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'delivered' => AppTheme.leaf,
      'cancelled' => AppTheme.rose,
      _ => AppTheme.gold,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12),
      ),
    );
  }
}
