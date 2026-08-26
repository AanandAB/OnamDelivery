import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/cart_provider.dart';
import '../../providers/catalog_provider.dart';

/// Vendor store — its product list, with quick add-to-cart.
class VendorScreen extends ConsumerWidget {
  final String vendorId;
  const VendorScreen({super.key, required this.vendorId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vendorAsync = ref.watch(vendorProvider(vendorId));
    final productsAsync = ref.watch(vendorProductsProvider(vendorId));
    final vendorName = vendorAsync.value?.name ?? 'Products';

    return Scaffold(
      appBar: AppBar(title: Text(vendorName)),
      body: productsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load products:\n$e', textAlign: TextAlign.center)),
        data: (products) => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: products.length,
          itemBuilder: (context, i) => _ProductCard(product: products[i], vendorName: vendorName),
        ),
      ),
    );
  }
}

String _unitLabel(String unit) => switch (unit) {
      'kg' => 'per kg',
      'bunch' => 'per bunch',
      _ => 'per piece',
    };

class _ProductCard extends ConsumerWidget {
  final Product product;
  final String vendorName;
  const _ProductCard({required this.product, required this.vendorName});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: NeumorphicBox(
        onTap: () => context.push('/vendor/${product.vendorId}/product/${product.id}'),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: product.stock == 0 ? AppTheme.muted.withValues(alpha: 0.15) : AppTheme.leaf.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                product.stock == 0 ? Icons.block : Icons.local_florist,
                color: product.stock == 0 ? AppTheme.muted : AppTheme.leaf,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.nameEn, style: const TextStyle(fontWeight: FontWeight.w600)),
                  if (product.nameMl != null)
                    Text(product.nameMl!, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(
                    '₹${product.price.toStringAsFixed(0)} ${_unitLabel(product.unit)}'
                    '${product.stock == 0 ? '  ·  out of stock' : '  ·  ${product.stock} left'}',
                    style: TextStyle(
                      color: product.stock == 0 ? AppTheme.rose : AppTheme.leaf,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            if (product.stock > 0)
              IconButton(
                icon: const Icon(Icons.add_circle, color: AppTheme.rose, size: 30),
                onPressed: () {
                  ref.read(cartProvider.notifier).add(CartItem(
                        productId: product.id,
                        vendorId: product.vendorId,
                        vendorName: vendorName,
                        nameEn: product.nameEn,
                        unit: product.unit,
                        price: product.price,
                        qty: 1,
                        stock: product.stock,
                      ));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${product.nameEn} added to cart')),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
