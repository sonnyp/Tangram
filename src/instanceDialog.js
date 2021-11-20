import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";

const { WindowTypeHint } = Gdk;
const { Dialog, Align, Grid, Label, Entry, ResponseType, EntryIconPosition } =
  Gtk;

import { once } from "./troll/util.js";

export function editInstanceDialog(props) {
  return instanceDialog({ ...props, action: "Save" });
}

export function addInstanceDialog(props) {
  return instanceDialog({ ...props, action: "Add " });
}

async function instanceDialog({ window, instance, action }) {
  // TODO Dialog.new_with_buttons
  // is undefined in gjs, open issue.
  // https://developer.gnome.org/hig/stable/dialogs.html.en#Action
  // "Action Dialogs"
  // and
  // https://developer.gnome.org/hig/stable/visual-layout.html.en
  const dialog = new Dialog({
    title: `${action} ${instance.name}`,
    modal: true,
    type_hint: WindowTypeHint.DIALOG,
    use_header_bar: true,
    transient_for: window,
    resizable: false,
  });

  dialog.add_button("Cancel", ResponseType.CANCEL);
  const primaryButton = dialog.add_button(action, ResponseType.APPLY);
  primaryButton.get_style_context().add_class("suggested-action");
  primaryButton.grab_focus();

  const contentArea = dialog.get_content_area();
  contentArea.margin = 18;

  const grid = new Grid({
    column_spacing: 12,
    row_spacing: 6,
  });
  contentArea.add(grid);

  const nameLabel = new Label({
    label: "Name",
    halign: Align.END,
  });
  grid.attach(nameLabel, 1, 1, 1, 1);
  const nameEntry = new Entry({
    hexpand: true,
    text: instance.settings.get_string('name')
  });
  grid.attach(nameEntry, 2, 1, 1, 1);

  const URLLabel = new Label({
    label: "Homepage",
    halign: Align.END,
  });
  grid.attach(URLLabel, 1, 3, 1, 1);

  const URLEntry = new Entry({
    hexpand: true,
    text: instance.settings.get_string('url')
  });
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

  const expander = new Gtk.Expander({label: 'Advanced'})
  const expander_grid = new Grid({
    column_spacing: 12,
    row_spacing: 6,
  });
  expander.add(expander_grid)

  const UserAgentLabel = new Label({
    label: "User Agent",
    halign: Align.END,
  });
  expander_grid.attach(UserAgentLabel, 1, 4, 1, 1);

  const UserAgentEntry = new Entry({
    hexpand: true,
    text: instance.settings.get_string('user-agent')
  });
  expander_grid.attach(UserAgentEntry, 2, 4, 1, 1);

  contentArea.add(expander)

  dialog.show_all();

  const [response_id] = await once(dialog, "response");
  if (response_id === ResponseType.DELETE_EVENT) {
    return true;
  }

  if (response_id !== ResponseType.APPLY) {
    dialog.destroy();
    return true;
  }

  instance.settings.set_string('name', nameEntry.text)
  instance.settings.set_string('url', URLEntry.text)
  instance.settings.set_string('user-agent', UserAgentEntry.text)

  dialog.destroy();

  return false;
}
