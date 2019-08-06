function printable(arg) {
  if (typeof arg === "object") {
    return JSON.stringify(arg);
  } else {
    return arg.toString();
  }
}

this.log = function log(...args) {
  // eslint-disable-next-line no-restricted-globals
  print(args.map(printable).join(" "));
};

this.error = function error(...args) {
  // eslint-disable-next-line no-restricted-globals
  printerr(args.map(printable).join(" "));
};
