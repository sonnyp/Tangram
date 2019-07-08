(() => {
  "use strict";

  const { build_filenamev, get_user_config_dir } = imports.gi.GLib;
  const { File, IOErrorEnum, FileCreateFlags } = imports.gi.Gio;

  const dbPath = build_filenamev([get_user_config_dir(), "Gigagram.json"]);
  const dbFile = File.new_for_path(dbPath);

  const instances = [];
  this.instances = instances;

  function load() {
    let success;
    let content;

    try {
      [success, content] = dbFile.load_contents(null);
    } catch (err) {
      if (err.code === IOErrorEnum.NOT_FOUND) {
        return;
      }
      throw err;
    }
    if (!success) {
      return;
    }

    log(content);

    try {
      instances.push(...JSON.parse(content));
    } catch (err) {
      logError(err);
    }
  }

  function save() {
    dbFile.replace_contents(
      JSON.stringify(instances, null, 2),
      null,
      false,
      FileCreateFlags.REPLACE_DESTINATION,
      null
    );
  }

  this.addInstance = function add(instance) {
    instances.push(instance);
    save();
  };

  load();
})();
