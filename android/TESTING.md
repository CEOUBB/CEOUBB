# Android regression tests (CEO-75)

The app reuses JUnit 4.13.2, AndroidX Test, and Espresso already declared in
`app/build.gradle`. No Robolectric, Mockito, or production test hooks are needed.

## Run

Prerequisites: pnpm dependencies, JDK 21, Android SDK 36, and an API 35 or 36 emulator
with a WebView installed. Use a disposable emulator, with Wi-Fi and mobile data
disabled, so Firebase initialization cannot reach external services. Loopback
remains available for the download fixture. Do not run against a personal device.

From the repository root in PowerShell:

```powershell
$env:CAPACITOR_SERVER_URL = 'http://127.0.0.1:1'
pnpm exec cap sync android
adb shell cmd connectivity airplane-mode enable
adb shell svc wifi disable
adb shell svc data disable
./android/gradlew.bat -p android :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug
./android/gradlew.bat -p android :app:connectedDebugAndroidTest
```

On Linux, prefix the sync command with `CAPACITOR_SERVER_URL=http://127.0.0.1:1`
and use `./android/gradlew -p android` in place of the batch file. The port is
intentionally unreachable: Capacitor must load its real packaged error page.
The instrumented suite fails immediately if the test override is absent.

Restore the normal portal assets before regular development or release builds:

```powershell
Remove-Item Env:CAPACITOR_SERVER_URL
pnpm exec cap sync android
```

## Coverage and limits

| Suite | Assertions |
| --- | --- |
| JVM `AppStateTest` | State changes precede callback delivery; listener detachment and replacement do not retain the old activity listener. |
| Instrumented `NativeRuntimeTest` | Manifest application and Firebase identity; installed Play Integrity factory; real activity stop/resume/recreation; required plugin registration and visible WebView; synthetic cold/background FCM data and notification taps; loopback PDF download into cache and readback after recreation; failed downloads preserve existing cache; missing-file rejection; rendered offline page after recreation. |

Native callback capture substitutes only the JavaScript response destination.
The app, activity, messaging service, registered plugins, Android filesystem,
and offline WebView are real. The suite does not claim to test Google's FCM
transport, Play Integrity attestation, process-death delivery, TypeScript document
opening, or permanent offline library storage. `Directory.Cache` is replaceable
by Android; only activity recreation persistence is required here.

The Play Integrity assertion uses Firebase's `@VisibleForTesting` accessor on
`DefaultFirebaseAppCheck`; dependency upgrades must keep this assertion valid.
See [Firebase initialization](https://firebase.google.com/docs/app-check/android/play-integrity-provider)
and [ActivityScenario](https://developer.android.com/reference/androidx/test/core/app/ActivityScenario).

## CI and reports

`.github/workflows/android-ci.yml` builds the debug and test APKs, runs JVM tests
and lint, then executes instrumentation on an API 36 emulator with external
network disabled. Every failing Gradle task fails the job. The always-run
`android-test-reports` artifact includes:

- `app/build/reports/` (JUnit HTML, instrumented HTML, Android lint).
- `app/build/test-results/` (JVM XML).
- `app/build/outputs/androidTest-results/` (connected-device results).

The original arithmetic and wrong-package scaffold tests are replaced, not
retained as false coverage. Existing locked web tests are unchanged.

## Verification evidence (2026-09-18)

- `:app:testDebugUnitTest`: 3 tests, no failures or skips.
- `:app:assembleDebug` and `:app:assembleDebugAndroidTest`: successful.
- `:app:lintDebug`: successful, 0 errors and 33 existing manifest/resource/dependency warnings.
- `:app:connectedDebugAndroidTest`: 8 tests passed on the local API 35 Pixel 8 emulator, no failures or skips. CI targets API 36.
- Initial instrumented failures exposed test setup races: navigation cleared early plugin listeners, and JavaScript evaluation during navigation lost its callback. Waiting on the real Capacitor page-load event before listener registration/evaluation resolved both failures without changing production code or relaxing assertions/timeouts.
- The normal production portal configuration was restored after local instrumentation.
