.PHONY: build flatpak bundle test clean

build:
	meson --reconfigure --prefix $(shell pwd)/install build
	ninja -C build install

flatpak:
	flatpak-builder --user  --force-clean --repo=repo --install-deps-from=flathub flatpak re.sonny.gigagram.json
	flatpak --user remote-add --no-gpg-verify --if-not-exists gigagram repo
	flatpak --user install --reinstall --assumeyes gigagram re.sonny.gigagram
	flatpak run re.sonny.gigagram

bundle:
	flatpak-builder --user  --force-clean --repo=repo --install-deps-from=flathub flatpak re.sonny.gigagram.json
	flatpak build-bundle repo gigagram.flatpak re.sonny.gigagram --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo

test:
	./node_modules/.bin/eslint src/

clean:
	rm -rf .flatpak-builder build flatpak install repo var/config var/cache var/data var/applications/*.desktop
