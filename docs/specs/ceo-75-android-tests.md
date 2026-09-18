# CEO-75: Native Android regression tests

## Scope and authorization

The user requested implementation of CEO-75 and a pull request. Its three objectives authorize the test harness, native integration coverage, and CI execution below. Reuse the installed JUnit and AndroidX/Espresso dependencies; do not add production abstractions or a second test framework.

## Requirements and acceptance

- **REQ-ANDROID-TEST-01:** WHEN the native app changes lifecycle state, the harness SHALL verify state notifications and listener cleanup with JVM JUnit tests, and pause/resume/recreation with the real `MainActivity` on Android.
  - GIVEN an active bridge, WHEN the activity stops and resumes, THEN listeners receive false and true, and recreation creates a working bridge with the required plugins.
- **REQ-ANDROID-TEST-02:** WHEN `CEOUBBApplication` starts, the instrumented suite SHALL verify the default Firebase app and installed Play Integrity factory without requesting attestation tokens.
  - GIVEN the manifest application, WHEN Android starts it, THEN Firebase App Check uses `PlayIntegrityAppCheckProviderFactory`.
- **REQ-ANDROID-TEST-03:** WHEN FCM messages arrive before bridge startup or while backgrounded, the suite SHALL verify payload retention/delivery and notification-tap forwarding.
  - GIVEN a synthetic FCM message, WHEN the real messaging service receives it, THEN the native plugin delivers its ID and data to a registered listener, including after a cold bridge start.
- **REQ-ANDROID-TEST-04:** WHEN material is downloaded to app cache, the suite SHALL verify native plugin bytes, readback after activity recreation, and rejection of missing files. WHEN the portal is unavailable, the packaged offline page SHALL remain usable after recreation.
  - GIVEN a loopback HTTP fixture, WHEN Filesystem downloads a PDF, THEN the result lies in app cache and readback matches the source bytes after recreation.
  - GIVEN the unreachable test portal, WHEN the activity starts and is recreated, THEN the WebView displays the bundled offline page.
- **REQ-ANDROID-TEST-05:** WHEN Android CI runs, it SHALL build, lint, execute JVM and emulator tests, fail on test errors, and upload reports even on failure.

## Boundaries

The tests exercise production native classes and installed plugins. A test-only loopback portal override and offline emulator isolate them from the deployed portal. No Play Integrity token exchange, real FCM delivery, institutional login, or production backend is needed. Native file cache survives activity recreation but is replaceable under storage pressure; this issue does not introduce a persistent offline academic library. Synthetic FCM tests cover service-to-plugin integration, not transport by Google or delivery after OS process termination.

## Execution and handoff

See [Android test instructions](../../android/TESTING.md) for commands, prerequisites, coverage, and verification evidence.
