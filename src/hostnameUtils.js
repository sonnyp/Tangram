const {
  tld_get_base_domain,
  URI,
  TLDError: { IS_IP_ADDRESS, NOT_ENOUGH_DOMAINS, NO_BASE_DOMAIN },
} = imports.gi.Soup;
const { hostname_to_ascii } = imports.gi.GLib;

// Implements https://web.dev/same-site-same-origin/
function isSameSite(a, b) {
  a = new URI(a);
  b = new URI(b);

  if (!a || !b) return false;

  // punycode
  a = hostname_to_ascii(a.get_host());
  b = hostname_to_ascii(b.get_host());

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

export { isSameSite };
