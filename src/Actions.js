import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

import AboutDialog from "./AboutDialog.js";

import * as instances from "./instances.js";
import { editInstanceDialog } from "./instanceDialog.js";

export default function Actions({
  window,
  application,
  settings,
  notebook,
  showTab,
}) {
  function showPage(page) {
    showTab(notebook.page_num(page));
  }

  const tabsPosition = settings.create_action("tabs-position");
  window.add_action(tabsPosition);

  const removeInstanceAction = new Gio.SimpleAction({
    name: "removeInstance",
    parameter_type: GLib.VariantType.new("s"),
  });
  removeInstanceAction.connect("activate", (self, parameters) => {
    const id = parameters.deep_unpack();
    const instance = instances.get(id);

    // const idx = instances.detach(settings, instance.id);

    log([id]);

    const pages = notebook.get_pages();
    for (let i = 0; i < pages.get_n_items(); i++) {
      const page = pages.get_item(i);
      log([i, page.child.instance_id]);
    }

    notebook.remove_page(instance.page);

    return;

    try {
      instances.destroy(instance);
    } catch (err) {
      logError(err);
    }
  });
  window.add_action(removeInstanceAction);

  const editInstanceAction = new Gio.SimpleAction({
    name: "editInstance",
    parameter_type: GLib.VariantType.new("s"),
  });
  editInstanceAction.connect("activate", (self, parameters) => {
    const id = parameters.deep_unpack();
    const instance = instances.get(id);
    if (!instance) return;
    if (instance.page) {
      showPage(instance.page);
    }
    editInstanceDialog({ window, instance }).catch(logError);
  });
  window.add_action(editInstanceAction);

  const showAboutDialog = new Gio.SimpleAction({
    name: "about",
    parameter_type: null,
  });
  showAboutDialog.connect("activate", () => {
    AboutDialog({ window });
  });
  application.add_action(showAboutDialog);

  const showShortcutsDialog = new Gio.SimpleAction({
    name: "shortcuts",
    parameter_type: null,
  });
  showShortcutsDialog.connect("activate", () => {
    const builder = Gtk.Builder.new_from_resource(
      "/re/sonny/Tangram/data/shortcuts.xml.ui",
    );
    const shortcutsWindow = builder.get_object("shortcuts-window");
    shortcutsWindow.set_transient_for(window);
    shortcutsWindow.present();
  });
  application.add_action(showShortcutsDialog);

  const showInstanceAction = new Gio.SimpleAction({
    name: "showInstance",
    parameter_type: GLib.VariantType.new("s"),
  });
  showInstanceAction.connect("activate", (self, parameters) => {
    const id = parameters.unpack();

    const instance = instances.get(id);
    if (instance && instance.page) {
      showTab(notebook.page_num(instance.page));
    }

    window.present();
  });
  application.add_action(showInstanceAction);

  const openURIAction = new Gio.SimpleAction({
    name: "openURI",
    parameter_type: GLib.VariantType.new("s"),
  });
  openURIAction.connect("activate", (self, parameters) => {
    const path = parameters.unpack();
    Gio.AppInfo.launch_default_for_uri(path, null);
  });
  application.add_action(openURIAction);

  const quit = new Gio.SimpleAction({
    name: "quit",
    parameter_type: null,
  });
  quit.connect("activate", () => {
    application.quit();
  });
  application.add_action(quit);
}
