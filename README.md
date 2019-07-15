# Gigagram

![screenshot](screenshot.png)

Gigagram combines webapps and websites into a single application.

Tabs are persistent and independent from each others so you can use multiple accounts.

Gigagram is powered by [WebKitGTK](https://webkitgtk.org/).

## Features

* Add an instance by clicking on a service
* Edit an instance by right clicking on the tab
* Remove an instance by right clicking on the tab
* Re-order tabs by drag'n drop
* Desktop/audio notifications (if supported by the service)

## Install

### Arch Linux

https://aur.archlinux.org/packages/gigagram-git/


### Flatpak

[Install flatpak](https://flatpak.org/setup/)

```sh
git clone https://github.com/sonnyp/gigagram.git
cd gigagram
flatpak-builder --repo=repo --install-deps-from=flathub flatpak re.sonny.gigagram.yaml
flatpak --user remote-add --no-gpg-verify gigagram repo
flatpak --user install gigagram re.sonny.gigagram
flatpak run re.sonny.gigagram
```

## Services

Only a limited number of services but adding a new service is quite easy.

Make sure the service loads/works using `Custom`.

If you can please send a pull request with the changes; look into [src/services](src/services) and [src/re.sonny.gigagram.services.gresource.xml](src/re.sonny.gigagram.services.gresource.xml).

Otherwise feel free to [open an issue](https://github.com/sonnyp/gigagram/issues/new) with the service name and url.

## Details

Similar to [GNOME Web standalone](https://fedoramagazine.org/standalone-web-applications-gnome-web/):

* WebKit data is stored under `~/.local/share/gigagram/{instance-id}/`
* WebKit cache is stored under `~/.cache/gigagram/{instance-id}/`

## Development

### Run

```sh
./run.sh
```

### Test

```sh
npm install
npm test
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
flatpak-builder --user --force-clean --install-deps-from=flathub flatpak re.sonny.gigagram.yaml
flatpak-builder --run flatpak re.sonny.gigagram.yaml re.sonny.gigagram
```

### Flatpak sandboxed

```sh
cd gigagram
flatpak-builder --repo=repo --force-clean flatpak re.sonny.gigagram.yaml
flatpak --user remote-add --no-gpg-verify gigagram repo
flatpak --user install gigagram re.sonny.gigagram
flatpak run re.sonny.gigagram
```

### Ubuntu dependencies

```
sudo apt update && sudo apt upgrade
sudo apt install libglib2.0-dev libglib2.0 -y
```

### Fedora dependencies

```
sudo dnf install npm glib2-devel
```
### Inspect

```sh
cd gigagrram
gsettings set org.gtk.Settings.Debug enable-inspector-keybinding true
GTK_DEBUG=interactive ./run.sh
```

## Credits

Inspired by [GNOME Web](https://wiki.gnome.org/Apps/Web), [Rambox](https://rambox.pro/#home), [Station](https://getstation.com/) and [Franz](https://meetfranz.com/).

Service icons from [papirus-icon-theme](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme) and [Flaticon.com](https://www.flaticon.com/)
