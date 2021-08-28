import GLib from "gi://GLib";
import Gio from "gi://Gio";

const { VariantType } = GLib;
const { SimpleAction, AppInfo } = Gio;

import * as instances from "./instances.js";

export function PersistentActions({ getWindow, application }) {
  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const showInstanceAction = new SimpleAction({
    name: "showInstance",
    parameter_type: VariantType.new("s"),
  });
  showInstanceAction.connect("activate", (self, parameters) => {
    const id = parameters.unpack();
    const { window, showTab, notebook } = getWindow();

    const instance = instances.get(id);
    if (instance && instance.page) {
      showTab(notebook.page_num(instance.page));
    }

    window.present();
  });
  application.add_action(showInstanceAction);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const openURIAction = new SimpleAction({
    name: "openURI",
    parameter_type: VariantType.new("s"),
  });
  openURIAction.connect("activate", (self, parameters) => {
    const path = parameters.unpack();
    AppInfo.launch_default_for_uri(path, null);
  });
  application.add_action(openURIAction);
}
