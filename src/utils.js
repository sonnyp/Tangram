import Soup from "gi://Soup";
import GLib from "gi://GLib";
import system from "system";

const {
  tld_get_base_domain,
  URI,
  TLDError: { IS_IP_ADDRESS, NOT_ENOUGH_DOMAINS, NO_BASE_DOMAIN },
} = Soup;
const { hostname_to_ascii } = GLib;

import { BLANK_URI, MODES } from "./constants.js";

// Implements https://web.dev/same-site-same-origin/
export function isSameSite(a, b) {
  // uris
  a = new URI(a);
  b = new URI(b);
  if (!a || !b) return false;

  // hostnames
  a = a.get_host();
  b = b.get_host();
  // example: about:blank
  if (!a || !b) return a === b;

  // punycode
  a = hostname_to_ascii(a);
  b = hostname_to_ascii(b);
  if (!a || !b) return false;

  try {
    return tld_get_base_domain(a) === tld_get_base_domain(b);
  } catch (err) {
    switch (err.code) {
      case IS_IP_ADDRESS:
      case NOT_ENOUGH_DOMAINS:
      case NO_BASE_DOMAIN:
        return a === b;
    }
    logError(err);
    return false;
  }
}

export function isUrlAllowedForNavigation(webView, request_url) {
  const current_url = webView.get_uri();

  if (webView.mode === MODES.TEMPORARY) return true;

  if (request_url === BLANK_URI) return true;

  return isSameSite(current_url, request_url);
}

export function getGIRepositoryVersion(repo) {
  const { get_major_version, get_minor_version, get_micro_version } = repo;
  return `${get_major_version()}.${get_minor_version()}.${get_micro_version()}`;
}

export function getGjsVersion() {
  const v = system.version.toString();
  return `${v[0]}.${+(v[1] + v[2])}.${+(v[3] + v[4])}`;
}
