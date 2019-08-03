(() => {
  "use strict";

  const Gio = imports.gi.Gio;
  const {
    getenv,
    build_filenamev,
    get_user_config_dir,
    KeyFile,
    KEY_FILE_DESKTOP_GROUP,
  } = imports.gi.GLib;

  const FLATPAK_ID = getenv("FLATPAK_ID");

  let backend = null; // dconf - default
  // https://github.com/flatpak/flatpak/issues/78#issuecomment-511160975
  if (FLATPAK_ID) {
    backend = Gio.keyfile_settings_backend_new(
      build_filenamev([get_user_config_dir(), "glib-2.0/settings/keyfile"]),
      "/",
      null
    );
  } else if (getenv("DEV")) {
    backend = Gio.keyfile_settings_backend_new(
      "var/config/glib-2.0/settings/keyfile",
      "/",
      null
    );
  }
  this.Settings = function Settings(props) {
    return new Gio.Settings({
      backend,
      ...props,
    });
  };

  this.connect = function connect(object, signal, handler) {
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
  };

  this.disconnect = function disconnect(object, signal) {
    if (typeof signal !== "object") {
      object.disconnect(signal, signal);
      return;
    }

    Object.entries(signal).forEach(([signal, id]) => {
      object.disconnect(signal, id);
    });
  };

  this.once = function once(object, signal) {
    return new Promise(resolve => {
      const handlerId = object.connect(signal, handler);

      function handler(self, ...params) {
        object.disconnect(handlerId);
        return resolve(params);
      }
    });
  };

  this.getEnum = function getEnum(enums, idx) {
    return Object.keys(enums).find(key => {
      return enums[key] === idx;
    });
  };

  // https://developer.gnome.org/integration-guide/stable/desktop-files.html.en
  // https://standards.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html
  // https://specifications.freedesktop.org/menu-spec/menu-spec-1.0.html
  this.desktopEntry = function desktopEntry(fields) {
    const keyFile = new KeyFile();
    for (const key in fields) {
      const value = fields[key];
      if (value === null || value === undefined) continue;
      keyFile.set_value(KEY_FILE_DESKTOP_GROUP, key, fields[key].toString());
    }
    return keyFile;
  };

  this.lookup = function lookup(dict, key, type = null) {
    const variant = dict.lookup_value(key, type);
    if (!variant) return null;
    return variant.get_string()[0];
  };

  this.observeSetting = function observeSetting(settings, key, fn) {
    if (fn(settings.get_value(key).unpack()) === true) {
      return true;
    }
    settings.connect("changed", (self, _key) => {
      if (_key !== key) return;
      return fn(settings.get_value(key).unpack());
    });
  };

  this.observeProperty = function observeProperty(GObject, name, fn) {
    if (fn(GObject[name]) === true) {
      return true;
    }
    GObject.connect(`notify::${name}`, () => {
      return fn(GObject[name]);
    });
  };
})();
