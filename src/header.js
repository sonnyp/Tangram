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
const { LoadEvent } = imports.gi.WebKit2;

const { AddressBar } = imports.AddressBar;

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
  onStopLoading,
  onGoBack,
  onGoForward,
  onDoneAddingTab,
  onCancelAddingTab,
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
  state.bind("view", left_stack, "visible_child_name");

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

  const addTabButton = Button.new_from_icon_name(
    "tab-new-symbolic",
    IconSize.BUTTON
  );
  buttonBox.add(addTabButton);
  addTabButton.set_always_show_image(true);
  addTabButton.connect("clicked", () => {
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

  const center_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });
  titlebar.custom_title = center_stack;
  const title = new Label({
    label: profile.title,
  });
  title.get_style_context().add_class("title");
  center_stack.add_named(title, "tabs");
  const addressBar = AddressBar({ state, onAddService });
  center_stack.add_named(addressBar, "services");
  center_stack.add_named(addressBar, "add-tab");
  state.bind("view", center_stack, "visible_child_name");

  const right_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });
  state.bind("view", right_stack, "visible_child_name");
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

  let loadChangedHandlerId = null;
  function setAddress(webview) {
    const url = webview.get_uri();
    addressBar.text = url === "about:blank" ? "" : url;
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
