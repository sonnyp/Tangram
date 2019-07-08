(() => {
  "use strict";

  const { build_filenamev, get_user_config_dir } = imports.gi.GLib;
  const { File, IOErrorEnum, FileCreateFlags } = imports.gi.Gio;

  const configFile = File.new_for_path(
    build_filenamev([get_user_config_dir(), "Gigagram.json"])
  );

  const instances = [
    {
      url: "https://jhmux.codesandbox.io/",
      service_id: "custom",
      id: "test-gigagram",
      title: "Tests",
    },
  ];
  this.instances = instances;

  function load() {
    let success;
    let content;

    try {
      [success, content] = configFile.load_contents(null);
    } catch (err) {
      if (err.code === IOErrorEnum.NOT_FOUND) {
        return;
      }
      throw err;
    }
    if (!success) {
      return;
    }

    try {
      instances.push(...JSON.parse(content));
    } catch (err) {
      logError(err);
    }
  }

  function save() {
    configFile.replace_contents(
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
