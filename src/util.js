import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";

const { Settings: GioSettings, keyfile_settings_backend_new } = Gio;
const { KeyFile, KEY_FILE_DESKTOP_GROUP } = GLib;

import { keyfile_settings_path } from "./env.js";

// default dconf
let backend = null;
if (keyfile_settings_path) {
  backend = keyfile_settings_backend_new(keyfile_settings_path, "/", null);
}

export function Settings(props) {
  return new GioSettings({
    backend,
    ...props,
  });
}

export function connect(object, signal, handler) {
  if (typeof signal === "string") {
    return object.connect(signal, (self, ...params) => {
      return handler(...params);
    });
  }

  const ids = {};
  Object.entries(signal).forEach(([signal, handler]) => {
    ids[signal] = object.connect(signal, (self, ...params) => {
      return handler(...params);
    });
  });
  return ids;
}

export function disconnect(object, signal) {
  if (typeof signal !== "object") {
    object.disconnect(signal, signal);
    return;
  }

  Object.entries(signal).forEach(([signal, id]) => {
    object.disconnect(signal, id);
  });
}

export function getEnum(enums, idx) {
  return Object.keys(enums).find((key) => {
    return enums[key] === idx;
  });
}

// https://developer.gnome.org/integration-guide/stable/desktop-files.html.en
// https://standards.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html
// https://specifications.freedesktop.org/menu-spec/menu-spec-1.0.html
export function desktopEntry(fields) {
  const keyFile = new KeyFile();
  for (const key in fields) {
    const value = fields[key];
    if (value === null || value === undefined) continue;
    keyFile.set_value(KEY_FILE_DESKTOP_GROUP, key, fields[key].toString());
  }
  return keyFile;
}

export function observeSetting(settings, key, fn) {
  if (fn(settings.get_value(key).unpack()) === true) {
    return true;
  }
  settings.connect("changed", (self, _key) => {
    if (_key !== key) return;
    return fn(settings.get_value(key).unpack());
  });
}

export function observeProperty(GObject, name, fn) {
  if (fn(GObject[name]) === true) {
    return true;
  }
  GObject.connect(`notify::${name}`, () => {
    return fn(GObject[name]);
  });
}

export function logEnum(obj, value) {
  log(
    Object.entries(obj).find(([, v]) => {
      return v === value;
    })[0],
  );
}

export function relativePath(path) {
  const [filename] = GLib.filename_from_uri(import.meta.url);
  const dirname = GLib.path_get_dirname(filename);
  return GLib.canonicalize_filename(path, dirname);
}

export function loadStyleSheet(path) {
  const provider = new Gtk.CssProvider();
  provider.load_from_path(path);
  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    provider,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
  );
}
