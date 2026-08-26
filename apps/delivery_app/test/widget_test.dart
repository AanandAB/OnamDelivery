import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:delivery_app/main.dart';

void main() {
  testWidgets('Delivery partner app boots to the splash screen', (WidgetTester tester) async {
    // Provide an empty prefs store so the splash's session-restore doesn't
    // hit a missing plugin channel during the test.
    SharedPreferences.setMockInitialValues({});

    // The real main() wraps the app in a ProviderScope — mirror that here.
    await tester.pumpWidget(const ProviderScope(child: OnamDeliveryPartnerApp()));
    expect(find.byType(OnamDeliveryPartnerApp), findsOneWidget);
  });
}
