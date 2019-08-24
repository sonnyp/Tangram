const Soup = imports.gi.Soup;

const { promiseAsyncReadyCallback, once } = imports.util;
const { fetch } = imports.std.fetch;
const {
  getWebAppIcon,
  getWebAppTitle,
  getWebAppManifest,
  getWebAppURL,
} = imports.webapp.ephy;

this.download = function download(webview, url, destination) {
  const download = webview.download_uri(url);
  download.set_allow_overwrite(true);
  download.set_destination(destination);
  return once(download, "finished", "failed");
};

this.runJavaScript = runJavaScript;
function runJavaScript(webview, script) {
  return promiseAsyncReadyCallback(
    webview,
    "run_javascript",
    "run_javascript_finish",
    script,
    null
  ).then(javascriptResult => {
    if (!javascriptResult) return;
    return javascriptResult.get_js_value();
  });
}

async function fetchManifest(url) {
  return (await fetch(url)).json();
}

function getTitle(webview) {
  const script = `(${getWebAppTitle.toString()})()`;

  return runJavaScript(webview, script)
    .then(javascriptValue => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch(err => {
      logError(err);
      return null;
    });
}

function getURL(webview) {
  const script = `(${getWebAppURL.toString()})()`;

  return runJavaScript(webview, script)
    .then(javascriptValue => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch(err => {
      logError(err);
      return null;
    });
}

function getIcon(webview) {
  const script = `(${getWebAppIcon.toString()})()`;

  return runJavaScript(webview, script)
    .then(javascriptValue => {
      const url = javascriptValue.object_get_property("url");
      if (!url.is_string()) return null;
      return url.to_string();
      // const color = javascriptValue.object_get_property('color').to_string();
    })
    .catch(err => {
      logError(err);
      return null;
    });
}

async function getManifestURL(webview) {
  const script = `(${getWebAppManifest.toString()})()`;

  return runJavaScript(webview, script)
    .then(javascriptValue => {
      if (!javascriptValue.is_string()) return null;
      return javascriptValue.to_string();
    })
    .catch(err => {
      logError(err);
      return null;
    });
}

const supported_formats = (() => {
  const formats = imports.gi.GdkPixbuf.Pixbuf.get_formats();
  return [].concat(...formats.map(format => format.get_mime_types()));
})();

function getMaxSize(icon) {
  const sizes = [];

  for (const size of icon.sizes.split(" ")) {
    if (!size) continue;
    sizes.push(+size.split("x")[0]);
  }

  return Math.max(...sizes);
}

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
    false
  );
}

this.getWebAppInfo = getWebAppInfo;
async function getWebAppInfo(webview) {
  const title = await getTitle(webview);
  const icon = await getIcon(webview);
  const URL = await getURL(webview);

  const info = { title };
  info.URL = resolveURI(webview, URL);
  if (icon) {
    info.icon = resolveURI(webview, icon);
  }

  const manifestURL = await getManifestURL(webview);
  if (!manifestURL) {
    return info;
  }

  const manifest = await fetchManifest(manifestURL).catch(err => {
    logError(err);
    return null;
  });
  if (!manifest) {
    return info;
  }

  const { name, short_name, icons = [], start_url } = manifest;

  if (short_name) {
    info.title = short_name;
  } else if (name) {
    info.title = name;
  }

  if (start_url) {
    info.URL = resolveURI(webview, start_url);
  }

  const bestIcon = findBestIcon(icons);
  if (bestIcon) {
    info.icon = resolveURI(webview, bestIcon.src);
  }

  info.manifest = manifest;
  return info;
}
