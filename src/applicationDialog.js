const { WindowTypeHint } = imports.gi.Gdk;
const { programInvocationName } = imports.system;
const {
  Dialog,
  Align,
  Grid,
  Label,
  Entry,
  ResponseType,
  Orientation,
  Box,
} = imports.gi.Gtk;
const {
  build_filenamev,
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
  KeyFile,
  KeyFileFlags,
  KEY_FILE_DESKTOP_GROUP,
} = imports.gi.GLib;
const { DesktopAppInfo } = imports.gi.Gio;

import { applications_dir, data_dir, env } from "./env";
import { iconChooser, saveIcon } from "./icon";
import { desktopEntry } from "./util";
import { once } from "./troll/util";

let bin;
if (env === "flatpak") {
  bin = pkg.name;
} else {
  bin = path_is_absolute(programInvocationName)
    ? programInvocationName
    : build_filenamev([get_current_dir(), programInvocationName]);
}
log(`bin: ${bin}`);

let default_desktop_icon = "re.sonny.Tangram";
if (env === "dev") {
  default_desktop_icon = build_filenamev([
    get_current_dir(),
    `data/icons/hicolor/scalable/apps/${default_desktop_icon}.svg`,
  ]);
}
log(`default_icon: ${default_desktop_icon}`);

const APP_ICON = "resource:///re/sonny/Tangram/data/icon.svg";

export function launchApplication(desktopFilePath) {
  const desktopAppInfo = DesktopAppInfo.new_from_filename(desktopFilePath);

  try {
    const success = desktopAppInfo.launch([], null);
    if (!success) {
      throw new Error("Failure");
    }
  } catch (err) {
    unlink(desktopFilePath);
    throw err;
  }
}

export function buildApplicationId(name) {
  return `${name}-${uuid_string_random().replace(/-/g, "")}`;
}

export function buildDesktopFilePath(id) {
  return build_filenamev([applications_dir, `${id}.desktop`]);
}

export function createApplication({ name, icon, id }) {
  if (icon === APP_ICON || !icon) {
    icon = default_desktop_icon;
  }

  const desktopKeyFile = desktopEntry({
    [KEY_FILE_DESKTOP_KEY_NAME]: name,
    // https://specifications.freedesktop.org/desktop-entry-spec/latest/ar01s07.html
    [KEY_FILE_DESKTOP_KEY_EXEC]: [bin, `--name=%c`, `--id=${id}`].join(" "),
    [KEY_FILE_DESKTOP_KEY_TERMINAL]: false,
    [KEY_FILE_DESKTOP_KEY_TYPE]: KEY_FILE_DESKTOP_TYPE_APPLICATION,
    [KEY_FILE_DESKTOP_KEY_CATEGORIES]: ["Network", "GNOME", "GTK"].join(";"),
    [KEY_FILE_DESKTOP_KEY_STARTUP_NOTIFY]: true,
    [KEY_FILE_DESKTOP_KEY_ICON]: icon,
    "X-GNOME-UsesNotifications": true,
    StartupWMClass: id,
  });
  desktopKeyFile.set_comment(null, null, " Created by Tangram");

  const desktopFilePath = buildDesktopFilePath(id);
  desktopKeyFile.save_to_file(desktopFilePath);

  return { id, desktopFilePath, desktopKeyFile };
}

export async function editApplicationDialog({ id, ...props }) {
  const desktopFilePath = buildDesktopFilePath(id);
  const keyFile = new KeyFile();
  keyFile.load_from_file(
    desktopFilePath,
    KeyFileFlags.KEEP_COMMENTS | KeyFileFlags.KEEP_TRANSLATIONS,
  );

  const name = keyFile.get_value(
    KEY_FILE_DESKTOP_GROUP,
    KEY_FILE_DESKTOP_KEY_NAME,
  );

  let icon = keyFile.get_value(
    KEY_FILE_DESKTOP_GROUP,
    KEY_FILE_DESKTOP_KEY_ICON,
  );
  if (!icon || icon === default_desktop_icon) {
    icon = APP_ICON;
  }

  const result = await applicationDialog({
    ...props,
    params: {
      name,
      icon,
    },
    action: "Edit",
  });
  if (!result) return;

  keyFile.set_value(
    KEY_FILE_DESKTOP_GROUP,
    KEY_FILE_DESKTOP_KEY_NAME,
    result.name,
  );
  keyFile.set_value(
    KEY_FILE_DESKTOP_GROUP,
    KEY_FILE_DESKTOP_KEY_ICON,
    result.icon,
  );
  keyFile.save_to_file(desktopFilePath);
  // FIXME - we should restart the app
  // maybe notification https://developer.gnome.org/hig/stable/in-app-notifications.html.en ?
}

export async function newApplicationDialog({ ...props }) {
  const params = {
    name: "",
    icon: APP_ICON,
  };

  const result = await applicationDialog({
    ...props,
    params,
    action: "New",
  });
  if (!result) return;

  try {
    const { desktopFilePath } = createApplication(result);
    launchApplication(desktopFilePath);
  } catch (err) {
    logError(err);
    // TODO show error
  }
}

export async function applicationDialog({ window, action, params = {} }) {
  // TODO Dialog.new_with_buttons
  // is undefined in gjs, open issue.
  // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
  // "Action Dialogs"
  // and
  // https://developer.gnome.org/hig/stable/visual-layout.html.en
  const dialog = new Dialog({
    title: `${action} Application`,
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

  const iconEntry = iconChooser({
    value: params.icon,
    parent: dialog,
  });
  const box = new Box({
    orientation: Orientation.HORIZONTAL,
    halign: Align.CENTER,
    margin_bottom: 18,
  });
  box.add(iconEntry);
  contentArea.add(box);

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
    text: params.name || "",
  });
  primaryButton.set_sensitive(!!nameEntry.text);
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
  const id = params.id || buildApplicationId(name);
  let icon = iconEntry.get_value();

  if (icon !== params.icon) {
    icon = saveIcon(icon, build_filenamev([data_dir, `${id}.png`]));
  }

  dialog.destroy();

  return { name, icon, id };
}
