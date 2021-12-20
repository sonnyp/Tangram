import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GObject from "gi://GObject";
import { relativePath } from "./util.js";
import Gdk from "gi://Gdk";

const file = Gio.File.new_for_path(relativePath("TabWidget.ui"));
const [, template] = file.load_contents(null);

export default GObject.registerClass(
  {
    GTypeName: "Tab",
    Template: template,
    Children: ["popover", "image"],
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
  class Tab extends Gtk.Box {
    _init({ label = "", ...params } = {}) {
      super._init(params);
      Object.assign(this, { label });

      const eventController = new Gtk.GestureSingle({
        button: Gdk.BUTTON_SECONDARY,
        exclusive: true,
      });
      this.add_controller(eventController);
      eventController.connect("end", () => {
        this.popover.popup();
      });
    }

    set label(label) {
      this._label.label = label;
    }

    get label() {
      return this._label.label;
    }
  },
);
