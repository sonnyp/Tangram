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
    const template = `
    <?xml version="1.0" encoding="UTF-8"?>
    <interface>
      <object class="GtkPopoverMenu" id="app-menu">
        <child>
          <object class="GtkBox">
            <property name="visible">True</property>
            <property name="margin">10</property>
            <property name="orientation">1</property>
            <child>
              <object class="GtkModelButton">
                <property name="visible">True</property>
                <property name="menu-name">tabs-position</property>
                <property name="text" translatable="yes">Tabs position</property>
              </object>
            </child>
            <child>
              <object class="GtkModelButton">
                <property name="visible">True</property>
                <property name="text" translatable="yes">About</property>
                <property name="action-name">app.about</property>
              </object>
            </child>
            <child>
            <object class="GtkModelButton">
              <property name="visible">True</property>
              <property name="text" translatable="yes">Quit</property>
              <property name="action-name">app.quit</property>
            </object>
          </child>
          </object>
        </child>
        <child>
          <object class="GtkBox">
            <property name="orientation">1</property>
            <property name="visible">True</property>
            <property name="margin">10</property>
            <child>
              <object class="GtkModelButton">
                <property name="visible">True</property>
                <property name="action-name">app.tabsPosition</property>
                <property name="action-target">"top"</property>
                <property name="text" translatable="yes">Top</property>
              </object>
            </child>
            <child>
              <object class="GtkModelButton">
                <property name="visible">True</property>
                <property name="action-name">app.tabsPosition</property>
                <property name="action-target">"left"</property>
                <property name="text" translatable="yes">Left</property>
              </object>
            </child>
            <child>
              <object class="GtkModelButton">
                <property name="visible">True</property>
                <property name="action-name">app.tabsPosition</property>
                <property name="action-target">"right"</property>
                <property name="text" translatable="yes">Right</property>
              </object>
            </child>
            <child>
              <object class="GtkModelButton">
                <property name="visible">True</property>
                <property name="action-name">app.tabsPosition</property>
                <property name="action-target">"bottom"</property>
                <property name="text" translatable="yes">Bottom</property>
              </object>
            </child>
          </object>
          <packing>
            <property name="submenu">tabs-position</property>
          </packing>
        </child>
      </object>
    </interface>`;

    const builder = Builder.new_from_string(template, -1);
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
