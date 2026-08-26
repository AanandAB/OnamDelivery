import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/cart_provider.dart';
import '../../providers/catalog_provider.dart';

/// Vendor store — rating summary, product list, and customer reviews.
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
        data: (products) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _RatingHeader(vendor: vendorAsync.value),
            const SizedBox(height: 8),
            ...products.map((p) => _ProductCard(product: p, vendorName: vendorName)),
            const SizedBox(height: 8),
            _ReviewsSection(vendorId: vendorId),
          ],
        ),
      ),
    );
  }
}

class _RatingHeader extends StatelessWidget {
  final Vendor? vendor;
  const _RatingHeader({this.vendor});

  @override
  Widget build(BuildContext context) {
    final count = vendor?.ratingCount ?? 0;
    final rating = vendor?.rating ?? 0;
    return NeumorphicBox(
      child: Row(
        children: [
          const Icon(Icons.storefront, color: AppTheme.rose),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(vendor?.name ?? 'Shop', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 2),
                Text(
                  count > 0
                      ? '★ ${rating.toStringAsFixed(1)} · $count review${count == 1 ? '' : 's'}'
                      : 'New · no reviews yet',
                  style: TextStyle(
                    color: count > 0 ? AppTheme.gold : AppTheme.muted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewsSection extends ConsumerWidget {
  final String vendorId;
  const _ReviewsSection({required this.vendorId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reviewsAsync = ref.watch(vendorReviewsProvider(vendorId));
    return reviewsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      ),
      error: (_, _) => const SizedBox.shrink(),
      data: (reviews) {
        if (reviews.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Reviews', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 8),
            ...reviews.map((r) => _ReviewTile(review: r)),
          ],
        );
      },
    );
  }
}

class _ReviewTile extends StatelessWidget {
  final Review review;
  const _ReviewTile({required this.review});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: NeumorphicBox(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  List.filled(review.rating, '★').join(),
                  style: const TextStyle(color: AppTheme.gold, fontWeight: FontWeight.w700),
                ),
                const SizedBox(width: 8),
                Text(review.userName ?? 'Customer', style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            if (review.comment != null && review.comment!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(review.comment!, style: const TextStyle(color: AppTheme.muted)),
            ],
          ],
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
