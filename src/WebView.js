const { show_uri_on_window } = imports.gi.Gtk;
const {
  WebsiteDataManager,
  WebContext,
  CookiePersistentStorage,
  CookieAcceptPolicy,
  Settings,
  NotificationPermissionRequest,
  SecurityOrigin,
  UserContentManager,
  TLSErrorsPolicy,
  HardwareAccelerationPolicy,
  WebView,
} = imports.gi.WebKit2;
const { build_filenamev } = imports.gi.GLib;

const { connect } = imports.util;

this.buildWebView = buildWebView;
function buildWebView({ instance, onNotification, window }) {
  const { data_dir, cache_dir, url, id } = instance;

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.websitedatamanager
  const website_data_manager = new WebsiteDataManager({
    base_data_directory: data_dir,
    disk_cache_directory: cache_dir,
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
  const web_context = new WebContext({
    website_data_manager,
  });
  web_context.set_tls_errors_policy(TLSErrorsPolicy.FAIL);
  web_context.set_favicon_database_directory(
    build_filenamev([cache_dir, "icondatabase"])
  );
  // web_context.set_process_model(
  //   imports.gi.WebKit2.ProcessModel.MULTIPLE_SECONDARY_PROCESSES
  // );

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.favicondatabase
  // const favicon_database = web_context.get_favicon_database();

  /*
   * Notifications
   */
  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#signal-initialize-notification-permissions
  if (url) {
    web_context.connect("initialize-notification-permissions", () => {
      // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#method-initialize_notification_permissions
      web_context.initialize_notification_permissions(
        [SecurityOrigin.new_for_uri(url)],
        []
      );
    });
  }

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.cookiemanager
  // not sure why but must be done after new_with_website_data_manager
  const cookieManager = website_data_manager.get_cookie_manager();
  cookieManager.set_accept_policy(CookieAcceptPolicy.NO_THIRD_PARTY);
  cookieManager.set_persistent_storage(
    build_filenamev([data_dir, "cookies.sqlite"]),
    CookiePersistentStorage.SQLITE
  );

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.usercontentmanager
  const user_content_manager = new UserContentManager();

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.settings
  const settings = new Settings({
    enable_developer_extras: true,
    enable_site_specific_quirks: true,
    enable_smooth_scrolling: true,
    media_playback_requires_user_gesture: true,
  });

  // https://github.com/sonnyp/Tangram/issues/39
  if (url.includes("reddit.com")) {
    settings.set_media_playback_requires_user_gesture(true);
    settings.set_hardware_acceleration_policy(HardwareAccelerationPolicy.NEVER);
  }

  settings.set_user_agent_with_application_details("Tangram", pkg.version);

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
  const webView = new WebView({
    web_context,
    user_content_manager,
    expand: true,
    settings,
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webinspector
  // const webInspector = webView.get_inspector();
  // webView.connect("load-changed", (self, load_event) => {
  //   webInspector.show();
  // });

  // webView.connect("decide-policy", (self, decision, decision_policy) => {
  //   if (decision_policy === PolicyDecisionType.NEW_WINDOW_ACTION)
  //     log(decision);
  //   log(decision_policy);
  // });

  connect(
    webView,
    {
      // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webview#signal-create
      create(navigation_action) {
        const uri = navigation_action.get_request().get_uri();
        show_uri_on_window(window, uri, null);
      },

      // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webview#signal-permission-request
      ["permission-request"](request) {
        if (request instanceof NotificationPermissionRequest) {
          request.allow();
          return;
        }
        request.deny();
      },

      // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webview#signal-show-notification
      ["show-notification"](notification) {
        onNotification(notification, id);
        return true;
      },
    }
  );

  webView.instance_id = id;
  webView.show_all();

  webView.load_uri(url || "about:blank");

  return webView;
}
