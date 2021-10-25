import Gtk from "gi://Gtk";
import Gio from "gi://Gio";

const { Application, Builder } = Gtk;
const {
  // ApplicationFlags,
  SimpleAction,
} = Gio;

import AboutDialog from "./AboutDialog.js";
import Window from "./window.js";
import state from "./state.js";
import { PersistentActions } from "./persistentActions.js";

const application = new Application({
  application_id: "re.sonny.Tangram",
});
export default application;

let window;

function getWindow() {
  if (!window) {
    window = Window({ state, application });
  }

  return window;
}

application.connect("activate", (app) => {
  if (app.active_window) {
    app.active_window.present();
    return;
  }
  getWindow().window.present();
});

const showAboutDialog = new SimpleAction({
  name: "about",
  parameter_type: null,
});
showAboutDialog.connect("activate", () => {
  AboutDialog({ window: window.window });
});
application.add_action(showAboutDialog);

const showShortcutsDialog = new SimpleAction({
  name: "shortcuts",
  parameter_type: null,
});
showShortcutsDialog.connect("activate", () => {
  const builder = Builder.new_from_resource(
    "/re/sonny/Tangram/data/shortcuts.xml.ui",
  );
  const shortcutsWindow = builder.get_object("shortcuts-window");
  shortcutsWindow.set_transient_for(window.window);
  shortcutsWindow.present();
});
application.add_action(showShortcutsDialog);
application.set_accels_for_action("app.shortcuts", [
  "<Ctrl>F1",
  "<Ctrl>question",
]);

PersistentActions({ application, getWindow });
