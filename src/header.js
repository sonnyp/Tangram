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
    STYLE_CLASS_LINKED,
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
    onReload,
    onGoBack,
    onGoForward,
    onDoneAddingTab,
    onCancelAddingTab,
    profile,
    state,
  }) {
    // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.headerbar
    const titlebar = new HeaderBar({
      title: profile.title,
      show_close_button: true,
    });

    const left_stack = new Stack();
    state.bind("view", left_stack, "visible_child_name");
    left_stack.set_transition_type(StackTransitionType.CROSSFADE);

    const buttonBox = new Box({
      spacing: 6,
    });
    left_stack.add_named(buttonBox, "tabs");

    const navigationButtons = new Box({ spacing: 0 });
    navigationButtons.get_style_context().add_class(STYLE_CLASS_LINKED);
    buttonBox.add(navigationButtons);

    const backButton = Button.new_from_icon_name(
      "go-previous-symbolic",
      IconSize.BUTTON
    );
    navigationButtons.add(backButton);
    backButton.connect("clicked", onGoBack);

    const forwardButton = Button.new_from_icon_name(
      "go-next-symbolic",
      IconSize.BUTTON
    );
    navigationButtons.add(forwardButton);
    forwardButton.connect("clicked", onGoForward);

    const reloadButton = Button.new_from_icon_name(
      "view-refresh-symbolic",
      IconSize.BUTTON
    );
    buttonBox.add(reloadButton);
    reloadButton.connect("clicked", onReload);

    const addTabButton = Button.new_from_icon_name(
      "tab-new-symbolic",
      IconSize.BUTTON
    );
    buttonBox.add(addTabButton);
    addTabButton.set_always_show_image(true);
    addTabButton.connect("clicked", () => {
      state.set({ view: "services" });
    });

    const serviceBox = new Box();
    const cancelServicesButton = Button.new_from_icon_name(
      "go-previous-symbolic",
      IconSize.BUTTON
    );
    serviceBox.add(cancelServicesButton);
    cancelServicesButton.connect("clicked", () => {
      state.set({ view: "tabs" });
    });
    left_stack.add_named(serviceBox, "services");

    const addTabBox = new Box();
    const cancelAddTabButton = Button.new_from_icon_name(
      "go-previous-symbolic",
      IconSize.BUTTON
    );
    addTabBox.add(cancelAddTabButton);
    cancelAddTabButton.connect("clicked", onCancelAddingTab);
    left_stack.add_named(addTabBox, "add-tab");

    titlebar.pack_start(left_stack);

    const right_stack = new Stack();
    state.bind("view", right_stack, "visible_child_name");
    right_stack.set_transition_type(StackTransitionType.CROSSFADE);
    titlebar.pack_end(right_stack);

    const tabsLayer = new Box();
    tabsLayer.pack_end(Menu(), false, false, null);
    right_stack.add_named(tabsLayer, "tabs");

    const servicesLayer = new Box();
    const doneAddingTabButton = new Button({
      label: "Done",
    });
    doneAddingTabButton.connect("clicked", onDoneAddingTab);
    doneAddingTabButton.get_style_context().add_class("suggested-action");
    servicesLayer.pack_end(doneAddingTabButton, false, false, null);
    right_stack.add_named(servicesLayer, "add-tab");

    right_stack.add_named(new Box(), "services");

    titlebar.show_all();
    state.bind(
      "instances",
      cancelServicesButton,
      "visible",
      instances => instances.length > 0
    );

    return { titlebar };
  };
})();
