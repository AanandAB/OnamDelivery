// API client for the OnamDelivery backend (Cloudflare Worker).
// Pure client-side fetch — the storefront is a static export with no server,
// so every call goes straight to https://onam-flowers-api.aanandab44.workers.dev.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://onam-flowers-api.aanandab44.workers.dev";

export const TOKEN_KEY = "od_token";
export const USER_KEY = "od_user";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string }).error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

// ---- Types (mirror the Worker's snake_case JSON) ----

export interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  lat: number;
  lng: number;
  radius_km: number;
  rating: number;
  rating_count: number;
  is_open: number;
  has_own_delivery: number;
  license: string | null;
  banner: string | null;
  created_at: number;
  distance_km?: number | null;
  delivers?: boolean;
}

export interface Product {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name_en: string;
  name_ml: string | null;
  unit: string;
  price: number;
  stock: number;
  image_url: string | null;
  occasion: string | null;
  hidden: number;
  created_at: number;
}

export interface Category {
  id: string;
  name_en: string;
  name_ml: string | null;
  sort_order: number;
}

export interface Review {
  id: string;
  order_id: string;
  vendor_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: number;
}

export interface OrderItem {
  product_id: string;
  name_en: string;
  unit: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  user_id: string;
  vendor_id: string;
  partner_id: string | null;
  status: string;
  items: string | OrderItem[];
  subtotal: number;
  delivery_fee: number;
  delivery_pay: number;
  platform_fee: number;
  vendor_payout: number;
  total: number;
  payment_method: string;
  delivery_type: string;
  distance_km: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  drop_lat: number;
  drop_lng: number;
  drop_address: string;
  otp: string | null;
  created_at: number;
  updated_at: number;
}

export interface TrackInfo {
  id: string;
  status: string;
  vendor_name: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_lat: number;
  drop_lng: number;
  drop_address: string;
  partner: {
    name: string | null;
    vehicle: string | null;
    is_online: boolean;
    current_lat: number | null;
    current_lng: number | null;
  } | null;
}

export interface Settings {
  platform_fee: string;
  delivery_base_fee: string;
  delivery_rate_per_km: string;
  partner_base_pay: string;
  partner_rate_per_km: string;
  upi_id?: string;
  [key: string]: string | undefined;
}

// ---- Endpoints ----

export function getVendors(lat?: number, lng?: number): Promise<Vendor[]> {
  const q = new URLSearchParams();
  if (lat !== undefined && lng !== undefined) {
    q.set("lat", String(lat));
    q.set("lng", String(lng));
  }
  const qs = q.toString();
  return request<Vendor[]>(`/api/vendors${qs ? `?${qs}` : ""}`);
}

export function getVendor(id: string): Promise<Vendor & { products: Product[] }> {
  return request<Vendor & { products: Product[] }>(`/api/vendors/${id}`);
}

export function getProducts(vendorId: string): Promise<Product[]> {
  return request<Product[]>(`/api/vendors/${vendorId}/products`);
}

export function getCategories(): Promise<Category[]> {
  return request<Category[]>("/api/categories");
}

export function getReviews(vendorId: string): Promise<Review[]> {
  return request<Review[]>(`/api/vendors/${vendorId}/reviews`);
}

export function getSettings(): Promise<Settings> {
  return request<Settings>("/api/settings");
}

export function validateCoupon(
  code: string,
  phone: string,
  subtotal: number,
): Promise<{
  valid: boolean;
  code: string;
  type: string;
  value: number;
  discount: number;
}> {
  return request("/api/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, phone, subtotal }),
  });
}

export async function requestOtp(phone: string): Promise<string> {
  const res = await request<{ ok: boolean; dev_otp?: string; note?: string }>(
    "/api/auth/otp",
    { method: "POST", body: JSON.stringify({ phone }) },
  );
  return res.dev_otp ?? "";
}

export async function verifyOtp(
  phone: string,
  code: string,
  consent: boolean,
): Promise<{ token: string; user: { id: string; phone: string; name: string | null } }> {
  return request("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code, consent, consent_version: "1.0" }),
  });
}

export function createOrder(payload: {
  vendor_id: string;
  items: { product_id: string; qty: number }[];
  drop_lat: number;
  drop_lng: number;
  drop_address: string;
  payment_method?: string;
  coupon_code?: string;
}): Promise<Order> {
  return request<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOrders(): Promise<Order[]> {
  return request<Order[]>("/api/orders");
}

export function trackOrder(id: string): Promise<TrackInfo> {
  return request<TrackInfo>(`/api/orders/${id}/track`);
}

export function createReview(
  orderId: string,
  rating: number,
  comment?: string,
): Promise<{ ok: boolean }> {
  return request(`/api/orders/${orderId}/review`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
}

export function formatRupees(n: number): string {
  const s = Math.round(Number(n) || 0).toString();
  let head = "";
  let last3 = s;
  if (s.length > 3) {
    last3 = s.slice(-3);
    head = s.slice(0, -3);
  }
  const groups: string[] = [];
  while (head.length > 2) {
    groups.unshift(head.slice(-2));
    head = head.slice(0, -2);
  }
  if (head) groups.unshift(head);
  return "₹" + [...groups, last3].join(",");
}
