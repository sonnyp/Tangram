import Gtk from "gi://Gtk";

import { once } from "./troll/util.js";

import { relativePath } from "./util.js";

const { Align, Grid, Label, Entry, ResponseType, EntryIconPosition } = Gtk;

export function editInstanceDialog(props) {
  return instanceDialog({ ...props, mode: "edit" });
}

export function addInstanceDialog(props) {
  return instanceDialog({ ...props, mode: "add" });
}

async function instanceDialog({ window, instance, mode }) {
  const builder = Gtk.Builder.new_from_file(
    relativePath("./InstanceDialog.ui"),
  );
  const dialog = builder.get_object("dialog");
  dialog.title =
    mode === "add" ? `Add ${instance.name}` : `Edit ${instance.name}`;
  dialog.set_transient_for(window);

  const button_save = builder.get_object("button_save");

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
    text: instance.settings.get_string("name"),
  });
  grid.attach(nameEntry, 2, 1, 1, 1);

  const URLLabel = new Label({
    label: "Homepage",
    halign: Align.END,
  });
  grid.attach(URLLabel, 1, 3, 1, 1);

  const URLEntry = new Entry({
    hexpand: true,
    text: instance.settings.get_string("url"),
  });
  grid.attach(URLEntry, 2, 3, 1, 1);

  button_save.set_sensitive(!!URLEntry.text);
  URLEntry.set_icon_tooltip_text(
    EntryIconPosition.SECONDARY,
    "Cannot be empty",
  );
  URLEntry.set_icon_activatable(EntryIconPosition.SECONDARY, false);
  URLEntry.connect("changed", () => {
    const isValid = !!URLEntry.text;
    if (isValid) {
      URLEntry.set_icon_from_icon_name(EntryIconPosition.SECONDARY, null);
      button_save.set_sensitive(true);
      return;
    }

    button_save.set_sensitive(false);
    URLEntry.set_icon_from_icon_name(
      EntryIconPosition.SECONDARY,
      "face-sick-symbolic",
    );
  });

  const notifications_priority_label = new Label({
    label: "Notifications priority",
    halign: Align.END,
  });
  grid.attach(notifications_priority_label, 1, 4, 1, 1);
  const model = builder.get_object("notification_options");
  const combobox = new Gtk.ComboBox({ model, hexpand: true });
  const renderer = new Gtk.CellRendererText();
  combobox.pack_start(renderer, true);
  combobox.add_attribute(renderer, "text", 1);
  combobox.set_active(instance.settings.get_enum("notifications-priority"));
  grid.attach(combobox, 2, 4, 1, 1);


  const userAgentLabel = new Label({
    label: "User Agent",
    halign: Align.END,
  });
  grid.attach(userAgentLabel, 1, 5, 1, 1);
  const userAgentEntry = new Entry({
    hexpand: true,
    text: instance.settings.get_string("user-agent"),
  });
  grid.attach(userAgentEntry, 2, 5, 1, 1);

  dialog.show_all();

  const [response_id] = await once(dialog, "response");
  if (response_id === ResponseType.DELETE_EVENT) {
    return true;
  }

  if (response_id !== ResponseType.APPLY) {
    dialog.destroy();
    return true;
  }

  instance.settings.set_string("name", nameEntry.text);
  instance.settings.set_string("url", URLEntry.text);
  instance.settings.set_string("user-agent", userAgentEntry.text);
  const [success, iter] = combobox.get_active_iter();
  if (!success) return;
  const value = model.get_value(iter, 0);
  instance.settings.set_enum("notifications-priority", value);

  dialog.destroy();

  return false;
}
