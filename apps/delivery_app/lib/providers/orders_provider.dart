import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../models/models.dart';
import 'location_provider.dart';

/// Orders + online state for the delivery partner.
///
/// Two "new work" lists mirror the backend's assignment model:
///  - [offers] are orders auto-offered to THIS partner (nearest-partner
///    assignment) with a countdown to accept/decline;
///  - [pool]   is the open, unassigned pool any partner can still pull.
class OrdersState {
  final bool loading;
  final bool busy; // during accept / decline / status-advance calls
  final String? error;
  final bool isOnline;
  final List<PartnerOrder> offers;
  final List<PartnerOrder> pool;
  final List<PartnerOrder> mine;

  const OrdersState({
    this.loading = false,
    this.busy = false,
    this.error,
    this.isOnline = false,
    this.offers = const [],
    this.pool = const [],
    this.mine = const [],
  });

  OrdersState copyWith({
    bool? loading,
    bool? busy,
    String? error,
    bool? isOnline,
    List<PartnerOrder>? offers,
    List<PartnerOrder>? pool,
    List<PartnerOrder>? mine,
  }) =>
      OrdersState(
        loading: loading ?? this.loading,
        busy: busy ?? this.busy,
        error: error ?? this.error,
        isOnline: isOnline ?? this.isOnline,
        offers: offers ?? this.offers,
        pool: pool ?? this.pool,
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

  /// Load online status + offers/pool/mine (fires the three requests in parallel).
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
        offers: avail.offers,
        pool: avail.pool,
        mine: mine,
      );
      // Resume GPS streaming if we were already online (e.g. app restart).
      if (me.isOnline) await ref.read(locationProvider.notifier).start();
    } catch (e) {
      state = state.copyWith(loading: false, error: ApiClient.errorMessage(e));
    }
  }

  /// Go online/offline (a partner only receives offers while online).
  Future<void> setOnline(bool on) async {
    try {
      final p = await _api.updateMe(isOnline: on);
      state = state.copyWith(isOnline: p.isOnline, error: null);
      // Online → stream GPS breadcrumbs; offline → stop.
      if (on) {
        await ref.read(locationProvider.notifier).start();
      } else {
        await ref.read(locationProvider.notifier).stop();
      }
    } catch (e) {
      state = state.copyWith(error: ApiClient.errorMessage(e));
    }
  }

  /// Silent refresh (no loading spinner) for the periodic offer poll.
  Future<void> poll() async {
    try {
      final avail = await _api.getAvailableOrders();
      final mine = await _api.getMyOrders();
      state = state.copyWith(offers: avail.offers, pool: avail.pool, mine: mine, error: null);
    } catch (_) {
      // Ignore transient poll failures; the next tick retries.
    }
  }

  /// Accept an order (either a directed offer or a pool pull).
  Future<PartnerOrder?> accept(String id) async {
    state = state.copyWith(busy: true, error: null);
    try {
      final order = await _api.acceptOrder(id);
      state = state.copyWith(
        busy: false,
        offers: state.offers.where((o) => o.id != id).toList(),
        pool: state.pool.where((o) => o.id != id).toList(),
        mine: [order, ...state.mine],
      );
      return order;
    } catch (e) {
      state = state.copyWith(busy: false, error: ApiClient.errorMessage(e));
      return null;
    }
  }

  /// Decline a directed offer — it rolls to the next-nearest partner.
  Future<void> decline(String id) async {
    state = state.copyWith(busy: true, error: null);
    try {
      await _api.declineOrder(id);
      state = state.copyWith(
        busy: false,
        offers: state.offers.where((o) => o.id != id).toList(),
      );
    } catch (e) {
      state = state.copyWith(busy: false, error: ApiClient.errorMessage(e));
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
