import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../widgets/offline_dialog.dart';
import '../widgets/splash_overlay.dart';

const String kStartUrl = 'https://battleasia1.lovable.app/?app=1';
const String kHost = 'battleasia1.lovable.app';

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});
  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  InAppWebViewController? _controller;
  PullToRefreshController? _refresh;
  late StreamSubscription _connSub;
  bool _offline = false;
  bool _ready = false;
  bool _showSplash = true;
  String _currentUrl = kStartUrl;

  @override
  void initState() {
    super.initState();
    _refresh = PullToRefreshController(
      settings: PullToRefreshSettings(color: const Color(0xFF7CD44A)),
      onRefresh: () async => _controller?.reload(),
    );
    _connSub = Connectivity().onConnectivityChanged.listen((results) {
      final hasNet = results.any((r) => r != ConnectivityResult.none);
      if (!hasNet && !_offline) {
        setState(() => _offline = true);
      } else if (hasNet && _offline) {
        setState(() => _offline = false);
        _controller?.reload();
      }
    });
    Future.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) setState(() => _showSplash = false);
    });
  }

  @override
  void dispose() {
    _connSub.cancel();
    super.dispose();
  }

  Future<bool> _handleBack() async {
    if (_controller == null) return true;
    final url = (await _controller!.getUrl())?.toString() ?? '';
    final inDashboard = url.contains('/dashboard');
    if (inDashboard && await _controller!.canGoBack()) {
      _controller!.goBack();
      return false;
    }
    return await _confirmExit();
  }

  Future<bool> _confirmExit() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0E0820),
        title: const Text('Exit Battle Asia?',
            style: TextStyle(color: Colors.white)),
        content: const Text('আপনি কি অ্যাপ থেকে বের হতে চান?',
            style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('CANCEL',
                  style: TextStyle(color: Color(0xFF7CD44A)))),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('EXIT', style: TextStyle(color: Colors.redAccent))),
        ],
      ),
    );
    if (result == true) {
      SystemNavigator.pop();
      return true;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        await _handleBack();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0A0617),
        body: SafeArea(
          child: Stack(
            children: [
              InAppWebView(
                initialUrlRequest: URLRequest(url: WebUri(kStartUrl)),
                initialSettings: InAppWebViewSettings(
                  userAgent:
                      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 BattleAsiaApp/1.0',
                  javaScriptEnabled: true,
                  domStorageEnabled: true,
                  databaseEnabled: true,
                  thirdPartyCookiesEnabled: true,
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserGesture: false,
                  useHybridComposition: true,
                  supportZoom: false,
                  transparentBackground: true,
                  allowFileAccess: true,
                  useOnDownloadStart: true,
                ),
                pullToRefreshController: _refresh,
                onWebViewCreated: (c) => _controller = c,
                onLoadStop: (c, url) async {
                  _refresh?.endRefreshing();
                  _currentUrl = url?.toString() ?? _currentUrl;
                  if (!_ready) setState(() => _ready = true);
                },
                onReceivedError: (c, req, err) {
                  _refresh?.endRefreshing();
                  if (req.isForMainFrame == true) {
                    setState(() => _offline = true);
                  }
                },
                shouldOverrideUrlLoading: (c, action) async {
                  final u = action.request.url;
                  if (u == null) return NavigationActionPolicy.ALLOW;
                  // External links / APK download → open in system browser
                  final isExternal = u.host.isNotEmpty && u.host != kHost;
                  final isApk = u.toString().toLowerCase().endsWith('.apk');
                  if (isExternal || isApk) {
                    if (await canLaunchUrl(u)) {
                      await launchUrl(u, mode: LaunchMode.externalApplication);
                    }
                    return NavigationActionPolicy.CANCEL;
                  }
                  return NavigationActionPolicy.ALLOW;
                },
                onDownloadStartRequest: (c, req) async {
                  if (await canLaunchUrl(req.url)) {
                    await launchUrl(req.url,
                        mode: LaunchMode.externalApplication);
                  }
                },
              ),
              if (_offline)
                OfflineDialog(onRetry: () {
                  setState(() => _offline = false);
                  _controller?.reload();
                }),
              if (_showSplash) const SplashOverlay(),
            ],
          ),
        ),
      ),
    );
  }
}
