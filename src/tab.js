(() => {
  "use strict";

  const { show_uri_on_window } = imports.gi.Gtk;
  const {
    WebsiteDataManager,
    WebView,
    WebContext,
    CookiePersistentStorage,
    CookieAcceptPolicy,
    Settings,
    // NotificationPermissionRequest,
    SecurityOrigin,
    UserContentManager,
  } = imports.gi.WebKit2;
  const { connect } = imports.util;
  const { stylesheets } = imports.serviceManager;

  const { get_user_cache_dir, build_filenamev } = imports.gi.GLib;

  this.buildTab = function buildTab({
    url,
    service_id,
    title,
    window,
    onNotification,
  }) {
    const path = build_filenamev([get_user_cache_dir(), "gigagram", title]);

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.websitedatamanager
    const websiteDataManager = new WebsiteDataManager({
      base_data_directory: path,
      disk_cache_directory: path,
    });

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
    const web_context = WebContext.new_with_website_data_manager(
      websiteDataManager
    );
    web_context.set_favicon_database_directory(path);

    /*
     * Notifications
     */
    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#signal-initialize-notification-permissions
    web_context.connect("initialize-notification-permissions", () => {
      // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#method-initialize_notification_permissions
      web_context.initialize_notification_permissions(
        [SecurityOrigin.new_for_uri(url)],
        []
      );
    });

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.cookiemanager
    // not sure why but must be done after new_with_website_data_manager
    const cookieManager = websiteDataManager.get_cookie_manager();
    cookieManager.set_accept_policy(CookieAcceptPolicy.NO_THIRD_PARTY);
    cookieManager.set_persistent_storage(
      `${path}/cookies.sqlite`,
      CookiePersistentStorage.SQLITE
    );

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.usercontentmanager
    const user_content_manager = new UserContentManager();
    if (stylesheets[service_id]) {
      user_content_manager.add_style_sheet(stylesheets[service_id]);
    }

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.settings
    const settings = new Settings({
      enable_developer_extras: true,
    });

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
        // ["permission-request"](request) {
        //   log("permission request");
        //   if (request instanceof NotificationPermissionRequest) {
        //     request.allow();
        //     return;
        //   }
        //   request.deny();
        // },
        // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webview#signal-show-notification
        ["show-notification"](notification) {
          onNotification(notification);
          return true;
        },
      }
    );

    webView.load_uri(url);

    return webView;
    //   this.webView = webView;
    // this.webView.connect("load-changed", (self, load_event) => {
    //   if (load_event === LoadEvent.FINISHED) {
    //     log("finished");
    //   }
    // });
    // this.webView.connect("ready-to-show", () => {
    //   log("ready to show");
    // });
    //   this.page = this.webView;
    // this.webView.connect("notify::title", () => {
    //   this.title = this.webView.title;
    //   log(this.title);

    // });
  };
})();
