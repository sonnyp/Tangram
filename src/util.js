const GioSettings = imports.gi.Gio.Settings;
const { KeyFile, KEY_FILE_DESKTOP_GROUP, VariantType } = imports.gi.GLib;
const { keyfile_settings_backend_new } = imports.gi.Gio;

const { keyfile_settings_path } = imports.env;
const ephy = imports.ephy;

// default dconf
let backend = null;
if (keyfile_settings_path) {
  backend = keyfile_settings_backend_new(keyfile_settings_path, "/", null);
}
this.Settings = function Settings(props) {
  return new GioSettings({
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

// TODO replace with dict.lookup with SDK 3.24
// merge request
// https://gitlab.gnome.org/GNOME/gjs/merge_requests/320
this.lookup = function lookup(dict, key, variantType = null, deep = false) {
  if (typeof variantType === "string")
    variantType = new VariantType(variantType);

  const variant = dict.lookup_value(key, variantType);
  if (variant === null) return null;
  return deep === true ? variant.deep_unpack(deep) : variant.unpack();
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

this.promiseAsyncReadyCallback = promiseAsyncReadyCallback;
function promiseAsyncReadyCallback(object, method, ...args) {
  return new Promise(resolve => {
    object[method](...args, (self, asyncResult) => {
      resolve(object[`${method}_finish`](asyncResult));
    });
  });
}

function runJavaScript(webview, script) {
  return promiseAsyncReadyCallback(
    webview,
    "run_javascript",
    script,
    null
  ).then(javascriptResult => {
    if (!javascriptResult) return;
    return javascriptResult.get_js_value();
  });
}

this.getWebAppName = function(webview) {
  const script = `(${ephy.getWebAppName.toString()})()`;

  return runJavaScript(webview, script)
    .then(javascriptValue => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch(err => {
      logError(err);
      return null;
    });
};

this.getWebAppIcon = async function(webview) {
  const script = `(${ephy.getWebAppIcon.toString()})("${webview.get_uri()}")`;

  return runJavaScript(webview, script)
    .then(javascriptValue => {
      const url = javascriptValue.object_get_property("url");
      if (!url.is_string()) return null;
      return url.to_string();
      // const color = javascriptValue.object_get_property('color').to_string();
    })
    .catch(err => {
      logError(err);
      return null;
    });
};

this.download = function download(webview, url, destination) {
  return new Promise((resolve, reject) => {
    const download = webview.download_uri(url);
    download.set_allow_overwrite(true);
    download.set_destination(destination);
    download.connect("failed", (self, err) => {
      reject(err);
    });
    download.connect("finished", () => {
      resolve();
    });
  });
};
