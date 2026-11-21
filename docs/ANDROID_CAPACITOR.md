# Android APK Packaging Guide (Capacitor)

This project is pre-configured for Android packaging using Capacitor (`capacitor.config.ts`).

## Prerequisites

- Node.js 22+
- Android Studio & Android SDK
- JDK 17+

## Build & Sync Steps

1. Set the production API URL in `.env`:
   ```bash
   VITE_API_BASE_URL="https://your-deployed-api-domain.com"
   ```
2. Build the production web bundle:
   ```bash
   npm run build
   ```
3. Install Capacitor CLI & Android platform (local dev machine):
   ```bash
   npm install -D @capacitor/cli
   npm install @capacitor/android
   npx cap add android
   npx cap sync android
   ```
4. For native SQLite offline storage on Android, install `@capacitor-community/sqlite` and wire its driver into `src/storage/offlineDb.ts`.
5. Open Android Studio to compile or sign the APK/AAB:
   ```bash
   npx cap open android
   ```
