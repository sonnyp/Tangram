const { uuid_string_random, get_tmp_dir, build_filenamev } = imports.gi.GLib;
const { ApplicationWindow, Stack, StackTransitionType } = imports.gi.Gtk;

const { Notification, NotificationPriority } = imports.gi.Gio;

const { Notebook } = imports.Notebook;
const { Shortcuts } = imports.Shortcuts;
const { Actions } = imports.Actions;
const {
  Settings,
  observeSetting,
  getWebAppName,
  getWebAppIcon,
  download,
} = imports.util;

// https://github.com/flatpak/flatpak/issues/78#issuecomment-511158618
// log(imports.gi.Gio.SettingsBackend.get_default());

const { buildHomePage } = imports.homePage;
const { TabLabel, TabPage } = imports.tab;
const { addInstanceDialog } = imports.serviceDialog;
const { Header } = imports.header;
const instances = imports.instances;

this.Window = function Window({ application, profile, state }) {
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
    onAddTab,
    onCancelAddTab,
    profile,
    state,
    onAddService,
  });

  function getCurrentTab() {
    const idx = notebook.get_current_page();
    if (idx < 0) return null;
    return notebook.get_nth_page(idx);
  }

  function onStopLoading() {
    const tab = getCurrentTab();
    tab && tab.stop_loading();
  }

  function onReload(bypass_cache) {
    const tab = getCurrentTab();
    if (!tab) return;
    if (bypass_cache) {
      tab.reload_bypass_cache();
    } else {
      tab.reload();
    }
  }

  function onGoBack() {
    const tab = getCurrentTab();
    tab && tab.go_back();
  }

  function onGoForward() {
    const tab = getCurrentTab();
    tab && tab.go_forward();
  }

  function onShowInspector() {
    getCurrentTab()
      .get_inspector()
      .show();
  }

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.applicationwindow
  const window = new ApplicationWindow({
    application,
    title: profile.title,
    default_height: 620,
    default_width: 840,
  });
  window.set_titlebar(header.titlebar);

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.stack
  const stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });
  state.bind("view", stack, "visible_child_name");
  window.add(stack);

  const notebook = Notebook({ profile, settings });
  stack.add_named(notebook, "tabs");

  const addTabPage = buildHomePage({ onAddService });
  stack.add_named(addTabPage, "services");
  stack.show_all();

  function showTab(idx) {
    notebook.set_current_page(idx);
    state.set({ view: "tabs" });
  }

  function onNotification({ title, body, id }) {
    // https://gjs-docs.gnome.org/gio20~2.0_api/gio.notification
    const notification = new Notification();
    if (title) notification.set_title(title);
    if (body) notification.set_body(body);
    notification.set_priority(NotificationPriority.HIGH);
    notification.set_default_action(`app.selectTab('${id}')`);
    application.send_notification(null, notification);
  }

  function buildInstance(instance) {
    const page = TabPage({
      instance,
      window,
      onNotification,
    });
    return buildInstanceFromPage({ instance, page });
  }

  function buildInstanceFromPage({ instance, page }) {
    const label = TabLabel({ instance, settings });
    const idx = notebook.append_page(page, label);
    notebook.set_tab_reorderable(page, true);
    notebook.set_tab_detachable(page, true);
    return idx;
  }

  async function onAddTab() {
    const webview = stack.get_child_by_name("add-tab");
    const { instance_id } = webview;
    const instance = instances.get(instance_id);
    instance.url = webview.uri;

    const [iconURL, title] = await Promise.all([
      getWebAppIcon(webview),
      getWebAppName(webview),
    ]);

    if (!instance.name) {
      instance.name = title || webview.title || "";
    }

    const icon = build_filenamev([get_tmp_dir(), instance_id]);
    try {
      await download(webview, iconURL, `file://${icon}`);
      instance.icon = icon;
    } catch (err) {
      logError(err);
    }

    let canceled;
    try {
      canceled = await addInstanceDialog({
        instance,
        window,
      });
    } catch (err) {
      logError(err);
      instances.destroy(instance);
      // TODO display error
      return;
    }

    if (canceled) {
      return;
    }

    webview.load_uri(instance.url);

    instances.attach(settings, instance.id);
    stack.remove(webview);

    const idx = buildInstanceFromPage({
      page: webview,
      instance,
    });
    showTab(idx);
  }

  function onCancelAddTab() {
    state.set({ view: "services", webview: null });
    const webView = stack.get_child_by_name("add-tab");
    if (!webView) return;
    webView.destroy();
    const { instance_id } = webView;
    const instance = instances.get(instance_id);
    if (!instance) return;
    instances.destroy(instance);
  }

  function onAddService(service) {
    const { url, name } = service;
    const service_id = service.id;
    // FIXME should we keep the prefix service.name ? could be confusing when renaming/custom
    const id = `${service.id}-${uuid_string_random().replace(/-/g, "")}`;

    const instance = instances.create({
      url,
      service_id,
      id,
      name: service_id === "custom" ? "" : name,
    });

    const webview = TabPage({
      instance,
      window,
      onNotification,
    });

    stack.add_named(webview, "add-tab");
    state.set({ webview, view: "add-tab" });
    if (!url) {
      header.addressBar.grab_focus();
    }
  }

  instances.load(settings);
  instances.list.forEach(instance => {
    buildInstance(instance);
  });

  observeSetting(settings, "instances", instances => {
    state.set({
      instances,
      view: instances.length > 0 ? "tabs" : "services",
      webview: instances.length > 0 ? undefined : null,
    });
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
    onShowInspector,
  });

  Actions({ window, application, settings, showTab });

  return window;
};
