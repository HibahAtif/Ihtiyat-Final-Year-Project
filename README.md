# Ihtiyat | احتياط

**Final Year Project — CM3070**

Ihtiyat is a Saudi Arabia-focused mobile disaster-preparedness application built with React Native, Expo and TypeScript. The project uses Jeddah flash flooding as its implemented pilot context while supporting a wider configurable preparedness structure for Saudi locations and hazards.

The application combines preparedness guidance, location-aware content, offline-resilient local caching and a Supabase backend. It is intended as a preparedness and early-response support tool. It does not replace official emergency services, warnings or professional safety advice.

## Android APK

A pre-built Android APK is available for evaluation:

**[Download the Ihtiyat Android APK from Google Drive](https://drive.google.com/file/d/16CpHezm3Nsfi3TyJrxMKBi24JUy161eo/view?usp=drive_link)**

### Installing the APK on Android

Your Android may block applications installed outside Google Play by default.

1. Open the Google Drive link on the Android device and download the APK.
2. Open the downloaded APK.
3. If Android blocks the installation, allow installation from the application being used to open the file. Depending on the device, this setting may appear under:
   **Settings → Apps → Special app access → Install unknown apps**
4. Select **Google Drive**, **Files**, **Chrome**, or whichever application is opening the APK, then enable **Allow from this source**.
5. Return to the APK and complete the installation.
6. The permission can be disabled again after installation.

Menu names differ slightly between Android manufacturers and Android versions. If Google Drive downloads the APK but does not open the installer, please open the file from the device's **Files** or **Downloads** application instead.

## Main Features

- bilingual English and Arabic interface with RTL support
- configurable Saudi location selection and location-aware hazard context
- preparedness missions and safety-kit checklists
- adaptive preparedness content
- preparedness quiz with related guidance
- progress tracking and achievements
- simulated emergency alerts with local Android notifications
- deterministic, explainable Emergency Action Plan prioritisation
- Resource Hub with source/provenance information
- Supabase authentication and profile preferences
- offline-resilient SQLite caching and local progress persistence
- responsive layouts and application-level text-size accessibility controls

> The alert feature is a simulation for my project evaluation and demonstration. Ihtiyat does not provide a live official emergency-warning service.

## Technology Stack

- React Native
- Expo SDK 57
- Expo Router
- TypeScript
- React
- Supabase
- PostgreSQL
- Expo SQLite
- Expo Notifications
- Expo Location
- Geoapify
- Jest / jest-expo
- React Native Testing Library

The exact dependency versions used by the submitted project are recorded in `package.json` and `package-lock.json`.

## Repository Structure

```text
.
├── assets/                  Application icons and image assets
├── scripts/                 Development/integration scripts retained with the project
├── src/                     Application source code
│   ├── accessibility/
│   ├── app/                 Expo Router screens and layouts
│   ├── auth/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── localization/
│   ├── location/
│   ├── profile/
│   ├── storage/
│   ├── types/
│   └── utils/
├── supabase/
│   ├── migrations/          Database migration history
│   ├── tests/               SQL/database tests
│   ├── config.toml
│   └── supabase-full-schema.sql
├── __tests__/               Jest unit/component/integration-style tests
├── .env.example
├── app.json
├── jest.config.js
├── jest.setup.js
├── package.json
├── package-lock.json
└── tsconfig.json
```

Generated build directories, local environment files, caches, development archives and local documentation are intentionally excluded from the public repository.

## Prerequisites

For local Android development, install:

- **Node.js 20.19.4 or newer compatible Node release**
- **npm**
- **Git**
- **Android Studio**, including the Android SDK and either an Android emulator or a USB-connected Android device
- a suitable Java/JDK installation configured for the Android/Gradle toolchain
- a Supabase project
- a Geoapify API key if testing Geoapify-backed location resolution

The pre-built APK does not require the development toolchain.

## 1. Clone the Repository

```bash
git clone <https://github.com/HibahAtif/Ihtiyat-Final-Year-Project.git>
cd Ihtiyat-Final-Year-Project
```

## 2. Install Dependencies

The repository includes `package-lock.json`, so a clean reproducible installation can be performed with:

```bash
npm ci
```

If required, `npm install` can also be used.

## 3. Configure Environment Variables

Copy `.env.example` to `.env.local`.

### Windows PowerShell

```powershell
Copy-Item .env.example .env.local
```

### macOS / Linux

```bash
cp .env.example .env.local
```

Provide values for the variables defined in `.env.example`:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_GEOAPIFY_API_KEY=
```

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must correspond to the Supabase project used by the application.

`EXPO_PUBLIC_GEOAPIFY_API_KEY` is used for Geoapify-backed location resolution.

Do **not** commit `.env.local`.

## 4. Configure the Supabase Backend

The repository contains both the database migration history and a complete schema export.

For a new Supabase project, the simplest reproduction route is to apply:

```text
supabase/supabase-full-schema.sql
```

to a fresh Supabase project using the Supabase SQL Editor.

The ordered migration history is also retained under:

```text
supabase/migrations/
```

Database verification SQL is available under:

```text
supabase/tests/database/
```

After creating/configuring the Supabase project, place its project URL and publishable client key in `.env.local`.

> Use either the supplied full-schema export or the migration workflow to establish a fresh database. Do not apply both independently to the same already-initialised database unless you understand the resulting migration/schema state.

## 5. Run the Android Application Locally

For the most representative local Android run, use the native Android development build:

```bash
npm run android
```

The script invokes Expo's Android run command and can generate the native Android project when it is not already present.

Make sure either:

- an Android emulator is running, or
- an Android device is connected with USB debugging enabled.

For subsequent Metro development sessions, use:

```bash
npm start
```

The submitted release APK is the preferred route when the goal is simply to evaluate the finished application without setting up the development environment.

## Type Checking

```bash
npx tsc --noEmit
```

## Automated Tests

Run the full Jest regression suite with:

```bash
npx jest --runInBand
```

At the final verified pre-release checkpoint, the project passed:

```text
Test Suites: 63 passed, 63 total
Tests:       535 passed, 535 total
Snapshots:   0 total
```

The Jest configuration uses `jest-expo` so React Native/Expo unit and component tests can run without requiring a physical Android device.

The `supabase/tests/database/` directory contains additional SQL-level database tests and is separate from the Jest test count above.

## Hosted Supabase Integration Tests

In addition to the Jest regression suite, the repository contains Node-based
integration scripts under:

```text
scripts/security/
```

### Integration-test environment variables

The hosted Supabase integration scripts require the standard Supabase environment variables:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

They also require two dedicated confirmed Supabase test accounts:
```env
IHTIYAT_TEST_A_EMAIL=
IHTIYAT_TEST_A_PASSWORD=
IHTIYAT_TEST_B_EMAIL=
IHTIYAT_TEST_B_PASSWORD=

## Building a Release APK Locally

If a native `android/` directory has already been generated:

```powershell
cd android
.\gradlew.bat assembleRelease --max-workers=4 --no-daemon
```

The resulting APK is normally written to:

```text
android/app/build/outputs/apk/release/app-release.apk
```

The public repository intentionally does not track generated native/build output. Generate the Android project locally first with `npm run android` if required.

## Project Notes

- Android is the primary evaluated platform.
- English and Arabic are supported.
- Jeddah flash flooding is the implemented pilot context within the wider Saudi Arabia-focused application design.
- Preparedness progress is an application engagement/progress measure, not a guarantee or certification of household safety.
- Simulated alerts are used for demonstration and evaluation. Users should rely on official authorities and emergency services for real incidents.
- No private environment file, API secret, build cache or generated APK binary is committed to this repository. The evaluation APK is distributed separately through the link above.

## Licence

See `LICENSE` for the repository licence.
