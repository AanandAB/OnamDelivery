import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/geo.dart';
import '../../core/theme.dart';
import '../../providers/cart_provider.dart';

/// Cart — line items with steppers, subtotal, checkout.
class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Your cart')),
      body: cart.isEmpty
          ? const Center(child: Text('Your cart is empty', style: TextStyle(color: AppTheme.muted)))
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: cart.items.length,
                    itemBuilder: (context, i) => _CartLine(item: cart.items[i]),
                  ),
                ),
                _CartFooter(subtotal: cart.subtotal),
              ],
            ),
    );
  }
}

class _CartLine extends ConsumerWidget {
  final CartItem item;
  const _CartLine({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: NeumorphicBox(
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.nameEn, style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text('${item.vendorName} · ${formatRupees(item.price)} each',
                      style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(formatRupees(item.lineTotal),
                      style: const TextStyle(fontWeight: FontWeight.w700, color: AppTheme.leaf)),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.remove_circle_outline, color: AppTheme.rose),
              onPressed: () => ref.read(cartProvider.notifier).setQty(item.productId, item.qty - 1),
            ),
            Text('${item.qty}', style: const TextStyle(fontWeight: FontWeight.w600)),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, color: AppTheme.leaf),
              onPressed: item.qty >= item.stock
                  ? null
                  : () => ref.read(cartProvider.notifier).setQty(item.productId, item.qty + 1),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AppTheme.muted),
              onPressed: () => ref.read(cartProvider.notifier).remove(item.productId),
            ),
          ],
        ),
      ),
    );
  }
}

class _CartFooter extends ConsumerWidget {
  final double subtotal;
  const _CartFooter({required this.subtotal});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeumorphicBox(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Subtotal', style: TextStyle(fontSize: 16)),
              Text(formatRupees(subtotal),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () => context.push('/checkout'),
            child: const Text('Checkout (COD)'),
          ),
        ],
      ),
    );
  }
}
