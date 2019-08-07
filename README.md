# Gigagram

![screenshot](screenshot.png)

Gigagram combines webapps and websites into a single application.

Tabs are persistent and independent from each others so you can use multiple accounts.

Gigagram is powered by [WebKitGTK](https://webkitgtk.org/).

## Features

- Add a tab
- Edit a tab by right clicking on it
- Remove a tab by right clicking on it
- Re-order tabs via drag'n drop or shortcut
- Custom tab icon
- Desktop/audio notifications (if supported by the service)
- Change tabs position (top, left, right, bottom) via the menu
- Navigation controls (go back, forward, reload, stop loading)
- Shortcuts

### Custom applications

You can create custom applications with one or multiple tabs. They work the same as the main instance.

See demo: https://www.youtube.com/watch?v=y9MIXn4Iw70

You can create a custom application by

- dragging the tab out (see demo)
- right click on the tab
- via the application menu

## Install

### Arch Linux

https://aur.archlinux.org/packages/gigagram-git/

### Flatpak

Make sure flatpak is setup according to [Install flatpak](https://flatpak.org/setup/).

---

Download and install
[gigagram.flatpak](https://github.com/sonnyp/gigagram/releases/download/v0.4.1/gigagram.flatpak)

or

```sh
wget https://github.com/sonnyp/gigagram/releases/download/v0.4.1/gigagram.flatpak

flatpak install gigagram.flatpak
```

## Services

Only a limited number of services but adding a new service is quite easy.

Make sure the service loads/works using `Custom`.

If you can please send a pull request with the changes; look into [src/services](src/services) and [src/re.sonny.gigagram.services.gresource.xml](src/re.sonny.gigagram.services.gresource.xml).

Otherwise feel free to [open an issue](https://github.com/sonnyp/gigagram/issues/new) with the service name and url.

## Details

Similar to [GNOME Web standalone](https://fedoramagazine.org/standalone-web-applications-gnome-web/):

- WebKit data is stored under `~/.local/share/gigagram/{instance-id}/`
- WebKit cache is stored under `~/.cache/gigagram/{instance-id}/`

## Development

### Install dependencies

<details>
 <summary>Ubuntu</summary>
 <code>
 sudo apt install npm libglib2.0-dev-bin flatpak-builder
 </code>
</details>

<details>
 <summary>Arch Linux</summary>
 <code>
 sudo pacman -S npm glib2 flatpak-builder
 </code>
</details>

<details>
  <summary>Fedora</summary>
  <code>
  sudo dnf install npm glib2-devel flatpak-builder
  </code>
</details>

```sh
npm install
```

### Run

```sh
./run.sh
```

Hit `<Ctrl><Shift>Q` to restart the application.

- data files are stored in `./var/data/` instead of `$XDG_DATA_HOME/gigagram/`
- cache files are tored in `./var/cache/` instead of `XDG_CACHE_HOME/gigagram/`
- desktop files are stored in `./var/applications/` instead of `$XDG_DATA_HOME/applications/`

To test desktop notifications you can add a custom service with `https://jhmux.codesandbox.io/` as URL.

### Test

```sh
make test
```

### Meson

```sh
cd gigagram
meson --reconfigure --prefix $PWD/install build
ninja -C build install
GSETTINGS_SCHEMA_DIR=./install/share/glib-2.0/schemas/ ./install/bin/re.sonny.gigagram
```

### Flatpak

```sh
cd gigagram
flatpak-builder --user --force-clean --install-deps-from=flathub flatpak re.sonny.gigagram.json
flatpak-builder --run flatpak re.sonny.gigagram.json re.sonny.gigagram
```

### Flatpak sandboxed

```sh
cd gigagram
flatpak-builder --repo=repo --force-clean flatpak re.sonny.gigagram.json
flatpak --user remote-add --no-gpg-verify gigagram repo
flatpak --user install gigagram re.sonny.gigagram
flatpak run re.sonny.gigagram
```

### Inspect

```sh
cd gigagrram
gsettings set org.gtk.Settings.Debug enable-inspector-keybinding true
GTK_DEBUG=interactive ./run.sh
```

## Credits

Inspired by [GNOME Web](https://wiki.gnome.org/Apps/Web), [Rambox](https://rambox.pro/#home), [Station](https://getstation.com/) and [Franz](https://meetfranz.com/).
