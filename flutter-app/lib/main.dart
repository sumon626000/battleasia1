import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/webview_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Color(0xFF0A0617),
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF0A0617),
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const BattleAsiaApp());
}

class BattleAsiaApp extends StatelessWidget {
  const BattleAsiaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Battle Asia',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFF0A0617),
        primaryColor: const Color(0xFF7CD44A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF7CD44A),
          secondary: Color(0xFF6A32B8),
          surface: Color(0xFF0E0820),
        ),
        useMaterial3: true,
      ),
      home: const WebViewScreen(),
    );
  }
}
