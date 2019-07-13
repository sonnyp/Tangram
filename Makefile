.PHONY: test

test:
	./node_modules/.bin/eslint src/
	flatpak-builder --user  --force-clean --repo=repo --install-deps-from=flathub flatpak re.sonny.gigagram.yaml
	flatpak --user remote-add --no-gpg-verify --if-not-exists gigagram repo
	flatpak --user install gigagram re.sonny.gigagram
	flatpak run re.sonny.gigagram
