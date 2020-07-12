const {
  HeaderBar,
  Button,
  Box,
  MenuButton,
  Builder,
  IconSize,
  Image,
  STYLE_CLASS_LINKED,
  Label,
} = imports.gi.Gtk;
const { LoadEvent, uri_for_display } = imports.gi.WebKit2;

import flags from "./flags";
import { BLANK_URI } from "./constants";

function Menu({ profile }) {
  const builder = Builder.new_from_resource(
    "/re/sonny/Tangram/data/menu.xml.ui",
  );
  const popover = builder.get_object("app-menu");

  if (!flags.custom_applications) {
    builder.get_object("edit-application").destroy();
    builder.get_object("new-application").destroy();
  }
  // main app
  else if (!profile.id) {
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

function Navigation({
  onGoBack,
  onGoForward,
  onGoHome,
  onStopLoading,
  onReload,
  state,
}) {
  const navigationButtonBox = new Box({
    spacing: 6,
  });

  const navigationButtons = new Box({ spacing: 0 });
  navigationButtons.get_style_context().add_class(STYLE_CLASS_LINKED);
  navigationButtonBox.add(navigationButtons);

  const backButton = Button.new_from_icon_name(
    "go-previous-symbolic",
    IconSize.BUTTON,
  );
  backButton.set_tooltip_text("Go back to the previous page");
  backButton.sensitive = false;
  navigationButtons.add(backButton);
  backButton.connect("clicked", onGoBack);

  const forwardButton = Button.new_from_icon_name(
    "go-next-symbolic",
    IconSize.BUTTON,
  );
  forwardButton.set_tooltip_text("Go forward to the next page");
  forwardButton.sensitive = false;
  navigationButtons.add(forwardButton);
  forwardButton.connect("clicked", onGoForward);

  const reloadIcon = new Image({
    icon_size: IconSize.BUTTON,
    icon_name: "view-refresh-symbolic",
  });
  const reloadButton = new Button({ image: reloadIcon });
  reloadButton.set_tooltip_text("Reload the current page");
  navigationButtonBox.add(reloadButton);
  reloadButton.connect("clicked", () => {
    const webview = state.get("webview");
    if (webview.is_loading) {
      onStopLoading();
    } else {
      onReload();
    }
  });

  const homeIcon = new Image({
    icon_size: IconSize.BUTTON,
    icon_name: "go-home-symbolic",
  });
  const homeButton = new Button({ image: homeIcon });
  homeButton.set_tooltip_text("Go to homepage");
  navigationButtonBox.add(homeButton);
  homeButton.connect("clicked", onGoHome);

  return {
    navigationButtonBox,
    backButton,
    forwardButton,
    reloadIcon,
    homeButton,
  };
}

export default function Header({
  onReload,
  onStopLoading,
  onGoBack,
  onGoForward,
  onGoHome,
  onAddTab,
  profile,
  state,
  onNewTab,
}) {
  // https://gjs-docs.gnome.org/gtk30~3.24.8/gtk.headerbar
  const titlebar = new HeaderBar({
    show_close_button: true,
  });

  const {
    navigationButtonBox,
    backButton,
    forwardButton,
    reloadIcon,
  } = Navigation({
    onReload,
    onStopLoading,
    onGoBack,
    onGoForward,
    onGoHome,
    state,
  });
  titlebar.pack_start(navigationButtonBox);

  const title = new Label({
    label: profile.title,
  });
  title.get_style_context().add_class("title");
  titlebar.custom_title = title;

  const menuButtonBox = new Box({
    spacing: 6,
  });
  const newTabButton = Button.new_from_icon_name(
    "tab-new-symbolic",
    IconSize.BUTTON,
  );
  newTabButton.set_tooltip_text("Add new tab");
  newTabButton.set_always_show_image(true);
  newTabButton.connect("clicked", () => onNewTab());
  menuButtonBox.pack_end(Menu({ profile }), false, false, null);
  menuButtonBox.pack_end(newTabButton, false, false, null);
  titlebar.pack_end(menuButtonBox);

  titlebar.show_all();

  function updateButtons(webview) {
    backButton.sensitive = webview.can_go_back();
    forwardButton.sensitive = webview.can_go_forward();
  }

  // function setAddress(webview) {
  //   const url = webview.get_uri();
  //   if (!url || url === BLANK_URI) {
  //     addressBar.text = "";
  //     return;
  //   }
  //   addressBar.text = uri_for_display(url);
  // }

  // function setSecurity(webview) {
  //   if (!addressBar.text) {
  //     addressBar.primary_icon_name = null;
  //     return;
  //   }

  //   const [ok, , errors] = webview.get_tls_info();
  //   if (!ok) {
  //     addressBar.primary_icon_name = "channel-insecure-symbolic";
  //     return;
  //   }

  //   if (errors !== 0) {
  //     addressBar.primary_icon_name = "channel-insecure-symbolic";
  //     return;
  //   }

  //   addressBar.primary_icon_name = null;
  // }

  // state.notify("view", (view) => {
  //   addTabButton.sensitive = false;
  //   if (view === "tabs") {
  //     left_stack.visible_child_name = "navigation";
  //     center_stack.visible_child_name = "title";
  //     right_stack.visible_child_name = "menu";
  //   } else if (view === "new-tab") {
  //     left_stack.visible_child_name = "cancel";
  //     center_stack.visible_child_name = "url";
  //     right_stack.visible_child_name = "new-tab";
  //   }
  // });

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
      // addressBar.primary_icon_name = null;
      // addressBar.text = "";
      return;
    }

    updateButtons(webview);
    // setAddress(webview);
    if (!webview.is_loading) {
      // setSecurity(webview);
    }
    reloadIcon.icon_name = webview.is_loading
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
          if (webview.uri !== BLANK_URI) {
            reloadIcon.icon_name = "view-refresh-symbolic";
            addTabButton.sensitive = true;
          }
        } else if (loadEvent !== LoadEvent.FINISHED) {
          addTabButton.sensitive = false;
        }

        if (loadEvent === LoadEvent.STARTED) {
          reloadIcon.icon_name = "process-stop-symbolic";
          // setAddress(webview);
          addressBar.primary_icon_name = null;
        } else if (loadEvent === LoadEvent.REDIRECTED) {
          // setAddress(webview);
        } else if (loadEvent === LoadEvent.COMMITTED) {
          // setSecurity(webview);
        }
      },
    );
  });

  return { titlebar };
}
