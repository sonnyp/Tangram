import { parse, getDomain } from "./publicsuffixlist";

const {
  file_get_contents,
  build_filenamev,
  get_current_dir,
  hostname_to_ascii,
} = imports.gi.GLib;
const { toString } = imports._byteArrayNative;

function load() {
  const path = build_filenamev([
    get_current_dir(),
    "src/public_suffix_list.dat",
  ]);
  const [, result] = file_get_contents(path);

  parse(toString(result), hostname_to_ascii);
}

load();

function isSameSite(a, b) {
  return getDomain(a.get_host()) === getDomain(b.get_host());
}

export { isSameSite };
