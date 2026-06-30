import 'package:flutter/material.dart';

class SplashOverlay extends StatefulWidget {
  const SplashOverlay({super.key});
  @override
  State<SplashOverlay> createState() => _SplashOverlayState();
}

class _SplashOverlayState extends State<SplashOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _c;
  late Animation<double> _fade;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1400))
      ..forward();
    _fade = CurvedAnimation(parent: _c, curve: Curves.easeOut);
    _scale = Tween(begin: 0.85, end: 1.0)
        .animate(CurvedAnimation(parent: _c, curve: Curves.easeOutBack));
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          colors: [Color(0xFF1A0B3D), Color(0xFF0A0617)],
          radius: 1.0,
        ),
      ),
      child: Center(
        child: FadeTransition(
          opacity: _fade,
          child: ScaleTransition(
            scale: _scale,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFF7CD44A), width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF7CD44A).withOpacity(0.6),
                        blurRadius: 40,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child: const Text(
                    'BATTLE\nASIA',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 6,
                      height: 1.0,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'TOURNAMENT ARENA',
                  style: TextStyle(
                    color: Color(0xFF7CD44A),
                    fontSize: 11,
                    letterSpacing: 4,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
