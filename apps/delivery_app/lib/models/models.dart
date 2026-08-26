// API models for the partner app (mirror the Worker's snake_case JSON).

/// The logged-in delivery partner.
class Partner {
  final String id;
  final String phone;
  final String? name;
  final String? vehicle;
  final String kycStatus;
  final bool isOnline;
  final double? currentLat;
  final double? currentLng;

  const Partner({
    required this.id,
    required this.phone,
    this.name,
    this.vehicle,
    required this.kycStatus,
    required this.isOnline,
    this.currentLat,
    this.currentLng,
  });

  factory Partner.fromJson(Map<String, dynamic> j) => Partner(
        id: j['id'] as String,
        phone: j['phone'] as String,
        name: j['name'] as String?,
        vehicle: j['vehicle'] as String?,
        kycStatus: j['kyc_status'] as String? ?? 'pending',
        isOnline: (j['is_online'] as bool?) ?? false,
        currentLat: (j['current_lat'] as num?)?.toDouble(),
        currentLng: (j['current_lng'] as num?)?.toDouble(),
      );
}

/// One line item in an order (what the partner picks up at the vendor).
class PartnerOrderItem {
  final String productId;
  final String nameEn;
  final String unit;
  final int qty;
  final double price;

  const PartnerOrderItem({
    required this.productId,
    required this.nameEn,
    required this.unit,
    required this.qty,
    required this.price,
  });

  factory PartnerOrderItem.fromJson(Map<String, dynamic> j) => PartnerOrderItem(
        productId: j['product_id'] as String,
        nameEn: j['name_en'] as String,
        unit: j['unit'] as String? ?? 'piece',
        qty: (j['qty'] as num?)?.toInt() ?? 0,
        price: (j['price'] as num?)?.toDouble() ?? 0,
      );
}

/// An order as seen by a partner. Note: the handover OTP is NEVER sent to the
/// partner app — the customer tells it to the partner at the door.
class PartnerOrder {
  final String id;
  final String vendorName;
  final String status;
  final List<PartnerOrderItem> items;
  final double subtotal;
  final double deliveryPay; // what the partner earns for this trip
  final String paymentMethod;
  final double? distanceKm;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropLat;
  final double? dropLng;
  final String dropAddress;
  final int createdAt;

  const PartnerOrder({
    required this.id,
    required this.vendorName,
    required this.status,
    required this.items,
    required this.subtotal,
    required this.deliveryPay,
    required this.paymentMethod,
    this.distanceKm,
    this.pickupLat,
    this.pickupLng,
    this.dropLat,
    this.dropLng,
    required this.dropAddress,
    required this.createdAt,
  });

  factory PartnerOrder.fromJson(Map<String, dynamic> j) => PartnerOrder(
        id: j['id'] as String,
        vendorName: j['vendor_name'] as String? ?? 'Vendor',
        status: j['status'] as String? ?? 'placed',
        items: ((j['items'] as List?) ?? const [])
            .map((e) => PartnerOrderItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        subtotal: (j['subtotal'] as num?)?.toDouble() ?? 0,
        deliveryPay: (j['delivery_pay'] as num?)?.toDouble() ?? 0,
        paymentMethod: j['payment_method'] as String? ?? 'cod',
        distanceKm: (j['distance_km'] as num?)?.toDouble(),
        pickupLat: (j['pickup_lat'] as num?)?.toDouble(),
        pickupLng: (j['pickup_lng'] as num?)?.toDouble(),
        dropLat: (j['drop_lat'] as num?)?.toDouble(),
        dropLng: (j['drop_lng'] as num?)?.toDouble(),
        dropAddress: j['drop_address'] as String? ?? '',
        createdAt: (j['created_at'] as num?)?.toInt() ?? 0,
      );

  /// Human label for the fulfilment status chip.
  String get statusLabel => switch (status) {
        'placed' => 'New',
        'accepted' => 'Accepted',
        'picked_up' => 'Picked up',
        'out_for_delivery' => 'On the way',
        'delivered' => 'Delivered',
        _ => status,
      };
}
