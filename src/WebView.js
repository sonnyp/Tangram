import Gtk from "gi://Gtk";
import WebKit2 from "gi://WebKit";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Gdk from "gi://Gdk";
import { gettext as _ } from "gettext";

import { connect, getEnum } from "./util.js";
import { MODES } from "./constants.js";

Gio._promisify(Gtk.FileDialog.prototype, "save", "save_finish");

const {
  WebContext,
  CookiePersistentStorage,
  CookieAcceptPolicy,
  Settings,
  NotificationPermissionRequest,
  SecurityOrigin,
  UserContentManager,
  TLSErrorsPolicy,
  WebView,
  PolicyDecisionType,
} = WebKit2;
const {
  build_filenamev,
  get_user_special_dir,
  UserDirectory,
  get_language_names,
} = GLib;
const { AppInfo, ResourceLookupFlags, resources_open_stream } = Gio;

export function buildWebView({ instance, onNotification, window }) {
  const { data_dir, cache_dir, url, id } = instance;

  const network_session = WebKit2.NetworkSession.new(data_dir, cache_dir);
  network_session.set_tls_errors_policy(TLSErrorsPolicy.FAIL);

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#signal-download-started
  network_session.connect("download-started", (self, download) => {
    // Beware of https://bugs.webkit.org/show_bug.cgi?id=201868
    download.set_allow_overwrite(false);

    const request = download.get_request();
    const uri = request.get_uri();
    if (uri.startsWith("http")) {
      download.cancel();
      AppInfo.launch_default_for_uri(uri, null);
      return;
    }

    // We cannot open blob: and file: uris in an other application
    // so we download them ourselves, it's okay because they are very
    // quick to download so we don't need a progress UI for them

    download.connect("failed", (self, err) => {
      logError(err);
    });

    // https://webkitgtk.org/reference/webkit2gtk/stable/signal.Download.decide-destination.html
    download.connect("decide-destination", (self, suggested_filename) => {
      if (!suggested_filename || suggested_filename === "unknown.asc") {
        suggested_filename = "";
      }

      const dest_dir = Gio.File.new_for_path(
        get_user_special_dir(UserDirectory.DIRECTORY_DOWNLOAD),
      );
      const dialog = new Gtk.FileDialog({
        title: _("Save File"),
        initial_folder: dest_dir,
        initial_name: suggested_filename,
      });

      dialog
        .save(window, null)
        .then((file) => {
          download.set_destination(file.get_path());
        })
        .catch(logError);

      return true;
    });
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
  const web_context = new WebContext();
  web_context.set_spell_checking_enabled(true);
  web_context.set_spell_checking_languages(get_language_names());
  console.log(data_dir);
  console.log(cache_dir);
  web_context.add_path_to_sandbox(data_dir, true);
  web_context.add_path_to_sandbox(cache_dir, true);

  const security_manager = web_context.get_security_manager();

  security_manager.register_uri_scheme_as_local("tangram-resource");
  web_context.register_uri_scheme("tangram-resource", (schemeRequest) => {
    const stream = resources_open_stream(
      schemeRequest.get_path(),
      ResourceLookupFlags.NONE,
    );
    schemeRequest.finish(stream, -1, null);
  });

  /*
   * Notifications
   */
  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#signal-initialize-notification-permissions
  if (url) {
    web_context.connect("initialize-notification-permissions", () => {
      // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#method-initialize_notification_permissions
      web_context.initialize_notification_permissions(
        [SecurityOrigin.new_for_uri(url)],
        [],
      );
    });
  }

  const website_data_manager = network_session.get_website_data_manager();
  website_data_manager.set_favicons_enabled(true);

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.cookiemanager
  const cookieManager = network_session.get_cookie_manager();
  cookieManager.set_accept_policy(CookieAcceptPolicy.NO_THIRD_PARTY);
  cookieManager.set_persistent_storage(
    build_filenamev([data_dir, "cookies.sqlite"]),
    CookiePersistentStorage.SQLITE,
  );

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.usercontentmanager
  const user_content_manager = new UserContentManager();

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.settings
  const settings = new Settings({
    enable_smooth_scrolling: true,
    media_playback_requires_user_gesture: true,

    // https://gitlab.gnome.org/GNOME/epiphany/-/blob/master/embed/ephy-embed-prefs.c
    enable_back_forward_navigation_gestures: true,
    enable_developer_extras: true,
    enable_dns_prefetching: true,
    javascript_can_open_windows_automatically: true,
    allow_top_navigation_to_data_urls: false,
  });

  settings.set_user_agent_with_application_details("Tangram", pkg.version);

  // user-agent
  const userAgent = instance.settings.get_string("user-agent");
  if (userAgent) settings.set_user_agent(userAgent);
  instance.settings.connect(`changed::user-agent`, () => {
    settings.set_user_agent(instance.settings.get_string("user-agent"));
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
  const webView = new WebView({
    web_context,
    user_content_manager,
    settings,
    network_session,
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webinspector
  // const webInspector = webView.get_inspector();
  // webInspector.show();

  connect(webView, {
    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webview#signal-create
    create(navigation_action) {
      const request_url = navigation_action.get_request().get_uri();

      console.debug("create", request_url);

      if (webView.mode === MODES.TEMPORARY) {
        webView.load_uri(request_url);
        return;
      }

      // Open URL in default browser
      Gtk.show_uri(window, request_url, Gdk.CURRENT_TIME);
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

    // https://webkitgtk.org/reference/webkit2gtk/stable/WebKitWebView.html#WebKitWebView-decide-policy
    ["decide-policy"](decision, decision_type) {
      console.debug(
        "decide-policy",
        getEnum(PolicyDecisionType, decision_type),
      );

      if (decision_type === PolicyDecisionType.NAVIGATION_ACTION) {
        // https://webkitgtk.org/reference/webkit2gtk/stable/WebKitNavigationAction.html
        const navigation_action = decision.get_navigation_action();
        const request_url = navigation_action.get_request().get_uri();
        console.debug(
          "navigation",
          getEnum(WebKit2.NavigationType),
          request_url,
        );

        if (didUserRequestOpenInBrowser(navigation_action)) {
          decision.ignore();
          Gtk.show_uri(window, request_url, Gdk.CURRENT_TIME);
          return true;
        }
      }

      return false;
    },
    // https://webkitgtk.org/reference/webkit2gtk/stable/signal.WebView.load-changed.html
    // ["load-changed"](load_event) {
    //   console.debug("load-changed", getEnum(WebKit2.LoadEvent, load_event));
    // },
  });

  webView.instance_id = id;

  webView.load_uri(url);

  return webView;
}

function didUserRequestOpenInBrowser(navigation_action) {
  if (navigation_action.get_mouse_button() === Gdk.BUTTON_MIDDLE) {
    return true;
  }

  const { CONTROL_MASK } = Gdk.ModifierType;
  if ((navigation_action.get_modifiers() & CONTROL_MASK) === CONTROL_MASK) {
    return true;
  }

  return false;
}
