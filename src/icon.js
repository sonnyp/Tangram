const {
  FileChooserDialog,
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

this.iconChooser = function iconChooser({ value, size }) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.filechooser

  const image = new Image();

  if (value) {
    const pixbuf = Pixbuf.new_from_file_at_size(value, size, size);
    image.set_from_pixbuf(pixbuf);
  } else {
    // text = "(default)";
  }

  image.set_size_request(size, size);
  const fileChooserButton = new Button({
    image: image,
  });

  fileChooserButton.filename = null;

  fileChooserButton.connect("clicked", () => {
    const fileChooserDialog = new FileChooserDialog({
      action: FileChooserAction.OPEN,
      filter: iconFileFilter,
      select_multiple: false,
      title: "Choose an icon",
    });
    fileChooserDialog.add_button("Cancel", ResponseType.CANCEL);
    fileChooserDialog.add_button("OK", ResponseType.OK);

    //inside lambda in order to recreate dialog every time

    const result = fileChooserDialog.run();
    if (result === ResponseType.OK) {
      fileChooserButton.filename = fileChooserDialog.get_filename();
      const pixbuf = Pixbuf.new_from_file_at_scale(
        fileChooserButton.filename,
        size,
        size,
        true
      );
      //don't save as it can still change
      image.set_from_pixbuf(pixbuf);
      //label.set_label(fileChooserButton.filename.split("/").pop());
    }
    fileChooserDialog.destroy();
  });

  fileChooserButton.get_filename = function() {
    return fileChooserButton.filename;
  };

  return fileChooserButton;
};

this.saveIcon = function saveIcon(image, filepath, size) {
  const pixbuf = Pixbuf.new_from_file_at_scale(image, size, size, true);

  // //make directory drwx------
  // mkdir_with_parents(data_dir, 0o700);

  pixbuf.savev(filepath, "png", [], []);
  return filepath;
};
