import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/cart_provider.dart';
import '../../providers/catalog_provider.dart';

/// Product detail — quantity stepper, live total, add to cart.
/// Route: /vendor/:vendorId/product/:productId
class ProductDetailScreen extends ConsumerStatefulWidget {
  final String vendorId;
  final String productId;
  const ProductDetailScreen({super.key, required this.vendorId, required this.productId});

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  int _qty = 1;

  @override
  Widget build(BuildContext context) {
    final productsAsync = ref.watch(vendorProductsProvider(widget.vendorId));
    final vendorAsync = ref.watch(vendorProvider(widget.vendorId));
    final vendorName = vendorAsync.value?.name ?? '';

    return Scaffold(
      appBar: AppBar(title: const Text('Product')),
      body: productsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Could not load product:\n$e', textAlign: TextAlign.center)),
        data: (products) {
          final product = products.where((p) => p.id == widget.productId).firstOrNull;
          if (product == null) return const Center(child: Text('Product not found'));
          return _buildDetail(context, product, vendorName);
        },
      ),
    );
  }

  Widget _buildDetail(BuildContext context, Product product, String vendorName) {
    final maxQty = product.stock < 1 ? 0 : product.stock;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        NeumorphicBox(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: AppTheme.rose.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Icon(Icons.local_florist, size: 64, color: AppTheme.rose),
                ),
              ),
              const SizedBox(height: 16),
              Text(product.nameEn, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              if (product.nameMl != null)
                Text(product.nameMl!, style: const TextStyle(color: AppTheme.muted)),
              if (vendorName.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('by $vendorName', style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                ),
              const SizedBox(height: 12),
              Text(
                '₹${product.price.toStringAsFixed(0)} ${product.unit == 'kg' ? 'per kg' : product.unit == 'bunch' ? 'per bunch' : 'per piece'}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.leaf),
              ),
              const SizedBox(height: 8),
              Text(
                product.stock == 0 ? 'Out of stock' : '${product.stock} available',
                style: TextStyle(color: product.stock == 0 ? AppTheme.rose : AppTheme.muted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        NeumorphicBox(
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline, color: AppTheme.rose, size: 32),
                    onPressed: maxQty == 0 || _qty <= 1 ? null : () => setState(() => _qty--),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text('$_qty', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, color: AppTheme.leaf, size: 32),
                    onPressed: maxQty == 0 || _qty >= maxQty ? null : () => setState(() => _qty++),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Total: ₹${(product.price * _qty).toStringAsFixed(0)}',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: maxQty == 0
              ? null
              : () {
                  ref.read(cartProvider.notifier).add(CartItem(
                        productId: product.id,
                        vendorId: product.vendorId,
                        vendorName: vendorName,
                        nameEn: product.nameEn,
                        unit: product.unit,
                        price: product.price,
                        qty: _qty,
                        stock: product.stock,
                      ));
                  context.go('/cart');
                },
          child: Text(maxQty == 0 ? 'Out of stock' : 'Add to cart'),
        ),
      ],
    );
  }
}
