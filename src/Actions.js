import GLib from "gi://GLib";
import Gio from "gi://Gio";

const { VariantType, Variant } = GLib;
const { SimpleAction } = Gio;

import { detachTab } from "./Notebook.js";
import * as instances from "./instances.js";
import {
  newApplicationDialog,
  editApplicationDialog,
} from "./applicationDialog.js";
import { editInstanceDialog } from "./instanceDialog.js";

export default function Actions({
  window,
  application,
  settings,
  profile,
  notebook,
  showTab,
}) {
  function showPage(page) {
    showTab(notebook.page_num(page));
  }

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  // FIXME, is there a better way to bind setting to action?
  // or even better bind menu to setting, see header.js
  const tabsPosition = SimpleAction.new_stateful(
    "tabsPosition",
    VariantType.new("s"),
    Variant.new_string(settings.get_string("tabs-position")),
  );
  settings.connect("changed::tabs-position", () => {
    tabsPosition.set_state(
      Variant.new_string(settings.get_string("tabs-position")),
    );
  });
  tabsPosition.connect("change-state", (self, value) => {
    const position = value.get_string()[0];
    settings.set_string("tabs-position", position);
  });
  application.add_action(tabsPosition);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const detachTabAction = new SimpleAction({
    name: "detachTab",
    parameter_type: VariantType.new("s"),
  });
  detachTabAction.connect("activate", (self, parameters) => {
    const id = parameters.unpack();
    detachTab({ instance_id: id, settings, notebook });
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

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const editInstanceAction = new SimpleAction({
    name: "editInstance",
    parameter_type: VariantType.new("s"),
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
  application.add_action(editInstanceAction);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const quit = new SimpleAction({
    name: "quit",
    parameter_type: null,
  });
  quit.connect("activate", () => {
    window.destroy();
    // application.quit();
  });
  application.add_action(quit);
  application.set_accels_for_action("app.quit", ["<Ctrl>Q"]);
}
