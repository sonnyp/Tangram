const {
  VariantType,
  Variant,
  uuid_string_random,
  get_tmp_dir,
  build_filenamev,
} = imports.gi.GLib;
const {
  ApplicationWindow,
  Notebook,
  Stack,
  StackTransitionType,
  AccelGroup,
  AccelFlags,
  accelerator_parse,
} = imports.gi.Gtk;
const { ModifierType, keyval_name } = imports.gi.Gdk;
const {
  Notification,
  NotificationPriority,
  SimpleAction,
  SettingsBindFlags,
} = imports.gi.Gio;
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
const { editInstanceDialog, addInstanceDialog } = imports.serviceDialog;
const { connect } = imports.util;
const { Header } = imports.header;
const {
  newApplicationDialog,
  createApplication,
  launchApplication,
  buildApplicationId,
  editApplicationDialog,
} = imports.applicationDialog;
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

  const addTabPage = buildHomePage({ onAddService });
  stack.add_named(addTabPage, "services");
  stack.show_all();

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.accelgroup
  const accelGroup = new AccelGroup();
  window.add_accel_group(accelGroup);
  const shortcuts = [
    [["Escape"], onStopLoading],
    [["<Primary>R", "F5"], onReload],
    [["<Primary><Shift>R", "<Shift>F5"], () => onReload(true)],
    [
      ["<Alt>Left"],
      () => {
        onGoBack();
        // prevents default notebook behavior
        return true;
      },
    ],
    [
      ["<Alt>Right"],

      () => {
        onGoForward();
        // prevents default notebook behavior
        return true;
      },
    ],
    [
      ["<Primary><Shift>I"],
      () => {
        getCurrentTab()
          .get_inspector()
          .show();
      },
    ],
    [
      ["<Primary>L"],
      () => {
        header.addressBar.grab_focus();
      },
    ],
  ];
  shortcuts.forEach(([accels, fn]) => {
    accels.forEach(accel => {
      const [accelerator_key, accelerator_mods] = accelerator_parse(accel);
      accelGroup.connect(
        accelerator_key,
        accelerator_mods,
        AccelFlags.VISIBLE,
        fn
      );
    });
  });

  function nextPage() {
    if (notebook.page === notebook.get_n_pages() - 1) {
      notebook.page = 0;
    } else {
      notebook.next_page();
    }
  }
  function prevPage() {
    if (notebook.page === 0) {
      notebook.page = notebook.get_n_pages() - 1;
    } else {
      notebook.prev_page();
    }
  }

  window.connect("key-press-event", (self, event) => {
    const [, modifier] = event.get_state();
    const [, keyval] = event.get_keyval();
    const name = keyval_name(keyval);

    // CTRL + Page_Down
    if (name === "Page_Down" && modifier === ModifierType.CONTROL_MASK) {
      nextPage();
      return true;
    }
    // CTRL + Tab
    if (
      ["Tab", "ISO_Left_Tab", "KP_Tab"].includes(name) &&
      modifier === ModifierType.CONTROL_MASK
    ) {
      nextPage();
      return true;
    }

    // CTRL + Page_Up
    if (name === "Page_Up" && modifier === ModifierType.CONTROL_MASK) {
      prevPage();
      return true;
    }
    // CTRL+SHIFT + Tab
    if (
      ["Tab", "ISO_Left_Tab", "KP_Tab"].includes(name) &&
      modifier === ModifierType.CONTROL_MASK + 1
    ) {
      prevPage();
      return true;
    }

    // CTRL+SHIFT + PageUp
    if (name === "Page_Up" && modifier === ModifierType.CONTROL_MASK + 1) {
      if (notebook.page === 0) return true;
      notebook.reorder_child(getCurrentTab(), notebook.page - 1);
      return true;
    }

    // CTRL+SHIFT + PageDown
    if (name === "Page_Down" && modifier === ModifierType.CONTROL_MASK + 1) {
      if (notebook.page === notebook.get_n_pages() - 1) return true;
      notebook.reorder_child(getCurrentTab(), notebook.page + 1);
      return true;
    }

    return false;
  });

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  // FIXME, is there a better way to bind setting to action?
  // or even better bind menu to setting, see header.js
  const tabsPosition = SimpleAction.new_stateful(
    "tabsPosition",
    VariantType.new("s"),
    Variant.new_string(settings.get_string("tabs-position"))
  );
  settings.connect("changed", (self, key) => {
    if (key !== "tabs-position") {
      return;
    }
    tabsPosition.set_state(
      Variant.new_string(settings.get_string("tabs-position"))
    );
  });
  tabsPosition.connect("change-state", (self, value) => {
    const position = value.get_string()[0];
    settings.set_string("tabs-position", position);
  });
  application.add_action(tabsPosition);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const selectTabAction = new SimpleAction({
    name: "selectTab",
    parameter_type: VariantType.new("s"),
  });
  selectTabAction.connect("activate", (self, parameters) => {
    const id = parameters.unpack();
    // FIXME get idx or child from id
    const idx = id;
    showTab(idx);
    window.present();
  });
  application.add_action(selectTabAction);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const detachTabAction = new SimpleAction({
    name: "detachTab",
    parameter_type: VariantType.new("s"),
  });
  detachTabAction.connect("activate", (self, parameters) => {
    const id = parameters.unpack();
    detachTab(id);
  });
  application.add_action(detachTabAction);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const removeInstanceAction = new SimpleAction({
    name: "removeInstance",
    parameter_type: VariantType.new("s"),
  });
  removeInstanceAction.connect("activate", (self, parameters) => {
    const instance = instances.get(parameters.deep_unpack());

    const idx = instances.detach(settings, instance.id);

    const page = notebook.get_nth_page(idx);
    if (page) {
      const label = notebook.get_tab_label(page);
      if (label) label.destroy();
      page.destroy();
    }

    try {
      instances.destroy(instance);
    } catch (err) {
      logError(err);
    }
  });
  application.add_action(removeInstanceAction);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const newApplication = SimpleAction.new("newApplication", null);
  newApplication.connect("activate", () => {
    newApplicationDialog({ window }).catch(log);
  });
  application.add_action(newApplication);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const editApplication = SimpleAction.new("editApplication", null);
  editApplication.connect("activate", () => {
    editApplicationDialog({ id: profile.id, window }).catch(logError);
  });
  application.add_action(editApplication);

  function showTab(idx) {
    notebook.set_current_page(idx);
    state.set({ view: "tabs" });
  }

  const editInstanceAction = new SimpleAction({
    name: "editInstance",
    parameter_type: VariantType.new("s"),
  });
  editInstanceAction.connect("activate", (self, parameters) => {
    const id = parameters.deep_unpack();
    const instance = instances.get(id);
    // FIXME - should we show the tab in case it is not the current?
    // showTab(idx);
    editInstanceDialog({ window, instance }).catch(logError);
  });
  application.add_action(editInstanceAction);

  const nthTab = new SimpleAction({
    name: "nth-tab",
    parameter_type: VariantType.new("i"),
  });
  for (let i = 1; i < 10; i++) {
    application.set_accels_for_action(`app.nth-tab(${i})`, [`<Alt>${i}`]);
  }
  nthTab.connect("activate", (self, parameters) => {
    const idx = parameters.deep_unpack();
    notebook.page = idx - 1;
  });
  application.add_action(nthTab);

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

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.notebook
  const notebook = new Notebook({ scrollable: true });
  // Tab bar only hides on custom applications
  if (profile.id) {
    state.bind(
      "instances",
      notebook,
      "show_tabs",
      instances => instances.length > 1
    );
  }
  notebook.connect("switch-page", (self, webview) => {
    state.set({ webview });
  });
  notebook.set_group_name("tabs");
  notebook.show_all();
  stack.add_named(notebook, "tabs");
  connect(
    notebook,
    {
      ["page-reordered"]() {
        const number_of_pages = notebook.get_n_pages();

        const instances = settings.get_strv("instances");
        const reordered = [];

        for (let i = 0; i < number_of_pages; i++) {
          const id = notebook.get_nth_page(i).instance_id;
          if (!instances.includes(id)) continue;
          reordered.push(id);
        }

        settings.set_strv("instances", reordered);
      },
    }
  );
  settings.bind("tabs-position", notebook, "tab_pos", SettingsBindFlags.GET);

  function detachTab(instance_id) {
    const instance = instances.get(instance_id);
    const { name, icon } = instance;
    const id = buildApplicationId(name);

    let app;

    try {
      app = createApplication({ name, icon, id });
    } catch (err) {
      logError(err);
      // TODO show error
      return;
    }

    const newAppSettings = new Settings({
      schema_id: "re.sonny.Tangram",
      path: `/re/sonny/Tangram/applications/${app.id}/`,
    });
    instances.attach(newAppSettings, instance.id);

    try {
      launchApplication(app);
    } catch (err) {
      logError(err);
      // todo show error and cleanup
      return;
    }

    const idx = instances.detach(settings, instance.id);

    const page = notebook.get_nth_page(idx);
    notebook.detach_tab(page);
    const label = notebook.get_tab_label(page);
    if (label) label.destroy();
    page.destroy();
  }

  notebook.connect("create-window", (self, page /*_x, _y */) => {
    detachTab(page.instance_id);
  });

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

  return window;
};
