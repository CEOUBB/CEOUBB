package cl.ubb.centroestudio;

import android.app.Activity;
import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.os.Build;
import android.content.pm.PackageManager;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String ASSET_ROOT = "www/";
    private static final String START_URL = "file:///android_asset/www/index.html";
    private WebView webView;
    private ClassroomService classroom;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(18, 9, 13));
        getWindow().setNavigationBarColor(Color.rgb(18, 9, 13));
        getWindow().getDecorView().setSystemUiVisibility(0);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(18, 9, 13));
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(0, insets.getSystemWindowInsetTop(), 0, insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setBlockNetworkLoads(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);

        webView.addJavascriptInterface(new StudyBridge(), "StudyBridge");
        classroom = new ClassroomService(this, webView);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(Uri.parse(url));
            }
        });
        webView.loadUrl(startUrl(getIntent()));
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 8042);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (webView != null) webView.loadUrl(startUrl(intent));
    }

    private String startUrl(Intent intent) {
        Uri data = intent == null ? null : intent.getData();
        String course = intent == null ? null : intent.getStringExtra("course");
        if (data != null && "estatica".equals(data.getQueryParameter("course"))) course = "estatica";
        return "estatica".equals(course) ? START_URL + "?course=estatica" : START_URL;
    }

    private boolean handleUrl(Uri uri) {
        String url = uri.toString();
        String prefix = "file:///android_asset/www/";
        if (url.startsWith(prefix) && !url.equals(START_URL)) {
            new StudyBridge().openAsset(Uri.decode(url.substring(prefix.length())));
            return true;
        }
        if (!url.equals(START_URL)) {
            Toast.makeText(this, "La app funciona sin conexión y no abre enlaces externos.", Toast.LENGTH_LONG).show();
            return true;
        }
        return false;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (classroom != null) classroom.destroy();
        if (webView != null) {
            webView.removeJavascriptInterface("StudyBridge");
            webView.destroy();
        }
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (classroom != null) classroom.onActivityResult(requestCode, resultCode, data);
    }

    private final class StudyBridge {
        @JavascriptInterface
        public void openAsset(String path) {
            runOnUiThread(() -> openBundledFile(path));
        }

        @JavascriptInterface
        public void askTutor(String prompt) {
            runOnUiThread(() -> openTutor(prompt));
        }

        @JavascriptInterface
        public void classroomReady() {
            runOnUiThread(() -> classroom.onPageReady());
        }

        @JavascriptInterface
        public void signInWithGoogle() {
            runOnUiThread(() -> classroom.signInWithGoogle());
        }

        @JavascriptInterface
        public void signOut() {
            runOnUiThread(() -> classroom.signOut());
        }

        @JavascriptInterface
        public void deleteAccount() {
            runOnUiThread(() -> classroom.deleteAccount());
        }

        @JavascriptInterface
        public void requestTeacherAccess() {
            runOnUiThread(() -> classroom.requestTeacherAccess());
        }

        @JavascriptInterface
        public void setUserRole(String uid, String role) {
            runOnUiThread(() -> classroom.setUserRole(uid, role));
        }

        @JavascriptInterface
        public void publishDrivePost(String title, String body, String url, String kind) {
            runOnUiThread(() -> classroom.publishDrivePost(title, body, url, kind));
        }

        @JavascriptInterface
        public void beginFilePost(String title, String body, String kind) {
            runOnUiThread(() -> classroom.beginFilePost(title, body, kind));
        }

        @JavascriptInterface
        public void deleteClassPost(String postId) {
            runOnUiThread(() -> classroom.deletePost(postId));
        }

        @JavascriptInterface
        public void updateEstaticaProgress(int completed, int total) {
            runOnUiThread(() -> classroom.updateProgress(completed, total));
        }

        @JavascriptInterface
        public void openExternal(String url) {
            runOnUiThread(() -> openExternalUrl(url));
        }
    }

    private void openExternalUrl(String url) {
        if (url == null || (!url.startsWith("https://") && !url.startsWith("http://"))) {
            Toast.makeText(this, "Enlace no válido.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "No hay una aplicación disponible para abrir el enlace.", Toast.LENGTH_LONG).show();
        }
    }

    private void openTutor(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            Toast.makeText(this, "Escribe una duda para el tutor.", Toast.LENGTH_LONG).show();
            return;
        }
        if (!isOnline()) {
            Toast.makeText(this, "No hay internet. El contenido, las pistas y las soluciones siguen disponibles sin conexión.", Toast.LENGTH_LONG).show();
            return;
        }
        Intent chatGpt = new Intent(Intent.ACTION_SEND);
        chatGpt.setType("text/plain");
        chatGpt.putExtra(Intent.EXTRA_TEXT, prompt);
        chatGpt.setPackage("com.openai.chatgpt");
        try {
            startActivity(chatGpt);
        } catch (ActivityNotFoundException error) {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            clipboard.setPrimaryClip(ClipData.newPlainText("Duda para ChatGPT", prompt));
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://chatgpt.com")));
                Toast.makeText(this, "Duda copiada. Pégala en ChatGPT.", Toast.LENGTH_LONG).show();
            } catch (ActivityNotFoundException browserError) {
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("text/plain");
                share.putExtra(Intent.EXTRA_TEXT, prompt);
                startActivity(Intent.createChooser(share, "Enviar duda al tutor"));
            }
        }
    }

    private boolean isOnline() {
        ConnectivityManager manager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        Network network = manager.getActiveNetwork();
        if (network == null) return false;
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private void openBundledFile(String path) {
        String cleanPath = normalizeAssetPath(path);
        if (cleanPath == null) {
            Toast.makeText(this, "No se pudo abrir ese archivo.", Toast.LENGTH_LONG).show();
            return;
        }
        String extension = extensionOf(cleanPath);
        if (isTextExtension(extension)) {
            showTextAsset(cleanPath);
            return;
        }
        try {
            File file = copyAssetToCache(cleanPath);
            Uri uri = Uri.parse("content://cl.ubb.centroestudio.files/shared/" + Uri.encode(file.getName()));
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, mimeTypeFor(extension));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(intent);
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "Instala un visor compatible para abrir este tipo de archivo.", Toast.LENGTH_LONG).show();
        } catch (IOException error) {
            Toast.makeText(this, "No fue posible preparar el archivo.", Toast.LENGTH_LONG).show();
        }
    }

    private String normalizeAssetPath(String path) {
        if (path == null) return null;
        String clean = Uri.decode(path).replace('\\', '/');
        while (clean.startsWith("./")) clean = clean.substring(2);
        if (clean.isEmpty() || clean.startsWith("/") || clean.contains("../") || clean.equals("..")) return null;
        return clean;
    }

    private void showTextAsset(String cleanPath) {
        try (InputStream input = getAssets().open(ASSET_ROOT + cleanPath)) {
            String content = new String(readAll(input), StandardCharsets.UTF_8);
            String title = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
            boolean markdown = extensionOf(cleanPath).equals("md");
            String body = markdown ? markdownToHtml(content) : "<pre>" + escapeHtml(content) + "</pre>";
            String mathAssets = markdown ? "<link rel=\"stylesheet\" href=\"assets/vendor/katex/katex.min.css\"><script src=\"assets/vendor/katex/katex.min.js\"></script><script src=\"assets/vendor/katex/contrib/auto-render.min.js\"></script>" : "";
            String mathStart = markdown ? "<script>document.addEventListener('DOMContentLoaded',function(){renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false,ignoredTags:['script','noscript','style','textarea','pre','code']});});</script>" : "";
            String html = "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>" + escapeHtml(title) + "</title>" + mathAssets + "<style>html{background:#12090d;color:#f7eef1;font-family:system-ui,sans-serif}body{margin:0;padding:22px;line-height:1.65}header{position:sticky;top:0;z-index:2;background:#12090df2;border-bottom:2px solid #8f1738;padding:10px 0 14px;margin-bottom:18px}header h1{font-size:1.05rem;margin:0;color:#f1b8c8}h1,h2,h3{color:#ffd7e2;line-height:1.25}h1{font-size:1.65rem}h2{font-size:1.3rem;margin-top:1.8em}h3{font-size:1.1rem}p{color:#eadde2}li{margin:.38em 0}code{background:#2a151e;color:#ffc2d3;padding:.12em .35em;border-radius:.3em}pre{font:.94rem/1.62 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#0c080a;border:1px solid #3c222c;padding:14px;border-radius:10px}.katex-display{overflow-x:auto;overflow-y:hidden;padding:8px 2px}.katex{color:#fff8fa}</style></head><body><header><h1>" + escapeHtml(title) + "</h1></header>" + body + mathStart + "</body></html>";
            webView.loadDataWithBaseURL("file:///android_asset/www/", html, "text/html", "UTF-8", null);
        } catch (IOException error) {
            Toast.makeText(this, "No fue posible leer el archivo.", Toast.LENGTH_LONG).show();
        }
    }

    private String markdownToHtml(String markdown) {
        StringBuilder html = new StringBuilder();
        String listTag = "";
        boolean codeBlock = false;
        for (String line : markdown.split("\\R", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("```")) {
                if (!listTag.isEmpty()) {
                    html.append("</").append(listTag).append(">");
                    listTag = "";
                }
                html.append(codeBlock ? "</code></pre>" : "<pre><code>");
                codeBlock = !codeBlock;
                continue;
            }
            if (codeBlock) {
                html.append(escapeHtml(line)).append('\n');
                continue;
            }
            if (trimmed.isEmpty()) {
                if (!listTag.isEmpty()) {
                    html.append("</").append(listTag).append(">");
                    listTag = "";
                }
                continue;
            }
            int headingLevel = 0;
            while (headingLevel < trimmed.length() && headingLevel < 4 && trimmed.charAt(headingLevel) == '#') headingLevel++;
            if (headingLevel > 0 && headingLevel < trimmed.length() && trimmed.charAt(headingLevel) == ' ') {
                if (!listTag.isEmpty()) {
                    html.append("</").append(listTag).append(">");
                    listTag = "";
                }
                html.append("<h").append(headingLevel).append(">").append(inlineMarkdown(trimmed.substring(headingLevel + 1))).append("</h").append(headingLevel).append(">");
                continue;
            }
            boolean unordered = trimmed.startsWith("- ");
            boolean ordered = trimmed.matches("^\\d+\\.\\s+.*");
            if (unordered || ordered) {
                String targetTag = unordered ? "ul" : "ol";
                if (!targetTag.equals(listTag)) {
                    if (!listTag.isEmpty()) html.append("</").append(listTag).append(">");
                    html.append("<").append(targetTag).append(">");
                    listTag = targetTag;
                }
                String item = unordered ? trimmed.substring(2) : trimmed.replaceFirst("^\\d+\\.\\s+", "");
                html.append("<li>").append(inlineMarkdown(item)).append("</li>");
                continue;
            }
            if (!listTag.isEmpty()) {
                html.append("</").append(listTag).append(">");
                listTag = "";
            }
            html.append("<p>").append(inlineMarkdown(trimmed)).append("</p>");
        }
        if (!listTag.isEmpty()) html.append("</").append(listTag).append(">");
        if (codeBlock) html.append("</code></pre>");
        return html.toString();
    }

    private String inlineMarkdown(String value) {
        return escapeHtml(value)
                .replaceAll("\\*\\*(.+?)\\*\\*", "<strong>$1</strong>")
                .replaceAll("`([^`]+)`", "<code>$1</code>")
                .replaceAll("\\*([^*]+)\\*", "<em>$1</em>");
    }

    private File copyAssetToCache(String cleanPath) throws IOException {
        File shared = new File(getCacheDir(), "shared");
        if (!shared.exists() && !shared.mkdirs()) throw new IOException("No se pudo crear el directorio temporal");
        String originalName = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
        String safeName = Integer.toHexString(cleanPath.hashCode()) + "_" + originalName.replaceAll("[^\\p{L}\\p{N}._-]", "_");
        File target = new File(shared, safeName);
        if (!target.exists()) {
            try (InputStream input = getAssets().open(ASSET_ROOT + cleanPath); FileOutputStream output = new FileOutputStream(target)) {
                byte[] buffer = new byte[32768];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            }
        }
        return target;
    }

    private byte[] readAll(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[16384];
        int count;
        while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
        return output.toByteArray();
    }

    private String extensionOf(String path) {
        int dot = path.lastIndexOf('.');
        return dot >= 0 ? path.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }

    private boolean isTextExtension(String extension) {
        return extension.equals("md") || extension.equals("txt") || extension.equals("m") || extension.equals("csv") || extension.equals("tsv") || extension.equals("json") || extension.equals("html") || extension.equals("htm");
    }

    private String mimeTypeFor(String extension) {
        if (extension.equals("pdf")) return "application/pdf";
        if (extension.equals("doc")) return "application/msword";
        if (extension.equals("docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (extension.equals("xls")) return "application/vnd.ms-excel";
        if (extension.equals("xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (extension.equals("ppt")) return "application/vnd.ms-powerpoint";
        if (extension.equals("pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        if (extension.equals("zip")) return "application/zip";
        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        return mime == null ? "application/octet-stream" : mime;
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }
}
