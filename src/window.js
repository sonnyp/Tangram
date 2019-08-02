(() => {
  "use strict";

  const { VariantType, Variant, uuid_string_random } = imports.gi.GLib;
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
  const { Settings, observeSetting } = imports.util;

  // https://github.com/flatpak/flatpak/issues/78#issuecomment-511158618
  // log(imports.gi.Gio.SettingsBackend.get_default());

  const { buildHomePage } = imports.homePage;
  const { Tab, TabPage } = imports.tab;
  const { promptServiceDialog } = imports.serviceDialog;
  const { connect } = imports.util;
  const { Header } = imports.header;
  const {
    promptNewApplicationDialog,
    createApplication,
    launchApplication,
  } = imports.applicationDialog;

  this.Window = function Window({ application, profile }) {
    profile.settings =
      "/re/sonny/gigagram/" + (profile.id ? `applications/${profile.id}/` : "");

    for (const key in profile) {
      log(`profile.${key}: ${profile[key]}`);
    }

    const settings = new Settings({
      schema_id: "re.sonny.gigagram",
      path: profile.settings,
    });

    const header = Header({
      onAddTab: showServices,
      onCancel: showServices,
      onReload,
      onGoBack,
      onGoForward,
      onDoneAddingTab,
      profile,
    });

    function getCurrentTab() {
      const idx = notebook.get_current_page();
      if (idx < 0) return null;
      return notebook.get_nth_page(idx);
    }

    function onStop() {
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
    header.titlebar.show_all();

    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.stack
    const stack = new Stack();
    stack.set_transition_type(StackTransitionType.CROSSFADE);
    window.add(stack);
    const addTabPage = buildHomePage({ onAddService });
    stack.add_named(addTabPage, "services");
    stack.show_all();

    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.accelgroup
    const accelGroup = new AccelGroup();
    window.add_accel_group(accelGroup);
    const shortcuts = [
      [["Escape"], onStop],
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
      const idx = parameters.deep_unpack();
      showTabs(idx);
      window.present();
    });
    application.add_action(selectTabAction);

    // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
    const detachTabAction = new SimpleAction({
      name: "detachTab",
      parameter_type: VariantType.new("s"),
    });
    detachTabAction.connect("activate", (self, parameters) => {
      const id = parameters.deep_unpack();
      detachTab(id);
    });
    application.add_action(detachTabAction);

    function detachInstance(id) {
      const instances = settings.get_strv("instances");
      const idx = instances.indexOf(id);
      if (idx < 0) return;
      instances.splice(idx, 1);
      settings.set_strv("instances", instances);
      return idx;
    }
    // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
    const removeInstanceAction = new SimpleAction({
      name: "removeInstance",
      parameter_type: VariantType.new("s"),
    });
    removeInstanceAction.connect("activate", (self, parameters) => {
      const id = parameters.deep_unpack();

      const idx = detachInstance(id);
      const instanceSettings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${id}/`,
      });
      instanceSettings.reset("name");
      instanceSettings.reset("url");
      instanceSettings.reset("service");
      // https://gitlab.gnome.org/GNOME/glib/merge_requests/981#note_551625
      try {
        instanceSettings.reset("");
      } catch (err) {} // eslint-disable-line no-empty

      notebook.remove_page(idx);
    });
    application.add_action(removeInstanceAction);

    // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
    const newApplication = SimpleAction.new("newApplication", null);
    newApplication.connect("activate", () => {
      promptNewApplicationDialog({ window }).catch(log);
    });
    application.add_action(newApplication);

    function showTabs(idx) {
      if (idx) {
        notebook.set_current_page(idx);
      }
      header.left_stack.set_visible_child_name("tabs");
      header.right_stack.set_visible_child_name("tabs");
      stack.set_visible_child_name("tabs");
    }
    function showServices() {
      const instances = settings.get_strv("instances");
      stack.set_visible_child_name("services");
      if (instances.length > 0) {
        header.left_stack.set_visible_child_name("services");
        header.right_stack.set_visible_child_name("services");
      } else {
        header.left_stack.set_visible_child_name("none");
        header.right_stack.set_visible_child_name("none");
      }
    }

    const editInstanceAction = new SimpleAction({
      name: "editInstance",
      parameter_type: VariantType.new("s"),
    });
    editInstanceAction.connect("activate", (self, parameters) => {
      const id = parameters.deep_unpack();
      // showTabs(idx); FIXME
      promptServiceDialog({ window, id, profile }).catch(logError);
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

    function onNotification({ title, body, idx }) {
      // https://gjs-docs.gnome.org/gio20~2.0_api/gio.notification
      const notification = new Notification();
      if (title) notification.set_title(title);
      if (body) notification.set_body(body);
      notification.set_priority(NotificationPriority.HIGH);
      notification.set_default_action(`app.selectTab('${idx}')`);
      application.send_notification(null, notification);
    }

    function buildInstance({ url, name, service_id, id }) {
      const instanceSettings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${id}/`,
      });

      const { label, page } = Tab(
        {
          url,
          name,
          window,
          service_id,
          id,
          onNotification: notification =>
            onNotification({ ...notification, idx }),
        },
        settings,
        instanceSettings
      );

      label.show_all();
      page.show_all();
      const idx = notebook.append_page(page, label);
      notebook.set_tab_reorderable(page, true);
      notebook.set_tab_detachable(page, true);
      return idx;
    }

    let serviceBeingAdded;

    async function onDoneAddingTab() {
      const webView = stack.get_child_by_name("webview");
      const instance = await promptServiceDialog({
        profile,
        window,
        uri: webView.uri,
        service: serviceBeingAdded,
      });
      if (!instance) return;

      const { name, url, id, service_id } = instance;
      const instances = settings.get_strv("instances");
      instances.push(id);
      settings.set_strv("instances", instances);

      const idx = buildInstance({ url, name, service_id, id });
      showTabs(idx);
    }

    async function onAddService(service) {
      const { url } = service;
      const service_id = service.id;
      // FIXME should we keep the prefix service.name ? could be confusing when renaming/custom
      const id = `${service.name}-${uuid_string_random().replace(/-/g, "")}`;
      const webview = TabPage({
        url,
        service_id,
        id,
        window,
        // FIXME fix idx - maybe use id?
        onNotification: notification =>
          onNotification({ ...notification, idx: 99 }),
      });

      header.left_stack.set_visible_child_name("services");
      header.right_stack.set_visible_child_name("services");

      stack.add_named(webview, "webview");
      stack.show_all();
      stack.set_visible_child_name("webview");

      serviceBeingAdded = service;

      return;
      // const instance = await promptServiceDialog({
      //   profile,
      //   window,
      //   service,
      // });
      // if (!instance) return;

      // const { name, url, id, service_id } = instance;
      // const instances = settings.get_strv("instances");
      // instances.push(id);
      // settings.set_strv("instances", instances);

      // const idx = buildInstance({ url, name, service_id, id });
      // showTabs(idx);
    }

    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.notebook
    const notebook = new Notebook({ scrollable: true, show_tabs: false });
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

    // if (getenv("DEV")) {
    //   buildInstance({
    //     url: "https://jhmux.codesandbox.io/",
    //     name: "Tests",
    //     id: "gigagram-tests",
    //     service_id: "custom",
    //   });
    // }

    observeSetting(settings, "instances", instances => {
      if (instances.length === 0) {
        showServices();
        return;
      }

      notebook.set_show_tabs(instances.length > 1);
      showTabs();
    });

    function detachTab(instance_id) {
      const instanceSettings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${instance_id}/`,
      });
      const name = instanceSettings.get_string("name");
      // const icon = instanceSettings.get_string("icon");

      let app;

      try {
        app = createApplication({ name });
      } catch (err) {
        logError(err);
        // TODO show error
        return;
      }

      const newAppSettings = new Settings({
        schema_id: "re.sonny.gigagram",
        path: `/re/sonny/gigagram/applications/${app.id}/`,
      });
      newAppSettings.set_strv("instances", [instance_id]);

      try {
        launchApplication(app);
      } catch (err) {
        logError(err);
        // todo show error and cleanup
        return;
      }

      const idx = detachInstance(instance_id);

      const page = notebook.get_nth_page(idx);
      notebook.detach_tab(page);
    }

    notebook.connect("create-window", (self, page /*_x, _y */) => {
      detachTab(page._instance_id);
    });

    const instances = settings.get_strv("instances");
    instances.forEach(id => {
      const settings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${id}/`,
      });
      const name = settings.get_string("name");
      const url = settings.get_string("url");
      const service_id = settings.get_string("service");
      if (!url || !service_id) return;

      buildInstance({ url, name, id, service_id });
    });

    return window;
  };
})();
