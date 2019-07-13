(() => {
  "use strict";

  const { HeaderBar, Button, Stack, StackTransitionType, Box } = imports.gi.Gtk;

  this.Header = function Header({ onAddTab, onCancel }) {
    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.headerbar
    const titlebar = new HeaderBar({
      title: "Gigagram",
      show_close_button: true,
    });

    const stack = new Stack();
    stack.set_transition_type(StackTransitionType.CROSSFADE);

    const addTabButton = Button.new_from_icon_name("tab-new", null);
    addTabButton.set_label("Add");
    addTabButton.set_always_show_image(true);
    addTabButton.connect("clicked", onAddTab);
    stack.add_named(addTabButton, "tabs");

    const cancelButton = Button.new_with_label("Cancel");
    cancelButton.connect("clicked", onCancel);
    stack.add_named(cancelButton, "services");

    stack.add_named(new Box(), "none");

    titlebar.pack_start(stack);

    return { titlebar, stack };
  };
})();
