const { build_filenamev } = imports.gi.GLib;
const { File } = imports.gi.Gio;

const { Settings } = imports.util;
const { data_dir, cache_dir } = imports.env;

const list = [];
this.list = list;

class Instance {
  constructor(id) {
    this.id = id;
    this.data_dir = build_filenamev([data_dir, id]);
    this.cache_dir = build_filenamev([cache_dir, id]);

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
    return this.settings.set_string("name", name);
  }
  get icon() {
    return this.settings.get_string("icon");
  }
  set icon(icon) {
    return this.settings.set_string("icon", icon);
  }
  get url() {
    return this.settings.get_string("url");
  }
  set url(url) {
    return this.settings.set_string("url", url);
  }
}
this.Instance = Instance;

this.load = function load(settings) {
  settings.get_strv("instances").forEach(id => {
    list.push(new Instance(id));
  });
};

this.detach = function detach(settings, id) {
  const instances = settings.get_strv("instances");
  const idx = instances.indexOf(id);
  if (idx < 0) return;
  instances.splice(idx, 1);
  settings.set_strv("instances", instances);
  return idx;
};

this.attach = function attach(settings, id) {
  const instances = settings.get_strv("instances") || [];
  settings.set_strv("instances", [...instances, id]);
};

this.create = function create({ id, ...props }) {
  const instance = new Instance(id);
  Object.assign(instance, props);
  list.push(instance);
  return instance;
};

this.destroy = function destroy(instance) {
  const idx = list.indexOf(instance);
  if (idx > -1) list.splice(idx, 1);

  const { settings } = instance;
  settings.reset("name");
  settings.reset("url");
  settings.reset("icon");
  // https://gitlab.gnome.org/GNOME/glib/merge_requests/981#note_551625
  try {
    settings.reset("");
  } catch (err) {} // eslint-disable-line no-empty

  File.new_for_path(instance.data_dir).trash(null);
  File.new_for_path(instance.cache_dir).trash(null);
};

this.get = function get(id) {
  return list.find(instance => instance.id === id);
};
