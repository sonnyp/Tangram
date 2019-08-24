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
  Label,
} = imports.gi.Gtk;
const { LoadEvent, uri_for_display } = imports.gi.WebKit2;

const { AddressBar } = imports.AddressBar;

function Menu({ profile }) {
  const builder = Builder.new_from_resource(
    "/re/sonny/Tangram/data/menu.xml.ui"
  );
  const popover = builder.get_object("app-menu");

  // main app
  if (!profile.id) {
    builder.get_object("edit-application").destroy();
  }
  // custom app
  else {
    builder.get_object("new-application").destroy();
  }

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
  onStopLoading,
  onGoBack,
  onGoForward,
  onAddTab,
  onCancelAddTab,
  profile,
  state,
  onAddService,
}) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.headerbar
  const titlebar = new HeaderBar({
    show_close_button: true,
  });

  const left_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });

  const buttonBox = new Box({
    spacing: 6,
  });
  left_stack.add_named(buttonBox, "navigation");

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

  const reloadIcon = new Image({
    icon_size: IconSize.BUTTON,
    icon_name: "view-refresh-symbolic",
  });
  const reloadButton = new Button({ image: reloadIcon });
  buttonBox.add(reloadButton);
  reloadButton.connect("clicked", () => {
    const webview = state.get("webview");
    if (webview.is_loading) {
      onStopLoading();
    } else {
      onReload();
    }
  });

  const newTabButton = Button.new_from_icon_name(
    "tab-new-symbolic",
    IconSize.BUTTON
  );
  buttonBox.add(newTabButton);
  newTabButton.set_always_show_image(true);
  newTabButton.connect("clicked", () => {
    state.set({ view: "services", webview: null });
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
  left_stack.add_named(serviceBox, "cancel-services");

  const addTabBox = new Box();
  const cancelAddTabButton = Button.new_from_icon_name(
    "go-previous-symbolic",
    IconSize.BUTTON
  );
  addTabBox.add(cancelAddTabButton);
  cancelAddTabButton.connect("clicked", onCancelAddTab);
  left_stack.add_named(addTabBox, "cancel-add-tab");

  titlebar.pack_start(left_stack);

  const center_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });
  titlebar.custom_title = center_stack;
  const title = new Label({
    label: profile.title,
  });
  title.get_style_context().add_class("title");
  center_stack.add_named(title, "title");
  const addressBar = AddressBar({ state, onAddService });
  center_stack.add_named(addressBar, "url");

  const right_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });
  titlebar.pack_end(right_stack);

  const tabsLayer = new Box();
  tabsLayer.pack_end(Menu({ profile }), false, false, null);
  right_stack.add_named(tabsLayer, "menu");

  const servicesLayer = new Box();
  const addTabButton = new Button({
    label: "Done",
  });
  addTabButton.connect("clicked", () => {
    onAddTab().catch(logError);
  });
  addTabButton.get_style_context().add_class("suggested-action");
  servicesLayer.pack_end(addTabButton, false, false, null);
  right_stack.add_named(servicesLayer, "add-tab");

  titlebar.show_all();
  state.bind(
    "instances",
    cancelServicesButton,
    "visible",
    instances => instances.length > 0
  );

  let loadChangedHandlerId = null;
  function setAddress(webview) {
    const url = webview.get_uri();
    addressBar.text = url === "about:blank" ? "" : uri_for_display(url);
  }
  function setSecurity(webview) {
    if (!addressBar.text) {
      addressBar.primary_icon_name = null;
      return;
    }

    const [ok, , errors] = webview.get_tls_info();
    if (!ok) {
      addressBar.primary_icon_name = "channel-insecure-symbolic";
      return;
    }

    if (errors !== 0) {
      addressBar.primary_icon_name = "channel-insecure-symbolic";
      return;
    }

    addressBar.primary_icon_name = null;
  }

  state.notify("view", view => {
    if (view === "services") {
      left_stack.visible_child_name = "cancel-services";
      center_stack.visible_child_name = "url";
      right_stack.visible_child_name = "menu";
    } else if (view === "tabs") {
      left_stack.visible_child_name = "navigation";
      center_stack.visible_child_name = "title";
      right_stack.visible_child_name = "menu";
    } else if (view === "add-tab") {
      left_stack.visible_child_name = "cancel-add-tab";
      center_stack.visible_child_name = "url";
      right_stack.visible_child_name = "add-tab";
    }
  });

  state.notify("webview", (webview, previous) => {
    if (previous) {
      if (loadChangedHandlerId) {
        previous.disconnect(loadChangedHandlerId);
        loadChangedHandlerId = null;
      }
    }

    if (!webview) {
      addressBar.primary_icon_name = null;
      addressBar.text = "";
      return;
    }

    setAddress(webview);
    if (!webview.is_loading) {
      setSecurity(webview);
    }
    reloadIcon.icon_name = webview.is_loading
      ? "process-stop-symbolic"
      : "view-refresh-symbolic";
    loadChangedHandlerId = webview.connect(
      "load-changed",
      (self, loadEvent) => {
        // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.loadevent
        if (loadEvent === LoadEvent.STARTED) {
          reloadIcon.icon_name = "process-stop-symbolic";
          setAddress(webview);
          addressBar.primary_icon_name = null;
        } else if (loadEvent === LoadEvent.REDIRECTED) {
          setAddress(webview);
        } else if (loadEvent === LoadEvent.COMMITTED) {
          setSecurity(webview);
        } else if (loadEvent === LoadEvent.FINISHED) {
          reloadIcon.icon_name = "view-refresh-symbolic";
        }
      }
    );
  });

  return { titlebar, addressBar };
};
