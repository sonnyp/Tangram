(() => {
  "use strict";

  const { Gtk, GLib, GdkPixbuf } = imports.gi;

  const [ok, contents] = GLib.file_get_contents("./src/services.json");

  let services;

  if (ok) {
    services = JSON.parse(contents);
  }

  this.buildHomePage = function buildHomePage({ onAddService }) {
    const scrolledWindow = new Gtk.ScrolledWindow();
    const viewPort = new Gtk.Viewport();
    scrolledWindow.add(viewPort);
    const flowBox = new Gtk.FlowBox({
      homogeneous: true,
      halign: Gtk.Align.CENTER,
      valign: Gtk.Align.START,
      max_children_per_line: 10,
    });
    viewPort.add(flowBox);

    services.forEach(service => {
      const flowBoxChild = new Gtk.FlowBoxChild({
        width_request: 200,
        height_request: 200,
        can_focus: false,
      });

      let pixbuf = GdkPixbuf.Pixbuf.new_from_file(
        `./src/icons/${service.logo}`
      );
      pixbuf = pixbuf.scale_simple(48, 48, GdkPixbuf.InterpType.BILINEAR);
      const image = new Gtk.Image({
        pixbuf,
      });

      const button = new Gtk.Button({
        width_request: 200,
        height_request: 200,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
        image,
        always_show_image: true,
        label: service.name,
        image_position: Gtk.PositionType.TOP,
        relief: Gtk.ReliefStyle.NONE,
      });
      // FIXME get_data/set_data does not work in gjs
      // open issue.
      button.service_id = service.id;
      button.connect("clicked", onButtonclicked);

      flowBoxChild.add(button);
      flowBox.add(flowBoxChild);
    });

    function onButtonclicked({ service_id }) {
      const service = services.find(({ id }) => id === service_id);
      if (!service) return;
      onAddService(service).catch(logError);
    }

    return scrolledWindow;
  };
})();
