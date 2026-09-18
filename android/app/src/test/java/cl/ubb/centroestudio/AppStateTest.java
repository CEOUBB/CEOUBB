package cl.ubb.centroestudio;

import static org.junit.Assert.*;

import com.getcapacitor.App;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

// Implements: REQ-ANDROID-TEST-01
public class AppStateTest {
    @Test
    public void foregroundAndBackgroundUpdateStateBeforeNotifyingListeners() {
        App app = new App();
        List<Boolean> events = new ArrayList<>();
        assertFalse(app.isActive());
        app.setStatusChangeListener(active -> {
            assertEquals(active.booleanValue(), app.isActive());
            events.add(active);
        });

        app.fireStatusChange(true);
        app.fireStatusChange(false);
        app.fireStatusChange(true);

        assertEquals(Arrays.asList(true, false, true), events);
        assertTrue(app.isActive());
    }

    @Test
    public void detachedListenerReceivesNoFurtherEvents() {
        App app = new App();
        List<Boolean> events = new ArrayList<>();
        app.setStatusChangeListener(events::add);
        app.fireStatusChange(true);
        app.setStatusChangeListener(null);
        app.fireStatusChange(false);

        assertEquals(Arrays.asList(true), events);
        assertFalse(app.isActive());
    }

    @Test
    public void recreatedListenerReplacesPreviousActivityListener() {
        App app = new App();
        List<Boolean> previous = new ArrayList<>();
        List<Boolean> current = new ArrayList<>();
        app.setStatusChangeListener(previous::add);
        app.setStatusChangeListener(current::add);
        app.fireStatusChange(true);

        assertTrue(previous.isEmpty());
        assertEquals(Arrays.asList(true), current);
    }
}
