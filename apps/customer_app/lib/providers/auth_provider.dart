import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Auth state — token + basic profile, persisted in SharedPreferences.
class AuthState {
  final String? token;
  final String? phone;
  final String? name;

  const AuthState({this.token, this.phone, this.name});

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
      );
    }
  }

  /// Save a fresh session after OTP verification.
  Future<void> login(String token, {String? phone, String? name}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    if (phone != null) await prefs.setString('phone', phone);
    if (name != null) await prefs.setString('name', name);
    state = AuthState(token: token, phone: phone, name: name);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('phone');
    await prefs.remove('name');
    state = const AuthState();
  }
}
