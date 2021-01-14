const versions = {
  Gio: "2.0",
  Gtk: "3.0",
  GLib: "2.0",
  WebKit2: "4.0",
  Gdk: "3.0",
  GdkPixbuf: "2.0",
  GObject: "2.0",
};

Object.assign(imports.gi.versions, versions);

const Gtk = imports.gi.Gtk;
const WebKit = imports.gi.WebKit2;
const system = imports.system;

const { get_major_version, get_minor_version, get_micro_version } = WebKit;
const WebKitGTKVersion = `${get_major_version()}.${get_minor_version()}.${get_micro_version()}`;

const gjsVersion = (() => {
  const v = system.version.toString();
  return `${v[0]}.${+(v[1] + v[2])}.${+(v[3] + v[4])}`;
})();

log(`gjs ${gjsVersion}`);
log(`WebKitGTK ${WebKitGTKVersion}`);

function AboutDialog({ window }) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.aboutdialog
  const aboutDialog = new Gtk.AboutDialog({
    authors: ["Sonny Piers https://sonny.re"],
    artists: ["Tobias Bernard <tbernard@gnome.org>"],
    comments: [
      "Run web apps on your desktop",
      "",
      `Powered by WebKitGTK ${WebKitGTKVersion}`,
      `Powered by gjs ${gjsVersion}`,
    ].join("\n"),
    copyright: "Copyright 2019-2020 Sonny Piers",
    license_type: Gtk.License.GPL_3_0,
    version: pkg.version,
    website_label: "Learn more about Tangram",
    website: "https://github.com/sonnyp/Tangram",
    transient_for: window,
    modal: true,
    logo_icon_name: "re.sonny.Tangram",
  });
  aboutDialog.add_credit_section("Contributors", [
    // Add yourself as
    // "John Doe",
    // or
    // "John Doe <john@example.com>",
    // or
    // "John Doe https://john.com",
    "codyfish https://github.com/codyfish",
  ]);
  aboutDialog.present();
  aboutDialog.connect("response", () => {
    aboutDialog.destroy();
  });

  return aboutDialog;
}

const {
  getenv,
  get_user_cache_dir,
  get_user_data_dir,
  build_filenamev,
  get_current_dir,
  get_home_dir,
  get_user_config_dir,
  file_test,
  FileTest,
} = imports.gi.GLib;

const env = (() => {
  // On flatpak 1.0 (Ubuntu 18.04 and derivates such as Mint 19.3)
  // FLATPAK_ID is not defined
  if (getenv("FLATPAK_ID") || file_test("/.flatpak-info", FileTest.EXISTS)) {
    return "flatpak";
  }

  if (getenv("DEV")) {
    return "dev";
  }

  return "host";
})();
log(`env: ${env}`);

const data_dir =
  env === "dev"
    ? build_filenamev([get_current_dir(), "var/data/Tangram"])
    : build_filenamev([get_user_data_dir(), "Tangram"]);
log(`data_dir: ${data_dir}`);

const cache_dir =
  env === "dev"
    ? build_filenamev([get_current_dir(), "var/cache/Tangram"])
    : build_filenamev([get_user_cache_dir(), "Tangram"]);
log(`cache_dir: ${cache_dir}`);

const config_dir =
  env === "dev"
    ? build_filenamev([get_current_dir(), "var/config/Tangram"])
    : build_filenamev([get_user_config_dir(), "Tangram"]);
log(`config_dir: ${config_dir}`);

const applications_dir = (() => {
  switch (env) {
    case "dev":
      return build_filenamev([get_current_dir(), "var/applications"]);
    case "flatpak":
      return build_filenamev([get_home_dir(), ".local/share/applications"]);
    default:
      return build_filenamev([get_user_data_dir(), "applications"]);
  }
})();
log(`applications_dir: ${applications_dir}`);

// On Flatpak with org.gnome.Platform//3.34 (which we use)
// dconf defaults to using the keyfile backend with
// ~/.var/app/re.sonny.Tangram/config/glib-2.0/settings/keyfile
// so there is no need to specify keyfile backend
// see https://blogs.gnome.org/mclasen/2019/07/12/settings-in-a-sandbox-world/
const keyfile_settings_path =
  env === "dev"
    ? build_filenamev([
        get_current_dir(),
        "var/config/",
        "glib-2.0/settings/keyfile",
      ])
    : "";
log(`keyfile_settings_path: ${keyfile_settings_path}`);

const GioSettings = imports.gi.Gio.Settings;
const { KeyFile, KEY_FILE_DESKTOP_GROUP, VariantType } = imports.gi.GLib;
const { keyfile_settings_backend_new } = imports.gi.Gio;

// default dconf
let backend = null;
if (keyfile_settings_path) {
  backend = keyfile_settings_backend_new(keyfile_settings_path, "/", null);
}

function Settings(props) {
  return new GioSettings({
    backend,
    ...props,
  });
}

function connect(object, signal, handler) {
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

// https://developer.gnome.org/integration-guide/stable/desktop-files.html.en
// https://standards.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html
// https://specifications.freedesktop.org/menu-spec/menu-spec-1.0.html
function desktopEntry(fields) {
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
function lookup(dict, key, variantType = null, deep = false) {
  if (typeof variantType === "string")
    variantType = new VariantType(variantType);

  const variant = dict.lookup_value(key, variantType);
  if (variant === null) return null;
  return deep === true ? variant.deep_unpack(deep) : variant.unpack();
}

function observeSetting(settings, key, fn) {
  if (fn(settings.get_value(key).unpack()) === true) {
    return true;
  }
  settings.connect("changed", (self, _key) => {
    if (_key !== key) return;
    return fn(settings.get_value(key).unpack());
  });
}

const { addSignalMethods } = imports.signals;

class State {
  constructor() {
    this.properties = Object.create(null);
  }

  get(prop) {
    return this.properties[prop];
  }

  set(props) {
    for (const key in props) {
      const value = props[key];
      if (value === undefined) continue;
      const previous = this.properties[key];
      const current = (this.properties[key] = value);
      this.emit(`notify::${key}`, current, previous);
    }
  }

  notify(prop, fn) {
    return this.connect(`notify::${prop}`, (self, ...args) => {
      fn(...args);
    });
  }

  // https://gjs-docs.gnome.org/gobject20~2.0_api/gobject.object#method-bind_property
  // https://gjs-docs.gnome.org/gobject20~2.0_api/gobject.object#method-bind_property_full
  bind(
    source_property,
    target,
    target_property,
    fn = (value) => value,
    // flags,
    // transform_to,
    // transform_from
  ) {
    const source_value = this.properties[source_property];
    if (source_value !== undefined) {
      target[target_property] = fn(source_value);
    }

    this.connect(`notify::${source_property}`, () => {
      const source_value = this.properties[source_property];
      if (source_value !== undefined) {
        target[target_property] = fn(source_value);
      }
    });
  }
}
addSignalMethods(State.prototype);

var state = new State();

const {
  FileChooserNative,
  FileChooserAction,
  FileFilter,
  Button,
  Image,
  ResponseType,
} = imports.gi.Gtk;
const { Pixbuf } = imports.gi.GdkPixbuf;
// const { mkdir_with_parents } = imports.gi.GLib;

// https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.filefilter
const iconFileFilter = new FileFilter();
iconFileFilter.add_mime_type("image/svg+xml");
iconFileFilter.add_mime_type("image/png");
iconFileFilter.add_mime_type("image/jpeg");

const ICON_SIZE = 16;

function iconChooser(props) {
  const image = new Image();
  if (props.value.startsWith("resource://")) {
    image.set_from_resource(props.value.split("resource://")[1]);
  } else {
    const pixbuf = Pixbuf.new_from_file_at_scale(
      props.value,
      ICON_SIZE,
      ICON_SIZE,
      true,
    );
    image.set_from_pixbuf(pixbuf);
  }
  image.set_size_request(ICON_SIZE, ICON_SIZE);

  const fileChooserButton = new Button({
    image,
  });

  let value = props.value;
  fileChooserButton.connect("clicked", () => {
    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.filechoosernative
    const fileChooserDialog = new FileChooserNative({
      action: FileChooserAction.OPEN,
      // Filter is not supported on flatpak
      // any alternative?
      filter: iconFileFilter,
      select_multiple: false,
      title: "Choose an icon",
      local_only: true,
      // TODO - no property parent on gjs
      // parent,
      transient_for: props.parent,
    });

    const result = fileChooserDialog.run();
    if (result === ResponseType.ACCEPT) {
      value = fileChooserDialog.get_filename();
      const pixbuf = Pixbuf.new_from_file_at_scale(
        value,
        ICON_SIZE,
        ICON_SIZE,
        true,
      );
      image.set_from_pixbuf(pixbuf);
    }
    fileChooserDialog.destroy();
  });

  fileChooserButton.get_value = function () {
    return value;
  };

  return fileChooserButton;
}

function saveIcon(image, filepath) {
  const pixbuf = Pixbuf.new_from_file_at_scale(
    image,
    ICON_SIZE,
    ICON_SIZE,
    true,
  );

  // //make directory drwx------
  // mkdir_with_parents(data_dir, 0o700);

  pixbuf.savev(filepath, "png", [], []);
  return filepath;
}

// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

function promiseTask(object, method, finish, ...args) {
    return new Promise((resolve, reject) => {
        object[method](...args, (self, asyncResult) => {
            try {
                resolve(object[finish](asyncResult));
            } catch (err) {
                reject(err);
            }
        });
    });
}

function once(object, signal, errorSignal) {
  return new Promise((resolve, reject) => {
    const handlerId = object.connect(signal, handler);
    let errorHandlerId;

    if (errorSignal) {
      errorHandlerId = object.connect(errorSignal, (self, error) => {
        object.disconnect(handlerId);
        object.disconnect(errorHandlerId);
        reject(error);
      });
    }

    function handler(self, ...params) {
      object.disconnect(handlerId);
      if (errorHandlerId) object.disconnect(errorHandlerId);
      return resolve(params);
    }
  });
}

const { WindowTypeHint } = imports.gi.Gdk;
const { programInvocationName } = imports.system;
const {
  Dialog,
  Align,
  Grid,
  Label,
  Entry,
  ResponseType: ResponseType$1,
  Orientation,
  Box,
} = imports.gi.Gtk;
const {
  build_filenamev: build_filenamev$1,
  path_is_absolute,
  get_current_dir: get_current_dir$1,
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
  KeyFile: KeyFile$1,
  KeyFileFlags,
  KEY_FILE_DESKTOP_GROUP: KEY_FILE_DESKTOP_GROUP$1,
} = imports.gi.GLib;
const { DesktopAppInfo } = imports.gi.Gio;

let bin;
if (env === "flatpak") {
  bin = pkg.name;
} else {
  bin = path_is_absolute(programInvocationName)
    ? programInvocationName
    : build_filenamev$1([get_current_dir$1(), programInvocationName]);
}
log(`bin: ${bin}`);

let default_desktop_icon = "re.sonny.Tangram";
if (env === "dev") {
  default_desktop_icon = build_filenamev$1([
    get_current_dir$1(),
    `data/icons/hicolor/scalable/apps/${default_desktop_icon}.svg`,
  ]);
}
log(`default_icon: ${default_desktop_icon}`);

const APP_ICON = "resource:///re/sonny/Tangram/data/icon.svg";

function launchApplication(desktopFilePath) {
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

function buildApplicationId(name) {
  return `${name}-${uuid_string_random().replace(/-/g, "")}`;
}

function buildDesktopFilePath(id) {
  return build_filenamev$1([applications_dir, `${id}.desktop`]);
}

function createApplication({ name, icon, id }) {
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

async function editApplicationDialog({ id, ...props }) {
  const desktopFilePath = buildDesktopFilePath(id);
  const keyFile = new KeyFile$1();
  keyFile.load_from_file(
    desktopFilePath,
    KeyFileFlags.KEEP_COMMENTS | KeyFileFlags.KEEP_TRANSLATIONS,
  );

  const name = keyFile.get_value(
    KEY_FILE_DESKTOP_GROUP$1,
    KEY_FILE_DESKTOP_KEY_NAME,
  );

  let icon = keyFile.get_value(
    KEY_FILE_DESKTOP_GROUP$1,
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
    KEY_FILE_DESKTOP_GROUP$1,
    KEY_FILE_DESKTOP_KEY_NAME,
    result.name,
  );
  keyFile.set_value(
    KEY_FILE_DESKTOP_GROUP$1,
    KEY_FILE_DESKTOP_KEY_ICON,
    result.icon,
  );
  keyFile.save_to_file(desktopFilePath);
  // FIXME - we should restart the app
  // maybe notification https://developer.gnome.org/hig/stable/in-app-notifications.html.en ?
}

async function newApplicationDialog({ ...props }) {
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

async function applicationDialog({ window, action, params = {} }) {
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

  dialog.add_button("Cancel", ResponseType$1.CANCEL);
  const primaryButton = dialog.add_button("Confirm", ResponseType$1.APPLY);
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
  if (response_id === ResponseType$1.DELETE_EVENT) {
    return;
  }
  if (response_id !== ResponseType$1.APPLY) {
    dialog.destroy();
    return;
  }

  const name = nameEntry.text;
  const id = params.id || buildApplicationId(name);
  let icon = iconEntry.get_value();

  if (icon !== params.icon) {
    icon = saveIcon(icon, build_filenamev$1([data_dir, `${id}.png`]));
  }

  dialog.destroy();

  return { name, icon, id };
}

const { build_filenamev: build_filenamev$2 } = imports.gi.GLib;
const { File } = imports.gi.Gio;

const list = [];

class Instance {
  constructor(id) {
    this.id = id;
    this.data_dir = build_filenamev$2([data_dir, id]);
    this.cache_dir = build_filenamev$2([cache_dir, id]);

    // https://gjs-docs.gnome.org/gio20~2.0_api/gio.settings
    this.settings = new Settings({
      schema_id: "re.sonny.Tangram.Instance",
      path: `/re/sonny/Tangram/instances/${id}/`,
    });
  }

  bind(...args) {
    return this.settings.bind(...args);
  }

  observe(prop, fn) {
    const val = this[prop];
    if (val !== undefined) fn(val);
    this.settings.connect(`changed::${prop}`, () => {
      fn(this[prop]);
    });
  }

  get name() {
    return this.settings.get_string("name");
  }
  set name(name) {
    this.settings.set_string("name", name);
  }
  // TODO icon
  // get icon() {
  //   return this.settings.get_string("icon");
  // }
  // set icon(icon) {
  //   return this.settings.set_string("icon", icon);
  // }
  get url() {
    return this.settings.get_string("url");
  }
  set url(url) {
    this.settings.set_string("url", url);
  }
}

function load(settings) {
  settings.get_strv("instances").forEach((id) => {
    list.push(new Instance(id));
  });
}

function detach(settings, id) {
  const instances = settings.get_strv("instances");
  const idx = instances.indexOf(id);
  if (idx < 0) return;
  instances.splice(idx, 1);
  settings.set_strv("instances", instances);
  return idx;
}

function attach(settings, id) {
  const instances = settings.get_strv("instances") || [];
  settings.set_strv("instances", [...instances, id]);
}

function create({ id, ...props }) {
  const instance = new Instance(id);
  Object.assign(instance, props);
  list.push(instance);
  return instance;
}

function destroy(instance) {
  const idx = list.indexOf(instance);
  if (idx > -1) list.splice(idx, 1);

  const { settings } = instance;
  settings.reset("name");
  settings.reset("url");
  // TODO icon
  // settings.reset("icon");
  // https://gitlab.gnome.org/GNOME/glib/merge_requests/981#note_551625
  try {
    settings.reset("");
  } catch (err) {} // eslint-disable-line no-empty

  File.new_for_path(instance.data_dir).trash(null);
  File.new_for_path(instance.cache_dir).trash(null);
}

function get(id) {
  return list.find((instance) => instance.id === id);
}

const { getenv: getenv$1 } = imports.gi.GLib;

const custom_applications =
  getenv$1("TANGRAM_ENABLE_CUSTOM_APPLICATIONS") === "true";
log(`flag TANGRAM_ENABLE_CUSTOM_APPLICATIONS ${custom_applications}`);

const custom_icons = getenv$1("TANGRAM_ENABLE_CUSTOM_ICONS") === "true";
log(`flag TANGRAM_ENABLE_CUSTOM_ICONS ${custom_icons}`);

var flags = { custom_applications, custom_icons };

const Gtk$1 = imports.gi.Gtk;
const { SettingsBindFlags } = imports.gi.Gio;

function detachTab({ instance_id, notebook, settings }) {
  const instance = get(instance_id);
  const { name, icon } = instance;
  const id = buildApplicationId(name);

  let desktopFilePath;
  try {
    desktopFilePath = createApplication({ name, icon, id }).desktopFilePath;
  } catch (err) {
    logError(err);
    // TODO show error
    return;
  }

  const newAppSettings = new Settings({
    schema_id: "re.sonny.Tangram",
    path: `/re/sonny/Tangram/applications/${id}/`,
  });
  attach(newAppSettings, instance.id);

  try {
    launchApplication(desktopFilePath);
  } catch (err) {
    logError(err);
    // todo show error and cleanup
    return;
  }

  const idx = detach(settings, instance.id);

  const page = notebook.get_nth_page(idx);
  notebook.detach_tab(page);
  const label = notebook.get_tab_label(page);
  if (label) label.destroy();
  page.destroy();
}

function Notebook({ profile, settings, application }) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.notebook
  const notebook = new Gtk$1.Notebook({ scrollable: true });
  // Tab bar only hides on custom applications
  if (profile.id) {
    state.bind(
      "instances",
      notebook,
      "show_tabs",
      (instances) => instances.length > 1,
    );
  }
  notebook.connect("switch-page", (self, webview) => {
    application.withdraw_notification(webview.instance_id);
    state.set({ webview });
  });
  notebook.set_group_name("tabs");
  notebook.show_all();
  connect(notebook, {
    ["page-reordered"]() {
      const number_of_pages = notebook.get_n_pages();

      const instances = settings.get_strv("instances");
      const reordered = [];

      for (let i = 0; i < number_of_pages; i++) {
        const id = notebook.get_nth_page(i).instance_id;
        if (!instances.includes(id)) continue;
        reordered.push(id);
      }

      settings.set_strv("instances", reordered);
    },
  });
  settings.bind("tabs-position", notebook, "tab_pos", SettingsBindFlags.GET);

  if (flags.custom_applications) {
    notebook.connect("create-window", (self, { instance_id } /*_x, _y */) => {
      detachTab({ instance_id, settings, notebook });
    });
  }

  return notebook;
}

const { VariantType: VariantType$1 } = imports.gi.GLib;
const { AccelGroup, AccelFlags, accelerator_parse } = imports.gi.Gtk;
const { SimpleAction } = imports.gi.Gio;
const { ModifierType, keyval_name } = imports.gi.Gdk;

function nextPage(notebook) {
  if (notebook.page === notebook.get_n_pages() - 1) {
    notebook.page = 0;
  } else {
    notebook.next_page();
  }
}
function prevPage(notebook) {
  if (notebook.page === 0) {
    notebook.page = notebook.get_n_pages() - 1;
  } else {
    notebook.prev_page();
  }
}

function Shortcuts({
  window,
  application,
  notebook,
  addressBar,
  onStopLoading,
  onReload,
  onGoBack,
  onGoForward,
  onShowInspector,
  onGoHome,
}) {
  const nthTab = new SimpleAction({
    name: "nth-tab",
    parameter_type: VariantType$1.new("i"),
  });
  for (let i = 1; i < 10; i++) {
    application.set_accels_for_action(`app.nth-tab(${i})`, [`<Alt>${i}`]);
  }
  nthTab.connect("activate", (self, parameters) => {
    const idx = parameters.deep_unpack();
    notebook.page = idx - 1;
  });
  application.add_action(nthTab);

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.accelgroup
  const accelGroup = new AccelGroup();
  window.add_accel_group(accelGroup);
  const shortcuts = [
    [["Escape"], onStopLoading],
    [["<Primary>R", "F5"], onReload],
    [["<Alt>Home"], onGoHome],
    [["<Primary><Shift>R", "<Shift>F5"], () => onReload(true)],
    [
      ["<Alt>Left"],
      () => {
        onGoBack();
        // prevents default notebook behavior
        return true;
      },
    ],
    [
      ["<Alt>Right"],
      () => {
        onGoForward();
        // prevents default notebook behavior
        return true;
      },
    ],
    [["<Primary><Shift>I"], onShowInspector],
    [
      ["<Primary>L"],
      () => {
        addressBar.grab_focus();
      },
    ],
  ];
  shortcuts.forEach(([accels, fn]) => {
    accels.forEach((accel) => {
      const [accelerator_key, accelerator_mods] = accelerator_parse(accel);
      accelGroup.connect(
        accelerator_key,
        accelerator_mods,
        AccelFlags.VISIBLE,
        fn,
      );
    });
  });

  window.connect("key-press-event", (self, event) => {
    const [, modifier] = event.get_state();
    const [, keyval] = event.get_keyval();
    const name = keyval_name(keyval);

    // CTRL + Page_Down
    if (name === "Page_Down" && modifier === ModifierType.CONTROL_MASK) {
      nextPage(notebook);
      return true;
    }
    // CTRL + Tab
    if (
      ["Tab", "ISO_Left_Tab", "KP_Tab"].includes(name) &&
      modifier === ModifierType.CONTROL_MASK
    ) {
      nextPage(notebook);
      return true;
    }

    // CTRL + Page_Up
    if (name === "Page_Up" && modifier === ModifierType.CONTROL_MASK) {
      prevPage(notebook);
      return true;
    }
    // CTRL+SHIFT + Tab
    if (
      ["Tab", "ISO_Left_Tab", "KP_Tab"].includes(name) &&
      modifier === ModifierType.CONTROL_MASK + 1
    ) {
      prevPage(notebook);
      return true;
    }

    // CTRL+SHIFT + PageUp
    if (name === "Page_Up" && modifier === ModifierType.CONTROL_MASK + 1) {
      const { page } = notebook;
      if (page === 0) return true;
      notebook.reorder_child(notebook.get_nth_page(page), page - 1);
      return true;
    }

    // CTRL+SHIFT + PageDown
    if (name === "Page_Down" && modifier === ModifierType.CONTROL_MASK + 1) {
      const { page } = notebook;
      if (page === notebook.get_n_pages() - 1) return true;
      notebook.reorder_child(notebook.get_nth_page(page), page + 1);
      return true;
    }

    return false;
  });
}

const { WindowTypeHint: WindowTypeHint$1 } = imports.gi.Gdk;
const {
  Dialog: Dialog$1,
  Align: Align$1,
  Grid: Grid$1,
  Label: Label$1,
  Entry: Entry$1,
  ResponseType: ResponseType$2,
  EntryIconPosition,
  Box: Box$1,
  Orientation: Orientation$1,
} = imports.gi.Gtk;
const { SettingsBindFlags: SettingsBindFlags$1 } = imports.gi.Gio;
const { build_filenamev: build_filenamev$3 } = imports.gi.GLib;

function editInstanceDialog(props) {
  return instanceDialog({ ...props, action: "Edit" });
}

function addInstanceDialog(props) {
  return instanceDialog({ ...props, action: "Add " });
}

async function instanceDialog({ window, instance, action }) {
  // TODO Dialog.new_with_buttons
  // is undefined in gjs, open issue.
  // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
  // "Action Dialogs"
  // and
  // https://developer.gnome.org/hig/stable/visual-layout.html.en
  const dialog = new Dialog$1({
    title: `${action} ${instance.name}`,
    modal: true,
    type_hint: WindowTypeHint$1.DIALOG,
    use_header_bar: true,
    transient_for: window,
    resizable: false,
  });

  dialog.add_button("Cancel", ResponseType$2.CANCEL);
  const primaryButton = dialog.add_button(action, ResponseType$2.APPLY);
  primaryButton.get_style_context().add_class("suggested-action");
  primaryButton.grab_focus();

  const contentArea = dialog.get_content_area();
  contentArea.margin = 18;

  let iconEntry;
  if (flags.custom_icons) {
    iconEntry = iconChooser({
      value: instance.getIconForDisplay(),
      parent: dialog,
    });
    const box = new Box$1({
      orientation: Orientation$1.HORIZONTAL,
      halign: Align$1.CENTER,
      margin_bottom: 18,
    });
    box.add(iconEntry);
    contentArea.add(box);
  }

  const grid = new Grid$1({
    column_spacing: 12,
    row_spacing: 6,
  });
  contentArea.add(grid);

  const nameLabel = new Label$1({
    label: "Name",
    halign: Align$1.END,
  });
  grid.attach(nameLabel, 1, 1, 1, 1);
  const nameEntry = new Entry$1({
    hexpand: true,
  });
  instance.bind("name", nameEntry, "text", SettingsBindFlags$1.DEFAULT);
  grid.attach(nameEntry, 2, 1, 1, 1);

  const URLLabel = new Label$1({
    label: "Homepage",
    halign: Align$1.END,
  });
  grid.attach(URLLabel, 1, 3, 1, 1);

  const URLEntry = new Entry$1({
    hexpand: true,
  });
  instance.bind("url", URLEntry, "text", SettingsBindFlags$1.DEFAULT);
  grid.attach(URLEntry, 2, 3, 1, 1);

  primaryButton.set_sensitive(!!URLEntry.text);
  URLEntry.set_icon_tooltip_text(
    EntryIconPosition.SECONDARY,
    "Cannot be empty",
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
      "face-sick-symbolic",
    );
  });

  const UserAgentLabel = new Label$1({
    label: "User Agent",
    halign: Align$1.END,
  });
  grid.attach(UserAgentLabel, 1, 4, 1, 1);

  const UserAgentEntry = new Entry$1({
    hexpand: true,
  });
  instance.bind(
    "user-agent",
    UserAgentEntry,
    "text",
    SettingsBindFlags$1.DEFAULT,
  );
  grid.attach(UserAgentEntry, 2, 4, 1, 1);

  dialog.show_all();

  const [response_id] = await once(dialog, "response");
  if (response_id === ResponseType$2.DELETE_EVENT) {
    return true;
  }

  if (response_id !== ResponseType$2.APPLY) {
    dialog.destroy();
    return true;
  }

  if (flags.custom_icons) {
    let icon = iconEntry.get_value();
    if (!icon.startsWith("resource://")) {
      icon = saveIcon(
        iconEntry.get_value(),
        build_filenamev$3([instance.data_dir, "icon.png"]),
      );
      // eslint-disable-next-line require-atomic-updates
      instance.icon = icon;
    }
  }

  dialog.destroy();

  return false;
}

const { VariantType: VariantType$2, Variant } = imports.gi.GLib;
const { SimpleAction: SimpleAction$1 } = imports.gi.Gio;

function Actions({
  window,
  application,
  settings,
  profile,
  notebook,
  showTab,
}) {
  function showPage(page) {
    showTab(notebook.page_num(page));
  }

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  // FIXME, is there a better way to bind setting to action?
  // or even better bind menu to setting, see header.js
  const tabsPosition = SimpleAction$1.new_stateful(
    "tabsPosition",
    VariantType$2.new("s"),
    Variant.new_string(settings.get_string("tabs-position")),
  );
  settings.connect("changed::tabs-position", () => {
    tabsPosition.set_state(
      Variant.new_string(settings.get_string("tabs-position")),
    );
  });
  tabsPosition.connect("change-state", (self, value) => {
    const position = value.get_string()[0];
    settings.set_string("tabs-position", position);
  });
  application.add_action(tabsPosition);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const detachTabAction = new SimpleAction$1({
    name: "detachTab",
    parameter_type: VariantType$2.new("s"),
  });
  detachTabAction.connect("activate", (self, parameters) => {
    const id = parameters.unpack();
    detachTab({ instance_id: id, settings, notebook });
  });
  application.add_action(detachTabAction);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const removeInstanceAction = new SimpleAction$1({
    name: "removeInstance",
    parameter_type: VariantType$2.new("s"),
  });
  removeInstanceAction.connect("activate", (self, parameters) => {
    const instance = get(parameters.deep_unpack());

    const idx = detach(settings, instance.id);

    const page = notebook.get_nth_page(idx);
    if (page) {
      const label = notebook.get_tab_label(page);
      if (label) label.destroy();
      page.destroy();
    }

    try {
      destroy(instance);
    } catch (err) {
      logError(err);
    }
  });
  application.add_action(removeInstanceAction);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const newApplication = SimpleAction$1.new("newApplication", null);
  newApplication.connect("activate", () => {
    newApplicationDialog({ window }).catch(log);
  });
  application.add_action(newApplication);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const editApplication = SimpleAction$1.new("editApplication", null);
  editApplication.connect("activate", () => {
    editApplicationDialog({ id: profile.id, window }).catch(logError);
  });
  application.add_action(editApplication);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const editInstanceAction = new SimpleAction$1({
    name: "editInstance",
    parameter_type: VariantType$2.new("s"),
  });
  editInstanceAction.connect("activate", (self, parameters) => {
    const id = parameters.deep_unpack();
    const instance = get(id);
    if (!instance) return;
    if (instance.page) {
      showPage(instance.page);
    }
    editInstanceDialog({ window, instance }).catch(logError);
  });
  application.add_action(editInstanceAction);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const quit = new SimpleAction$1({
    name: "quit",
    parameter_type: null,
  });
  quit.connect("activate", () => {
    window.destroy();
    // application.quit();
  });
  application.add_action(quit);
  application.set_accels_for_action("app.quit", ["<Ctrl>Q"]);
}

/* Shameless copy/paste of
 * https://gitlab.gnome.org/GNOME/epiphany/blob/master/embed/web-process-extension/resources/js/ephy.js
 */

/* eslint-env browser */

function getWebAppManifest() {
  const manifest = document.head.querySelector("link[rel=manifest]");
  return manifest ? manifest.href : null;
}

function getWebAppURL() {
  function querySelectorLast(el, query) {
    const els = el.querySelectorAll(query);
    return els[els.length - 1];
  }

  // https://msdn.microsoft.com/en-us/ie/dn255024(v=vs.94)
  const msApplicationStartURL = querySelectorLast(
    document.head,
    "meta[name=msapplication-starturl]",
  );
  if (msApplicationStartURL && msApplicationStartURL.content) {
    return msApplicationStartURL.content;
  }

  // https://ogp.me/#metadata
  const openGraphURL = querySelectorLast(
    document.head,
    "meta[property='og:url']",
  );
  if (openGraphURL && openGraphURL.content) {
    return openGraphURL.content;
  }

  return document.location.href;
}

function getWebAppTitle() {
  const metas = document.head.getElementsByTagName("meta");
  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i];
    if (meta.name === "application-name") return meta.content;

    // https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
    if (meta.name === "apple-mobile-web-app-title") return meta.content;

    // og:site_name is read from the property attribute (standard), but is
    // commonly seen on the web in the name attribute. Both are supported.
    if (
      meta.getAttribute("property") === "og:site_name" ||
      meta.name === "og:site_name"
    )
      return meta.content;
  }
  const titles = document.head.getElementsByTagName("title");
  const title = titles[titles.length - 1];
  if (title && title.innerText) return title.innerText;
  return document.location.hostname;
}

const Soup = imports.gi.Soup;
const { pixbuf_get_from_surface } = imports.gi.Gdk;
const { get_tmp_dir, build_filenamev: build_filenamev$4 } = imports.gi.GLib;
const byteArray = imports.byteArray;

function runJavaScript(webview, script) {
  return promiseTask(
    webview,
    "run_javascript",
    "run_javascript_finish",
    script,
    null,
  ).then((javascriptResult) => {
    if (!javascriptResult) return;
    return javascriptResult.get_js_value();
  });
}

// FIXME: we should use troll fetch but it doesn't support reading an InputStream
// without a `content-length` header
// import fetch from "../troll/std/fetch";
async function fetchManifest(url, webview) {
  return new Promise((resolve) => {
    const session = new Soup.Session();
    const message = new Soup.Message({
      method: "GET",
      uri: Soup.URI.new(url),
    });
    message.request_headers.append("Cache-Control", "no-cache");
    if (webview) {
      message.request_headers.append(
        "User-Agent",
        webview.get_settings().get_user_agent(),
      );
    }

    session.queue_message(message, () => {
      try {
        resolve(
          JSON.parse(
            byteArray.toString(
              byteArray.fromGBytes(message.response_body_data),
            ),
          ),
        );
      } catch (err) {
        logError(err);
        resolve(null);
      }
    });
  });
}

function getTitle(webview) {
  const script = `(${getWebAppTitle.toString()})()`;

  return runJavaScript(webview, script)
    .then((javascriptValue) => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch((err) => {
      logError(err);
      return null;
    });
}

function getURL(webview) {
  const script = `(${getWebAppURL.toString()})()`;

  return runJavaScript(webview, script)
    .then((javascriptValue) => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch((err) => {
      logError(err);
      return null;
    });
}

async function getManifestURL(webview) {
  const script = `(${getWebAppManifest.toString()})()`;

  return runJavaScript(webview, script)
    .then((javascriptValue) => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch((err) => {
      logError(err);
      return null;
    });
}

const supported_formats = (() => {
  const formats = imports.gi.GdkPixbuf.Pixbuf.get_formats();
  return [].concat(...formats.map((format) => format.get_mime_types()));
})();

function resolveURI(webview, URL) {
  return Soup.URI.new_with_base(new Soup.URI(webview.get_uri()), URL).to_string(
    false,
  );
}

async function getWebAppInfo(webview) {
  const title = await getTitle(webview);
  // const icon = await getIcon(webview);
  const URL = await getURL(webview);

  const info = { title };
  info.URL = resolveURI(webview, URL);
  // if (icon) {
  // info.icon = resolveURI(webview, icon);
  // }

  const manifestURL = await getManifestURL(webview);
  if (!manifestURL) {
    return info;
  }

  log(`manifestURL <${manifestURL}>`);

  const manifest = await fetchManifest(manifestURL, webview);
  if (!manifest) {
    return info;
  }

  const {
    name,
    short_name,
    // icons = [],
    start_url,
  } = manifest;

  if (short_name) {
    info.title = short_name;
  } else if (name) {
    info.title = name;
  }

  if (start_url) {
    info.URL = resolveURI(webview, start_url);
  }

  // const bestIcon = findBestIcon(icons);
  // if (bestIcon) {
  //   info.icon = resolveURI(webview, bestIcon.src);
  // }

  info.manifest = manifest;
  return info;
}

function getFavicon(webview) {
  // TODO file gjs issue
  // favicon property is null if there is no favicon (example.com), throws otherwise
  try {
    if (!webview.favicon) return null;
  } catch (err) {
    // Error: Can't convert non-null pointer to JS value
  }

  // if there is no favicon webview.get_favicon throws with
  // JSObject* gjs_cairo_surface_from_surface(JSContext*, cairo_surface_t*): assertion 'surface != NULL' failed
  try {
    return webview.get_favicon();
  } catch (err) {
    logError(err);
    return null;
  }
}

function getFaviconAsPixbuf(webview) {
  const favicon = getFavicon(webview);
  if (!favicon) return;

  const pixbuf = pixbuf_get_from_surface(
    favicon,
    0,
    0,
    favicon.getWidth(),
    favicon.getHeight(),
  );
  return pixbuf;
}

const BLANK_URI = "tangram-resource:///re/sonny/Tangram/data/blank.html";

const {
  tld_get_base_domain,
  URI,
  TLDError: { IS_IP_ADDRESS, NOT_ENOUGH_DOMAINS, NO_BASE_DOMAIN },
} = imports.gi.Soup;
const { hostname_to_ascii } = imports.gi.GLib;

// Implements https://web.dev/same-site-same-origin/
function isSameSite(a, b) {
  a = new URI(a);
  b = new URI(b);

  if (!a || !b) return false;

  // punycode
  a = hostname_to_ascii(a.get_host());
  b = hostname_to_ascii(b.get_host());

  if (!a || !b) return false;

  try {
    return tld_get_base_domain(a) === tld_get_base_domain(b);
  } catch (err) {
    switch (err.code) {
      case IS_IP_ADDRESS:
      case NOT_ENOUGH_DOMAINS:
      case NO_BASE_DOMAIN:
        return a === b;
    }
    logError(err);
    return false;
  }
}

const {
  show_uri_on_window,
  FileChooserNative: FileChooserNative$1,
  FileChooserAction: FileChooserAction$1,
  ResponseType: ResponseType$3,
} = imports.gi.Gtk;
const {
  WebsiteDataManager,
  WebContext,
  CookiePersistentStorage,
  CookieAcceptPolicy,
  Settings: Settings$1,
  NotificationPermissionRequest,
  SecurityOrigin,
  UserContentManager,
  TLSErrorsPolicy,
  WebView,
  ProcessModel,
  DownloadError,
} = imports.gi.WebKit2;
const {
  build_filenamev: build_filenamev$5,
  DIR_SEPARATOR_S,
  get_user_special_dir,
  UserDirectory,
  path_get_basename,
  path_get_dirname,
  get_language_names,
} = imports.gi.GLib;
const {
  Notification,
  AppInfo,
  ResourceLookupFlags,
  resources_open_stream,
} = imports.gi.Gio;

function buildWebView({
  instance,
  onNotification,
  application,
  window,
}) {
  const { data_dir, cache_dir, url, id, name } = instance;

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.websitedatamanager
  const website_data_manager = new WebsiteDataManager({
    base_data_directory: data_dir,
    disk_cache_directory: cache_dir,
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
  const web_context = new WebContext({
    website_data_manager,
  });
  web_context.set_spell_checking_enabled(true);
  web_context.set_spell_checking_languages(get_language_names());
  web_context.set_tls_errors_policy(TLSErrorsPolicy.FAIL);
  web_context.set_favicon_database_directory(
    build_filenamev$5([cache_dir, "icondatabase"]),
  );
  web_context.set_process_model(ProcessModel.MULTIPLE_SECONDARY_PROCESSES);
  if (typeof web_context.set_sandbox_enabled === "function") {
    web_context.set_sandbox_enabled(true);
    web_context.add_path_to_sandbox(data_dir, true);
    web_context.add_path_to_sandbox(cache_dir, true);
  }

  const security_manager = web_context.get_security_manager();

  security_manager.register_uri_scheme_as_local("tangram-resource");
  web_context.register_uri_scheme("tangram-resource", (schemeRequest) => {
    const stream = resources_open_stream(
      schemeRequest.get_path(),
      ResourceLookupFlags.NONE,
    );
    schemeRequest.finish(stream, -1, null);
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.favicondatabase
  // const favicon_database = web_context.get_favicon_database();

  /*
   * Notifications
   */
  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#signal-initialize-notification-permissions
  if (url) {
    web_context.connect("initialize-notification-permissions", () => {
      // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#method-initialize_notification_permissions
      web_context.initialize_notification_permissions(
        [SecurityOrigin.new_for_uri(url)],
        [],
      );
    });
  }

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext#signal-download-started
  web_context.connect("download-started", (self, download) => {
    // https://bugs.webkit.org/show_bug.cgi?id=201868
    // We do this because the destination is decided by the user in 'decide-destination' handler
    download.set_allow_overwrite(true);

    const request = download.get_request();
    const uri = request.get_uri();
    if (uri.startsWith("http")) {
      download.cancel();
      AppInfo.launch_default_for_uri(uri, null);
      return;
    }

    // We cannot open blob: and file: uris in an other application
    // so we download them ourselves, it's okay because they are very
    // quick to download so we don't need a progress UI for them

    let error;
    download.connect("failed", (self, err) => {
      error = err;
    });
    download.connect("finished", () => {
      if (error && error.code === DownloadError.CANCELLED_BY_USER) return;

      const path = download.get_destination();
      const filename = path_get_basename(path);

      const notification = new Notification();
      notification.set_title(name);

      if (error) {
        notification.set_body(`“${filename}” ${error.message}`);
      } else {
        notification.set_body(`“${filename}”`);
        if (env !== "flatpak") {
          notification.set_default_action(`app.openURI('${path}')`);
          notification.add_button("Open file", `app.openURI('${path}')`);
          const dirname = path_get_dirname(path);
          notification.add_button("Open folder", `app.openURI('${dirname}')`);
        }
      }

      application.send_notification(null, notification);
    });

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.download#signal-decide-destination
    download.connect("decide-destination", (self, suggested_filename) => {
      if (!suggested_filename || suggested_filename === "unknown.asc") {
        suggested_filename = "";
      }

      const dest_dir = get_user_special_dir(UserDirectory.DIRECTORY_DOWNLOAD);
      const dest_name = suggested_filename.replace(
        new RegExp(DIR_SEPARATOR_S, "g"),
        "_",
      );

      const dialog = new FileChooserNative$1({
        action: FileChooserAction$1.SAVE,
        transient_for: window,
        do_overwrite_confirmation: true,
        create_folders: true,
      });
      // On Linux Mint XFCE 19.2 the default label is 'Open'
      dialog.set_accept_label("Save");
      // dest_dir is null in sandbox
      if (dest_dir) {
        dialog.set_current_folder(dest_dir);
      }
      dialog.set_current_name(dest_name);

      if (dialog.run() !== ResponseType$3.ACCEPT) {
        download.cancel();
        dialog.destroy();
        // TODO open issue
        // return true segfaults
        return;
      }

      download.set_destination(dialog.get_uri());
      dialog.destroy();

      return false;
    });
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.cookiemanager
  const cookieManager = website_data_manager.get_cookie_manager();
  cookieManager.set_accept_policy(CookieAcceptPolicy.NO_THIRD_PARTY);
  cookieManager.set_persistent_storage(
    build_filenamev$5([data_dir, "cookies.sqlite"]),
    CookiePersistentStorage.SQLITE,
  );

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.usercontentmanager
  const user_content_manager = new UserContentManager();

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.settings
  const settings = new Settings$1({
    enable_smooth_scrolling: true,
    media_playback_requires_user_gesture: true,

    // https://gitlab.gnome.org/GNOME/epiphany/-/blob/master/embed/ephy-embed-prefs.c
    enable_back_forward_navigation_gestures: true,
    enable_developer_extras: true,
    enable_dns_prefetching: true,
    enable_plugins: false,
    javascript_can_open_windows_automatically: true,
    allow_top_navigation_to_data_urls: false,
  });

  settings.set_user_agent_with_application_details("Tangram", pkg.version);

  // user-agent
  const userAgent = instance.settings.get_string("user-agent");
  if (userAgent) settings.set_user_agent(userAgent);
  instance.settings.connect(`changed::user-agent`, () => {
    settings.set_user_agent(instance.settings.get_string("user-agent"));
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webcontext
  const webView = new WebView({
    web_context,
    user_content_manager,
    expand: true,
    settings,
  });

  // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webinspector
  // const webInspector = webView.get_inspector();
  // webInspector.show();

  connect(webView, {
    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webview#signal-create
    create(navigation_action) {
      const current_url = webView.get_uri();
      const request_url = navigation_action.get_request().get_uri();

      if (isSameSite(current_url, request_url)) {
        // Open URL in current tab
        webView.load_uri(request_url);
        return;
      }

      // Open URL in default browser
      show_uri_on_window(window, request_url, null);
    },

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webview#signal-permission-request
    ["permission-request"](request) {
      if (request instanceof NotificationPermissionRequest) {
        request.allow();
        return;
      }
      request.deny();
    },

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.webview#signal-show-notification
    ["show-notification"](notification) {
      onNotification(notification, id);
      return true;
    },
  });

  webView.instance_id = id;
  webView.show_all();

  webView.load_uri(url || BLANK_URI);

  return webView;
}

const { Label: Label$2, Image: Image$1, Box: Box$2, EventBox, Popover } = imports.gi.Gtk;
const { EventMask } = imports.gi.Gdk;
const { Menu, SettingsBindFlags: SettingsBindFlags$2 } = imports.gi.Gio;
const { Pixbuf: Pixbuf$1, InterpType } = imports.gi.GdkPixbuf;

const ICON_SIZE$1 = 16;

function getFaviconScaled(webview) {
  const pixbuf = getFaviconAsPixbuf(webview);
  if (!pixbuf) return null;
  return pixbuf.scale_simple(ICON_SIZE$1, ICON_SIZE$1, InterpType.BILINEAR);
}

function TabLabel({ instance, settings, page }) {
  const { id } = instance;

  const box = new Box$2({});
  const image = new Image$1({ margin_end: 6 });

  let connectFaviconId;
  function connectFavicon() {
    connectFaviconId = page.connect("notify::favicon", () => {
      const new_favicon = getFaviconScaled(page);
      if (!new_favicon) {
        return;
      }
      image.set_from_pixbuf(new_favicon);
    });
  }

  if (flags.custom_icons) {
    if (instance.icon) {
      image.set_from_pixbuf(
        Pixbuf$1.new_from_file_at_scale(
          instance.icon,
          ICON_SIZE$1,
          ICON_SIZE$1,
          true,
        ),
      );
    } else {
      const favicon = getFaviconScaled(page);
      if (favicon) {
        image.set_from_pixbuf(favicon);
      }
      connectFavicon();
    }
    instance.observe("icon", () => {
      const icon = instance.icon;
      if (!icon) {
        connectFavicon();
        return;
      }
      page.disconnect(connectFaviconId);
      image.set_from_pixbuf(
        Pixbuf$1.new_from_file_at_scale(
          instance.icon,
          ICON_SIZE$1,
          ICON_SIZE$1,
          true,
        ),
      );
    });
  } else {
    const favicon = getFaviconScaled(page);
    if (favicon) {
      image.set_from_pixbuf(favicon);
    }
    connectFavicon();
  }

  box.add(image);

  const label = new Label$2();
  instance.bind("name", label, "label", SettingsBindFlags$2.GET);
  box.add(label);

  box.add_events(EventMask.BUTTON_PRESS_MASK);

  const eventBox = new EventBox({
    // margin_top: 6,
    // margin_bottom: 6,
  });
  eventBox.add(box);

  const menu = new Menu();
  menu.append("Edit", `app.editInstance("${id}")`);
  menu.append("Remove", `app.removeInstance("${id}")`);
  if (flags.custom_applications) {
    menu.append("New application", `app.detachTab("${id}")`);
  }

  const popover = new Popover();
  popover.bind_model(menu, null);
  popover.set_relative_to(box);
  settings.bind("tabs-position", popover, "position", SettingsBindFlags$2.GET);

  eventBox.connect("button-press-event", (self, eventButton) => {
    const [, button] = eventButton.get_button();
    if (button !== 3) return;

    popover.popup();
  });

  eventBox.show_all();
  return eventBox;
}

function TabPage({ instance, window, onNotification, application }) {
  const webView = buildWebView({
    instance,
    window,
    onNotification,
    application,
  });
  instance.page = webView;
  return webView;
}

const {
  Entry: Entry$2,
  //  CssProvider
} = imports.gi.Gtk;
const { URI: URI$1 } = imports.gi.Soup;

function normalizeURL(str) {
  if (!str) return null;

  if (!str.startsWith("http")) {
    str = "http://" + str;
  }

  const uri = new URI$1(str);
  if (!uri) return null;

  // FIXME
  // no is_valid or valid_for_http in soup gjs?
  if (!["http", "https"].includes(uri.scheme)) {
    return null;
  }

  return uri.to_string(false);
}

function AddressBar({ state }) {
  const URLBar = new Entry$2({
    hexpand: true,
    placeholder_text: "Enter address",
  });

  // This is a workaround https://gitlab.gnome.org/GNOME/gtk/issues/378
  // described in https://gitlab.gnome.org/GNOME/gtk/commit/7aad0896a73e6957c8d5ef65d59b2d0891df1b9c
  // but that commit did not made it to stable yet so it's not working
  // there is unfortunally no workaround until then so we don't grab focus
  /*
  const css = new CssProvider();
  css.load_from_data(`
    entry:focus > placeholder {
      opacity: 1;
    }
  `);
  URLBar.get_style_context().add_provider(css, 0);
  state.notify("view", view => {
    if (view === "services") {
      URLBar.grab_focus_without_selecting();
    }
  });
  */

  URLBar.connect("activate", () => {
    const url = normalizeURL(URLBar.text);
    if (!url) return;

    const webview = state.get("webview");
    if (!webview) return;
    webview.load_uri(url);
    webview.grab_focus();
  });
  return URLBar;
}

const {
  HeaderBar,
  Button: Button$1,
  Stack,
  StackTransitionType,
  Box: Box$3,
  MenuButton,
  Builder,
  IconSize,
  Image: Image$2,
  STYLE_CLASS_LINKED,
  Label: Label$3,
} = imports.gi.Gtk;
const { LoadEvent, uri_for_display } = imports.gi.WebKit2;

function Menu$1({ profile }) {
  const builder = Builder.new_from_resource(
    "/re/sonny/Tangram/data/menu.xml.ui",
  );
  const popover = builder.get_object("app-menu");

  if (!flags.custom_applications) {
    builder.get_object("edit-application").destroy();
    builder.get_object("new-application").destroy();
  }
  // main app
  else if (!profile.id) {
    builder.get_object("edit-application").destroy();
  }
  // custom app
  else {
    builder.get_object("new-application").destroy();
  }

  const image = new Image$2({
    icon_name: "open-menu-symbolic",
    icon_size: IconSize.BUTTON,
  });
  const button = new MenuButton({
    popover,
    image,
  });

  return button;
}

function Header({
  onReload,
  onStopLoading,
  onGoBack,
  onGoForward,
  onGoHome,
  onAddTab,
  onCancelNewTab,
  profile,
  state,
  onNewTab,
}) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.headerbar
  const titlebar = new HeaderBar({
    show_close_button: true,
  });

  const left_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });

  const navigationButtonBox = new Box$3({
    spacing: 6,
  });
  left_stack.add_named(navigationButtonBox, "navigation");

  const navigationButtons = new Box$3({ spacing: 0 });
  navigationButtons.get_style_context().add_class(STYLE_CLASS_LINKED);
  navigationButtonBox.add(navigationButtons);

  const backButton = Button$1.new_from_icon_name(
    "go-previous-symbolic",
    IconSize.BUTTON,
  );
  backButton.set_tooltip_text("Go back to the previous page");
  backButton.sensitive = false;
  navigationButtons.add(backButton);
  backButton.connect("clicked", onGoBack);

  const forwardButton = Button$1.new_from_icon_name(
    "go-next-symbolic",
    IconSize.BUTTON,
  );
  forwardButton.set_tooltip_text("Go forward to the next page");
  forwardButton.sensitive = false;
  navigationButtons.add(forwardButton);
  forwardButton.connect("clicked", onGoForward);

  const reloadIcon = new Image$2({
    icon_size: IconSize.BUTTON,
    icon_name: "view-refresh-symbolic",
  });
  const reloadButton = new Button$1({ image: reloadIcon });
  reloadButton.set_tooltip_text("Reload the current page");
  navigationButtonBox.add(reloadButton);
  reloadButton.connect("clicked", () => {
    const webview = state.get("webview");
    if (webview.is_loading) {
      onStopLoading();
    } else {
      onReload();
    }
  });

  const homeIcon = new Image$2({
    icon_size: IconSize.BUTTON,
    icon_name: "go-home-symbolic",
  });
  const homeButton = new Button$1({ image: homeIcon });
  homeButton.set_tooltip_text("Go to homepage");
  navigationButtonBox.add(homeButton);
  homeButton.connect("clicked", onGoHome);

  const cancelBox = new Box$3();
  // https://github.com/sonnyp/Tangram/issues/64
  // const cancelIcon = new Image({
  //   icon_size: IconSize.BUTTON,
  //   icon_name: "go-previous-symbolic",
  // });
  const cancelButton = new Button$1({
    label: "Cancel",
    // image: cancelIcon,
    always_show_image: true,
  });
  state.bind(
    "instances",
    cancelButton,
    "visible",
    (instances) => instances.length > 0,
  );
  cancelBox.add(cancelButton);
  cancelButton.connect("clicked", onCancelNewTab);
  left_stack.add_named(cancelBox, "cancel");

  titlebar.pack_start(left_stack);

  const center_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });
  titlebar.custom_title = center_stack;
  const title = new Label$3({
    label: profile.title,
  });
  title.get_style_context().add_class("title");
  center_stack.add_named(title, "title");
  const addressBar = AddressBar({ state });
  center_stack.add_named(addressBar, "url");

  const right_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });
  titlebar.pack_end(right_stack);

  const menuButtonBox = new Box$3({
    spacing: 6,
  });
  const newTabButton = Button$1.new_from_icon_name(
    "tab-new-symbolic",
    IconSize.BUTTON,
  );
  newTabButton.set_tooltip_text("Add new tab");
  newTabButton.set_always_show_image(true);
  newTabButton.connect("clicked", () => onNewTab());
  menuButtonBox.pack_end(Menu$1({ profile }), false, false, null);
  menuButtonBox.pack_end(newTabButton, false, false, null);
  right_stack.add_named(menuButtonBox, "menu");
  right_stack.add_named(new Box$3(), "empty");

  const servicesLayer = new Box$3();
  const addTabButton = new Button$1({
    label: "Done",
    sensitive: false,
  });
  addTabButton.connect("clicked", () => {
    onAddTab().catch(logError);
  });
  addTabButton.get_style_context().add_class("suggested-action");
  servicesLayer.pack_end(addTabButton, false, false, null);
  right_stack.add_named(servicesLayer, "new-tab");

  titlebar.show_all();

  function updateButtons(webview) {
    backButton.sensitive = webview.can_go_back();
    forwardButton.sensitive = webview.can_go_forward();
  }

  function setAddress(webview) {
    const url = webview.get_uri();
    if (!url || url === BLANK_URI) {
      addressBar.text = "";
      return;
    }
    addressBar.text = uri_for_display(url);
  }

  function setSecurity(webview) {
    if (!addressBar.text) {
      addressBar.primary_icon_name = null;
      return;
    }

    const [ok, , errors] = webview.get_tls_info();
    if (!ok) {
      addressBar.primary_icon_name = "channel-insecure-symbolic";
      return;
    }

    if (errors !== 0) {
      addressBar.primary_icon_name = "channel-insecure-symbolic";
      return;
    }

    addressBar.primary_icon_name = null;
  }

  state.notify("view", (view) => {
    addTabButton.sensitive = false;
    if (view === "tabs") {
      left_stack.visible_child_name = "navigation";
      center_stack.visible_child_name = "title";
      right_stack.visible_child_name = "menu";
    } else if (view === "new-tab") {
      left_stack.visible_child_name = "cancel";
      center_stack.visible_child_name = "url";
      right_stack.visible_child_name = "new-tab";
    }
  });

  let loadChangedHandlerId = null;
  let backForwardListChangedHandlerId = null;
  state.notify("webview", (webview, previous) => {
    if (previous) {
      if (loadChangedHandlerId) {
        previous.disconnect(loadChangedHandlerId);
        loadChangedHandlerId = null;
      }
      if (backForwardListChangedHandlerId) {
        previous
          .get_back_forward_list()
          .disconnect(backForwardListChangedHandlerId);
        backForwardListChangedHandlerId = null;
      }
    }

    if (!webview) {
      addressBar.primary_icon_name = null;
      addressBar.text = "";
      return;
    }

    updateButtons(webview);
    setAddress(webview);
    if (!webview.is_loading) {
      setSecurity(webview);
    }
    reloadIcon.icon_name = webview.is_loading
      ? "process-stop-symbolic"
      : "view-refresh-symbolic";

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.backforwardlist#signal-changed
    backForwardListChangedHandlerId = webview
      .get_back_forward_list()
      .connect("changed", () => {
        updateButtons(webview);
      });

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.loadevent
    loadChangedHandlerId = webview.connect(
      "load-changed",
      (self, loadEvent) => {
        // updateButtons(webview);

        if (loadEvent === LoadEvent.COMMITTED) {
          if (webview.uri !== BLANK_URI) {
            reloadIcon.icon_name = "view-refresh-symbolic";
            addTabButton.sensitive = true;
          }
        } else if (loadEvent !== LoadEvent.FINISHED) {
          addTabButton.sensitive = false;
        }

        if (loadEvent === LoadEvent.STARTED) {
          reloadIcon.icon_name = "process-stop-symbolic";
          setAddress(webview);
          addressBar.primary_icon_name = null;
        } else if (loadEvent === LoadEvent.REDIRECTED) {
          setAddress(webview);
        } else if (loadEvent === LoadEvent.COMMITTED) {
          setSecurity(webview);
        }
      },
    );
  });

  return { titlebar, addressBar };
}

const { uuid_string_random: uuid_string_random$1 } = imports.gi.GLib;
const { ApplicationWindow, Stack: Stack$1, StackTransitionType: StackTransitionType$1 } = imports.gi.Gtk;
const { Notification: Notification$1, NotificationPriority } = imports.gi.Gio;

function Window({ application, profile, state }) {
  profile.settings =
    "/re/sonny/Tangram/" + (profile.id ? `applications/${profile.id}/` : "");

  for (const key in profile) {
    log(`profile.${key}: ${profile[key]}`);
  }

  const settings = new Settings({
    schema_id: "re.sonny.Tangram",
    path: profile.settings,
  });

  const header = Header({
    onReload,
    onStopLoading,
    onGoBack,
    onGoForward,
    onGoHome,
    onAddTab,
    onCancelNewTab,
    profile,
    state,
    onNewTab,
  });

  function onStopLoading() {
    const tab = state.get("webview");
    tab && tab.stop_loading();
  }

  function onReload(bypass_cache) {
    const tab = state.get("webview");
    if (!tab) return;
    if (bypass_cache) {
      tab.reload_bypass_cache();
    } else {
      tab.reload();
    }
  }

  function onGoBack() {
    const tab = state.get("webview");
    tab && tab.go_back();
  }

  function onGoForward() {
    const tab = state.get("webview");
    tab && tab.go_forward();
  }

  function onGoHome() {
    const tab = state.get("webview");
    if (!tab || !tab.instance_id) return;
    const instance = get(tab.instance_id);
    if (!instance) return;
    tab.load_uri(instance.url);
  }

  function onShowInspector() {
    const tab = state.get("webview");
    tab && tab.get_inspector().show();
  }

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.applicationwindow
  const window = new ApplicationWindow({
    application,
    title: profile.title,
  });

  let width = settings.get_int("window-width");
  let height = settings.get_int("window-height");
  if (width && height) {
    window.set_default_size(width, height);
  } else {
    window.maximize();
    window.set_default_size(800, 600);
  }
  window.connect("size-allocate", () => {
    [width, height] = window.is_maximized ? [0, 0] : window.get_size();
  });
  window.connect("destroy", () => {
    settings.set_int("window-width", width);
    settings.set_int("window-height", height);
  });

  window.set_titlebar(header.titlebar);

  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.stack
  const stack = new Stack$1({
    transition_type: StackTransitionType$1.CROSSFADE,
  });
  state.bind("view", stack, "visible_child_name");
  window.add(stack);

  const notebook = Notebook({ profile, settings, application });
  stack.add_named(notebook, "tabs");
  stack.show_all();

  function showTab(idx) {
    notebook.set_current_page(idx);
    state.set({ view: "tabs", webview: notebook.get_nth_page(idx) });
  }

  function onNotification(webkit_notification, instance_id) {
    // TODO
    // report gjs bug webkit_notification.body and webkit_notification.title return undefined
    const body = webkit_notification.get_body();
    const title = webkit_notification.get_title();

    // https://gjs-docs.gnome.org/gio20~2.0_api/gio.notification
    const notification = new Notification$1();
    if (title) notification.set_title(title);
    if (body) notification.set_body(body);
    notification.set_priority(NotificationPriority.HIGH);
    notification.set_default_action(`app.showInstance('${instance_id}')`);
    application.send_notification(instance_id, notification);
  }

  function buildInstance(instance) {
    const page = TabPage({
      application,
      instance,
      window,
      onNotification,
    });
    return buildInstanceFromPage({ instance, page });
  }

  function buildInstanceFromPage({ instance, page }) {
    const label = TabLabel({ instance, settings, page });
    const idx = notebook.append_page(page, label);
    notebook.set_tab_reorderable(page, true);
    if (flags.custom_applications) {
      notebook.set_tab_detachable(page, true);
    }
    return idx;
  }

  async function onAddTab() {
    const webview = stack.get_child_by_name("new-tab");
    const { instance_id } = webview;
    const instance = get(instance_id);
    instance.url = webview.uri;

    const info = await getWebAppInfo(webview);
    log(`WebApp info for ${instance.url}`);
    log(JSON.stringify(info, null, 2));

    instance.url = info.URL;

    if (!instance.name) {
      instance.name = info.title || webview.title || "";
    }

    // TODO icon
    // try {
    //   // await download(webview, info.icon, `file://${icon}`);
    //   const icon = saveFavicon(webview, instance);
    //   if (icon) instance.icon = icon;
    // } catch (err) {
    //   logError(err);
    // }

    let canceled;
    try {
      canceled = await addInstanceDialog({
        instance,
        window,
      });
    } catch (err) {
      logError(err);
      destroy(instance);
      // TODO display error
      return;
    }

    if (canceled) {
      return;
    }

    webview.load_uri(instance.url);

    attach(settings, instance.id);
    stack.remove(webview);

    const idx = buildInstanceFromPage({
      page: webview,
      instance,
    });
    showTab(idx);
  }

  function onCancelNewTab() {
    // FIXME set webview!!
    // state.set({ view: "tabs", webview: notebook.get_nth_child(notebook.page) });
    showTab(notebook.page || 0);
    const webView = stack.get_child_by_name("new-tab");
    if (!webView) return;
    webView.destroy();
    const { instance_id } = webView;
    const instance = get(instance_id);
    if (!instance) return;
    destroy(instance);
  }

  function onNewTab() {
    const id = uuid_string_random$1().replace(/-/g, "");

    const instance = create({
      url: BLANK_URI,
      id,
      name: "",
    });

    const webview = buildWebView({
      application,
      onNotification,
      window,
      instance,
    });

    const previous = stack.get_child_by_name("new-tab");
    if (previous) previous.destroy();
    stack.add_named(webview, "new-tab");
    state.set({ webview, view: "new-tab" });
  }

  load(settings);
  list.forEach((instance) => {
    buildInstance(instance);
  });

  observeSetting(settings, "instances", (instances) => {
    state.set({ instances });
    if (instances.length === 0) {
      onNewTab();
    } else {
      const page = notebook.get_nth_page(notebook.page);
      state.set({
        view: "tabs",
        webview: page,
      });
    }
  });

  Shortcuts({
    window,
    application,
    notebook,
    addressBar: header.addressBar,
    onStopLoading,
    onReload,
    onGoBack,
    onGoForward,
    onGoHome,
    onShowInspector,
  });

  Actions({
    window,
    application,
    settings,
    profile,
    notebook,
    showTab,
  });

  return { window, notebook, showTab };
}

const { VariantType: VariantType$3 } = imports.gi.GLib;
const { SimpleAction: SimpleAction$2, AppInfo: AppInfo$1 } = imports.gi.Gio;

function PersistentActions({ getWindow, application }) {
  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const showInstanceAction = new SimpleAction$2({
    name: "showInstance",
    parameter_type: VariantType$3.new("s"),
  });
  showInstanceAction.connect("activate", (self, parameters) => {
    const id = parameters.unpack();
    const { window, showTab, notebook } = getWindow();

    const instance = get(id);
    if (instance && instance.page) {
      showTab(notebook.page_num(instance.page));
    }

    window.present();
  });
  application.add_action(showInstanceAction);

  // https://gjs-docs.gnome.org/gio20~2.0_api/gio.simpleaction
  const openURIAction = new SimpleAction$2({
    name: "openURI",
    parameter_type: VariantType$3.new("s"),
  });
  openURIAction.connect("activate", (self, parameters) => {
    const path = parameters.unpack();
    AppInfo$1.launch_default_for_uri(path, null);
  });
  application.add_action(openURIAction);
}

const { Application, Builder: Builder$1 } = imports.gi.Gtk;
const {
  // ApplicationFlags,
  SimpleAction: SimpleAction$3,
} = imports.gi.Gio;
const {
  OptionFlags,
  OptionArg,
  set_prgname,
  set_application_name,
} = imports.gi.GLib;
const { set_program_class } = imports.gi.Gdk;

const application = new Application({
  application_id: "re.sonny.Tangram",
  // TODO applications
  // flags: ApplicationFlags.NON_UNIQUE,
});

if (flags.custom_applications) {
  application.add_main_option(
    "name",
    null,
    OptionFlags.OPTIONAL_ARG,
    OptionArg.STRING,
    "Display name to use",
    "name",
  );
  application.add_main_option(
    "id",
    null,
    OptionFlags.OPTIONAL_ARG,
    OptionArg.STRING,
    "Application id to use",
    "application-id",
  );
}

const profile = {
  title: "Tangram",
  application_id: "re.sonny.Tangram",
};
// https://gitlab.gnome.org/GNOME/epiphany/blob/master/lib/ephy-web-app-utils.c#L484
function setupProfile() {
  application.set_application_id(profile.application_id);
  // On X11 and wayland Shows in about dialog
  set_application_name("Tangram");

  if (profile.id) {
    // On X11 does not show anywhere
    // I think this is supposed to be proc name
    // but does not work in gjs?
    // On wayland shows in GNOME Shell header bar
    // and task bar
    // On wayland is the wmclass
    set_prgname(profile.id);
    // On X11 shows in GNOME Shell header bar
    // on X11 is the wmclass
    // on Wayland does not show anywhere
    set_program_class(profile.id);
  } else {
    set_prgname("Tangram");
    set_program_class("Tangram");
  }
}

if (flags.custom_applications) {
  application.connect("handle-local-options", (self, dict) => {
    const name = lookup(dict, "name");
    const id = lookup(dict, "id");

    if (name) {
      profile.name = name;
      profile.title = name;
    }
    if (id) {
      profile.id = id;
      profile.application_id += `.${id}`;
    }
    setupProfile();

    return -1;
  });
}

let window;

function getWindow() {
  if (!window) {
    window = Window({ state, application, profile });
  }

  return window;
}

application.connect("activate", (app) => {
  if (app.active_window) {
    app.active_window.present();
    return;
  }
  getWindow().window.present();
});

const showAboutDialog = new SimpleAction$3({
  name: "about",
  parameter_type: null,
});
showAboutDialog.connect("activate", () => {
  AboutDialog({ window: window.window });
});
application.add_action(showAboutDialog);

const showShortcutsDialog = new SimpleAction$3({
  name: "shortcuts",
  parameter_type: null,
});
showShortcutsDialog.connect("activate", () => {
  const builder = Builder$1.new_from_resource(
    "/re/sonny/Tangram/data/shortcuts.xml.ui",
  );
  const shortcutsWindow = builder.get_object("shortcuts-window");
  shortcutsWindow.set_transient_for(window.window);
  shortcutsWindow.present();
});
application.add_action(showShortcutsDialog);
application.set_accels_for_action("app.shortcuts", [
  "<Ctrl>F1",
  "<Ctrl>question",
]);

PersistentActions({ application, getWindow });

const { programInvocationName: programInvocationName$1 } = imports.system;
const { SimpleAction: SimpleAction$4 } = imports.gi.Gio;
const {
  getenv: getenv$2,
  // listenv,
  spawn_async,
  SpawnFlags,
  log_writer_is_journald,
  setenv,
} = imports.gi.GLib;

pkg.require(versions);

if (getenv$2("DEV")) {
  if (log_writer_is_journald(2)) {
    setenv("G_MESSAGES_DEBUG", "re.sonny.Tangram", false);
  }
}

// Debug
log(`programInvocationName: ${programInvocationName$1}`);
log(`_: ${getenv$2("_")}`);
for (const i in pkg) {
  if (typeof pkg[i] === "string") {
    log(`pkg.${i}: ${pkg[i]}`);
  }
}
// listenv().forEach((name) => {
//   log(`env ${name}: ${getenv(name)}`);
// });

this.main = function main(argv = []) {
  log("argv " + argv.join(" "));

  if (getenv$2("DEV")) {
    const restart = new SimpleAction$4({
      name: "restart",
      parameter_type: null,
    });
    restart.connect("activate", () => {
      application.quit();
      log(argv);
      spawn_async(null, argv, null, SpawnFlags.DEFAULT, null);
    });
    application.add_action(restart);
    application.set_accels_for_action("app.restart", ["<Ctrl><Shift>Q"]);
  }
  return application.run(argv);
};
