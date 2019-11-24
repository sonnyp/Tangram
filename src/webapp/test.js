import { getWebAppInfo } from "./webapp";
import * as assert from "../troll/assert";

const WebKit = imports.gi.WebKit2;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Soup = imports.gi.Soup;

// Gtk needs to be initialized for WebKitGTK
Gtk.init(null);
const loop = GLib.MainLoop.new(null, false);

async function setup(webview, html, manifest) {
  return new Promise(resolve => {
    const { url, server } = serve(html, manifest);

    const loadChangedHandlerId = webview.connect(
      "load-changed",
      loadChangedHandler
    );
    function loadChangedHandler(self, loadEvent) {
      if (loadEvent !== WebKit.LoadEvent.FINISHED) return;
      resolve(server);
      webview.disconnect(loadChangedHandlerId);
    }
    webview.load_uri(url);
  });
}

function serve(html, manifest) {
  const server = new Soup.Server();

  if (manifest) {
    server.add_handler("/manifest.json", (self, msg) => {
      msg.set_status(200);
      msg.response_headers.set_content_type("application/manifest+json", {
        charset: "UTF-8",
      });
      msg.response_body.append(JSON.stringify(manifest));
    });
  }

  server.add_handler("/", (self, msg) => {
    msg.set_status(200);
    msg.response_headers.set_content_type("text/html", { charset: "UTF-8" });
    msg.response_body.append(html);
  });

  server.listen_local(0, Soup.ServerListenOptions.IPV4_ONLY);

  const url = server.get_uris()[0].to_string(false);
  return {
    server,
    url,
  };
}

async function test(html, manifest) {
  const webview = new WebKit.WebView({
    is_ephemeral: true,
  });

  const server = await setup(webview, html, manifest);
  const info = await getWebAppInfo(webview);

  server.disconnect();

  return { info, webview, server };
}

let exit_code = 0;

(async () => {
  await (async () => {
    const { info } = await test(
      `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta name="msapplication-starturl" content="https://msapplication.starturl">
        </head>
        <body></body>
        </html>
    `
    );

    assert.is(info.URL, "https://msapplication.starturl/");
  })();

  await (async () => {
    const { info } = await test(
      `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        </head>
        <body></body>
        </html>
    `
    );

    assert.is(info.title, "127.0.0.1");
  })();

  await (async () => {
    const { info } = await test(
      `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta property="og:url" content="https://opengraph.url">
        </head>
        <body></body>
        </html>
    `
    );

    assert.is(info.URL, "https://opengraph.url/");
  })();

  await (async () => {
    const { info } = await test(
      `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta name="application-name" content="meta-application-name">
        <title>title</title>
        </head>
        <body></body>
        </html>
    `
    );

    assert.is(info.title, "meta-application-name");
  })();

  await (async () => {
    const { info } = await test(
      `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta name="apple-mobile-web-app-title" content="meta-apple-mobile-web-app-title">
        <title>title</title>
        </head>
        <body></body>
        </html>
    `
    );

    assert.is(info.title, "meta-apple-mobile-web-app-title");
  })();

  await (async () => {
    const { info } = await test(
      `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta property="og:site_name" content="meta-property-site-name">
        <title>title</title>
        <meta name="application-name" content="meta-application-name">
        </head>
        <body></body>
        </html>
    `
    );

    assert.is(info.title, "meta-property-site-name");
  })();

  await (async () => {
    const { info } = await test(
      `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <meta name="og:site_name" content="meta-site-name">
        <meta property="og:site_name" content="meta-property-site-name">
        <title>title</title>
        <meta name="application-name" content="meta-application-name">
        </head>
        <body></body>
        </html>
    `
    );

    assert.is(info.title, "meta-site-name");
  })();

  await (async () => {
    const { info } = await test(
      `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <title>title</title>
        </head>
        <body></body>
        </html>
    `
    );

    assert.is(info.title, "title");
  })();

  await (async () => {
    const { info, webview } = await test(
      `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <link rel="manifest" href="/manifest.json">
    <title>foobar</title>
    </head>
    <body></body>
    </html>
    `,
      {
        name: "HackerWeb",
        short_name: "HackerWeb",
        start_url: "../startpoint.html?foo=bar#foobar",
        display: "standalone",
        background_color: "#fff",
        description: "A simply readable Hacker News app.",
        icons: [
          {
            src: "images/touch/homescreen48.png",
            sizes: "48x48",
            type: "image/png",
          },
        ],
      }
    );

    assert.is(info.title, "HackerWeb");
    // assert.is(info.icon, `${webview.get_uri()}images/touch/homescreen48.png`);
    assert.is(info.URL, `${webview.get_uri()}startpoint.html?foo=bar#foobar`);
  })();

  loop.quit();
})().catch(err => {
  logError(err);
  exit_code = 1;
  loop.quit();
});

loop.run();

// Must run after loop, see
// https://gitlab.gnome.org/GNOME/gjs/issues/278#note_587273
imports.system.exit(exit_code);
