import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/theme.dart';

void main() {
  runApp(const ProviderScope(child: OnamDeliveryApp()));
}

class OnamDeliveryApp extends ConsumerWidget {
  const OnamDeliveryApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'OnamDelivery',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
