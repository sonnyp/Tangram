import GLib from "gi://GLib";
import Gdk from "gi://Gdk";
import Soup from "gi://Soup";
import GdkPixbuf from "gi://GdkPixbuf";

const { byteArray } = imports;

const { pixbuf_get_from_surface } = Gdk;
const { get_tmp_dir, build_filenamev } = GLib;
const { Pixbuf } = GdkPixbuf;

import { promiseTask, once } from "../troll/util.js";

import {
  getWebAppIcon,
  getWebAppTitle,
  getWebAppManifest,
  getWebAppURL,
} from "./ephy.js";

export function download(webview, url, destination) {
  const download = webview.download_uri(url);
  download.set_allow_overwrite(true);
  download.set_destination(destination);
  return once(download, "finished", "failed");
}

export function runJavaScript(webview, script) {
  return promiseTask(
    webview,
    "run_javascript",
    "run_javascript_finish",
    script,
    null,
  ).then((javascriptResult) => {
    if (!javascriptResult) return;
    return javascriptResult.get_js_value();
  });
}

// FIXME: we should use troll fetch but it doesn't support reading an InputStream
// without a `content-length` header
// import fetch from "../troll/std/fetch";
export async function fetchManifest(url, webview) {
  return new Promise((resolve) => {
    const session = new Soup.Session();
    const message = new Soup.Message({
      method: "GET",
      uri: Soup.URI.new(url),
    });
    message.request_headers.append("Cache-Control", "no-cache");
    if (webview) {
      message.request_headers.append(
        "User-Agent",
        webview.get_settings().get_user_agent(),
      );
    }

    session.queue_message(message, () => {
      try {
        resolve(
          JSON.parse(
            byteArray.toString(
              byteArray.fromGBytes(message.response_body_data),
            ),
          ),
        );
      } catch (err) {
        logError(err);
        resolve(null);
      }
    });
  });
}

function getTitle(webview) {
  const script = `(${getWebAppTitle.toString()})()`;

  return runJavaScript(webview, script)
    .then((javascriptValue) => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch((err) => {
      logError(err);
      return null;
    });
}

function getURL(webview) {
  const script = `(${getWebAppURL.toString()})()`;

  return runJavaScript(webview, script)
    .then((javascriptValue) => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch((err) => {
      logError(err);
      return null;
    });
}

// eslint-disable-next-line no-unused-vars
function getIcon(webview) {
  const script = `(${getWebAppIcon.toString()})()`;

  return runJavaScript(webview, script)
    .then((javascriptValue) => {
      const url = javascriptValue.object_get_property("url");
      if (!url.is_string()) return null;
      return url.to_string();
      // const color = javascriptValue.object_get_property('color').to_string();
    })
    .catch((err) => {
      logError(err);
      return null;
    });
}

async function getManifestURL(webview) {
  const script = `(${getWebAppManifest.toString()})()`;

  return runJavaScript(webview, script)
    .then((javascriptValue) => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch((err) => {
      logError(err);
      return null;
    });
}

const supported_formats = (() => {
  const formats = Pixbuf.get_formats();
  return [].concat(...formats.map((format) => format.get_mime_types()));
})();

function getMaxSize(icon) {
  const sizes = [];

  for (const size of icon.sizes.split(" ")) {
    if (!size) continue;
    sizes.push(+size.split("x")[0]);
  }

  return Math.max(...sizes);
}

// eslint-disable-next-line no-unused-vars
function findBestIcon(icons) {
  let bestIcon;

  for (const icon of icons) {
    if (!supported_formats.includes(icon.type)) continue;
    if (!icon.src) continue;

    const size = getMaxSize(icon);
    if (!size) continue;

    if (!bestIcon) {
      bestIcon = icon;
      continue;
    }

    if (size >= getMaxSize(bestIcon)) {
      bestIcon = icon;
    }
  }

  return bestIcon;
}

function resolveURI(webview, URL) {
  return Soup.URI.new_with_base(new Soup.URI(webview.get_uri()), URL).to_string(
    false,
  );
}

export async function getWebAppInfo(webview) {
  const title = await getTitle(webview);
  // const icon = await getIcon(webview);
  const URL = await getURL(webview);

  const info = { title };
  info.URL = resolveURI(webview, URL);
  // if (icon) {
  // info.icon = resolveURI(webview, icon);
  // }

  const manifestURL = await getManifestURL(webview);
  if (!manifestURL) {
    return info;
  }

  console.debug(`manifestURL <${manifestURL}>`);

  const manifest = await fetchManifest(manifestURL, webview);
  if (!manifest) {
    return info;
  }

  const {
    name,
    short_name,
    // icons = [],
    start_url,
  } = manifest;

  if (short_name) {
    info.title = short_name;
  } else if (name) {
    info.title = name;
  }

  if (start_url) {
    info.URL = resolveURI(webview, start_url);
  }

  // const bestIcon = findBestIcon(icons);
  // if (bestIcon) {
  //   info.icon = resolveURI(webview, bestIcon.src);
  // }

  info.manifest = manifest;
  return info;
}

function getFavicon(webview) {
  // TODO file gjs issue
  // favicon property is null if there is no favicon (example.com), throws otherwise
  try {
    if (!webview.favicon) return null;
  } catch (err) {
    // Error: Can't convert non-null pointer to JS value
  }

  // if there is no favicon webview.get_favicon throws with
  // JSObject* gjs_cairo_surface_from_surface(JSContext*, cairo_surface_t*): assertion 'surface != NULL' failed
  try {
    return webview.get_favicon();
  } catch (err) {
    logError(err);
    return null;
  }
}

export function getFaviconAsPixbuf(webview) {
  const favicon = getFavicon(webview);
  if (!favicon) return;

  const pixbuf = pixbuf_get_from_surface(
    favicon,
    0,
    0,
    favicon.getWidth(),
    favicon.getHeight(),
  );
  return pixbuf;
}

export function saveFavicon(webview, instance) {
  const favicon = getFaviconAsPixbuf(webview);
  if (!favicon) return null;

  const path = build_filenamev([get_tmp_dir(), instance.id]);
  if (!favicon.savev(path, "png", [], [])) return null;

  return path;
}
