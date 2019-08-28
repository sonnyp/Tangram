const { VariantType, Variant } = imports.gi.GLib;
const { SimpleAction } = imports.gi.Gio;

const { detachTab } = imports.Notebook;
const instances = imports.instances;
const {
  newApplicationDialog,
  editApplicationDialog,
} = imports.applicationDialog;
const { editInstanceDialog } = imports.instanceDialog;

this.Actions = function Actions({
  window,
  application,
  settings,
  profile,
  notebook,
  showTab,
}) {
  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  // FIXME, is there a better way to bind setting to action?
  // or even better bind menu to setting, see header.js
  const tabsPosition = SimpleAction.new_stateful(
    "tabsPosition",
    VariantType.new("s"),
    Variant.new_string(settings.get_string("tabs-position"))
  );
  settings.connect("changed::tabs-position", () => {
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
};
