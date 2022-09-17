import GLib from "gi://GLib";
import Gio from "gi://Gio";

import Notebook from "./Notebook.js";
import Shortcuts from "./Shortcuts.js";
import Actions from "./Actions.js";
import { Settings, observeSetting } from "./util.js";
import {
  getWebAppInfo,
  // download,
  // saveFavicon
} from "./webapp/webapp.js";

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
import { buildWebView } from "./WebView.js";
import { BLANK_URI, MODES } from "./constants.js";
import * as instances from "./instances.js";

import builder from "./window.blp" assert { type: "builder" };

export default function Window({ application, state }) {
  const settings = new Settings({
    schema_id: "re.sonny.Tangram",
    path: "/re/sonny/Tangram/",
  });

  const header = Header({
    onReload,
    onStopLoading,
    onGoBack,
    onGoForward,
    onGoHome,
    onAddTab,
    onCancelNewTab,
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

  function onToggleWebInspector() {
    const tab = state.get("webview");
    if (!tab) return;
    const inspector = tab.get_inspector();

    if (inspector.attached_height) {
      inspector.close();
    } else {
      inspector.show();
    }
  }

  const window = builder.get_object("window");
  window.set_application(application);

  // https://wiki.gnome.org/HowDoI/SaveWindowState
  settings.bind(
    "window-width",
    window,
    "default-width",
    Gio.SettingsBindFlags.DEFAULT,
  );
  settings.bind(
    "window-height",
    window,
    "default-height",
    Gio.SettingsBindFlags.DEFAULT,
  );
  settings.bind(
    "window-maximized",
    window,
    "maximized",
    Gio.SettingsBindFlags.DEFAULT,
  );

  builder.get_object("main").prepend(header.titlebar);

  const stack = builder.get_object("stack");
  state.bind("view", stack, "visible_child_name");

  const notebook = Notebook({ settings, application });
  stack.add_named(notebook, "tabs");

  function showTab(idx) {
    notebook.set_current_page(idx);
    state.set({ view: "tabs", webview: notebook.get_nth_page(idx) });
  }

  function onNotification(webkit_notification, instance_id) {
    const priority = instances
      .get(instance_id)
      .settings.get_enum("notifications-priority");

    // TODO
    // report gjs bug webkit_notification.body and webkit_notification.title return undefined
    const body = webkit_notification.get_body();
    const title = webkit_notification.get_title();

    // https://gjs-docs.gnome.org/gio20~2.0_api/gio.notification
    const notification = new Gio.Notification();
    if (title) notification.set_title(title);
    if (body) notification.set_body(body);
    notification.set_priority(priority);
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
    return idx;
  }

  async function onAddTab() {
    const webview = stack.get_child_by_name("new-tab");
    const { instance_id } = webview;
    const instance = getInstance(instance_id);
    instance.url = webview.uri;

    const info = await getWebAppInfo(webview);
    console.debug(`WebApp info for ${instance.url}`, info);

    instance.url = info.URL;

    if (!instance.name) {
      instance.name = info.title || webview.title || "";
    }

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
    stack.remove(webView);
    const { instance_id } = webView;
    const instance = getInstance(instance_id);
    if (!instance) return;
    destroyInstance(instance);
  }

  function onNewTab() {
    const id = GLib.uuid_string_random().replace(/-/g, "");

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
    if (previous) stack.remove(previous);
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
    onToggleWebInspector,
  });

  Actions({
    window,
    application,
    settings,
    notebook,
    showTab,
  });

  window.present();

  return window;
}
