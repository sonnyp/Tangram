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
  TLSErrorsPolicy,
} = imports.gi.WebKit2;
const { Pixbuf } = imports.gi.GdkPixbuf;
const { build_filenamev } = imports.gi.GLib;

const { connect } = imports.util;
const { stylesheets } = imports.serviceManager;
const flags = imports.flags;

this.Tab = function Tab(...params) {
  return {
    label: TabLabel(...params),
    page: TabPage(...params),
  };
};

this.TabLabel = TabLabel;

const ICON_SIZE = 16;

function TabLabel({ instance, settings }) {
  const { id } = instance;

  const box = new Box({});
  const image = new Image({ margin_end: 6 });
  instance.observe("icon", () => {
    const icon = instance.getIconForDisplay();
    if (!icon) return;

    let pixbuf;
    if (icon.startsWith("resource://")) {
      pixbuf = Pixbuf.new_from_resource_at_scale(
        icon.split("resource://")[1],
        ICON_SIZE,
        ICON_SIZE,
        true
      );
      image.set_from_pixbuf(pixbuf);
    } else {
      pixbuf = Pixbuf.new_from_file_at_scale(icon, ICON_SIZE, ICON_SIZE, true);
    }
    image.set_from_pixbuf(pixbuf);
  });
  box.add(image);

  const label = new Label();
  instance.bind("name", label, "label", SettingsBindFlags.GET);
  box.add(label);

  box.add_events(EventMask.BUTTON_PRESS_MASK);

  const eventBox = new EventBox({
    // margin_top: 6,
    // margin_bottom: 6,
  });
  eventBox.add(box);

  const menu = new Menu();
  menu.append("Edit", `app.editInstance("${id}")`);
  menu.append("Remove", `app.removeInstance("${id}")`);
  if (flags.custom_applications) {
    menu.append("New application", `app.detachTab("${id}")`);
  }

  const popover = new Popover();
  popover.bind_model(menu, null);
  popover.set_relative_to(box);
  settings.bind("tabs-position", popover, "position", SettingsBindFlags.GET);

  eventBox.connect("button-press-event", (self, eventButton) => {
    const [, button] = eventButton.get_button();
    if (button !== 3) return;

    popover.popup();
  });

  eventBox.show_all();
  return eventBox;
}

this.TabPage = TabPage;

function TabPage({ instance, window, onNotification }) {
  const { service_id, id, url, data_dir, cache_dir } = instance;

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
    build_filenamev([data_dir, "cookies.sqlite"]),
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
        onNotification({ ...notification, id });
        return true;
      },
    }
  );

  webView.load_uri(url || "about:blank");

  webView.instance_id = id;
  webView.show_all();

  return webView;
}
