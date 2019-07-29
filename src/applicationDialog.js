(() => {
  "use strict";

  const { WindowTypeHint } = imports.gi.Gdk;
  const { once } = imports.util;
  const {
    // Box,
    Dialog,
    Align,
    Grid,
    Label,
    Entry,
    ResponseType,
    // Orientation,
  } = imports.gi.Gtk;

  const {
    KeyFile,
    get_user_data_dir,
    build_filenamev,
    spawn_async,
    SpawnFlags,
  } = imports.gi.GLib;
  const {
    KEY_FILE_DESKTOP_GROUP,
    KEY_FILE_DESKTOP_KEY_CATEGORIES,
    KEY_FILE_DESKTOP_KEY_VERSION,
    KEY_FILE_DESKTOP_KEY_NAME,
    KEY_FILE_DESKTOP_KEY_EXEC,
    KEY_FILE_DESKTOP_KEY_TERMINAL,
    KEY_FILE_DESKTOP_KEY_TYPE,
    KEY_FILE_DESKTOP_KEY_STARTUP_NOTIFY,
    KEY_FILE_DESKTOP_TYPE_APPLICATION,
  } = imports.gi.GLib;

  this.promptNewApplicationDialog = async function promptNewApplicationDialog({
    window,
  }) {
    // FIXME Dialog.new_with_buttons
    // is undefined in gjs, open issue.
    // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
    // "Action Dialogs"
    // and
    // https://developer.gnome.org/hig/stable/visual-layout.html.en
    const dialog = new Dialog({
      title: `New Application`,
      modal: true,
      type_hint: WindowTypeHint.DIALOG,
      use_header_bar: true,
      transient_for: window,
      resizable: false,
    });

    dialog.add_button("Cancel", ResponseType.CANCEL);
    const primaryButton = dialog.add_button("Confirm", ResponseType.APPLY);
    primaryButton.get_style_context().add_class("suggested-action");
    primaryButton.grab_focus();
    primaryButton.set_sensitive(false);

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
      text: "",
    });
    nameEntry.connect("changed", () => {
      primaryButton.set_sensitive(!!nameEntry.text);
    });
    grid.attach(nameEntry, 2, 1, 1, 1);

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

    dialog.destroy();

    const keyFile = new KeyFile();
    // https://developer.gnome.org/integration-guide/stable/desktop-files.html.en
    // https://standards.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html
    // https://specifications.freedesktop.org/menu-spec/menu-spec-1.0.html
    keyFile.set_value(
      KEY_FILE_DESKTOP_GROUP,
      KEY_FILE_DESKTOP_KEY_VERSION,
      "1.0"
    );
    keyFile.set_value(KEY_FILE_DESKTOP_GROUP, KEY_FILE_DESKTOP_KEY_NAME, name);
    keyFile.set_value(
      KEY_FILE_DESKTOP_GROUP,
      KEY_FILE_DESKTOP_KEY_EXEC,
      "re.sonny.gigagram"
    );
    keyFile.set_value(
      KEY_FILE_DESKTOP_GROUP,
      KEY_FILE_DESKTOP_KEY_TERMINAL,
      "false"
    );
    keyFile.set_value(
      KEY_FILE_DESKTOP_GROUP,
      KEY_FILE_DESKTOP_KEY_TYPE,
      KEY_FILE_DESKTOP_TYPE_APPLICATION
    );
    keyFile.set_value(
      KEY_FILE_DESKTOP_GROUP,
      KEY_FILE_DESKTOP_KEY_CATEGORIES,
      "Network;GNOME;GTK"
    );
    keyFile.set_value(
      KEY_FILE_DESKTOP_GROUP,
      KEY_FILE_DESKTOP_KEY_STARTUP_NOTIFY,
      "true"
    );
    keyFile.set_value(
      KEY_FILE_DESKTOP_GROUP,
      "X-GNOME-UsesNotifications",
      "true"
    );

    const filePath = build_filenamev([
      get_user_data_dir(),
      "applications",
      `${name}.desktop`,
    ]);
    keyFile.save_to_file(filePath);

    spawn_async(
      null,
      ["/usr/bin/gtk-launch", name],
      null,
      SpawnFlags.DEFAULT,
      null
    );
  };
})();
