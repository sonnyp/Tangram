(() => {
  "use strict";

  const { WindowTypeHint } = imports.gi.Gdk;
  const { once } = imports.util;
  const {
    Dialog,
    Align,
    Grid,
    Label,
    Entry,
    ResponseType,
    EntryIconPosition,
  } = imports.gi.Gtk;
  const { SettingsBindFlags } = imports.gi.Gio;

  const GLib = imports.gi.GLib;
  const Gtk = imports.gi.Gtk;

  const openIconChooserDialog = function() {
    const filter = new Gtk.FileFilter();
    filter.add_mime_type("image/png");
    filter.add_mime_type("image/jpeg");
    filter.add_mime_type("image/svg+xml");

    const chooser = new Gtk.FileChooserDialog({
      action: Gtk.FileChooserAction.OPEN,
      filter: filter,
      select_multiple: false,
      //transient_for: this.window,
      title: "Choose an icon",
    });

    // Without setting a current folder, folders won't show its contents
    chooser.set_current_folder(GLib.get_home_dir());

    chooser.add_button("Cancel", Gtk.ResponseType.CANCEL);
    chooser.add_button("OK", Gtk.ResponseType.OK);

    chooser.set_filter(filter);

    // Run the dialog
    const result = chooser.run();
    const name = chooser.get_filename();
    chooser.destroy();

    if (result === Gtk.ResponseType.OK) {
      return name;
    }
    return null;
  };

  this.editInstanceDialog = function editInstanceDialog({ window, instance }) {
    return serviceDialog({ window, instance, action: "Edit" });
  };

  this.addInstanceDialog = function editInstanceDialog({ window, instance }) {
    return serviceDialog({ window, instance, action: "Add " });
  };

  async function serviceDialog({ window, instance, action }) {
    // TODO Dialog.new_with_buttons
    // is undefined in gjs, open issue.
    // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
    // "Action Dialogs"
    // and
    // https://developer.gnome.org/hig/stable/visual-layout.html.en
    const dialog = new Dialog({
      title: `${action} ${instance.name}`,
      modal: true,
      type_hint: WindowTypeHint.DIALOG,
      use_header_bar: true,
      transient_for: window,
      resizable: false,
    });

    dialog.add_button("Cancel", ResponseType.CANCEL);
    const primaryButton = dialog.add_button(action, ResponseType.APPLY);
    primaryButton.get_style_context().add_class("suggested-action");
    primaryButton.grab_focus();

    const contentArea = dialog.get_content_area();
    contentArea.margin = 18;

    const grid = new Grid({
      column_spacing: 12,
      row_spacing: 6,
    });
    contentArea.add(grid);

    const nameLabel = new Label({
      label: "Name",
      halign: Align.END,
    });
    grid.attach(nameLabel, 1, 1, 1, 1);
    const nameEntry = new Entry({
      hexpand: true,
    });
    instance.bind("name", nameEntry, "text", SettingsBindFlags.DEFAULT);
    grid.attach(nameEntry, 2, 1, 1, 1);

    const URLLabel = new Label({
      label: "URL",
      halign: Align.END,
    });
    grid.attach(URLLabel, 1, 2, 1, 1);

    const URLEntry = new Entry({
      hexpand: true,
    });
    instance.bind("url", URLEntry, "text", SettingsBindFlags.DEFAULT);
    grid.attach(URLEntry, 2, 2, 1, 1);

    const iconLabel = new Label({
      label: "Icon",
      halign: Align.END,
    });
    grid.attach(iconLabel, 1, 3, 1, 1);
    const iconEntry = new Entry({
      hexpand: true,
    });
    instance.bind("icon", iconEntry, "text", SettingsBindFlags.DEFAULT);
    grid.attach(iconEntry, 2, 3, 1, 1);

    const fileButton = new Gtk.Button({ label: "choose" });
    grid.attach(fileButton, 3, 3, 1, 1);

    // Bind it to a function that says what to do when the button is clicked
    fileButton.connect("clicked", () => {
      const file = openIconChooserDialog();
      if (file) {
        iconEntry.text = file;
      }
    });

    primaryButton.set_sensitive(!!URLEntry.text);
    URLEntry.set_icon_tooltip_text(
      EntryIconPosition.SECONDARY,
      "Cannot be empty"
    );
    URLEntry.set_icon_activatable(EntryIconPosition.SECONDARY, false);
    URLEntry.connect("changed", () => {
      const isValid = !!URLEntry.text;
      if (isValid) {
        URLEntry.set_icon_from_icon_name(EntryIconPosition.SECONDARY, null);
        primaryButton.set_sensitive(true);
        return;
      }

      primaryButton.set_sensitive(false);
      URLEntry.set_icon_from_icon_name(
        EntryIconPosition.SECONDARY,
        "face-sick-symbolic"
      );
    });

    dialog.show_all();

    const [response_id] = await once(dialog, "response");
    if (response_id === ResponseType.DELETE_EVENT) {
      return;
    }
    if (response_id !== ResponseType.APPLY) {
      dialog.destroy();
      return;
    }

    dialog.destroy();
  }
})();
