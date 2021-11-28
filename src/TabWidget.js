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
    Children: ["image", "text", "popover"],
    Properties: {
      label: GObject.ParamSpec.string(
        "label",
        "LabelProperty",
        "Set text label",
        GObject.ParamFlags.READWRITE,
        "",
      ),
      // web: GObject.ParamSpec.string(
      //   "label",
      //   "LabelProperty",
      //   "Set text label",
      //   GObject.ParamFlags.READWRITE,
      //   "",
      // ),
    },
    // InternalChildren: ["button"],
  },
  class Tab extends Gtk.Box {
    _init(params = {}) {
      super._init(params);

      const eventController = new Gtk.GestureSingle({
        button: Gdk.BUTTON_SECONDARY,
      });
      this.add_controller(eventController);
      eventController.connect("end", () => {
        this.popover.popup();
      });

      // log(params.webView);

      // // The template has been initialized and you can access the children
      // this.box.visible = true;

      // // Internal children are set on the instance prefixed with a `_`
      // this._button.visible = true;
    }

    set label(label) {
      this.text.label = label;
    }

    get label() {
      return this.text.label;
    }

    size_allocate(...args) {
      log("size allocate");
      this.popover.present();
      super._vfunc_size_allocate(...args);
    }

    // get label() {
    //   return this.label.label;
    // }

    // set label(label) {
    //   this.label.label = label;
    // }

    // The signal handler bound in the UI file
    // _onButtonClicked(button) {
    //   if (this instanceof Gtk.Window)
    //     log("Callback scope is bound to `ExampleWindow`");

    //   button.label = "Button was clicked!";
    // }
  },
);
