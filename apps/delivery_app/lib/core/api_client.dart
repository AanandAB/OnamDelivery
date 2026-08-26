import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/models.dart';
import 'constants.dart';

/// Thin dio wrapper for the PARTNER endpoints. Injects the stored bearer
/// token on every request and exposes one typed method per endpoint.
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
    final res = await _dio.post('/api/partner/otp', data: {'phone': phone});
    return res.data['dev_otp'] as String; // dev-mode code; prod sends SMS
  }

  Future<({String token, Partner partner})> verifyOtp(
    String phone,
    String code, {
    required bool consent,
    String? name,
    String? vehicle,
  }) async {
    final res = await _dio.post('/api/partner/verify', data: {
      'phone': phone,
      'code': code,
      'consent': consent,
      'consent_version': Constants.consentVersion,
      'name': ?name,
      'vehicle': ?vehicle,
    });
    return (
      token: res.data['token'] as String,
      partner: Partner.fromJson(res.data['partner'] as Map<String, dynamic>),
    );
  }

  // ---- Profile / online / location ----
  Future<Partner> getMe() async {
    final res = await _dio.get('/api/partner/me');
    return Partner.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Partner> updateMe({
    bool? isOnline,
    String? name,
    String? vehicle,
    double? lat,
    double? lng,
  }) async {
    final res = await _dio.patch('/api/partner/me', data: {
      'is_online': ?isOnline,
      'name': ?name,
      'vehicle': ?vehicle,
      'current_lat': ?lat,
      'current_lng': ?lng,
    });
    return Partner.fromJson(res.data as Map<String, dynamic>);
  }

  // ---- Orders ----
  Future<List<PartnerOrder>> getAvailableOrders() async {
    final res = await _dio.get('/api/partner/orders/available');
    return (res.data as List)
        .map((e) => PartnerOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<PartnerOrder>> getMyOrders() async {
    final res = await _dio.get('/api/partner/orders');
    return (res.data as List)
        .map((e) => PartnerOrder.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<PartnerOrder> acceptOrder(String id) async {
    final res = await _dio.post('/api/partner/orders/$id/accept');
    return PartnerOrder.fromJson(res.data as Map<String, dynamic>);
  }

  Future<PartnerOrder> updateStatus(String id, String status, {String? otp}) async {
    final res = await _dio.post('/api/partner/orders/$id/status', data: {
      'status': status,
      'otp': ?otp,
    });
    return PartnerOrder.fromJson(res.data as Map<String, dynamic>);
  }
}

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
