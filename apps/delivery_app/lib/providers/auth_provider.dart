import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Partner auth state — token + basic profile, persisted in SharedPreferences.
class AuthState {
  final String? token;
  final String? phone;
  final String? name;
  final String? vehicle;

  const AuthState({this.token, this.phone, this.name, this.vehicle});

  bool get isLoggedIn => token != null && token!.isNotEmpty;
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState();

  /// Load the persisted session (called from the splash screen).
  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null && token.isNotEmpty) {
      state = AuthState(
        token: token,
        phone: prefs.getString('phone'),
        name: prefs.getString('name'),
        vehicle: prefs.getString('vehicle'),
      );
    }
  }

  /// Save a fresh session after OTP verification.
  Future<void> login(String token, {String? phone, String? name, String? vehicle}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    if (phone != null) await prefs.setString('phone', phone);
    if (name != null) await prefs.setString('name', name);
    if (vehicle != null) await prefs.setString('vehicle', vehicle);
    state = AuthState(token: token, phone: phone, name: name, vehicle: vehicle);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('phone');
    await prefs.remove('name');
    await prefs.remove('vehicle');
    state = const AuthState();
  }
}
