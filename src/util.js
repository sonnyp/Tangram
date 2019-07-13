(() => {
  "use strict";

  const Gio = imports.gi.Gio;
  const { getenv, build_filenamev, get_user_config_dir } = imports.gi.GLib;

  const FLATPAK_ID = getenv("FLATPAK_ID");

  // https://github.com/flatpak/flatpak/issues/78#issuecomment-511160975
  const keyfileBackend = Gio.keyfile_settings_backend_new(
    FLATPAK_ID
      ? build_filenamev([get_user_config_dir(), "glib-2.0/settings/keyfile"])
      : "settings.ini",
    "/",
    null
  );
  this.Settings = function Settings(props) {
    return new Gio.Settings({
      backend: getenv("DEV") ? keyfileBackend : null,
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
})();
