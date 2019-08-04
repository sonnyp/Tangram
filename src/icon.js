(() => {
  "use strict";

  const { FileChooserButton, FileChooserAction, FileFilter } = imports.gi.Gtk;
  const {
    build_filenamev,
    // mkdir_with_parents
  } = imports.gi.GLib;
  const { Pixbuf } = imports.gi.GdkPixbuf;

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.filefilter
  const iconFileFilter = new FileFilter();
  iconFileFilter.add_mime_type("image/svg+xml");
  iconFileFilter.add_mime_type("image/png");
  iconFileFilter.add_mime_type("image/jpeg");

  this.iconChooser = function iconChooser({ value }) {
    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.filechooser
    const fileChooserButton = new FileChooserButton({
      title: "Choose an icon",
      action: FileChooserAction.OPEN,
    });
    fileChooserButton.set_filter(iconFileFilter);
    if (value) fileChooserButton.select_filename(value);
    // fileChooserButton.connect("file-set", () => {
    //   log(fileChooserButton.get_file());
    // });
    return fileChooserButton;
  };

  this.saveIcon = function saveIcon(image, dir) {
    const pixbuf = Pixbuf.new_from_file_at_scale(image, 28, 28, true);

    // //make directory drwx------
    // mkdir_with_parents(data_dir, 0o700);

    const filepath = build_filenamev([dir, "icon.png"]);
    pixbuf.savev(filepath, "png", [], []);
    return filepath;
  };
})();
