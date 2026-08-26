import 'package:flutter/material.dart';

/// Neumorphism design tokens + a soft UI container widget (shared brand with
/// the customer app — same palette, same soft shadows).
///
/// Neumorphism = same-tone background with two opposing shadows
/// (light top-left, dark bottom-right) to create a "soft extruded" look.
class AppTheme {
  AppTheme._();

  // Palette
  static const Color background = Color(0xFFECF0F3);
  static const Color surface = Color(0xFFECF0F3);
  static const Color rose = Color(0xFFD94F70); // primary accent (flowers)
  static const Color leaf = Color(0xFF3FA34D); // success / earnings
  static const Color gold = Color(0xFFE8B84B); // highlights
  static const Color ink = Color(0xFF2B2B2B); // text
  static const Color muted = Color(0xFF7A8290); // secondary text

  // Neumorphic shadows
  static const List<BoxShadow> softShadows = [
    BoxShadow(
      color: Color(0xFFFFFFFF),
      offset: Offset(-6, -6),
      blurRadius: 12,
    ),
    BoxShadow(
      color: Color(0xFFC8CED6),
      offset: Offset(6, 6),
      blurRadius: 12,
    ),
  ];

  static const List<BoxShadow> pressedShadows = [
    BoxShadow(
      color: Color(0xFFC8CED6),
      offset: Offset(-3, -3),
      blurRadius: 6,
    ),
    BoxShadow(
      color: Color(0xFFFFFFFF),
      offset: Offset(3, 3),
      blurRadius: 6,
    ),
  ];

  static ThemeData get light {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: background,
      colorScheme: base.colorScheme.copyWith(
        primary: rose,
        secondary: leaf,
        surface: surface,
        onSurface: ink,
      ),
      textTheme: base.textTheme.apply(
        bodyColor: ink,
        displayColor: ink,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        foregroundColor: ink,
        elevation: 0,
        centerTitle: true,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: rose,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
        ),
      ),
    );
  }
}

/// A soft neumorphic container. Use `pressed` for an inset/sunken look.
class NeumorphicBox extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final BorderRadius borderRadius;
  final bool pressed;
  final VoidCallback? onTap;

  const NeumorphicBox({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius = const BorderRadius.all(Radius.circular(20)),
    this.pressed = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final box = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: borderRadius,
        boxShadow: pressed ? AppTheme.pressedShadows : AppTheme.softShadows,
      ),
      child: child,
    );
    if (onTap == null) return box;
    return GestureDetector(onTap: onTap, child: box);
  }
}
