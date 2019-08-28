const { VariantType } = imports.gi.GLib;
const { SimpleAction } = imports.gi.Gio;

const instances = imports.instances;

this.PersistentActions = function PersistentActions({
  getWindow,
  application,
}) {
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
};
