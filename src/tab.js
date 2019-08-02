(() => {
  "use strict";

  const {
    show_uri_on_window,
    Label,
    Image,
    Box,
    EventBox,
    Popover,
  } = imports.gi.Gtk;
  const { EventMask } = imports.gi.Gdk;
  const { Menu, SettingsBindFlags } = imports.gi.Gio;

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

  function TabLabel(
    { service_id, id, name, icon },
    settings,
    instanceSettings
  ) {
    const box = new Box({});

    const service =
      service_id && services.find(service => service.id === service_id);

    // log(service_id);
    // log(name);
    // log(id);
    // log(name + " " + icon);
    // use id?

    // log(service.icon);

    if (service && service.icon) {
      let pixbuf;
      // use service icon if service is not custom

      if (service_id === "custom" && icon !== "default") {
        try {
          pixbuf = Pixbuf.new_from_file_at_scale(icon, 28, 28, true);
        } catch (e) {
          log("icon " + icon + " for service " + name + " no found.");
          pixbuf = Pixbuf.new_from_resource_at_scale(
            service.icon,
            28,
            28,
            true
          );
        }
      } else {
        pixbuf = Pixbuf.new_from_resource_at_scale(service.icon, 28, 28, true);
      }
      box.add(new Image({ pixbuf, margin_end: 6 }));
    }

    const label = new Label();
    if (instanceSettings) {
      instanceSettings.bind("name", label, "label", SettingsBindFlags.GET);
    } else {
      label.label = name;
    }
    box.add(label);

    box.add_events(EventMask.BUTTON_PRESS_MASK);

    const eventBox = new EventBox({
      // margin_top: 6,
      // margin_bottom: 6,
    });
    eventBox.add(box);

    if (service && id) {
      const menu = new Menu();
      menu.append("Edit", `app.editInstance("${id}")`);
      menu.append("Remove", `app.removeInstance("${id}")`);

      const popover = new Popover();
      popover.bind_model(menu, null);
      popover.set_relative_to(box);
      settings.bind(
        "tabs-position",
        popover,
        "position",
        SettingsBindFlags.GET
      );

      eventBox.connect("button-press-event", (self, eventButton) => {
        const [, button] = eventButton.get_button();
        if (button !== 3) return;

        popover.popup();
      });
    }

    eventBox.show_all();
    return eventBox;
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
        //   git ("permission request");
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

    webView.instance_id = id;

    return webView;
  }
})();
