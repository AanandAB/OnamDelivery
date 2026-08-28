import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:latlong2/latlong.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/location_provider.dart';
import '../../providers/orders_provider.dart';
import 'delivery_map.dart';

/// Order detail — the active trip: pickup → deliver, with live earnings and a
/// handover-OTP prompt for the final step.
class OrderDetailScreen extends ConsumerWidget {
  final String orderId;
  const OrderDetailScreen({super.key, required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(ordersProvider);
    final order = _findOrder(state, orderId);
    final currentPos = ref.watch(locationProvider).position;

    if (order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order')),
        body: const Center(child: Text('Order not found', style: TextStyle(color: AppTheme.muted))),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(order.id)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Earnings banner
          NeumorphicBox(
            pressed: true,
            child: Row(
              children: [
                const Icon(Icons.payments_outlined, color: AppTheme.leaf, size: 28),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('This trip earns you', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                    Text(formatRupees(order.deliveryPay),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22, color: AppTheme.leaf)),
                  ],
                ),
                const Spacer(),
                _StatusChip(status: order.status),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Live map (active orders with known pickup/drop coordinates).
          if ((order.status == 'accepted' ||
                  order.status == 'picked_up' ||
                  order.status == 'out_for_delivery') &&
              order.pickupLat != null &&
              order.pickupLng != null &&
              order.dropLat != null &&
              order.dropLng != null) ...[
            DeliveryMap(
              pickup: LatLng(order.pickupLat!, order.pickupLng!),
              drop: LatLng(order.dropLat!, order.dropLng!),
              current: currentPos,
            ),
            const SizedBox(height: 16),
          ],

          // Pickup
          _LocationCard(
            icon: Icons.storefront,
            title: 'Pickup from ${order.vendorName}',
            subtitle: 'Show the order ID at the counter',
            color: AppTheme.rose,
          ),
          const SizedBox(height: 12),
          _LocationCard(
            icon: Icons.location_on,
            title: 'Deliver to',
            subtitle: order.dropAddress,
            color: AppTheme.leaf,
          ),
          const SizedBox(height: 12),

          // Items
          NeumorphicBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Items to collect', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ...order.items.map(
                  (it) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 3),
                    child: Row(
                      children: [
                        Expanded(child: Text('${it.qty} × ${it.nameEn}')),
                        Text(formatRupees(it.price * it.qty), style: const TextStyle(color: AppTheme.muted)),
                      ],
                    ),
                  ),
                ),
                const Divider(height: 20),
                if (order.paymentMethod == 'cod')
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Collect from customer (COD)', style: TextStyle(fontWeight: FontWeight.w600)),
                      Text(formatRupees(order.subtotal), style: const TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Action button based on status
          _ActionButton(order: order),
        ],
      ),
    );
  }

  PartnerOrder? _findOrder(OrdersState state, String id) {
    for (final o in state.mine) {
      if (o.id == id) return o;
    }
    for (final o in state.offers) {
      if (o.id == id) return o;
    }
    for (final o in state.pool) {
      if (o.id == id) return o;
    }
    return null;
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final order = PartnerOrder(
      id: '', vendorName: '', status: status, items: const [],
      subtotal: 0, deliveryPay: 0, paymentMethod: '', dropAddress: '', createdAt: 0,
    );
    final delivered = status == 'delivered';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: delivered ? AppTheme.leaf.withValues(alpha: 0.15) : AppTheme.gold.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(order.statusLabel, style: TextStyle(
        color: delivered ? AppTheme.leaf : AppTheme.ink,
        fontWeight: FontWeight.w700,
      )),
    );
  }
}

class _LocationCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  const _LocationCard({required this.icon, required this.title, required this.subtitle, required this.color});

  @override
  Widget build(BuildContext context) {
    return NeumorphicBox(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends ConsumerWidget {
  final PartnerOrder order;
  const _ActionButton({required this.order});

  Future<void> _advance(BuildContext context, WidgetRef ref, String status, {String? otp}) async {
    final updated = await ref.read(ordersProvider.notifier).advance(order.id, status, otp: otp);
    if (updated == null && context.mounted) {
      final err = ref.read(ordersProvider).error;
      if (err != null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(err)));
      }
    }
  }

  Future<void> _promptOtp(BuildContext context, WidgetRef ref) async {
    final ctrl = TextEditingController();
    final otp = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delivery code'),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          maxLength: 4,
          decoration: const InputDecoration(
            labelText: 'OTP from the customer',
            counterText: '',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
            child: const Text('Confirm delivery'),
          ),
        ],
      ),
    );
    if (otp != null && otp.isNotEmpty && context.mounted) {
      await _advance(context, ref, 'delivered', otp: otp);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final busy = ref.watch(ordersProvider).busy;

    switch (order.status) {
      case 'accepted':
        return _big(context, 'Mark as picked up', busy, () => _advance(context, ref, 'picked_up'));
      case 'picked_up':
        return _big(context, 'Start delivery', busy, () => _advance(context, ref, 'out_for_delivery'));
      case 'out_for_delivery':
        return _big(context, 'Delivered — enter OTP', busy, () => _promptOtp(context, ref), color: AppTheme.leaf);
      case 'delivered':
        return const NeumorphicBox(
          pressed: true,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.check_circle, color: AppTheme.leaf),
              SizedBox(width: 8),
              Text('Delivered', style: TextStyle(fontWeight: FontWeight.w700, color: AppTheme.leaf)),
            ],
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _big(BuildContext context, String label, bool busy, VoidCallback onPressed, {Color? color}) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: busy ? null : onPressed,
        style: color != null ? ElevatedButton.styleFrom(backgroundColor: color) : null,
        child: busy
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label),
      ),
    );
  }
}
