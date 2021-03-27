import Gtk from "gi://Gtk";
import GLib from "gi://GLib";
import Gio from "gi://Gio";

const { uuid_string_random } = GLib;
const { ApplicationWindow, Stack, StackTransitionType } = Gtk;
const { Notification, NotificationPriority } = Gio;

import Notebook from "./Notebook.js";
import Shortcuts from "./Shortcuts.js";
import Actions from "./Actions.js";
import { Settings, observeSetting } from "./util.js";
import {
  getWebAppInfo,
  // download,
  // saveFavicon
} from "./webapp/webapp.js";

// https://github.com/flatpak/flatpak/issues/78#issuecomment-511158618
// log(imports.gi.Gio.SettingsBackend.get_default());

import { TabLabel, TabPage } from "./tab.js";
import { addInstanceDialog } from "./instanceDialog.js";
import Header from "./Header.js";
import {
  get as getInstance,
  attach as attachInstance,
  destroy as destroyInstance,
  list as instanceList,
  load as loadInstances,
  create as createInstance,
} from "./instances.js";
import flags from "./flags.js";
import { buildWebView } from "./WebView.js";
import { BLANK_URI, MODES } from "./constants.js";

export default function Window({ application, profile, state }) {
  profile.settings =
    "/re/sonny/Tangram/" + (profile.id ? `applications/${profile.id}/` : "");

  for (const key in profile) {
    log(`profile.${key}: ${profile[key]}`);
  }

  const settings = new Settings({
    schema_id: "re.sonny.Tangram",
    path: profile.settings,
  });

  const header = Header({
    onReload,
    onStopLoading,
    onGoBack,
    onGoForward,
    onGoHome,
    onAddTab,
    onCancelNewTab,
    profile,
    state,
    onNewTab,
  });

  function onStopLoading() {
    const tab = state.get("webview");
    tab && tab.stop_loading();
  }

  function onReload(bypass_cache) {
    const tab = state.get("webview");
    if (!tab) return;
    if (bypass_cache) {
      tab.reload_bypass_cache();
    } else {
      tab.reload();
    }
  }

  function onGoBack() {
    const tab = state.get("webview");
    tab && tab.go_back();
  }

  function onGoForward() {
    const tab = state.get("webview");
    tab && tab.go_forward();
  }

  function onGoHome() {
    const tab = state.get("webview");
    if (!tab || !tab.instance_id) return;
    const instance = getInstance(tab.instance_id);
    if (!instance) return;
    tab.load_uri(instance.url);
  }

  function onShowInspector() {
    const tab = state.get("webview");
    tab && tab.get_inspector().show();
  }

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.applicationwindow
  const window = new ApplicationWindow({
    application,
    title: profile.title,
  });

  let width = settings.get_int("window-width");
  let height = settings.get_int("window-height");
  if (width && height) {
    window.set_default_size(width, height);
  } else {
    window.maximize();
    window.set_default_size(800, 600);
  }
  window.connect("size-allocate", () => {
    [width, height] = window.is_maximized ? [0, 0] : window.get_size();
  });
  window.connect("destroy", () => {
    settings.set_int("window-width", width);
    settings.set_int("window-height", height);
  });

  window.set_titlebar(header.titlebar);

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.stack
  const stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });
  state.bind("view", stack, "visible_child_name");
  window.add(stack);

  const notebook = Notebook({ profile, settings, application });
  stack.add_named(notebook, "tabs");
  stack.show_all();

  function showTab(idx) {
    notebook.set_current_page(idx);
    state.set({ view: "tabs", webview: notebook.get_nth_page(idx) });
  }

  function onNotification(webkit_notification, instance_id) {
    // TODO
    // report gjs bug webkit_notification.body and webkit_notification.title return undefined
    const body = webkit_notification.get_body();
    const title = webkit_notification.get_title();

    // https://gjs-docs.gnome.org/gio20~2.0_api/gio.notification
    const notification = new Notification();
    if (title) notification.set_title(title);
    if (body) notification.set_body(body);
    notification.set_priority(NotificationPriority.HIGH);
    notification.set_default_action(`app.showInstance('${instance_id}')`);
    application.send_notification(instance_id, notification);
  }

  function buildInstance(instance) {
    const page = TabPage({
      application,
      instance,
      window,
      onNotification,
    });
    return buildInstanceFromPage({ instance, page });
  }

  function buildInstanceFromPage({ instance, page }) {
    const label = TabLabel({ instance, settings, page });
    const idx = notebook.append_page(page, label);
    notebook.set_tab_reorderable(page, true);
    if (flags.custom_applications) {
      notebook.set_tab_detachable(page, true);
    }
    return idx;
  }

  async function onAddTab() {
    const webview = stack.get_child_by_name("new-tab");
    const { instance_id } = webview;
    const instance = getInstance(instance_id);
    instance.url = webview.uri;

    const info = await getWebAppInfo(webview);
    log(`WebApp info for ${instance.url}`);
    log(JSON.stringify(info, null, 2));

    instance.url = info.URL;

    if (!instance.name) {
      instance.name = info.title || webview.title || "";
    }

    // TODO icon
    // try {
    //   // await download(webview, info.icon, `file://${icon}`);
    //   const icon = saveFavicon(webview, instance);
    //   if (icon) instance.icon = icon;
    // } catch (err) {
    //   logError(err);
    // }

    let canceled;
    try {
      canceled = await addInstanceDialog({
        instance,
        window,
      });
    } catch (err) {
      logError(err);
      destroyInstance(instance);
      // TODO display error
      return;
    }

    if (canceled) {
      return;
    }

    webview.load_uri(instance.url);
    webview.mode = MODES.PERMANENT;

    attachInstance(settings, instance.id);
    stack.remove(webview);

    const idx = buildInstanceFromPage({
      page: webview,
      instance,
    });
    showTab(idx);
  }

  function onCancelNewTab() {
    // FIXME set webview!!
    // state.set({ view: "tabs", webview: notebook.get_nth_child(notebook.page) });
    showTab(notebook.page || 0);
    const webView = stack.get_child_by_name("new-tab");
    if (!webView) return;
    webView.destroy();
    const { instance_id } = webView;
    const instance = getInstance(instance_id);
    if (!instance) return;
    destroyInstance(instance);
  }

  function onNewTab() {
    const id = uuid_string_random().replace(/-/g, "");

    const instance = createInstance({
      url: BLANK_URI,
      id,
      name: "",
    });

    const webview = buildWebView({
      application,
      onNotification,
      window,
      instance,
    });
    webview.mode = MODES.TEMPORARY;

    const previous = stack.get_child_by_name("new-tab");
    if (previous) previous.destroy();
    stack.add_named(webview, "new-tab");
    state.set({ webview, view: "new-tab" });
  }

  loadInstances(settings);
  instanceList.forEach((instance) => {
    buildInstance(instance);
  });

  observeSetting(settings, "instances", (instances) => {
    state.set({ instances });
    if (instances.length === 0) {
      onNewTab();
    } else {
      const page = notebook.get_nth_page(notebook.page);
      state.set({
        view: "tabs",
        webview: page,
      });
    }
  });

  Shortcuts({
    window,
    application,
    notebook,
    addressBar: header.addressBar,
    onStopLoading,
    onReload,
    onGoBack,
    onGoForward,
    onGoHome,
    onShowInspector,
  });

  Actions({
    window,
    application,
    settings,
    profile,
    notebook,
    showTab,
  });

  return { window, notebook, showTab };
}
