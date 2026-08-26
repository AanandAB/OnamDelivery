import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/geo.dart';
import '../../core/theme.dart';
import '../../models/models.dart';
import '../../providers/cart_provider.dart';
import '../../providers/catalog_provider.dart';

/// Checkout — delivery address + location, live fee estimate, COD placement.
class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _addressController = TextEditingController();
  // Default to Kannur centre for quick testing (maps come in Phase 4).
  final _latController = TextEditingController(text: '11.8745');
  final _lngController = TextEditingController(text: '75.3704');
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _addressController.dispose();
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    final cart = ref.read(cartProvider);
    if (cart.items.isEmpty) return;
    setState(() => _busy = true);
    try {
      final order = await ref.read(apiClientProvider).createOrder(
            vendorId: cart.items.first.vendorId,
            items: cart.items.map((i) => (productId: i.productId, qty: i.qty)).toList(),
            dropLat: double.parse(_latController.text.trim()),
            dropLng: double.parse(_lngController.text.trim()),
            dropAddress: _addressController.text.trim(),
          );
      ref.read(cartProvider.notifier).clear();
      if (mounted) _showConfirmation(order);
    } catch (e) {
      setState(() => _error = ApiClient.errorMessage(e));
    } finally {
      setState(() => _busy = false);
    }
  }

  void _showConfirmation(Order order) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(children: [
          Icon(Icons.check_circle, color: AppTheme.leaf),
          SizedBox(width: 8),
          Text('Order placed!'),
        ]),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Order: ${order.id}', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text('Subtotal: ${formatRupees(order.subtotal)}'),
            Text('Delivery: ${formatRupees(order.deliveryFee)} (${order.distanceKm?.toStringAsFixed(1) ?? '?'} km)'),
            Text('Platform fee: ${formatRupees(order.platformFee)}'),
            const Divider(),
            Text('Total: ${formatRupees(order.total)}',
                style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Text('Share this OTP with your delivery partner on handover:',
                style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
            const SizedBox(height: 4),
            Text('🔑 ${order.otp ?? '—'}',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.rose)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.go('/orders');
            },
            child: const Text('View orders'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final vendorId = cart.items.isEmpty ? null : cart.items.first.vendorId;
    final vendor = vendorId != null ? ref.watch(vendorProvider(vendorId)).value : null;
    final settings = ref.watch(settingsProvider).value;

    // Live estimate: distance from vendor to the entered drop point.
    double? estimate;
    if (vendor != null && settings != null) {
      final lat = double.tryParse(_latController.text);
      final lng = double.tryParse(_lngController.text);
      if (lat != null && lng != null) {
        final km = distanceKm(vendor.lat, vendor.lng, lat, lng);
        estimate = settings.deliveryBaseFee + settings.deliveryRatePerKm * km;
      }
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: cart.isEmpty
          ? const Center(child: Text('Your cart is empty'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                NeumorphicBox(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Order summary', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      const SizedBox(height: 8),
                      for (final i in cart.items)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text('${i.nameEn} × ${i.qty} — ${formatRupees(i.lineTotal)}'),
                        ),
                      const Divider(),
                      Text('Subtotal: ${formatRupees(cart.subtotal)}',
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                NeumorphicBox(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Delivery address', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _addressController,
                        decoration: const InputDecoration(labelText: 'Full address', hintText: 'House, street, area'),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _latController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(labelText: 'Latitude'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: _lngController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(labelText: 'Longitude'),
                            ),
                          ),
                        ],
                      ),
                      if (estimate != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Text(
                            'Estimated delivery: ${formatRupees(estimate.round())} · platform fee ${formatRupees(settings!.platformFee)}',
                            style: const TextStyle(color: AppTheme.leaf, fontWeight: FontWeight.w600),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _busy ? null : _placeOrder,
                  child: Text(_busy ? 'Placing order…' : 'Place order (Cash on Delivery)'),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Text(_error!, style: const TextStyle(color: AppTheme.rose)),
                  ),
              ],
            ),
    );
  }
}
