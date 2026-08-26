import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import 'constants.dart';

/// Thin wrapper around dio that (a) injects the bearer token and
/// (b) exposes typed methods for every endpoint the customer app uses.
class ApiClient {
  final Dio _dio;

  ApiClient()
      : _dio = Dio(
          BaseOptions(
            baseUrl: Constants.baseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
          ),
        ) {
    // Attach the stored JWT to every request (if the user is logged in).
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  /// Human-readable error from a DioException.
  static String errorMessage(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['error'] is String) return data['error'] as String;
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.connectionError) {
        return 'Could not reach the server. Check your connection.';
      }
      return e.message ?? 'Something went wrong';
    }
    return e.toString();
  }

  // ---- Auth ----
  Future<String> requestOtp(String phone) async {
    final res = await _dio.post('/api/auth/otp', data: {'phone': phone});
    return res.data['dev_otp'] as String; // dev-mode code; prod sends SMS
  }

  Future<({String token, User user})> verifyOtp(
    String phone,
    String code, {
    required bool consent,
    String? name,
  }) async {
    final res = await _dio.post('/api/auth/verify', data: {
      'phone': phone,
      'code': code,
      'consent': consent,
      'consent_version': Constants.consentVersion,
      'name': ?name,
    });
    return (
      token: res.data['token'] as String,
      user: User.fromJson(res.data['user'] as Map<String, dynamic>),
    );
  }

  // ---- Catalog ----
  Future<List<Category>> getCategories() async {
    final res = await _dio.get('/api/categories');
    return (res.data as List).map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Vendor>> getVendors({double? lat, double? lng}) async {
    final res = await _dio.get('/api/vendors', queryParameters: {
      if (lat != null && lng != null) ...{'lat': lat, 'lng': lng},
    });
    return (res.data as List).map((e) => Vendor.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Product>> getVendorProducts(String vendorId) async {
    final res = await _dio.get('/api/vendors/$vendorId/products');
    return (res.data as List).map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Vendor> getVendor(String id) async {
    final res = await _dio.get('/api/vendors/$id');
    return Vendor.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Settings> getSettings() async {
    final res = await _dio.get('/api/settings');
    return Settings.fromJson(res.data as Map<String, dynamic>);
  }

  // ---- Orders ----
  Future<Order> createOrder({
    required String vendorId,
    required List<({String productId, int qty})> items,
    required double dropLat,
    required double dropLng,
    required String dropAddress,
    String paymentMethod = 'cod',
    String? couponCode,
  }) async {
    final res = await _dio.post('/api/orders', data: {
      'vendor_id': vendorId,
      'items': items.map((i) => {'product_id': i.productId, 'qty': i.qty}).toList(),
      'drop_lat': dropLat,
      'drop_lng': dropLng,
      'drop_address': dropAddress,
      'payment_method': paymentMethod,
      if (couponCode != null && couponCode.isNotEmpty) 'coupon_code': couponCode,
    });
    return Order.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<Order>> getOrders() async {
    final res = await _dio.get('/api/orders');
    return (res.data as List).map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<TrackInfo> trackOrder(String id) async {
    final res = await _dio.get('/api/orders/$id/track');
    return TrackInfo.fromJson(res.data as Map<String, dynamic>);
  }

  // ---- Account (DPDP right-to-erasure) ----
  Future<void> deleteAccount() async {
    await _dio.delete('/api/me');
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
