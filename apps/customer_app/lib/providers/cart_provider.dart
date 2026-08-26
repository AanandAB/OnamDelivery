import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A cart line item. `stock` is captured at add-time and used to clamp the
/// "+" stepper; the backend re-validates stock at checkout and rejects overstock.
class CartItem {
  final String productId;
  final String vendorId;
  final String vendorName;
  final String nameEn;
  final String unit;
  final double price;
  final int qty;
  final int stock;

  const CartItem({
    required this.productId,
    required this.vendorId,
    required this.vendorName,
    required this.nameEn,
    required this.unit,
    required this.price,
    required this.qty,
    required this.stock,
  });

  double get lineTotal => price * qty;

  CartItem copyWith({int? qty}) => CartItem(
        productId: productId,
        vendorId: vendorId,
        vendorName: vendorName,
        nameEn: nameEn,
        unit: unit,
        price: price,
        qty: qty ?? this.qty,
        stock: stock,
      );

  Map<String, dynamic> toJson() => {
        'product_id': productId,
        'vendor_id': vendorId,
        'vendor_name': vendorName,
        'name_en': nameEn,
        'unit': unit,
        'price': price,
        'qty': qty,
        'stock': stock,
      };

  factory CartItem.fromJson(Map<String, dynamic> j) => CartItem(
        productId: j['product_id'] as String,
        vendorId: j['vendor_id'] as String,
        vendorName: j['vendor_name'] as String? ?? '',
        nameEn: j['name_en'] as String,
        unit: j['unit'] as String? ?? 'piece',
        price: (j['price'] as num).toDouble(),
        qty: (j['qty'] as num).toInt(),
        stock: (j['stock'] as num).toInt(),
      );
}

class CartState {
  final List<CartItem> items;
  const CartState(this.items);

  double get subtotal => items.fold(0, (s, i) => s + i.lineTotal);
  int get count => items.fold(0, (s, i) => s + i.qty);
  bool get isEmpty => items.isEmpty;
}

final cartProvider = NotifierProvider<CartNotifier, CartState>(CartNotifier.new);

class CartNotifier extends Notifier<CartState> {
  @override
  CartState build() {
    _restore();
    return const CartState([]);
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('cart');
    if (raw == null || raw.isEmpty) return;
    try {
      final list = jsonDecode(raw) as List;
      state = CartState(list.map((e) => CartItem.fromJson(e as Map<String, dynamic>)).toList());
    } catch (_) {
      // Corrupt cart — start fresh rather than crash.
      state = const CartState([]);
    }
  }

  void _persist() {
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('cart', jsonEncode(state.items.map((e) => e.toJson()).toList()));
    });
  }

  void add(CartItem item) {
    // Single-vendor cart: an order is placed per vendor, so switching vendor
    // clears the current cart (kept simple; multi-vendor split comes later).
    final items = [...state.items];
    if (items.isNotEmpty && items.first.vendorId != item.vendorId) {
      state = CartState([item]);
      _persist();
      return;
    }
    final idx = items.indexWhere((i) => i.productId == item.productId);
    if (idx >= 0) {
      final existing = items[idx];
      final newQty = _clamp(existing.qty + item.qty, existing.stock);
      items[idx] = existing.copyWith(qty: newQty);
    } else {
      items.add(item);
    }
    state = CartState(items);
    _persist();
  }

  void setQty(String productId, int qty) {
    final items = state.items.map((i) {
      if (i.productId == productId) return i.copyWith(qty: _clamp(qty, i.stock));
      return i;
    }).toList();
    state = CartState(items);
    _persist();
  }

  void remove(String productId) {
    state = CartState(state.items.where((i) => i.productId != productId).toList());
    _persist();
  }

  void clear() {
    state = const CartState([]);
    _persist();
  }

  int _clamp(int qty, int stock) {
    final max = stock < 1 ? 0 : stock;
    return qty < 0 ? 0 : (qty > max ? max : qty);
  }
}
