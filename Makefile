.PHONY: test clean

test:
	flatpak-builder --user  --force-clean --repo=repo --install-deps-from=flathub flatpak re.sonny.gigagram.json
	flatpak --user remote-add --no-gpg-verify --if-not-exists gigagram repo
	flatpak --user install --reinstall --assumeyes gigagram re.sonny.gigagram
	flatpak run re.sonny.gigagram
	./node_modules/.bin/eslint src/

clean:
	rm -rf .flatpak-builder build flatpak install repo
