# Battle Asia — Flutter APK

WebView shell for https://battleasia1.lovable.app

## Setup

```bash
# 1. Install Flutter 3.22+ : https://docs.flutter.dev/get-started/install
flutter --version

# 2. Create platform folders (Android/iOS) inside this directory
flutter create --org com.battleasia --project-name battle_asia .
#   ⚠️ Keep the existing lib/, pubspec.yaml, AndroidManifest.xml, build.gradle.
#   When asked to overwrite, say NO to those files.

# 3. Install dependencies
flutter pub get

# 4. Generate native splash screen
flutter pub run flutter_native_splash:create

# 5. Add app icon (1024x1024 PNG at assets/icon.png) — optional with flutter_launcher_icons
```

## Required Assets (put in `assets/`)
- `splash_logo.png` — 512×512 transparent PNG (BATTLE ASIA logo)
- `icon.png` — 1024×1024 app icon

## Build Debug APK (for testing)
```bash
flutter build apk --debug
# Output: build/app/outputs/flutter-apk/app-debug.apk
```

## Build Release APK (signed)

1. Generate keystore (one-time):
```bash
keytool -genkey -v -keystore ~/battle-asia.jks -keyalg RSA -keysize 2048 -validity 10000 -alias battleasia
```

2. Create `android/key.properties`:
```
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=battleasia
storeFile=/full/path/to/battle-asia.jks
```

3. Build:
```bash
flutter build apk --release --split-per-abi
# Output: build/app/outputs/flutter-apk/
#   app-arm64-v8a-release.apk    (modern phones — main one)
#   app-armeabi-v7a-release.apk  (older phones)
#   app-x86_64-release.apk       (emulators)
```

## Features Included
- ✅ Full-screen WebView (loads `?app=1` so site skips marketing home)
- ✅ Splash screen with BATTLE ASIA logo + neon glow animation (~1.8s)
- ✅ Offline popup (violet + neon green theme) with retry button
- ✅ Pull-to-refresh
- ✅ Back button: navigates inside /dashboard, else shows Exit dialog
- ✅ External links + APK downloads open in system browser
- ✅ Cookies / localStorage persist (no repeated logins)
- ✅ Camera/Gallery permissions for image uploads
- ✅ Custom User-Agent (BattleAsiaApp/1.0) — survives OAuth redirects

## Package Info
- App name: **Battle Asia**
- Package: `com.battleasia.app`
- Min Android: 6.0 (API 23)
- Target: Android 14 (API 34)

## iOS Build (later, on Mac)
```bash
flutter build ios --release
```
Requires Mac + Xcode + Apple Developer account ($99/yr).
