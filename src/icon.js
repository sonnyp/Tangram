const {
  FileChooserNative,
  FileChooserAction,
  FileFilter,
  Button,
  Image,
  ResponseType,
} = imports.gi.Gtk;
const { Pixbuf } = imports.gi.GdkPixbuf;
const { pixbuf_get_from_surface } = imports.gi.Gdk;
const {
  get_tmp_dir,
  build_filenamev,
  // mkdir_with_parents
} = imports.gi.GLib;

this.saveFavicon = function(webview, instance) {
  const favicon = webview.get_favicon();
  if (!favicon) return null;

  const pixbuf = pixbuf_get_from_surface(
    favicon,
    0,
    0,
    favicon.getWidth(),
    favicon.getHeight()
  );
  if (!pixbuf) return null;

  const path = build_filenamev([get_tmp_dir(), instance.id]);
  if (!pixbuf.savev(path, "png", [], [])) return null;

  return path;
};

// https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.filefilter
const iconFileFilter = new FileFilter();
iconFileFilter.add_mime_type("image/svg+xml");
iconFileFilter.add_mime_type("image/png");
iconFileFilter.add_mime_type("image/jpeg");

const ICON_SIZE = 16;

this.iconChooser = function iconChooser(props) {
  const image = new Image();
  if (props.value.startsWith("resource://")) {
    image.set_from_resource(props.value.split("resource://")[1]);
  } else {
    const pixbuf = Pixbuf.new_from_file_at_scale(
      props.value,
      ICON_SIZE,
      ICON_SIZE,
      true
    );
    image.set_from_pixbuf(pixbuf);
  }
  image.set_size_request(ICON_SIZE, ICON_SIZE);

  const fileChooserButton = new Button({
    image,
  });

  let value = props.value;
  fileChooserButton.connect("clicked", () => {
    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.filechoosernative
    const fileChooserDialog = new FileChooserNative({
      action: FileChooserAction.OPEN,
      // Filter is not supported on flatpak
      // any alternative?
      filter: iconFileFilter,
      select_multiple: false,
      title: "Choose an icon",
      local_only: true,
      // TODO - no property parent on gjs
      // parent,
      transient_for: props.parent,
    });

    const result = fileChooserDialog.run();
    if (result === ResponseType.ACCEPT) {
      value = fileChooserDialog.get_filename();
      const pixbuf = Pixbuf.new_from_file_at_scale(
        value,
        ICON_SIZE,
        ICON_SIZE,
        true
      );
      image.set_from_pixbuf(pixbuf);
    }
    fileChooserDialog.destroy();
  });

  fileChooserButton.get_value = function() {
    return value;
  };

  return fileChooserButton;
};

this.saveIcon = function saveIcon(image, filepath) {
  const pixbuf = Pixbuf.new_from_file_at_scale(
    image,
    ICON_SIZE,
    ICON_SIZE,
    true
  );

  // //make directory drwx------
  // mkdir_with_parents(data_dir, 0o700);

  pixbuf.savev(filepath, "png", [], []);
  return filepath;
};
