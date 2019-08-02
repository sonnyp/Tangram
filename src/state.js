(() => {
  "use strict";

  const { addSignalMethods } = imports.signals;

  class State {
    constructor() {
      this.properties = Object.create(null);
    }

    get(prop) {
      return this.properties[prop];
    }

    set(props) {
      Object.assign(this.properties, props);
      Object.keys(props).forEach(key => {
        this.emit(`notify::${key}`, this);
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
  this.State = State;

  this.state = new State();
})();
