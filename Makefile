.PHONY: build flatpak bundle test clean

build:
	# meson --reconfigure --prefix $(shell pwd)/install build
	meson --prefix $(shell pwd)/install build
	ninja -C build install

run-host:
	make build
	GSETTINGS_SCHEMA_DIR=./data ./install/bin/re.sonny.Tangram

flatpak:
	flatpak-builder --user  --force-clean --repo=repo --install-deps-from=flathub flatpak re.sonny.Tangram.json
	flatpak --user remote-add --no-gpg-verify --if-not-exists Tangram repo
	flatpak --user install --reinstall --assumeyes Tangram re.sonny.Tangram
	# gtk-launch re.sonny.Tangram
	flatpak run re.sonny.Tangram

bundle:
	flatpak-builder --user  --force-clean --repo=repo --install-deps-from=flathub flatpak re.sonny.Tangram.json
	flatpak build-bundle repo Tangram.flatpak re.sonny.Tangram --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo

test:
	./node_modules/.bin/webpack
	./node_modules/.bin/webpack src/webapp/test.js -o dist/webapp/test.js
	gjs dist/webapp/test.js
	./node_modules/.bin/eslint src/

clean:
	rm -rf .flatpak-builder build flatpak install repo var/config var/cache var/data var/applications/*.desktop
