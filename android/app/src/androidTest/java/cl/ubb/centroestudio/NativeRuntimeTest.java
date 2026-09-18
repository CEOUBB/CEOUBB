package cl.ubb.centroestudio;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static org.junit.Assert.*;

import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.util.Base64;
import android.webkit.WebView;
import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.getcapacitor.CapConfig;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.WebViewListener;
import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.internal.DefaultFirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;
import com.google.firebase.messaging.RemoteMessage;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.FutureTask;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class NativeRuntimeTest {
    private final Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    private ActivityScenario<MainActivity> scenario;

    @Before
    public void requireIsolatedPortal() {
        assertEquals("Sync with CAPACITOR_SERVER_URL=http://127.0.0.1:1 before running tests",
            "http://127.0.0.1:1", CapConfig.loadDefault(context).getServerUrl());
        assertNull("Disable external emulator networking before running tests",
            context.getSystemService(ConnectivityManager.class).getActiveNetwork());
        PushNotificationsPlugin.staticBridge = null;
        PushNotificationsPlugin.lastMessage = null;
    }

    @After
    public void closeActivityAndClearPushState() {
        if (scenario != null) scenario.close();
        PushNotificationsPlugin.staticBridge = null;
        PushNotificationsPlugin.lastMessage = null;
    }

    // Implements: REQ-ANDROID-TEST-02
    @Test
    public void applicationInstallsPlayIntegrityBeforeActivityStarts() {
        assertTrue(context.getApplicationContext() instanceof CEOUBBApplication);
        assertEquals("cl.ubb.centroestudio", context.getPackageName());
        assertEquals("centro-de-estudio-ubb", FirebaseApp.getInstance().getOptions().getProjectId());
        FirebaseAppCheck appCheck = FirebaseAppCheck.getInstance();
        assertTrue(appCheck instanceof DefaultFirebaseAppCheck);
        // Firebase exposes this test accessor; no reflection or token exchange is needed.
        assertSame(PlayIntegrityAppCheckProviderFactory.getInstance(),
            ((DefaultFirebaseAppCheck) appCheck).getInstalledAppCheckProviderFactory());
    }

    // Implements: REQ-ANDROID-TEST-01
    @Test
    public void bridgeDeliversLifecycleEventsAndSurvivesRecreation() throws Exception {
        launch();
        CapturedCall listener = listen("App", "appStateChange");
        scenario.moveToState(Lifecycle.State.CREATED);
        assertFalse(listener.awaitSuccess().getBoolean("isActive"));
        scenario.moveToState(Lifecycle.State.RESUMED);
        assertTrue(listener.awaitSuccess().getBoolean("isActive"));
        scenario.recreate();
        scenario.onActivity(activity -> {
            assertTrue(activity.getBridge().getApp().isActive());
            for (String plugin : new String[] {"App", "Filesystem", "PushNotifications", "FirebaseAuthentication"}) {
                assertNotNull(plugin, activity.getBridge().getPlugin(plugin));
            }
        });
        onView(isAssignableFrom(WebView.class)).check(matches(isDisplayed()));
    }

    // Implements: REQ-ANDROID-TEST-03
    @Test
    public void coldStartRetainsMessageUntilPushPluginLoads() throws Exception {
        RemoteMessage message = message("cold-start");
        new MessagingService().onMessageReceived(message);
        assertSame(message, PushNotificationsPlugin.lastMessage);
        launch();
        assertMessage(listen("PushNotifications", "pushNotificationReceived").awaitSuccess(), "cold-start");
        assertNull(PushNotificationsPlugin.lastMessage);
    }

    // Implements: REQ-ANDROID-TEST-03
    @Test
    public void backgroundMessageAndNotificationTapReachBridge() throws Exception {
        launch();
        CapturedCall received = listen("PushNotifications", "pushNotificationReceived");
        CapturedCall tapped = listen("PushNotifications", "pushNotificationActionPerformed");
        scenario.moveToState(Lifecycle.State.CREATED);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(
            () -> new MessagingService().onMessageReceived(message("background")));
        assertMessage(received.awaitSuccess(), "background");
        scenario.moveToState(Lifecycle.State.RESUMED);
        scenario.onActivity(activity -> InstrumentationRegistry.getInstrumentation().callActivityOnNewIntent(activity,
            new Intent(activity, MainActivity.class)
                .putExtra("google.message_id", "background")
                .putExtra("sectionId", "test-section")));
        JSObject action = tapped.awaitSuccess();
        assertEquals("tap", action.getString("actionId"));
        assertMessage(action.getJSObject("notification"), "background");
    }

    // Implements: REQ-ANDROID-TEST-04
    @Test
    public void downloadedCacheBytesSurviveActivityRecreation() throws Exception {
        launch();
        byte[] pdf = "%PDF-1.4\nCEO-75 offline fixture\n%%EOF\n".getBytes(StandardCharsets.UTF_8);
        String path = "ceo75-" + UUID.randomUUID() + ".pdf";
        File target = new File(context.getCacheDir(), path);
        try (ServerSocket server = new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"))) {
            server.setSoTimeout(10000);
            FutureTask<Void> response = new FutureTask<>(() -> {
                try (Socket client = server.accept()) {
                    client.setSoTimeout(10000);
                    BufferedReader request = new BufferedReader(new InputStreamReader(client.getInputStream(), StandardCharsets.US_ASCII));
                    assertEquals("GET /material.pdf HTTP/1.1", request.readLine());
                    String header;
                    while ((header = request.readLine()) != null && !header.isEmpty()) { }
                    client.getOutputStream().write(("HTTP/1.1 200 OK\r\nContent-Type: application/pdf\r\nContent-Length: "
                        + pdf.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
                    client.getOutputStream().write(pdf);
                    client.getOutputStream().flush();
                }
                return null;
            });
            Thread responder = new Thread(response, "ceo75-download-fixture");
            responder.setDaemon(true);
            responder.start();
            JSObject downloaded = invoke("Filesystem", "downloadFile", new JSObject()
                .put("url", "http://127.0.0.1:" + server.getLocalPort() + "/material.pdf")
                .put("path", path).put("directory", "CACHE")
                .put("connectTimeout", 5000).put("readTimeout", 5000)).awaitSuccess();
            response.get(10, TimeUnit.SECONDS);
            assertEquals(target.getCanonicalPath(), new File(downloaded.getString("path")).getCanonicalPath());
            assertArrayEquals(pdf, Files.readAllBytes(target.toPath()));
            scenario.recreate();
            JSObject read = invoke("Filesystem", "readFile", new JSObject()
                .put("path", path).put("directory", "CACHE")).awaitSuccess();
            assertArrayEquals(pdf, Base64.decode(read.getString("data"), Base64.DEFAULT));
        } finally {
            Files.deleteIfExists(target.toPath());
        }
    }

    // Implements: REQ-ANDROID-TEST-04
    @Test
    public void failedDownloadRejectsWithoutDestroyingCachedMaterial() throws Exception {
        launch();
        String path = "ceo75-" + UUID.randomUUID() + ".pdf";
        File target = new File(context.getCacheDir(), path);
        byte[] cached = "previous offline material".getBytes(StandardCharsets.UTF_8);
        Files.write(target.toPath(), cached);
        try {
            CapturedCall call = invoke("Filesystem", "downloadFile", new JSObject()
                .put("url", "http://127.0.0.1:1/unavailable.pdf")
                .put("path", path).put("directory", "CACHE")
                .put("connectTimeout", 2000).put("readTimeout", 2000));
            assertTrue(call.awaitResult().has("error"));
            assertArrayEquals(cached, Files.readAllBytes(target.toPath()));
        } finally {
            Files.deleteIfExists(target.toPath());
        }
    }

    // Implements: REQ-ANDROID-TEST-04
    @Test
    public void missingCachedFileRejectsInsteadOfResolving() throws Exception {
        launch();
        CapturedCall call = invoke("Filesystem", "readFile", new JSObject()
            .put("path", "missing-" + UUID.randomUUID() + ".pdf").put("directory", "CACHE"));
        assertTrue(call.awaitResult().has("error"));
    }

    // Implements: REQ-ANDROID-TEST-04
    @Test
    public void unavailablePortalShowsPackagedFallbackAfterRecreation() throws Exception {
        assertEquals("index.html", CapConfig.loadDefault(context).getErrorPath());
        launch();
        scenario.recreate();
        awaitOfflinePage();
    }

    private void launch() throws Exception {
        scenario = ActivityScenario.launch(MainActivity.class);
        // Capacitor resets listeners on navigation; subscribe only after the fallback loads.
        awaitOfflinePage();
    }

    private CapturedCall listen(String plugin, String event) {
        return invoke(plugin, "addListener", new JSObject().put("eventName", event));
    }

    private CapturedCall invoke(String plugin, String method, JSObject data) {
        CapturedCall call = new CapturedCall(plugin, method, data);
        scenario.onActivity(activity -> {
            try {
                assertNotNull(plugin, activity.getBridge().getPlugin(plugin));
                activity.getBridge().getPlugin(plugin).invoke(method, call);
            } catch (Exception error) {
                throw new AssertionError(plugin + "." + method, error);
            }
        });
        return call;
    }

    private static RemoteMessage message(String id) {
        return new RemoteMessage.Builder("test-sender").setMessageId(id)
            .addData("sectionId", "test-section").build();
    }

    private static void assertMessage(JSObject payload, String id) {
        assertNotNull(payload);
        assertEquals(id, payload.getString("id"));
        assertEquals("test-section", payload.getJSObject("data").getString("sectionId"));
    }

    private void awaitOfflinePage() throws Exception {
        CountDownLatch loaded = new CountDownLatch(1);
        AtomicReference<WebViewListener> observer = new AtomicReference<>();
        scenario.onActivity(activity -> {
            WebViewListener listener = new WebViewListener() {
                @Override
                public void onPageLoaded(WebView view) {
                    if (activity.getBridge().getErrorUrl().equals(view.getUrl()) && view.getProgress() == 100) {
                        loaded.countDown();
                    }
                }
            };
            observer.set(listener);
            activity.getBridge().addWebViewListener(listener);
            listener.onPageLoaded(activity.getBridge().getWebView());
        });
        try {
            assertTrue("Bundled offline page did not finish loading", loaded.await(15, TimeUnit.SECONDS));
        } finally {
            scenario.onActivity(activity -> activity.getBridge().removeWebViewListener(observer.get()));
        }
        CountDownLatch evaluated = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
            "document.readyState === 'complete' && document.querySelector('h1')?.textContent === 'Sin conexión' && "
                + "document.querySelector('button')?.textContent === 'Reintentar' && "
                + "document.body.textContent.includes('Plataforma estudiantil independiente')",
            text -> { value.set(text); evaluated.countDown(); }));
        assertTrue("WebView evaluation timed out", evaluated.await(5, TimeUnit.SECONDS));
        assertEquals("Bundled offline page did not render", "true", value.get());
    }

    // Capture native bridge replies, leaving production plugin code untouched.
    private static final class CapturedCall extends PluginCall {
        private final BlockingQueue<JSObject> replies = new LinkedBlockingQueue<>();

        CapturedCall(String plugin, String method, JSObject data) {
            super(null, plugin, UUID.randomUUID().toString(), method, data);
        }

        @Override
        public void resolve(JSObject data) {
            replies.add(new JSObject().put("data", data == null ? new JSObject() : data));
        }

        @Override
        public void resolve() {
            resolve(new JSObject());
        }

        @Override
        public void reject(String message, String code, Exception error, JSObject data) {
            replies.add(new JSObject().put("error", message).put("code", code));
        }

        JSObject awaitResult() throws InterruptedException {
            JSObject result = replies.poll(10, TimeUnit.SECONDS);
            assertNotNull("Native callback timed out: " + getPluginId() + "." + getMethodName(), result);
            return result;
        }

        JSObject awaitSuccess() throws InterruptedException {
            JSObject result = awaitResult();
            assertFalse(result.toString(), result.has("error"));
            return result.getJSObject("data");
        }
    }
}
