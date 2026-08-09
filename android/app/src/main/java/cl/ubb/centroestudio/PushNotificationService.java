package cl.ubb.centroestudio;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public final class PushNotificationService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "course_updates";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        String title = message.getNotification() == null ? message.getData().get("title") : message.getNotification().getTitle();
        String body = message.getNotification() == null ? message.getData().get("body") : message.getNotification().getBody();
        if (title == null || title.isBlank()) title = "Estática · nuevo material";
        if (body == null || body.isBlank()) body = "Tu profesor publicó un aviso o archivo nuevo.";
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "Avisos de cursos", NotificationManager.IMPORTANCE_HIGH));
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("course", message.getData().getOrDefault("courseId", "estatica"));
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(this, 440299, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(pending)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH);
        manager.notify((int) (System.currentTimeMillis() & 0x7fffffff), builder.build());
    }
}
