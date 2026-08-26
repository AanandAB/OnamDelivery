// API models (mirror the Worker's snake_case JSON).

class Category {
  final String id;
  final String nameEn;
  final String? nameMl;
  final int sortOrder;

  const Category({required this.id, required this.nameEn, this.nameMl, required this.sortOrder});

  factory Category.fromJson(Map<String, dynamic> j) => Category(
        id: j['id'] as String,
        nameEn: j['name_en'] as String,
        nameMl: j['name_ml'] as String?,
        sortOrder: (j['sort_order'] as num?)?.toInt() ?? 0,
      );
}

class Vendor {
  final String id;
  final String name;
  final String? phone;
  final double lat;
  final double lng;
  final double radiusKm;
  final double rating;
  final int ratingCount;
  final bool isOpen;
  final bool hasOwnDelivery;
  final double? distanceKm;
  final bool delivers;

  const Vendor({
    required this.id,
    required this.name,
    this.phone,
    required this.lat,
    required this.lng,
    required this.radiusKm,
    required this.rating,
    required this.ratingCount,
    required this.isOpen,
    required this.hasOwnDelivery,
    this.distanceKm,
    required this.delivers,
  });

  factory Vendor.fromJson(Map<String, dynamic> j) => Vendor(
        id: j['id'] as String,
        name: j['name'] as String,
        phone: j['phone'] as String?,
        lat: (j['lat'] as num).toDouble(),
        lng: (j['lng'] as num).toDouble(),
        radiusKm: (j['radius_km'] as num?)?.toDouble() ?? 10,
        rating: (j['rating'] as num?)?.toDouble() ?? 0,
        ratingCount: (j['rating_count'] as num?)?.toInt() ?? 0,
        isOpen: (j['is_open'] as num?)?.toInt() == 1,
        hasOwnDelivery: (j['has_own_delivery'] as num?)?.toInt() == 1,
        distanceKm: (j['distance_km'] as num?)?.toDouble(),
        delivers: (j['delivers'] as bool?) ?? true,
      );
}

class Product {
  final String id;
  final String vendorId;
  final String? categoryId;
  final String nameEn;
  final String? nameMl;
  final String unit; // piece | bunch | kg
  final double price;
  final int stock;
  final String? imageUrl;
  final String? occasion;

  const Product({
    required this.id,
    required this.vendorId,
    this.categoryId,
    required this.nameEn,
    this.nameMl,
    required this.unit,
    required this.price,
    required this.stock,
    this.imageUrl,
    this.occasion,
  });

  factory Product.fromJson(Map<String, dynamic> j) => Product(
        id: j['id'] as String,
        vendorId: j['vendor_id'] as String,
        categoryId: j['category_id'] as String?,
        nameEn: j['name_en'] as String,
        nameMl: j['name_ml'] as String?,
        unit: j['unit'] as String? ?? 'piece',
        price: (j['price'] as num).toDouble(),
        stock: (j['stock'] as num?)?.toInt() ?? 0,
        imageUrl: j['image_url'] as String?,
        occasion: j['occasion'] as String?,
      );

  bool get isKgPriced => unit == 'kg';
}

class User {
  final String id;
  final String phone;
  final String? name;

  const User({required this.id, required this.phone, this.name});

  factory User.fromJson(Map<String, dynamic> j) => User(
        id: j['id'] as String,
        phone: j['phone'] as String,
        name: j['name'] as String?,
      );
}

class Order {
  final String id;
  final String vendorId;
  final String status;
  final double subtotal;
  final double deliveryFee;
  final double platformFee;
  final double total;
  final String paymentMethod;
  final String deliveryType;
  final double? distanceKm;
  final String dropAddress;
  final String? otp;
  final int createdAt;

  const Order({
    required this.id,
    required this.vendorId,
    required this.status,
    required this.subtotal,
    required this.deliveryFee,
    required this.platformFee,
    required this.total,
    required this.paymentMethod,
    required this.deliveryType,
    this.distanceKm,
    required this.dropAddress,
    this.otp,
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> j) => Order(
        id: j['id'] as String,
        vendorId: j['vendor_id'] as String,
        status: j['status'] as String? ?? 'placed',
        subtotal: (j['subtotal'] as num?)?.toDouble() ?? 0,
        deliveryFee: (j['delivery_fee'] as num?)?.toDouble() ?? 0,
        platformFee: (j['platform_fee'] as num?)?.toDouble() ?? 0,
        total: (j['total'] as num?)?.toDouble() ?? 0,
        paymentMethod: j['payment_method'] as String? ?? 'cod',
        deliveryType: j['delivery_type'] as String? ?? 'platform',
        distanceKm: (j['distance_km'] as num?)?.toDouble(),
        dropAddress: j['drop_address'] as String? ?? '',
        otp: j['otp'] as String?,
        createdAt: (j['created_at'] as num?)?.toInt() ?? 0,
      );
}

class Settings {
  final double platformFee;
  final double deliveryBaseFee;
  final double deliveryRatePerKm;
  final Map<String, String> grievanceOfficer;

  const Settings({
    required this.platformFee,
    required this.deliveryBaseFee,
    required this.deliveryRatePerKm,
    required this.grievanceOfficer,
  });

  factory Settings.fromJson(Map<String, dynamic> j) => Settings(
        platformFee: (j['platform_fee'] as num?)?.toDouble() ?? 20,
        deliveryBaseFee: (j['delivery_base_fee'] as num?)?.toDouble() ?? 40,
        deliveryRatePerKm: (j['delivery_rate_per_km'] as num?)?.toDouble() ?? 15,
        grievanceOfficer: ((j['grievance_officer'] as Map<String, dynamic>?) ?? {})
            .map((k, v) => MapEntry(k, v.toString())),
      );
}

/// Live delivery partner info from the order-tracking endpoint.
class TrackPartner {
  final String? name;
  final String? vehicle;
  final bool isOnline;
  final double? currentLat;
  final double? currentLng;

  const TrackPartner({
    this.name,
    this.vehicle,
    required this.isOnline,
    this.currentLat,
    this.currentLng,
  });

  factory TrackPartner.fromJson(Map<String, dynamic> j) => TrackPartner(
        name: j['name'] as String?,
        vehicle: j['vehicle'] as String?,
        isOnline: (j['is_online'] as bool?) ?? false,
        currentLat: (j['current_lat'] as num?)?.toDouble(),
        currentLng: (j['current_lng'] as num?)?.toDouble(),
      );
}

/// Live tracking snapshot for one order.
class TrackInfo {
  final String id;
  final String status;
  final String vendorName;
  final double? pickupLat;
  final double? pickupLng;
  final double? dropLat;
  final double? dropLng;
  final String dropAddress;
  final TrackPartner? partner;

  const TrackInfo({
    required this.id,
    required this.status,
    required this.vendorName,
    this.pickupLat,
    this.pickupLng,
    this.dropLat,
    this.dropLng,
    required this.dropAddress,
    this.partner,
  });

  factory TrackInfo.fromJson(Map<String, dynamic> j) => TrackInfo(
        id: j['id'] as String,
        status: j['status'] as String? ?? 'placed',
        vendorName: j['vendor_name'] as String? ?? 'Vendor',
        pickupLat: (j['pickup_lat'] as num?)?.toDouble(),
        pickupLng: (j['pickup_lng'] as num?)?.toDouble(),
        dropLat: (j['drop_lat'] as num?)?.toDouble(),
        dropLng: (j['drop_lng'] as num?)?.toDouble(),
        dropAddress: j['drop_address'] as String? ?? '',
        partner: j['partner'] == null
            ? null
            : TrackPartner.fromJson(j['partner'] as Map<String, dynamic>),
      );
}
