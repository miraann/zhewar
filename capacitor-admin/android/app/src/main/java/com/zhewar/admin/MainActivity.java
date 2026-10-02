package com.zhewar.admin;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before the bridge starts
        registerPlugin(BackgroundReliabilityPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        super.onPause();
        // The WebView only writes cookies to disk every so often, so an app
        // swiped away soon after login (or a session renewal) could lose its
        // admin_session cookie and open on the login screen next time
        CookieManager.getInstance().flush();
    }
}
