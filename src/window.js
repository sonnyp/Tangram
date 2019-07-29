(() => {
  "use strict";

  const { VariantType, Variant } = imports.gi.GLib;
  const {
    ApplicationWindow,
    Notebook,
    Stack,
    StackTransitionType,
    AboutDialog,
    License,
  } = imports.gi.Gtk;
  const {
    Notification,
    NotificationPriority,
    SimpleAction,
    SettingsBindFlags,
  } = imports.gi.Gio;
  const { Settings } = imports.util;

  // https://github.com/flatpak/flatpak/issues/78#issuecomment-511158618
  // log(imports.gi.Gio.SettingsBackend.get_default());

  const { buildHomePage } = imports.homePage;
  const { Tab } = imports.tab;
  const { promptServiceDialog } = imports.serviceDialog;
  const { connect } = imports.util;
  const { Header } = imports.header;

  const settings = new Settings({
    schema_id: "re.sonny.gigagram",
  });

  this.Window = function Window(application) {
    const header = Header({
      onAddTab: showServices,
      onCancel: showTabs,
      onReload,
      onGoBack,
      onGoForward,
    });

    function onReload() {
      const child = notebook.get_nth_page(notebook.page);
      child.reload();
    }

    function onGoBack() {
      const child = notebook.get_nth_page(notebook.page);
      child.go_back();
    }

    function onGoForward() {
      const child = notebook.get_nth_page(notebook.page);
      child.go_forward();
    }

    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.applicationwindow
    const window = new ApplicationWindow({
      application,
      title: "Gigagram",
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
    const removeInstanceAction = new SimpleAction({
      name: "removeInstance",
      parameter_type: VariantType.new("s"),
    });
    removeInstanceAction.connect("activate", (self, parameters) => {
      const id = parameters.deep_unpack();

      const instances = settings.get_strv("instances");
      const idx = instances.indexOf(id);

      if (idx < 0) return;

      instances.splice(idx, 1);

      settings.set_strv("instances", instances);

      const instanceSettings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: `/re/sonny/gigagram/instances/${id}/`,
      });

      // instanceSettings.reset("");
      // https://gitlab.gnome.org/GNOME/glib/merge_requests/981#note_551625
      // so instead
      instanceSettings.reset("name");
      instanceSettings.reset("url");
      instanceSettings.reset("service");

      notebook.remove_page(idx);

      if (instances.length < 1) {
        showServices();
      }
    });
    application.add_action(removeInstanceAction);

    function showTabs(idx) {
      if (idx) {
        notebook.set_current_page(idx);
      }
      header.stack.set_visible_child_name("tabs");
      stack.set_visible_child_name("tabs");
    }
    function showServices() {
      const instances = settings.get_strv("instances");
      stack.set_visible_child_name("services");
      if (instances.length > 0) {
        header.stack.set_visible_child_name("services");
      } else {
        header.stack.set_visible_child_name("none");
      }
    }

    const editInstanceAction = new SimpleAction({
      name: "editInstance",
      parameter_type: VariantType.new("s"),
    });
    editInstanceAction.connect("activate", (self, parameters) => {
      const id = parameters.deep_unpack();
      // showTabs(idx); FIXME
      promptServiceDialog({ window, id }).catch(logError);
    });
    application.add_action(editInstanceAction);

    const showAboutDialog = new SimpleAction({
      name: "about",
      parameter_type: null,
    });
    showAboutDialog.connect("activate", () => {
      const aboutDialog = new AboutDialog({
        authors: ["Sonny Piers <sonny@fastmail.net>"],
        comments: "Web applications runner/manager",
        copyright: "Copyright © 2019 Gigagram authors",
        license_type: License.GPL_3_0_ONLY,
        version: pkg.version,
        website_label: "Learn more about Gigagram",
        website: "https://github.com/sonnyp/gigagram",
        transient_for: window,
        modal: true,
      });
      aboutDialog.present();
    });
    application.add_action(showAboutDialog);

    function buildInstance({ url, name, service_id, id }) {
      notebook.set_show_tabs(true);
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
          onNotification({ title, body }) {
            // https://gjs-docs.gnome.org/gio20~2.0_api/gio.notification
            const notification = new Notification();
            if (title) notification.set_title(title);
            if (body) notification.set_body(body);
            notification.set_priority(NotificationPriority.HIGH);
            notification.set_default_action(`app.selectTab('${idx}')`);
            application.send_notification(null, notification);
          },
        },
        settings,
        instanceSettings
      );
      label.show_all();
      page.show_all();
      const idx = notebook.append_page(page, label);
      notebook.set_tab_reorderable(page, true);
      return idx;
    }

    async function onAddService(service) {
      const instance = await promptServiceDialog({ window, service });
      if (!instance) return;

      const { name, url, id, service_id } = instance;
      const instances = settings.get_strv("instances");
      instances.push(id);
      settings.set_strv("instances", instances);

      const idx = buildInstance({ url, name, service_id, id });
      showTabs(idx);
    }

    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.notebook
    const notebook = new Notebook({ scrollable: true, show_tabs: false });
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

    const instances = settings.get_strv("instances");
    if (instances.length > 0) {
      showTabs();
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
    } else {
      showServices();
    }

    return window;
  };
})();
