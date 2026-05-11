# Building the Android APK

## Requirements
- Node.js 18+
- Java 17+ (JDK)
- Android Studio with Android SDK
- pnpm

## Steps

### 1. Install Capacitor CLI
```bash
npm install -g @capacitor/cli
npm install @capacitor/core @capacitor/android @capacitor/splash-screen @capacitor/status-bar @capacitor/push-notifications @capacitor/keyboard @capacitor/local-notifications
```

### 2. Build the web app
```bash
pnpm --filter @workspace/pulse run build
```

### 3. Initialize Capacitor (first time only)
```bash
cp android/capacitor.config.ts capacitor.config.ts
npx cap init "Pulse Messenger" com.pulse.messenger --web-dir=artifacts/pulse/dist
npx cap add android
```

### 4. Sync assets
```bash
npx cap sync android
```

### 5. Open in Android Studio
```bash
npx cap open android
```
In Android Studio: Build → Generate Signed Bundle/APK → APK → follow the wizard.

### 6. Or build from command line (debug APK)
```bash
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### 7. Release APK
```bash
cd android
./gradlew assembleRelease
# Sign with jarsigner or use Android Studio's signing wizard
```
