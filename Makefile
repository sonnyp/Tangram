.PHONY: build flatpak bundle test clean dev

build:
	# meson --reconfigure --prefix $(shell pwd)/install build
	meson --prefix $(shell pwd)/install build
	ninja -C build install

lint:
	./node_modules/.bin/eslint --cache src/

run-host:
	make clean
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
	gjs -m src/webapp/test.js
	gjs -m src/utils.test.js
	make lint

clean:
	rm -rf .flatpak-builder build flatpak install repo var/config var/cache var/data var/applications/*.desktop
