# BusNear: Real-Time School Bus Tracking

## By Abeni Dinsa

## Project Info

A native cross-platform mobile app for real-time school bus tracking.

**Platform**: Native iOS & Android app, exportable to web
**Framework**: Expo Router + React Native

## How can I edit this code?

### **Use your preferred code editor**

Clone this repo and push changes.

The only requirement is having Node.js & Bun installed - [install Node.js with nvm](https://github.com/nvm-sh/nvm) and [install Bun](https://bun.sh/docs/installation)

Follow these steps:

```bash
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
bun i

# Step 4: Start the instant web preview in your browser
bun run start-web

# Step 5: Start iOS preview
# Option A (recommended):
bun run start  # then press "i" in the terminal to open iOS Simulator
# Option B (if supported by your environment):
bun run start -- --ios
```

### **Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

## What technologies are used for this project?

This project is built with the most popular native mobile cross-platform technical stack:

- **React Native** - Cross-platform native mobile development framework created by Meta
- **Expo** - Extension of React Native + platform used by Discord, Shopify, Coinbase, and more
- **Expo Router** - File-based routing system for React Native with support for web, server functions and SSR
- **TypeScript** - Type-safe JavaScript
- **React Query** - Server state management
- **Lucide React Native** - Beautiful icons

## How can I test my app?

### **On your phone (Recommended)**

1. **iOS**: Download [Expo Go](https://apps.apple.com/app/expo-go/id982107779)
2. **Android**: Download the [Expo Go app from Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
3. Run `bun run start` and scan the QR code from your development server

### **In your browser**

Run `bun start-web` to test in a web browser. Note: The browser preview is great for quick testing, but some native features may not be available.

### **iOS Simulator / Android Emulator**

You can test apps in Expo Go. You don't need XCode or Android Studio for most features.

**When do you need Custom Development Builds?**

- Native authentication (Face ID, Touch ID, Apple Sign In)
- In-app purchases and subscriptions
- Push notifications
- Custom native modules

Learn more: [Expo Custom Development Builds Guide](https://docs.expo.dev/develop/development-builds/introduction/)

If you have XCode (iOS) or Android Studio installed:

```bash
# iOS Simulator
bun run start -- --ios

# Android Emulator
bun run start -- --android
```

## How can I deploy this project?

### **Publish to App Store (iOS)**

1. **Install EAS CLI**:

   ```bash
   bun i -g @expo/eas-cli
   ```

2. **Configure your project**:

   ```bash
   eas build:configure
   ```

3. **Build for iOS**:

   ```bash
   eas build --platform ios
   ```

4. **Submit to App Store**:
   ```bash
   eas submit --platform ios
   ```

For detailed instructions, visit [Expo's App Store deployment guide](https://docs.expo.dev/submit/ios/).

### **Publish to Google Play (Android)**

1. **Build for Android**:

   ```bash
   eas build --platform android
   ```

2. **Submit to Google Play**:
   ```bash
   eas submit --platform android
   ```

For detailed instructions, visit [Expo's Google Play deployment guide](https://docs.expo.dev/submit/android/).

## App Features

- **Real-time school bus tracking** with live map
- **Push notifications** for boarding, exiting, and proximity alerts
- **Cross-platform compatibility** - Works on iOS, Android, and Web
- **File-based routing** with Expo Router
- **TypeScript support** for better development experience
- **Modern onboarding** with premium animations

## Project Structure

```
├── app/                    # App screens (Expo Router)
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home / Map screen
│   ├── onboarding.tsx      # Onboarding flow
│   ├── settings.tsx        # Settings screen
│   ├── activity.tsx        # Activity feed
│   └── driver.tsx          # Driver view
├── components/             # Reusable components
├── context/                # App context providers
├── constants/              # App constants and configuration
├── mocks/                  # Mock data
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions
├── backend/                # Backend API (Hono + tRPC)
├── assets/                 # Static assets
├── app.json                # Expo configuration
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Troubleshooting

### **App not loading on device?**

1. Make sure your phone and computer are on the same WiFi network
2. Try using tunnel mode: `bun start -- --tunnel`
3. Check if your firewall is blocking the connection

### **Build failing?**

1. Clear your cache: `bunx expo start --clear`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && bun install`
3. Check [Expo's troubleshooting guide](https://docs.expo.dev/troubleshooting/build-errors/)

### **Need help with native features?**

- Check [Expo's documentation](https://docs.expo.dev/) for native APIs
- Browse [React Native's documentation](https://reactnative.dev/docs/getting-started) for core components

## About

BusNear is built by **Abeni Dinsa**. It uses React Native and Expo - the same technology stack used by Discord, Shopify, Coinbase, Instagram, and nearly 30% of the top 100 apps on the App Store.

BusNear is production-ready and can be published to both the App Store and Google Play Store.
