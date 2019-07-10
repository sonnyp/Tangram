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
./install/bin/re.sonny.gigagram
```

### Flatpak

```sh
cd gigagram
flatpak-builder flatpak re.sonny.gigagram.json
flatpak-builder --run flatpak re.sonny.gigagram.json re.sonny.gigagram
```

### Flatpak sandboxed

```sh
cd gigagram
flatpak-builder --repo=repo --force-clean flatpak re.sonny.gigagram.json
flatpak --user remote-add --no-gpg-verify gigagram-repo repo
flatpak --user install gigagram-repo re.sonny.gigagram
flatpak run re.sonny.gigagram
```

### Inspect

```sh
gsettings set org.gtk.Settings.Debug enable-inspector-keybinding true
GTK_DEBUG=interactive ./run.sh
```

## Credits

Inspired by [GNOME Web](https://wiki.gnome.org/Apps/Web), [Rambox](https://rambox.pro/#home), [Station](https://getstation.com/) and [Franz](https://meetfranz.com/).

Service icons from [papirus-icon-theme](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme).
