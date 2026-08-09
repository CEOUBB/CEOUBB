package cl.ubb.centroestudio;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.CancellationSignal;
import android.provider.OpenableColumns;
import android.webkit.WebView;

import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.gms.tasks.Task;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.Timestamp;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import com.google.firebase.firestore.SetOptions;
import com.google.firebase.functions.FirebaseFunctions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageMetadata;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executor;

public final class ClassroomService {
    public static final int FILE_PICKER_REQUEST = 8031;
    private static final String COURSE_ID = "estatica";
    private static final long MAX_FILE_BYTES = 50L * 1024L * 1024L;
    private final Activity activity;
    private final WebView webView;
    private final Executor mainExecutor;
    private final CredentialManager credentialManager;
    private final String ownerEmail;
    private boolean configured;
    private FirebaseAuth auth;
    private FirebaseFirestore db;
    private FirebaseFunctions functions;
    private FirebaseStorage storage;
    private String currentRole = "offline";
    private ListenerRegistration profileListener;
    private ListenerRegistration postsListener;
    private ListenerRegistration progressListener;
    private ListenerRegistration usersListener;
    private String pendingTitle;
    private String pendingBody;
    private String pendingKind;

    public ClassroomService(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.mainExecutor = activity.getMainExecutor();
        this.credentialManager = CredentialManager.create(activity);
        this.ownerEmail = activity.getString(R.string.firebase_owner_email).trim().toLowerCase(Locale.ROOT);
        initializeFirebase();
    }

    private void initializeFirebase() {
        String apiKey = activity.getString(R.string.firebase_api_key).trim();
        String appId = activity.getString(R.string.firebase_app_id).trim();
        String projectId = activity.getString(R.string.firebase_project_id).trim();
        String bucket = activity.getString(R.string.firebase_storage_bucket).trim();
        configured = !apiKey.isEmpty() && !appId.isEmpty() && !projectId.isEmpty();
        if (!configured) return;
        FirebaseApp app;
        if (FirebaseApp.getApps(activity).isEmpty()) {
            FirebaseOptions.Builder builder = new FirebaseOptions.Builder()
                    .setApiKey(apiKey)
                    .setApplicationId(appId)
                    .setProjectId(projectId);
            if (!bucket.isEmpty()) builder.setStorageBucket(bucket);
            app = FirebaseApp.initializeApp(activity, builder.build());
        } else {
            app = FirebaseApp.getApps(activity).get(0);
        }
        if (app == null) {
            configured = false;
            return;
        }
        auth = FirebaseAuth.getInstance(app);
        db = FirebaseFirestore.getInstance(app);
        functions = FirebaseFunctions.getInstance(app, "southamerica-west1");
        if (!bucket.isEmpty()) storage = FirebaseStorage.getInstance(app);
        auth.addAuthStateListener(firebaseAuth -> {
            FirebaseUser user = firebaseAuth.getCurrentUser();
            if (user == null) {
                currentRole = "signed_out";
                updateNotificationTopic();
                stopListeners();
                emitAuthState();
            } else {
                ensureUserProfile(user);
            }
        });
    }

    public void onPageReady() {
        emitAuthState();
        if (configured && auth != null && auth.getCurrentUser() != null) ensureUserProfile(auth.getCurrentUser());
    }

    public void signInWithGoogle() {
        if (!configured) {
            emitError("El backend de la beta todavía no está activado.");
            return;
        }
        String webClientId = activity.getString(R.string.firebase_web_client_id).trim();
        if (webClientId.isEmpty()) {
            emitError("Falta completar la credencial de Google del proyecto Firebase.");
            return;
        }
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(webClientId).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(option)
                .build();
        credentialManager.getCredentialAsync(
                activity,
                request,
                new CancellationSignal(),
                mainExecutor,
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse result) {
                        handleGoogleCredential(result.getCredential());
                    }

                    @Override
                    public void onError(GetCredentialException error) {
                        emitError("Google no pudo mostrar el selector de cuentas. Actualiza Servicios de Google Play e inténtalo nuevamente.");
                    }
                }
        );
    }

    private void handleGoogleCredential(Credential credential) {
        if (!(credential instanceof CustomCredential)
                || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
            emitError("Google no devolvió una cuenta válida.");
            return;
        }
        try {
            GoogleIdTokenCredential googleCredential = GoogleIdTokenCredential.createFrom(((CustomCredential) credential).getData());
            AuthCredential firebaseCredential = GoogleAuthProvider.getCredential(googleCredential.getIdToken(), null);
            auth.signInWithCredential(firebaseCredential).addOnCompleteListener(activity, task -> {
                if (task.isSuccessful() && auth.getCurrentUser() != null) {
                    ensureUserProfile(auth.getCurrentUser());
                } else {
                    emitError("Firebase rechazó el inicio de sesión.");
                }
            });
        } catch (Exception error) {
            emitError("La credencial de Google no pudo verificarse.");
        }
    }

    public void signOut() {
        if (!configured || auth == null) return;
        auth.signOut();
        credentialManager.clearCredentialStateAsync(
                new ClearCredentialStateRequest(),
                new CancellationSignal(),
                mainExecutor,
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override
                    public void onResult(Void result) {
                        emitAuthState();
                    }

                    @Override
                    public void onError(ClearCredentialException error) {
                        emitAuthState();
                    }
                }
        );
    }

    public void deleteAccount() {
        FirebaseUser user = currentUser();
        if (!configured || user == null || functions == null) {
            emitError("Debes iniciar sesión para eliminar tu cuenta.");
            return;
        }
        functions.getHttpsCallable("deleteMyAccount").call()
                .addOnSuccessListener(result -> {
                    stopListeners();
                    currentRole = "signed_out";
                    emitMessage("Tu cuenta y sus datos fueron eliminados.");
                    emitAuthState();
                })
                .addOnFailureListener(error -> emitError("No se pudo eliminar la cuenta. Vuelve a iniciar sesión e inténtalo nuevamente."));
    }

    private void ensureUserProfile(FirebaseUser user) {
        DocumentReference reference = db.collection("users").document(user.getUid());
        reference.get().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) {
                emitError("No se pudo cargar el perfil.");
                return;
            }
            DocumentSnapshot snapshot = task.getResult();
            String initialRole = determineInitialRole(user.getEmail());
            if ("blocked".equals(initialRole)) {
                auth.signOut();
                currentRole = "signed_out";
                emitError("Solo puedes iniciar sesión con tu correo institucional UBB: @alumnos.ubiobio.cl o @ubiobio.cl.");
                emitAuthState();
                return;
            }
            String role = snapshot != null && snapshot.exists() ? snapshot.getString("role") : initialRole;
            if ("owner".equals(initialRole)) role = initialRole;
            if (role == null || role.isBlank()) role = initialRole;
            Map<String, Object> profile = new HashMap<>();
            profile.put("uid", user.getUid());
            profile.put("displayName", safe(user.getDisplayName()));
            profile.put("email", safe(user.getEmail()).toLowerCase(Locale.ROOT));
            profile.put("photoUrl", user.getPhotoUrl() == null ? "" : user.getPhotoUrl().toString());
            profile.put("domain", emailDomain(user.getEmail()));
            profile.put("role", role);
            profile.put("lastSeen", FieldValue.serverTimestamp());
            if (snapshot == null || !snapshot.exists()) {
                profile.put("teacherRequested", false);
                profile.put("createdAt", FieldValue.serverTimestamp());
            }
            currentRole = role;
            reference.set(profile, SetOptions.merge()).addOnCompleteListener(write -> {
                if (!write.isSuccessful()) {
                    emitError("Tu cuenta entró, pero no se pudo crear el perfil.");
                    return;
                }
                startProfileListener(reference);
                emitAuthState();
            });
        });
    }

    private String determineInitialRole(String emailValue) {
        String email = safe(emailValue).toLowerCase(Locale.ROOT);
        if (email.equals(ownerEmail)) return "owner";
        if (email.endsWith("@alumnos.ubiobio.cl")) return "student";
        if (email.endsWith("@ubiobio.cl")) return "teacher";
        return "blocked";
    }

    private void startProfileListener(DocumentReference reference) {
        if (profileListener != null) profileListener.remove();
        profileListener = reference.addSnapshotListener((snapshot, error) -> {
            if (error != null || snapshot == null || !snapshot.exists()) return;
            String updatedRole = snapshot.getString("role");
            if (updatedRole != null && !updatedRole.equals(currentRole)) currentRole = updatedRole;
            updateNotificationTopic();
            emitAuthState();
            startDataListeners();
        });
    }

    private void startDataListeners() {
        if (postsListener != null) postsListener.remove();
        if (progressListener != null) progressListener.remove();
        if (usersListener != null) usersListener.remove();
        progressListener = null;
        usersListener = null;
        if (!isCourseMember()) {
            emit("posts", jsonWithArray("items", new JSONArray()));
            return;
        }
        postsListener = db.collection("courses").document(COURSE_ID).collection("posts")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(100)
                .addSnapshotListener((snapshots, error) -> {
                    if (error != null) {
                        emitError("No se pudieron sincronizar las publicaciones.");
                        return;
                    }
                    JSONArray items = new JSONArray();
                    if (snapshots != null) {
                        for (QueryDocumentSnapshot document : snapshots) items.put(postJson(document));
                    }
                    emit("posts", jsonWithArray("items", items));
                });
        if (canTeach()) {
            progressListener = db.collection("courses").document(COURSE_ID).collection("progress")
                    .orderBy("lastSeen", Query.Direction.DESCENDING)
                    .limit(200)
                    .addSnapshotListener((snapshots, error) -> {
                        if (error != null) return;
                        JSONArray items = new JSONArray();
                        if (snapshots != null) {
                            for (QueryDocumentSnapshot document : snapshots) items.put(progressJson(document));
                        }
                        emit("monitoring", jsonWithArray("items", items));
                    });
        }
        if ("owner".equals(currentRole)) {
            usersListener = db.collection("users").orderBy("displayName").limit(300)
                    .addSnapshotListener((snapshots, error) -> {
                        if (error != null) return;
                        JSONArray items = new JSONArray();
                        if (snapshots != null) {
                            for (QueryDocumentSnapshot document : snapshots) items.put(userJson(document));
                        }
                        emit("users", jsonWithArray("items", items));
                    });
        }
    }

    public void requestTeacherAccess() {
        FirebaseUser user = currentUser();
        if (user == null) return;
        if (!safe(user.getEmail()).toLowerCase(Locale.ROOT).endsWith("@ubiobio.cl")) {
            emitError("El acceso docente requiere un correo @ubiobio.cl.");
            return;
        }
        Map<String, Object> update = new HashMap<>();
        update.put("teacherRequested", true);
        update.put("requestedAt", FieldValue.serverTimestamp());
        db.collection("users").document(user.getUid()).set(update, SetOptions.merge())
                .addOnSuccessListener(unused -> emitMessage("Solicitud docente enviada al desarrollador."))
                .addOnFailureListener(error -> emitError("No se pudo enviar la solicitud docente."));
    }

    public void setUserRole(String uid, String role) {
        if (!"owner".equals(currentRole)) {
            emitError("Solo el desarrollador puede cambiar roles.");
            return;
        }
        if (!role.equals("student") && !role.equals("teacher") && !role.equals("pending_teacher") && !role.equals("suspended")) {
            emitError("Ese rol no es válido.");
            return;
        }
        Map<String, Object> update = new HashMap<>();
        update.put("role", role);
        update.put("teacherRequested", false);
        update.put("roleUpdatedAt", FieldValue.serverTimestamp());
        update.put("roleUpdatedBy", currentUser().getUid());
        db.collection("users").document(uid).update(update)
                .addOnSuccessListener(unused -> emitMessage("Rol actualizado."))
                .addOnFailureListener(error -> emitError("No se pudo actualizar el rol."));
    }

    public void publishDrivePost(String title, String body, String url, String kind) {
        if (!canTeach()) {
            emitError("Tu cuenta no tiene permiso para publicar.");
            return;
        }
        String cleanUrl = safe(url).trim();
        if (!cleanUrl.isEmpty() && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("http://")) {
            emitError("El enlace debe comenzar con https://");
            return;
        }
        publishPost(title, body, kind, cleanUrl, cleanUrl.isEmpty() ? "" : "Abrir material", "", 0, "");
    }

    public void beginFilePost(String title, String body, String kind) {
        if (!canTeach()) {
            emitError("Tu cuenta no tiene permiso para subir archivos.");
            return;
        }
        if (storage == null) {
            emitError("La carga directa requiere activar Firebase Storage. Por ahora publica un enlace de Drive.");
            return;
        }
        pendingTitle = safe(title).trim();
        pendingBody = safe(body).trim();
        pendingKind = safe(kind).trim();
        if (pendingTitle.isEmpty()) {
            emitError("Escribe un título antes de elegir el archivo.");
            return;
        }
        Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType("*/*");
        picker.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "application/pdf",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "image/*",
                "text/plain",
                "application/zip"
        });
        activity.startActivityForResult(picker, FILE_PICKER_REQUEST);
    }

    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != FILE_PICKER_REQUEST || resultCode != Activity.RESULT_OK || data == null || data.getData() == null) return;
        uploadSelectedFile(data.getData());
    }

    private void uploadSelectedFile(Uri uri) {
        FirebaseUser user = currentUser();
        if (user == null || storage == null) return;
        String fileName = selectedFileName(uri);
        long size = selectedFileSize(uri);
        if (size > MAX_FILE_BYTES) {
            emitError("El archivo supera el límite beta de 50 MB.");
            return;
        }
        String cleanName = fileName.replaceAll("[^\\p{L}\\p{N}._-]", "_");
        String storagePath = "courses/" + COURSE_ID + "/" + user.getUid() + "/" + System.currentTimeMillis() + "_" + cleanName;
        StorageReference reference = storage.getReference().child(storagePath);
        String contentType = activity.getContentResolver().getType(uri);
        StorageMetadata.Builder metadataBuilder = new StorageMetadata.Builder();
        if (contentType != null) metadataBuilder.setContentType(contentType);
        UploadTask upload = reference.putFile(uri, metadataBuilder.build());
        upload.addOnProgressListener(snapshot -> {
            long total = snapshot.getTotalByteCount();
            int percent = total <= 0 ? 0 : (int) Math.round(100.0 * snapshot.getBytesTransferred() / total);
            JSONObject payload = new JSONObject();
            put(payload, "percent", percent);
            put(payload, "fileName", fileName);
            emit("uploadProgress", payload);
        }).continueWithTask(task -> {
            if (!task.isSuccessful()) throw task.getException();
            return reference.getDownloadUrl();
        }).addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult() != null) {
                publishPost(pendingTitle, pendingBody, pendingKind, task.getResult().toString(), fileName, storagePath, Math.max(0, size), contentType == null ? "application/octet-stream" : contentType);
            } else {
                emitError("No se pudo subir el archivo. Puedes publicar un enlace de Drive.");
            }
        });
    }

    private void publishPost(String titleValue, String bodyValue, String kindValue, String fileUrl, String fileName, String storagePath, long fileSize, String contentType) {
        FirebaseUser user = currentUser();
        if (user == null) return;
        String title = safe(titleValue).trim();
        if (title.isEmpty()) {
            emitError("La publicación necesita un título.");
            return;
        }
        Map<String, Object> post = new HashMap<>();
        post.put("courseId", COURSE_ID);
        post.put("title", title);
        post.put("body", safe(bodyValue).trim());
        post.put("kind", safe(kindValue).isBlank() ? "material" : safe(kindValue));
        post.put("fileUrl", safe(fileUrl));
        post.put("fileName", safe(fileName));
        post.put("storagePath", safe(storagePath));
        post.put("fileSize", fileSize);
        post.put("contentType", safe(contentType));
        post.put("authorId", user.getUid());
        post.put("authorName", safe(user.getDisplayName()));
        post.put("authorEmail", safe(user.getEmail()).toLowerCase(Locale.ROOT));
        post.put("createdAt", FieldValue.serverTimestamp());
        db.collection("courses").document(COURSE_ID).collection("posts").add(post)
                .addOnSuccessListener(reference -> emitMessage("Publicación enviada a Estática."))
                .addOnFailureListener(error -> emitError("No se pudo publicar el material."));
    }

    public void deletePost(String postId) {
        if (!canTeach()) {
            emitError("No tienes permiso para eliminar publicaciones.");
            return;
        }
        DocumentReference reference = db.collection("courses").document(COURSE_ID).collection("posts").document(postId);
        reference.get().addOnSuccessListener(snapshot -> {
            String authorId = safe(snapshot.getString("authorId"));
            FirebaseUser user = currentUser();
            if (user == null || (!"owner".equals(currentRole) && !authorId.equals(user.getUid()))) {
                emitError("Solo puedes eliminar tus propias publicaciones.");
                return;
            }
            String storagePath = snapshot.getString("storagePath");
            Task<Void> deleteFile = storagePath != null && !storagePath.isBlank() && storage != null
                    ? storage.getReference().child(storagePath).delete()
                    : com.google.android.gms.tasks.Tasks.forResult(null);
            deleteFile.continueWithTask(task -> reference.delete())
                    .addOnSuccessListener(unused -> emitMessage("Publicación eliminada."))
                    .addOnFailureListener(error -> emitError("No se pudo eliminar la publicación."));
        }).addOnFailureListener(error -> emitError("No se pudo encontrar la publicación."));
    }

    public void updateProgress(int completed, int total) {
        FirebaseUser user = currentUser();
        if (user == null || !isCourseMember()) return;
        int safeTotal = Math.max(total, 0);
        int safeCompleted = Math.max(0, Math.min(completed, safeTotal));
        Map<String, Object> progress = new HashMap<>();
        progress.put("uid", user.getUid());
        progress.put("displayName", safe(user.getDisplayName()));
        progress.put("email", safe(user.getEmail()).toLowerCase(Locale.ROOT));
        progress.put("role", currentRole);
        progress.put("completed", safeCompleted);
        progress.put("total", safeTotal);
        progress.put("percent", safeTotal == 0 ? 0 : Math.round(100.0 * safeCompleted / safeTotal));
        progress.put("lastSeen", FieldValue.serverTimestamp());
        db.collection("courses").document(COURSE_ID).collection("progress").document(user.getUid())
                .set(progress, SetOptions.merge());
    }

    private JSONObject postJson(DocumentSnapshot document) {
        JSONObject item = new JSONObject();
        put(item, "id", document.getId());
        put(item, "title", safe(document.getString("title")));
        put(item, "body", safe(document.getString("body")));
        put(item, "kind", safe(document.getString("kind")));
        put(item, "fileUrl", safe(document.getString("fileUrl")));
        put(item, "fileName", safe(document.getString("fileName")));
        put(item, "authorId", safe(document.getString("authorId")));
        put(item, "authorName", safe(document.getString("authorName")));
        put(item, "authorEmail", safe(document.getString("authorEmail")));
        put(item, "createdAt", timestampMillis(document.getTimestamp("createdAt")));
        return item;
    }

    private JSONObject progressJson(DocumentSnapshot document) {
        JSONObject item = new JSONObject();
        put(item, "uid", document.getId());
        put(item, "displayName", safe(document.getString("displayName")));
        put(item, "email", safe(document.getString("email")));
        put(item, "role", safe(document.getString("role")));
        put(item, "completed", longValue(document.getLong("completed")));
        put(item, "total", longValue(document.getLong("total")));
        put(item, "percent", longValue(document.getLong("percent")));
        put(item, "lastSeen", timestampMillis(document.getTimestamp("lastSeen")));
        return item;
    }

    private JSONObject userJson(DocumentSnapshot document) {
        JSONObject item = new JSONObject();
        put(item, "uid", document.getId());
        put(item, "displayName", safe(document.getString("displayName")));
        put(item, "email", safe(document.getString("email")));
        put(item, "role", safe(document.getString("role")));
        put(item, "teacherRequested", Boolean.TRUE.equals(document.getBoolean("teacherRequested")));
        put(item, "lastSeen", timestampMillis(document.getTimestamp("lastSeen")));
        return item;
    }

    private void emitAuthState() {
        JSONObject payload = new JSONObject();
        put(payload, "configured", configured);
        FirebaseUser user = currentUser();
        put(payload, "signedIn", user != null);
        put(payload, "role", currentRole);
        put(payload, "isOwner", "owner".equals(currentRole));
        put(payload, "canTeach", canTeach());
        if (user != null) {
            put(payload, "uid", user.getUid());
            put(payload, "displayName", safe(user.getDisplayName()));
            put(payload, "email", safe(user.getEmail()));
            put(payload, "photoUrl", user.getPhotoUrl() == null ? "" : user.getPhotoUrl().toString());
        }
        emit("auth", payload);
    }

    private void emitMessage(String message) {
        JSONObject payload = new JSONObject();
        put(payload, "message", message);
        emit("message", payload);
    }

    private void emitError(String message) {
        JSONObject payload = new JSONObject();
        put(payload, "message", message);
        emit("error", payload);
    }

    private void emit(String event, JSONObject payload) {
        String script = "window.__classroomNative&&window.__classroomNative(" + JSONObject.quote(event) + "," + payload + ");";
        activity.runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }

    private JSONObject jsonWithArray(String name, JSONArray values) {
        JSONObject result = new JSONObject();
        try {
            result.put(name, values);
        } catch (JSONException ignored) {
        }
        return result;
    }

    private FirebaseUser currentUser() {
        return auth == null ? null : auth.getCurrentUser();
    }

    private boolean isCourseMember() {
        return currentRole.equals("student") || currentRole.equals("pending_teacher") || currentRole.equals("teacher") || currentRole.equals("owner");
    }

    private boolean canTeach() {
        return currentRole.equals("teacher") || currentRole.equals("owner");
    }

    private void updateNotificationTopic() {
        if (!configured || FirebaseApp.getApps(activity).isEmpty()) return;
        FirebaseMessaging messaging = FirebaseMessaging.getInstance();
        if ("student".equals(currentRole)) messaging.subscribeToTopic("course_estatica_students");
        else messaging.unsubscribeFromTopic("course_estatica_students");
    }

    private void stopListeners() {
        if (profileListener != null) profileListener.remove();
        if (postsListener != null) postsListener.remove();
        if (progressListener != null) progressListener.remove();
        if (usersListener != null) usersListener.remove();
        profileListener = null;
        postsListener = null;
        progressListener = null;
        usersListener = null;
    }

    public void destroy() {
        stopListeners();
    }

    private String selectedFileName(Uri uri) {
        try (Cursor cursor = activity.getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return safe(cursor.getString(index));
            }
        }
        return uri.getLastPathSegment() == null ? "material" : uri.getLastPathSegment();
    }

    private long selectedFileSize(Uri uri) {
        try (Cursor cursor = activity.getContentResolver().query(uri, new String[]{OpenableColumns.SIZE}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (index >= 0 && !cursor.isNull(index)) return cursor.getLong(index);
            }
        }
        return 0;
    }

    private String emailDomain(String emailValue) {
        String email = safe(emailValue).toLowerCase(Locale.ROOT);
        int at = email.lastIndexOf('@');
        return at < 0 ? "" : email.substring(at + 1);
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private long timestampMillis(Timestamp timestamp) {
        return timestamp == null ? 0 : timestamp.toDate().getTime();
    }

    private long longValue(Long value) {
        return value == null ? 0 : value;
    }

    private void put(JSONObject object, String name, Object value) {
        try {
            object.put(name, value);
        } catch (JSONException ignored) {
        }
    }
}
