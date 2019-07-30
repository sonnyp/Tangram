(() => {
  "use strict";

  const {
    HeaderBar,
    Button,
    Stack,
    StackTransitionType,
    Box,
    MenuButton,
    Builder,
    IconSize,
    Image,
  } = imports.gi.Gtk;

  function Menu() {
    const builder = Builder.new_from_resource(
      "/re/sonny/gigagram/data/menu.xml.ui"
    );
    const popover = builder.get_object("app-menu");

    const image = new Image({
      icon_name: "open-menu-symbolic",
      icon_size: IconSize.BUTTON,
    });
    const button = new MenuButton({
      popover,
      image,
    });

    return button;
  }

  this.Header = function Header({
    onAddTab,
    onCancel,
    onReload,
    onGoBack,
    onGoForward,
  }) {
    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.headerbar
    const titlebar = new HeaderBar({
      title: "Gigagram",
      show_close_button: true,
    });

    const stack = new Stack();
    stack.set_transition_type(StackTransitionType.CROSSFADE);

    const buttonBox = new Box();
    stack.add_named(buttonBox, "tabs");
    const addTabButton = Button.new_from_icon_name(
      "tab-new-symbolic",
      IconSize.BUTTON
    );
    buttonBox.add(addTabButton);
    addTabButton.set_always_show_image(true);
    addTabButton.connect("clicked", onAddTab);

    const reloadButton = Button.new_from_icon_name(
      "view-refresh-symbolic",
      IconSize.BUTTON
    );
    buttonBox.add(reloadButton);
    reloadButton.connect("clicked", onReload);

    const backButton = Button.new_from_icon_name(
      "go-previous-symbolic",
      IconSize.BUTTON
    );
    buttonBox.add(backButton);
    backButton.connect("clicked", onGoBack);

    const forwardButton = Button.new_from_icon_name(
      "go-next-symbolic",
      IconSize.BUTTON
    );
    buttonBox.add(forwardButton);
    forwardButton.connect("clicked", onGoForward);

    const serviceBox = new Box();
    const cancelButton = Button.new_from_icon_name(
      "go-previous-symbolic",
      IconSize.BUTTON
    );
    serviceBox.add(cancelButton);
    cancelButton.connect("clicked", onCancel);
    stack.add_named(serviceBox, "services");

    stack.add_named(new Box(), "none");

    titlebar.pack_start(stack);

    const menu = Menu();
    titlebar.pack_end(menu);

    return { titlebar, stack };
  };
})();
