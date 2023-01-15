import GLib from "gi://GLib";
import Gio from "gi://Gio";

import AboutDialog from "./AboutDialog.js";

import * as instances from "./instances.js";
import { editTabDialog } from "./instanceDialog.js";

import builder from "./shortcuts.blp" assert { type: "builder" };

export default function Actions({
  window,
  application,
  settings,
  selectTab,
  removeTab,
}) {
  const action_remove_tab = new Gio.SimpleAction({
    name: "removeTab",
    parameter_type: GLib.VariantType.new("s"),
  });
  action_remove_tab.connect("activate", (self, parameters) => {
    const id = parameters.deep_unpack();
    const instance = instances.get(id);

    instances.detach(settings, instance.id);
    removeTab(instance);

    instances.destroy(instance);
  });
  window.add_action(action_remove_tab);

  const action_edit_tab = new Gio.SimpleAction({
    name: "editTab",
    parameter_type: GLib.VariantType.new("s"),
  });
  action_edit_tab.connect("activate", (self, parameters) => {
    const id = parameters.deep_unpack();
    const instance = instances.get(id);
    if (!instance) return;
    selectTab(instance, false);
    editTabDialog({ window, instance }).catch(logError);
  });
  window.add_action(action_edit_tab);

  const showAboutDialog = new Gio.SimpleAction({
    name: "about",
    parameter_type: null,
  });
  showAboutDialog.connect("activate", () => {
    AboutDialog({ application });
  });
  application.add_action(showAboutDialog);

  const showShortcutsDialog = new Gio.SimpleAction({
    name: "shortcuts",
    parameter_type: null,
  });
  showShortcutsDialog.connect("activate", () => {
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
    if (instance) {
      selectTab(instance);
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
