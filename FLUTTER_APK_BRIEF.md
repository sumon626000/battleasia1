# Battle Asia — Flutter APK Developer Brief

> Goal: Wrap the existing **Battle Asia** web app (`https://battleasia1.lovable.app`) into a native Android APK using Flutter. Keep everything simple — the web app already has all features (auth, wallet, matches, feed, admin, payments, etc.). The Flutter app is mainly a **secure WebView shell + native integrations**.

---

## 1. What to Hand Over to the Developer

### A. Access & Links
| Item | Value |
|------|-------|
| Live Website | `https://battleasia1.lovable.app` |
| Custom Domain (if any) | _to be added_ |
| Test User Account | email + password |
| Test Admin Account | email + password (optional) |
| Backend | Managed (Lovable Cloud / Supabase) — **no backend code needed** |
| API Base URL | Same as website (already handled by web app) |

### B. Branding Assets (zip folder)
- App name: **Battle Asia**
- Package name: `com.battleasia.app` (suggestion)
- App icon: **1024×1024 PNG** (transparent + solid version)
- Adaptive icon: foreground + background layers (Android 8+)
- Splash screen image: **1242×2688 PNG** (dark bg `#0a0a0a`, gold logo `#d4af37`)
- Notification icon: **96×96 white PNG** (monochrome silhouette)
- Brand colors:
  - Primary / Gold: `#d4af37`
  - Background: `#0a0a0a`
- Fonts: Rajdhani + JetBrains Mono (already in web; not needed for native shell)

### C. Existing Web Manifest (already done, share for reference)
- `/manifest.webmanifest`
- `/icon-192.png`, `/icon-512.png`

---

## 2. What the Flutter App Must Do (Feature List)

Keep it minimal — the web app does the heavy lifting.

1. **WebView Shell**
   - Load `https://battleasia1.lovable.app` full-screen
   - Use `flutter_inappwebview` (best support for file upload, downloads, JS bridge)
   - Enable: JavaScript, DOM storage, cookies, localStorage, third-party cookies
   - Hide URL bar, no browser chrome

2. **Splash Screen**
   - Native splash (use `flutter_native_splash` package)
   - Dark bg + gold logo, ~1.5s

3. **Pull-to-Refresh** inside WebView

4. **Back Button Handling**
   - Android back → WebView back; if no history → exit confirmation

5. **File Upload Support**
   - For profile pictures, screenshot uploads (Result Center)
   - Permissions: Camera, Photos/Storage

6. **APK Download Handling**
   - When user taps "Download APK" inside web → open in external browser OR native download manager

7. **Push Notifications** (optional, phase 2)
   - Firebase Cloud Messaging (FCM)
   - Web app already has push setup — coordinate the FCM key

8. **App Version Check** (optional)
   - Web has `/apk` page with versions table
   - App can call `apk_versions` endpoint and prompt update if `force_update = true`

9. **Deep Links** (optional)
   - `battleasia://` scheme + `https://battleasia1.lovable.app/*` App Links

10. **No Offline Mode** — requires internet (show a clean "No Internet" screen if offline)

---

## 3. Permissions to Declare (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

---

## 4. Recommended Flutter Packages

```yaml
dependencies:
  flutter_inappwebview: ^6.0.0
  flutter_native_splash: ^2.4.0
  connectivity_plus: ^6.0.0
  url_launcher: ^6.3.0
  permission_handler: ^11.3.0
  firebase_core: ^3.0.0          # if push enabled
  firebase_messaging: ^15.0.0    # if push enabled
  package_info_plus: ^8.0.0
```

---

## 5. Build & Delivery

- Min SDK: **Android 6.0 (API 23)**
- Target SDK: **Android 14 (API 34)**
- Build: `flutter build apk --release --split-per-abi`
- Deliverables:
  - `app-armeabi-v7a-release.apk`
  - `app-arm64-v8a-release.apk`
  - `app-x86_64-release.apk`
  - Signed keystore (`.jks`) + password (developer keeps backup, hands over to you)
  - `key.properties` config
- Versioning: `versionName` (e.g. `1.0.0`) + `versionCode` (integer, increment every release)

---

## 6. Testing Checklist (Developer Must Verify)

- [ ] Login / Signup works
- [ ] Google OAuth works inside WebView
- [ ] Image upload (profile, result screenshot) works
- [ ] Match join → balance deduct → room ID reveal works
- [ ] Push notification received (if enabled)
- [ ] Pull-to-refresh works
- [ ] Back button doesn't accidentally exit
- [ ] Splash + icon look correct
- [ ] No "Install from unknown sources" crashes
- [ ] Works on Android 6, 10, 13, 14

---

## 7. How to Explain Simply (Bangla note for the developer)

> "ভাই, পুরা ওয়েবসাইট রেডি — `https://battleasia1.lovable.app`। তুমি Flutter দিয়ে একটা **WebView app** বানাবা যেটা এই সাইট লোড করবে fullscreen-এ।
>
> Backend, API, login, payment — কিছুই বানাতে হবে না, সব already web-এ আছে।
>
> তোমাকে শুধু এই কাজগুলো করতে হবে:
> 1. `flutter_inappwebview` দিয়ে সাইট লোড
> 2. App icon + Splash screen (assets আমি দিব)
> 3. Camera/Gallery permission (image upload-এর জন্য)
> 4. Back button handle
> 5. Push notification (FCM) — optional
> 6. Signed release APK build করে দিবা (3টা ABI split সহ)
> 7. Keystore backup আমাকে দিবা
>
> Package name: `com.battleasia.app`, App name: `Battle Asia`। বাকি color/logo zip-এ দিয়ে দিছি।"

---

## 8. Timeline Estimate

- Basic WebView shell + splash + icon: **1–2 days**
- File upload + permissions + back handling: **1 day**
- Push notifications (FCM): **1–2 days**
- Testing + signed build: **1 day**
- **Total: ~5–7 days** for a single Flutter dev

---

## 9. Future (Phase 2) — Optional Native Features

- Biometric login (fingerprint)
- Native bottom navigation with WebView per tab
- In-app browser for external links
- Native share sheet
- Background notification badge count
