const { timeout_add, source_remove, PRIORITY_DEFAULT } = imports.gi.GLib;

// const GLib = imports.gi.GLib;
// const loop = GLib.MainLoop.new(null, false);
// setTimeout(() => {
//   print("yey");
//   loop.quit();
// }, 1000);
// loop.run();

this.setTimeout = function setTimeout(func, delay, ...args) {
  if (typeof delay !== "number" || delay < 0) delay = 0;
  return timeout_add(PRIORITY_DEFAULT, delay, () => {
    func.apply(null, args);
    return false;
  });
};

this.clearTimeout = function clearTimeout(id) {
  source_remove(id);
};

this.setInterval = function setInterval(func, delay, ...args) {
  if (typeof delay !== "number" || delay < 0) delay = 0;
  return timeout_add(PRIORITY_DEFAULT, delay, () => {
    func.apply(null, args);
    return true;
  });
};

this.clearInterval = function clearInterval(id) {
  source_remove(id);
};
