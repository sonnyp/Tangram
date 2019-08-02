(() => {
  "use strict";

  const { WindowTypeHint } = imports.gi.Gdk;
  const { once, Settings } = imports.util;
  const {
    Dialog,
    Align,
    Grid,
    Label,
    Entry,
    ResponseType,
    EntryIconPosition,
  } = imports.gi.Gtk;

  const GLib = imports.gi.GLib;
  const Gtk = imports.gi.Gtk;

  const { uuid_string_random } = imports.gi.GLib;

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

  this.promptServiceDialog = async function promptServiceDialog({
    window,
    service,
    id,
    profile,
  }) {
    let settings;

    if (id) {
      // https://gjs-docs.gnome.org/gio20~2.0_api/gio.settings
      settings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: profile.settings + `instances/${id}/`,
      });
    }

    // read properties of service
    const showName = settings ? settings.get_string("name") : service.name;
    const showURL = settings ? settings.get_string("url") : service.url;
    const showIcon = settings ? settings.get_string("icon") : service.icon;

    // FIXME Dialog.new_with_buttons
    // is undefined in gjs, open issue.
    // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
    // "Action Dialogs"
    // and
    // https://developer.gnome.org/hig/stable/visual-layout.html.en
    const dialog = new Dialog({
      title: `${settings ? "Edit" : "Add"} ${showName}`,
      modal: true,
      type_hint: WindowTypeHint.DIALOG,
      use_header_bar: true,
      transient_for: window,
      resizable: false,
    });

    dialog.add_button("Cancel", ResponseType.CANCEL);
    const primaryButton = dialog.add_button(
      id ? "Edit" : "Add",
      ResponseType.APPLY
    );
    primaryButton.get_style_context().add_class("suggested-action");
    primaryButton.grab_focus();

    const contentArea = dialog.get_content_area();
    contentArea.margin = 18;

    // grid.attach(frame, column, rom, ?, ?)

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
      text: showName,
    });
    grid.attach(nameEntry, 2, 1, 1, 1);

    const URLLabel = new Label({
      label: "URL",
      halign: Align.END,
    });
    grid.attach(URLLabel, 1, 2, 1, 1);

    const URLEntry = new Entry({
      text: showURL,
      hexpand: true,
    });
    grid.attach(URLEntry, 2, 2, 1, 1);

    const iconLabel = new Label({
      label: "Icon",
      halign: Align.END,
    });
    grid.attach(iconLabel, 1, 3, 1, 1);
    const iconEntry = new Entry({
      text: showIcon,
      hexpand: true,
    });
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

    const name = nameEntry.text;
    const url = URLEntry.text;
    const icon = iconEntry.text;

    if (!settings) {
      id = `${name}-${uuid_string_random().replace(/-/g, "")}`;
      settings = new Settings({
        schema_id: "re.sonny.gigagram.Instance",
        path: profile.settings + `instances/${id}/`,
      });
    }

    settings.set_string("name", name);
    settings.set_string("url", url);
    settings.set_string("icon", icon);
    if (service) {
      settings.set_string("service", service.id);
    }
    // binding example
    // settings.bind("name", nameEntry, "text", SettingsBindFlags.DEFAULT);

    dialog.destroy();

    return {
      name,
      url,
      icon,
      id,
      service_id: service ? service.id : "",
    };
  };
})();
