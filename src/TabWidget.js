import Gtk from "gi://Gtk";
import GObject from "gi://GObject";
import Template from "./TabWidget.blp" assert { type: "uri" };

import "./icons/settings-symbolic.svg" assert { type: "icon" };

export default GObject.registerClass(
  {
    GTypeName: "Tab",
    Template,
    Children: ["image", "button"],
    InternalChildren: ["label"],
    Properties: {
      label: GObject.ParamSpec.string(
        "label",
        "LabelProperty",
        "Set text label",
        GObject.ParamFlags.READWRITE,
        "",
      ),
    },
  },
  class Tab extends Gtk.ListBoxRow {
    _init({ label = "", ...params } = {}) {
      super._init(params);
      Object.assign(this, { label });
    }

    set label(label) {
      this._label.label = label;
    }

    get label() {
      return this._label.label;
    }
  },
);
