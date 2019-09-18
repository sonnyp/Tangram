const {
  get_user_config_dir,
  build_filenamev,
  mkdir_with_parents,
  rmdir,
} = imports.gi.GLib;
const { FileCopyFlags, File, IOErrorEnum } = imports.gi.Gio;

const { env } = imports.env;

this.migrate = function migrate() {
  if (env !== "flatpak") {
    return;
  }

  const config_dir = get_user_config_dir();
  const keyfile_directory = build_filenamev([config_dir, "glib-2.0/settings/"]);
  mkdir_with_parents(keyfile_directory, 0o700);

  const file = File.new_for_path(
    build_filenamev([config_dir, "Tangram/glib-2.0/settings/keyfile"])
  );
  const destination = File.new_for_path(
    build_filenamev([keyfile_directory, "keyfile"])
  );

  let migrated;
  try {
    migrated = file.move(destination, FileCopyFlags.NONE, null, null);
  } catch (err) {
    migrated = false;
    if (err.code !== IOErrorEnum.NOT_FOUND) {
      logError(err);
    }
  }

  if (migrated) {
    rmdir(build_filenamev([config_dir, "Tangram/glib-2.0/settings/"]));
    rmdir(build_filenamev([config_dir, "Tangram/glib-2.0/"]));
    rmdir(build_filenamev([config_dir, "Tangram/"]));
  }

  log(`Migrated: ${migrated}`);
};
