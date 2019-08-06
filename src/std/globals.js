const console = imports.std.console;
const timers = imports.std.timers;
const encoding = imports.std.encoding;

/* eslint-disable no-restricted-globals */
Object.assign(window, { console });
Object.assign(window, timers);
Object.assign(window, encoding);
/* eslint-enable no-restricted-globals */
