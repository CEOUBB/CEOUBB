package cl.ubb.centroestudio;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.List;
import java.util.Locale;

public class StudyFileProvider extends ContentProvider {
    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!"r".equals(mode)) throw new FileNotFoundException("Solo lectura");
        File file = resolveFile(uri);
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public String getType(Uri uri) {
        File file;
        try {
            file = resolveFile(uri);
        } catch (FileNotFoundException error) {
            return "application/octet-stream";
        }
        String name = file.getName();
        int dot = name.lastIndexOf('.');
        String extension = dot >= 0 ? name.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
        if (extension.equals("pdf")) return "application/pdf";
        if (extension.equals("docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (extension.equals("xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (extension.equals("pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        return mime == null ? "application/octet-stream" : mime;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File file;
        try {
            file = resolveFile(uri);
        } catch (FileNotFoundException error) {
            return null;
        }
        String[] columns = projection == null ? new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE} : projection;
        MatrixCursor cursor = new MatrixCursor(columns, 1);
        MatrixCursor.RowBuilder row = cursor.newRow();
        for (String column : columns) {
            if (OpenableColumns.DISPLAY_NAME.equals(column)) row.add(file.getName());
            else if (OpenableColumns.SIZE.equals(column)) row.add(file.length());
            else row.add(null);
        }
        return cursor;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("Solo lectura");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }

    private File resolveFile(Uri uri) throws FileNotFoundException {
        if (getContext() == null) throw new FileNotFoundException("Contexto no disponible");
        List<String> segments = uri.getPathSegments();
        if (segments.size() != 2 || !"shared".equals(segments.get(0))) throw new FileNotFoundException("Ruta inválida");
        try {
            File root = new File(getContext().getCacheDir(), "shared").getCanonicalFile();
            File file = new File(root, segments.get(1)).getCanonicalFile();
            if (!file.getParentFile().equals(root) || !file.isFile()) throw new FileNotFoundException("Archivo no disponible");
            return file;
        } catch (IOException error) {
            throw new FileNotFoundException("Ruta inválida");
        }
    }
}
