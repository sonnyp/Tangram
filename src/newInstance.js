const { WindowTypeHint } = imports.gi.Gdk;
const {
  Dialog,
  Align,
  Grid,
  Label,
  Entry,
  ResponseType,
  EntryIconPosition,
  Box,
  Orientation,
  Button,
  IconSize,
  StackTransitionType,
  Stack,
} = imports.gi.Gtk;
const { SettingsBindFlags } = imports.gi.Gio;
const { build_filenamev } = imports.gi.GLib;
const { BindingFlags } = imports.gi.GObject;

import { once } from "./troll/util";
import { iconChooser, saveIcon } from "./icon";
import flags from "./flags";
import AddressBar from "./AddressBar";

function Settings({ instance, primaryButton }) {
  const grid = new Grid({
    column_spacing: 12,
    row_spacing: 6,
  });

  const nameLabel = new Label({
    label: "Name",
    halign: Align.END,
  });
  grid.attach(nameLabel, 1, 1, 1, 1);
  const nameEntry = new Entry({
    hexpand: true,
  });
  instance.bind("name", nameEntry, "text", SettingsBindFlags.DEFAULT);
  grid.attach(nameEntry, 2, 1, 1, 1);

  const URLLabel = new Label({
    label: "Homepage",
    halign: Align.END,
  });
  grid.attach(URLLabel, 1, 3, 1, 1);

  const URLEntry = new Entry({
    hexpand: true,
  });
  instance.bind("url", URLEntry, "text", SettingsBindFlags.DEFAULT);
  grid.attach(URLEntry, 2, 3, 1, 1);

  primaryButton.set_sensitive(!!URLEntry.text);
  URLEntry.set_icon_tooltip_text(
    EntryIconPosition.SECONDARY,
    "Cannot be empty",
  );
  URLEntry.set_icon_activatable(EntryIconPosition.SECONDARY, false);
  URLEntry.connect("changed", () => {
    const isValid = !!URLEntry.text;
    if (isValid) {
      URLEntry.set_icon_from_icon_name(EntryIconPosition.SECONDARY, null);
      primaryButton.set_sensitive(true);
      return;
    }

    primaryButton.set_sensitive(false);
    URLEntry.set_icon_from_icon_name(
      EntryIconPosition.SECONDARY,
      "face-sick-symbolic",
    );
  });

  const userAgentLabel = new Label({
    label: "User Agent",
    halign: Align.END,
  });
  grid.attach(userAgentLabel, 1, 4, 1, 1);

  const userAgentEntry = new Entry({
    hexpand: true,
  });
  instance.bind(
    "user-agent",
    userAgentEntry,
    "text",
    SettingsBindFlags.DEFAULT,
  );
  instance.webView
    .get_settings()
    .bind_property(
      "user_agent",
      userAgentEntry,
      "placeholder_text",
      BindingFlags.SYNC_CREATE,
    );
  grid.attach(userAgentEntry, 2, 4, 1, 1);

  return grid;
}

export async function addInstanceDialog({ window, instance, webView }) {
  // TODO Dialog.new_with_buttons
  // is undefined in gjs, open issue.
  // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
  // "Action Dialogs"
  // and
  // https://developer.gnome.org/hig/stable/visual-layout.html.en
  const dialog = new Dialog({
    // title: `${action} ${instance.name}`,
    modal: true,
    type_hint: WindowTypeHint.DIALOG,
    use_header_bar: true,
    transient_for: window,
    resizable: true,
  });

  dialog.add_button("Cancel", ResponseType.CANCEL);

  const headerBar = dialog.get_header_bar();

  const primaryButton = new Button({
    label: "ok",
  });
  // const primaryButton = dialog.add_button("Add", ResponseType.OK);
  primaryButton.get_style_context().add_class("suggested-action");
  primaryButton.grab_focus();
  primaryButton.connect("clicked", () => {
    stack.visible_child_name = "settings";
    // log("foobar");
  });

  headerBar.pack_end(primaryButton);

  const addressBar = AddressBar({ webView });

  headerBar.custom_title = addressBar;

  const contentArea = dialog.get_content_area();
  // contentArea.margin = 18;

  const stack = new Stack({
    transition_type: StackTransitionType.SLIDE_LEFT,
  });
  stack.add_named(webView, "webView");
  const settings = Settings({ instance, primaryButton });
  stack.add_named(settings, "settings");

  contentArea.pack_start(stack, true, true, 0);

  dialog.show_all();

  const [response_id] = await once(dialog, "response");
  if (response_id === ResponseType.DELETE_EVENT) {
    return true;
  }

  if (response_id !== ResponseType.APPLY) {
    dialog.destroy();
    return true;
  }

  if (flags.custom_icons) {
    let icon = iconEntry.get_value();
    if (!icon.startsWith("resource://")) {
      icon = saveIcon(
        iconEntry.get_value(),
        build_filenamev([instance.data_dir, "icon.png"]),
      );
      // eslint-disable-next-line require-atomic-updates
      instance.icon = icon;
    }
  }

  dialog.destroy();

  return false;
}
