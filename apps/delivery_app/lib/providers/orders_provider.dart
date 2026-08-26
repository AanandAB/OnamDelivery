import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../models/models.dart';

/// Orders + online state for the delivery partner.
class OrdersState {
  final bool loading;
  final bool busy; // during accept / status-advance calls
  final String? error;
  final bool isOnline;
  final List<PartnerOrder> available;
  final List<PartnerOrder> mine;

  const OrdersState({
    this.loading = false,
    this.busy = false,
    this.error,
    this.isOnline = false,
    this.available = const [],
    this.mine = const [],
  });

  OrdersState copyWith({
    bool? loading,
    bool? busy,
    String? error,
    bool? isOnline,
    List<PartnerOrder>? available,
    List<PartnerOrder>? mine,
  }) =>
      OrdersState(
        loading: loading ?? this.loading,
        busy: busy ?? this.busy,
        error: error ?? this.error,
        isOnline: isOnline ?? this.isOnline,
        available: available ?? this.available,
        mine: mine ?? this.mine,
      );

  /// Total earned across delivered trips (base + per-km pay).
  double get totalEarnings =>
      mine.where((o) => o.status == 'delivered').fold(0, (sum, o) => sum + o.deliveryPay);
}

final ordersProvider = NotifierProvider<OrdersNotifier, OrdersState>(OrdersNotifier.new);

class OrdersNotifier extends Notifier<OrdersState> {
  @override
  OrdersState build() => const OrdersState();

  ApiClient get _api => ref.read(apiClientProvider);

  /// Load online status + both order lists (fires the three requests in parallel).
  Future<void> refresh() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final meFuture = _api.getMe();
      final availFuture = _api.getAvailableOrders();
      final mineFuture = _api.getMyOrders();
      final me = await meFuture;
      final avail = await availFuture;
      final mine = await mineFuture;
      state = state.copyWith(
        loading: false,
        isOnline: me.isOnline,
        available: avail,
        mine: mine,
      );
    } catch (e) {
      state = state.copyWith(loading: false, error: ApiClient.errorMessage(e));
    }
  }

  /// Go online/offline (a partner only sees orders while online).
  Future<void> setOnline(bool on) async {
    try {
      final p = await _api.updateMe(isOnline: on);
      state = state.copyWith(isOnline: p.isOnline, error: null);
    } catch (e) {
      state = state.copyWith(error: ApiClient.errorMessage(e));
    }
  }

  /// Claim an order. Returns the accepted order (or null on failure).
  Future<PartnerOrder?> accept(String id) async {
    state = state.copyWith(busy: true, error: null);
    try {
      final order = await _api.acceptOrder(id);
      state = state.copyWith(
        busy: false,
        available: state.available.where((o) => o.id != id).toList(),
        mine: [order, ...state.mine],
      );
      return order;
    } catch (e) {
      state = state.copyWith(busy: false, error: ApiClient.errorMessage(e));
      return null;
    }
  }

  /// Advance fulfilment status; `otp` is required for "delivered".
  Future<PartnerOrder?> advance(String id, String status, {String? otp}) async {
    state = state.copyWith(busy: true, error: null);
    try {
      final order = await _api.updateStatus(id, status, otp: otp);
      state = state.copyWith(
        busy: false,
        mine: [for (final o in state.mine) o.id == id ? order : o],
      );
      return order;
    } catch (e) {
      state = state.copyWith(busy: false, error: ApiClient.errorMessage(e));
      return null;
    }
  }
}
