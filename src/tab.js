(() => {
  "use strict";

  const { show_uri_on_window, Label, Image, Box } = imports.gi.Gtk;
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
  const {
    getenv,
    get_user_cache_dir,
    get_user_data_dir,
    build_filenamev,
  } = imports.gi.GLib;
  const { Pixbuf } = imports.gi.GdkPixbuf;

  const { services } = imports.serviceManager;

  this.Tab = function Tab(...params) {
    return {
      label: TabLabel(...params),
      page: TabPage(...params),
    };
  };

  this.TabLabel = TabLabel;
  function TabLabel({ name, service_id }) {
    const box = new Box({
      margin_top: 6,
      margin_bottom: 6,
    });

    const service =
      service_id && services.find(service => service.id === service_id);

    if (service && service.icon) {
      const pixbuf = Pixbuf.new_from_resource_at_scale(
        service.icon,
        28,
        28,
        true
      );
      box.add(new Image({ pixbuf, margin_end: 6 }));
    }

    box.add(new Label({ label: name }));

    box.show_all();
    return box;
  }

  this.TabPage = TabPage;
  function TabPage({ url, service_id, id, window, onNotification }) {
    const dataPath = build_filenamev([get_user_data_dir(), "gigagram", id]);
    const cachePath = build_filenamev([get_user_cache_dir(), "gigagram", id]);

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.websitedatamanager
    const website_data_manager = new WebsiteDataManager({
      base_data_directory: dataPath,
      disk_cache_directory: cachePath,
    });

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
    const web_context = new WebContext({
      website_data_manager,
    });
    web_context.set_favicon_database_directory(
      build_filenamev([cachePath, "icondatabase"])
    );

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
    const cookieManager = website_data_manager.get_cookie_manager();
    cookieManager.set_accept_policy(CookieAcceptPolicy.NO_THIRD_PARTY);
    cookieManager.set_persistent_storage(
      `${dataPath}/cookies.sqlite`,
      CookiePersistentStorage.SQLITE
    );

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.usercontentmanager
    const user_content_manager = new UserContentManager();
    if (stylesheets[service_id]) {
      user_content_manager.add_style_sheet(stylesheets[service_id]);
    }

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.settings
    const settings = new Settings({
      enable_developer_extras: getenv("DEV") === "true",
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
  }
})();
