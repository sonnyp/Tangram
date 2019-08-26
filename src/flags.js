const { getenv } = imports.gi.GLib;

this.custom_applications =
  getenv("TANGRAM_ENABLE_CUSTOM_APPLICATIONS") === "true";
