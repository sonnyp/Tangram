const {
  show_uri_on_window,
  FileChooserNative,
  FileChooserAction,
  ResponseType,
} = imports.gi.Gtk;
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
  ProcessModel,
  DownloadError,
} = imports.gi.WebKit2;
const {
  build_filenamev,
  DIR_SEPARATOR_S,
  get_user_special_dir,
  UserDirectory,
  path_get_basename,
  path_get_dirname,
  get_language_names,
} = imports.gi.GLib;
const { Notification, AppInfo } = imports.gi.Gio;

import { connect } from "./util";
import { env } from "./env";

export function buildWebView({
  instance,
  onNotification,
  application,
  window,
}) {
  const { data_dir, cache_dir, url, id, name } = instance;

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.websitedatamanager
  const website_data_manager = new WebsiteDataManager({
    base_data_directory: data_dir,
    disk_cache_directory: cache_dir,
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
  const web_context = new WebContext({
    website_data_manager,
  });
  web_context.set_spell_checking_enabled(true);
  web_context.set_spell_checking_languages(get_language_names());
  web_context.set_tls_errors_policy(TLSErrorsPolicy.FAIL);
  web_context.set_favicon_database_directory(
    build_filenamev([cache_dir, "icondatabase"])
  );
  web_context.set_process_model(ProcessModel.MULTIPLE_SECONDARY_PROCESSES);
  if (typeof web_context.set_sandbox_enabled === "function") {
    web_context.set_sandbox_enabled(true);
    web_context.add_path_to_sandbox(data_dir, true);
    web_context.add_path_to_sandbox(cache_dir, true);
  }

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

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#signal-download-started
  web_context.connect("download-started", (self, download) => {
    // https://bugs.webkit.org/show_bug.cgi?id=201868
    // We do this because the destination is decided by the user in 'decide-destination' handler
    download.set_allow_overwrite(true);

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

    let error;
    download.connect("failed", (self, err) => {
      error = err;
    });
    download.connect("finished", () => {
      if (error && error.code === DownloadError.CANCELLED_BY_USER) return;

      const path = download.get_destination();
      const filename = path_get_basename(path);

      const notification = new Notification();
      notification.set_title(name);

      if (error) {
        notification.set_body(`“${filename}” ${error.message}`);
      } else {
        notification.set_body(`“${filename}”`);
        if (env !== "flatpak") {
          notification.set_default_action(`app.openURI('${path}')`);
          notification.add_button("Open file", `app.openURI('${path}')`);
          const dirname = path_get_dirname(path);
          notification.add_button("Open folder", `app.openURI('${dirname}')`);
        }
      }

      application.send_notification(null, notification);
    });

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.download#signal-decide-destination
    download.connect("decide-destination", (self, suggested_filename) => {
      if (!suggested_filename || suggested_filename === "unknown.asc") {
        suggested_filename = "";
      }

      const dest_dir = get_user_special_dir(UserDirectory.DIRECTORY_DOWNLOAD);
      const dest_name = suggested_filename.replace(
        new RegExp(DIR_SEPARATOR_S, "g"),
        "_"
      );

      const dialog = new FileChooserNative({
        action: FileChooserAction.SAVE,
        transient_for: window,
        do_overwrite_confirmation: true,
        create_folders: true,
      });
      // On Linux Mint XFCE 19.2 the default label is 'Open'
      dialog.set_accept_label("Save");
      // dest_dir is null in sandbox
      if (dest_dir) {
        dialog.set_current_folder(dest_dir);
      }
      dialog.set_current_name(dest_name);

      if (dialog.run() !== ResponseType.ACCEPT) {
        download.cancel();
        dialog.destroy();
        // TODO open issue
        // return true segfaults
        return;
      }

      download.set_destination(dialog.get_uri());
      dialog.destroy();

      return false;
    });
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.cookiemanager
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
    enable_back_forward_navigation_gestures: true,
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
  // webInspector.show();

  connect(webView, {
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
  });

  webView.instance_id = id;
  webView.show_all();

  webView.load_uri(url || "about:blank");

  return webView;
}
