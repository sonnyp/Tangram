(() => {
  "use strict";

  const { FileChooserButton, FileChooserAction, FileFilter } = imports.gi.Gtk;

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.filefilter
  const iconFileFilter = new FileFilter();
  iconFileFilter.add_mime_type("image/svg+xml");
  iconFileFilter.add_mime_type("image/png");

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
})();
