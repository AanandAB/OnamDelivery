import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:customer_app/main.dart';

void main() {
  testWidgets('app boots without crashing when logged out', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const ProviderScope(child: OnamDeliveryApp()));
    await tester.pump(const Duration(seconds: 1));
    expect(find.byType(OnamDeliveryApp), findsOneWidget);
  });
}
