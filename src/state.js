const { addSignalMethods } = imports.signals;

export class State {
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
    fn = value => value
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

export default new State();
