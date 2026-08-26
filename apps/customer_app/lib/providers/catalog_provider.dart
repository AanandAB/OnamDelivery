import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../models/models.dart';

/// Read-only catalog data, fetched from the live Worker.

final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  return ref.watch(apiClientProvider).getCategories();
});

final vendorsProvider = FutureProvider<List<Vendor>>((ref) async {
  return ref.watch(apiClientProvider).getVendors();
});

/// Products for one vendor.
final vendorProductsProvider = FutureProvider.family<List<Product>, String>(
  (ref, vendorId) async => ref.watch(apiClientProvider).getVendorProducts(vendorId),
);

/// A single vendor.
final vendorProvider = FutureProvider.family<Vendor, String>(
  (ref, vendorId) async => ref.watch(apiClientProvider).getVendor(vendorId),
);

final settingsProvider = FutureProvider<Settings>((ref) async {
  return ref.watch(apiClientProvider).getSettings();
});
