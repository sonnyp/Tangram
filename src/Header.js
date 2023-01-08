import Gtk from "gi://Gtk";
import WebKit2 from "gi://WebKit2";
import Adw from "gi://Adw";
import builder from "./menu.blp" assert { type: "builder" };
import { gettext as _ } from "gettext";

const { Clamp } = Adw;
const { Button, Stack, StackTransitionType, Box, MenuButton, Label } = Gtk;
const { LoadEvent, uri_for_display } = WebKit2;

import AddressBar from "./AddressBar.js";

function Menu() {
  const popover = builder.get_object("menu_popover");

  const button = new MenuButton({
    popover,
    icon_name: "open-menu-symbolic",
  });

  return button;
}

export default function Header({
  onReload,
  onStopLoading,
  onGoBack,
  onGoForward,
  onGoHome,
  onAddTab,
  onCancelNewTab,
  state,
  onPlaceholder,
}) {
  const titlebar = new Adw.HeaderBar();

  const left_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
    hhomogeneous: false,
  });

  const navigationButtonBox = new Box({
    spacing: 6,
  });
  left_stack.add_named(navigationButtonBox, "navigation");

  const navigationButtons = new Box({ spacing: 0 });
  navigationButtons.add_css_class("linked");
  navigationButtonBox.append(navigationButtons);

  const backButton = Button.new_from_icon_name("go-previous-symbolic");
  backButton.set_tooltip_text("Go back to the previous page");
  backButton.sensitive = false;
  navigationButtons.append(backButton);
  backButton.connect("clicked", onGoBack);

  const forwardButton = Button.new_from_icon_name("go-next-symbolic");
  forwardButton.set_tooltip_text("Go forward to the next page");
  forwardButton.sensitive = false;
  navigationButtons.append(forwardButton);
  forwardButton.connect("clicked", onGoForward);

  const reloadButton = new Gtk.Button({ icon_name: "view-refresh-symbolic" });
  reloadButton.set_tooltip_text("Reload the current page");
  navigationButtonBox.append(reloadButton);
  reloadButton.connect("clicked", () => {
    const webview = state.get("webview");
    if (webview.is_loading) {
      onStopLoading();
    } else {
      onReload();
    }
  });

  const homeButton = new Gtk.Button({ icon_name: "go-home-symbolic" });
  homeButton.set_tooltip_text("Go to homepage");
  navigationButtonBox.append(homeButton);
  homeButton.connect("clicked", onGoHome);

  const cancelBox = new Box();
  const cancelButton = new Button({
    label: _("Cancel"),
  });
  cancelBox.append(cancelButton);
  cancelButton.connect("clicked", onCancelNewTab);
  left_stack.add_named(cancelBox, "cancel");

  titlebar.pack_start(left_stack);

  const center_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
  });
  titlebar.set_title_widget(center_stack);
  const title = new Label({
    label: "Tangram",
  });
  title.get_style_context().add_class("title");
  center_stack.add_named(title, "title");
  const addressBar = AddressBar({ state });
  const clamp = new Clamp({
    child: addressBar,
    maximum_size: 860,
    tightening_threshold: 560,
  });
  center_stack.add_named(clamp, "url");

  const right_stack = new Stack({
    transition_type: StackTransitionType.CROSSFADE,
    hhomogeneous: false,
  });
  titlebar.pack_end(right_stack);

  const menuButtonBox = new Box({
    spacing: 6,
  });
  const newTabButton = Button.new_from_icon_name("tab-new-symbolic");
  newTabButton.set_tooltip_text("Add new tab");
  newTabButton.connect("clicked", () => onPlaceholder());
  menuButtonBox.append(newTabButton);
  menuButtonBox.append(Menu());
  right_stack.add_named(menuButtonBox, "menu");
  right_stack.add_named(new Box(), "empty");

  const servicesLayer = new Box();
  const addTabButton = new Button({
    label: "Done",
    sensitive: false,
  });
  addTabButton.connect("clicked", () => {
    onAddTab().catch(logError);
  });
  addTabButton.get_style_context().add_class("suggested-action");
  servicesLayer.append(addTabButton);
  right_stack.add_named(servicesLayer, "new-tab");

  function updateButtons(webview) {
    backButton.sensitive = webview.can_go_back();
    forwardButton.sensitive = webview.can_go_forward();
  }

  function setAddress(webview) {
    const url = webview.get_uri();
    addressBar.text = url ? uri_for_display(url) : "";
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

  state.notify("view", (view) => {
    addTabButton.sensitive = false;

    const first_tab = state.get("instances").length === 0;

    cancelButton.visible = !first_tab;
    left_stack.visible = true;
    center_stack.visible = true;
    right_stack.visible = true;
    titlebar.get_style_context().remove_class("flat");

    if (view === "tabs") {
      left_stack.visible_child_name = "navigation";
      center_stack.visible_child_name = "title";
      right_stack.visible_child_name = "menu";
    } else if (view === "placeholder") {
      left_stack.visible_child_name = "cancel";
      center_stack.visible_child_name = "title";
      right_stack.visible_child_name = "empty";

      if (first_tab) {
        titlebar.get_style_context().add_class("flat");
        left_stack.visible = false;
        center_stack.visible = false;
        right_stack.visible = false;
      }
    } else if (view === "new-tab") {
      left_stack.visible_child_name = "cancel";
      center_stack.visible_child_name = "url";
      right_stack.visible_child_name = "new-tab";
      titlebar.get_style_context().remove_class("flat");
    }
  });

  let loadChangedHandlerId = null;
  let backForwardListChangedHandlerId = null;
  state.notify("webview", (webview, previous) => {
    if (previous) {
      if (loadChangedHandlerId) {
        previous.disconnect(loadChangedHandlerId);
        loadChangedHandlerId = null;
      }
      if (backForwardListChangedHandlerId) {
        previous
          .get_back_forward_list()
          .disconnect(backForwardListChangedHandlerId);
        backForwardListChangedHandlerId = null;
      }
    }

    if (!webview) {
      addressBar.primary_icon_name = null;
      addressBar.text = "";
      return;
    }

    updateButtons(webview);
    setAddress(webview);
    if (!webview.is_loading) {
      setSecurity(webview);
    }
    reloadButton.icon_name = webview.is_loading
      ? "process-stop-symbolic"
      : "view-refresh-symbolic";

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.backforwardlist#signal-changed
    backForwardListChangedHandlerId = webview
      .get_back_forward_list()
      .connect("changed", () => {
        updateButtons(webview);
      });

    // https://gjs-docs.gnome.org/webkit240~4.0_api/webkit2.loadevent
    loadChangedHandlerId = webview.connect(
      "load-changed",
      (self, loadEvent) => {
        // updateButtons(webview);

        if (loadEvent === LoadEvent.COMMITTED) {
          reloadButton.icon_name = "view-refresh-symbolic";
          addTabButton.sensitive = true;
        } else if (loadEvent !== LoadEvent.FINISHED) {
          addTabButton.sensitive = false;
        }

        if (loadEvent === LoadEvent.STARTED) {
          reloadButton.icon_name = "process-stop-symbolic";
          setAddress(webview);
          addressBar.primary_icon_name = null;
        } else if (loadEvent === LoadEvent.REDIRECTED) {
          setAddress(webview);
        } else if (loadEvent === LoadEvent.COMMITTED) {
          setSecurity(webview);
        }
      },
    );
  });

  return { titlebar, addressBar, right_stack, center_stack };
}
