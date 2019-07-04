# Gigagram

## Dev

```sh
cd gigagram
meson --reconfigure --prefix $PWD/install build
ninja -C build install
./install/bin/re.sonny.gigagram
```

## Flatpak

```sh
cd gigagram
flatpak-builder flatpak re.sonny.gigagram.json
flatpak-builder --run flatpak re.sonny.gigagram.json re.sonny.gigagram
```