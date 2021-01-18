.PHONY: build flatpak bundle test clean dev

build:
	./node_modules/.bin/rollup -c
	# meson --reconfigure --prefix $(shell pwd)/install build
	meson --prefix $(shell pwd)/install build
	ninja -C build install

dev:
	./node_modules/.bin/rollup --watch -c

run-host:
	make clean
	make build
	GSETTINGS_SCHEMA_DIR=./data ./install/bin/re.sonny.Tangram

flatpak:
	./node_modules/.bin/rollup -c
	flatpak-builder --user  --force-clean --repo=repo --install-deps-from=flathub flatpak re.sonny.Tangram.json
	flatpak --user remote-add --no-gpg-verify --if-not-exists Tangram repo
	flatpak --user install --reinstall --assumeyes Tangram re.sonny.Tangram
	# gtk-launch re.sonny.Tangram
	flatpak run re.sonny.Tangram

bundle:
	./node_modules/.bin/rollup -c
	flatpak-builder --user  --force-clean --repo=repo --install-deps-from=flathub flatpak re.sonny.Tangram.json
	flatpak build-bundle repo Tangram.flatpak re.sonny.Tangram --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo

test:
	./node_modules/.bin/rollup -c
	./node_modules/.bin/rollup --context=window --file=dist/webapp/test.js -- src/webapp/test.js
	./node_modules/.bin/rollup --context=window --file=dist/utils.test.js -- src/utils.test.js
	gjs dist/webapp/test.js
	gjs dist/utils.test.js
	./node_modules/.bin/eslint src/

clean:
	rm -rf .flatpak-builder build flatpak install repo var/config var/cache var/data var/applications/*.desktop dist/ src/main.js dist/webapp/test.js
