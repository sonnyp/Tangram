(() => {
  "use strict";

  const { WindowTypeHint } = imports.gi.Gdk;
  const { once, desktopEntry } = imports.util;
  const { programInvocationName } = imports.system;
  const {
    Dialog,
    Align,
    Grid,
    Label,
    Entry,
    ResponseType,
    FileChooserButton,
    FileChooserAction,
    FileFilter,
  } = imports.gi.Gtk;

  const iconFileFilter = new FileFilter();
  iconFileFilter.add_mime_type("image/svg+xml");
  iconFileFilter.add_mime_type("image/png");

  const {
    get_user_data_dir,
    build_filenamev,
    getenv,
    path_is_absolute,
    get_current_dir,
    KEY_FILE_DESKTOP_KEY_CATEGORIES,
    KEY_FILE_DESKTOP_KEY_NAME,
    KEY_FILE_DESKTOP_KEY_EXEC,
    KEY_FILE_DESKTOP_KEY_TERMINAL,
    KEY_FILE_DESKTOP_KEY_TYPE,
    KEY_FILE_DESKTOP_KEY_STARTUP_NOTIFY,
    KEY_FILE_DESKTOP_TYPE_APPLICATION,
    KEY_FILE_DESKTOP_KEY_ICON,
    uuid_string_random,
    unlink,
  } = imports.gi.GLib;
  const { DesktopAppInfo } = imports.gi.Gio;

  let bin;
  if (getenv("FLATPAK_ID")) {
    bin = pkg.name;
  } else {
    bin = path_is_absolute(programInvocationName)
      ? programInvocationName
      : build_filenamev([get_current_dir(), programInvocationName]);
  }
  log(`bin: ${bin}`);

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

    const iconLabel = new Label({
      label: "Icon",
      halign: Align.END,
    });
    grid.attach(iconLabel, 1, 2, 1, 1);
    const fileChooserButton = new FileChooserButton({
      title: "Choose an icon",
      action: FileChooserAction.OPEN,
    });
    fileChooserButton.set_current_folder("/usr/share/icons");
    // fileChooserButton.connect("file-set", () => {
    //   log(fileChooserButton.get_file());
    // });
    fileChooserButton.set_filter(iconFileFilter);
    grid.attach(fileChooserButton, 2, 2, 1, 1);

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
    const icon = fileChooserButton.get_filename();
    const id = `${name}-${uuid_string_random().replace(/-/g, "")}`;

    dialog.destroy();

    const desktopKeyFile = desktopEntry({
      [KEY_FILE_DESKTOP_KEY_NAME]: name,
      // FIXME %k is not supported by GNOME Shell so we use a cli argument
      // https://specifications.freedesktop.org/desktop-entry-spec/latest/ar01s07.html
      [KEY_FILE_DESKTOP_KEY_EXEC]: [bin, `--name=%c`, `--id=${id}`].join(" "),
      [KEY_FILE_DESKTOP_KEY_TERMINAL]: false,
      [KEY_FILE_DESKTOP_KEY_TYPE]: KEY_FILE_DESKTOP_TYPE_APPLICATION,
      [KEY_FILE_DESKTOP_KEY_CATEGORIES]: ["Network", "GNOME", "GTK"].join(";"),
      [KEY_FILE_DESKTOP_KEY_STARTUP_NOTIFY]: true,
      [KEY_FILE_DESKTOP_KEY_ICON]: icon,
      "X-GNOME-UsesNotifications": true,
      StartupWMClass: id,
      // "X-Flatpak": "re.sonny.gigagram",
    });
    desktopKeyFile.set_comment(null, null, " Created by Gigagram");

    const desktopFilePath = build_filenamev([
      get_user_data_dir(),
      "applications",
      `${id}.desktop`,
    ]);
    desktopKeyFile.save_to_file(desktopFilePath);

    const desktopAppInfo = DesktopAppInfo.new_from_filename(desktopFilePath);

    try {
      const success = desktopAppInfo.launch([], null);
      if (!success) {
        throw new Error("Failure");
      }
    } catch (err) {
      logError(err);
      unlink(desktopFilePath);
      // TODO show error
      return;
    }
  };
})();
