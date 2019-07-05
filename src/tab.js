const { GObject, Gtk, GLib, Gio, Gdk, GdkPixbuf } = imports.gi;
const {
  WebsiteDataManager,
  WebView,
  WebContext,
  CookiePersistentStorage,
  CookieAcceptPolicy,
  Settings,
  CookieManager,
  LoadEvent,
  PolicyDecisionType
} = imports.gi.WebKit2;

const { buildHomePage } = imports.homePage;

function buildTab(service) {
  const { name, url } = service;
  const path = `${GLib.get_user_data_dir()}/gigagram/${name}`;

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.websitedatamanager
  const websiteDataManager = new WebsiteDataManager({
    base_data_directory: path,
    disk_cache_directory: path
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
  const webContext = WebContext.new_with_website_data_manager(
    websiteDataManager
  );
  webContext.set_favicon_database_directory(path);

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.cookiemanager
  // not sure why but must be done after new_with_website_data_manager
  const cookieManager = websiteDataManager.get_cookie_manager();
  cookieManager.set_accept_policy(CookieAcceptPolicy.NO_THIRD_PARTY);
  cookieManager.set_persistent_storage(
    `${path}/cookies.sqlite`,
    CookiePersistentStorage.SQLITE
  );

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
  const webView = WebView.new_with_context(webContext);
  webView.expand = true;

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.settings
  const settings = new Settings({ enable_developer_extras: true });
  webView.set_settings(settings);

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

  webView.connect("create", (self, navigation_action) => {
    const uri = navigation_action.get_request().get_uri();
    Gtk.show_uri_on_window(this.window, uri, null);
  });

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
}
