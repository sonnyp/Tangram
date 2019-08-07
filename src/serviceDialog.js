const { WindowTypeHint } = imports.gi.Gdk;
const { once } = imports.util;
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
} = imports.gi.Gtk;
const { SettingsBindFlags } = imports.gi.Gio;
const { build_filenamev } = imports.gi.GLib;

const { iconChooser, saveIcon } = imports.icon;

this.editInstanceDialog = function editInstanceDialog(props) {
  return serviceDialog({ ...props, action: "Edit" });
};

this.addInstanceDialog = function editInstanceDialog(props) {
  return serviceDialog({ ...props, action: "Add " });
};

async function serviceDialog({ window, instance, action }) {
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

  const iconEntry = iconChooser({
    value: instance.icon === "default" ? null : instance.icon,
  });
  const box = new Box({
    orientation: Orientation.HORIZONTAL,
    halign: Align.CENTER,
    margin_bottom: 18,
  });
  box.add(iconEntry);
  contentArea.add(box);

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
  });
  instance.bind("name", nameEntry, "text", SettingsBindFlags.DEFAULT);
  grid.attach(nameEntry, 2, 1, 1, 1);

  const URLLabel = new Label({
    label: "URL",
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
    "Cannot be empty"
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
      "face-sick-symbolic"
    );
  });

  dialog.show_all();

  const [response_id] = await once(dialog, "response");
  if (response_id === ResponseType.DELETE_EVENT) {
    return true;
  }

  if (response_id !== ResponseType.APPLY) {
    dialog.destroy();
    return true;
  }

  let icon = "default";
  if (iconEntry.get_filename()) {
    icon = saveIcon(
      iconEntry.get_filename(),
      build_filenamev([instance.data_dir, "icon.png"])
    );
  }

  dialog.destroy();

  // eslint-disable-next-line require-atomic-updates
  instance.icon = icon;

  return false;
}
