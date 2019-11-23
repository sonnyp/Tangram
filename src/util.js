const GioSettings = imports.gi.Gio.Settings;
const { KeyFile, KEY_FILE_DESKTOP_GROUP, VariantType } = imports.gi.GLib;
const { keyfile_settings_backend_new } = imports.gi.Gio;

import { keyfile_settings_path } from "./env";

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
  return Object.keys(enums).find(key => {
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

// TODO replace with dict.lookup with SDK 3.24
// merge request
// https://gitlab.gnome.org/GNOME/gjs/merge_requests/320
export function lookup(dict, key, variantType = null, deep = false) {
  if (typeof variantType === "string")
    variantType = new VariantType(variantType);

  const variant = dict.lookup_value(key, variantType);
  if (variant === null) return null;
  return deep === true ? variant.deep_unpack(deep) : variant.unpack();
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
