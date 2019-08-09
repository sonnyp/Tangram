const {
  FileChooserNative,
  FileChooserAction,
  FileFilter,
  Button,
} = imports.gi.Gtk;
// const {
//   mkdir_with_parents,
// } = imports.gi.GLib;
const { Pixbuf } = imports.gi.GdkPixbuf;
const { Image, ResponseType } = imports.gi.Gtk;

// https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.filefilter
const iconFileFilter = new FileFilter();
iconFileFilter.add_mime_type("image/svg+xml");
iconFileFilter.add_mime_type("image/png");
iconFileFilter.add_mime_type("image/jpeg");

const ICON_SIZE = 128;

this.iconChooser = function iconChooser({ parent, value }) {
  const image = new Image();
  if (value) {
    const pixbuf = Pixbuf.new_from_file_at_size(value, ICON_SIZE, ICON_SIZE);
    image.set_from_pixbuf(pixbuf);
  } else {
    // text = "(default)";
  }
  image.set_size_request(ICON_SIZE, ICON_SIZE);

  const fileChooserButton = new Button({
    image,
  });

  let filename = value;
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
      transient_for: parent,
    });

    const result = fileChooserDialog.run();
    if (result === ResponseType.ACCEPT) {
      filename = fileChooserDialog.get_filename();
      const pixbuf = Pixbuf.new_from_file_at_scale(
        filename,
        ICON_SIZE,
        ICON_SIZE,
        true
      );
      image.set_from_pixbuf(pixbuf);
    }
    fileChooserDialog.destroy();
  });

  fileChooserButton.get_filename = function() {
    return filename;
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
