import "./setup";

import { isSameSite } from "./hostnameUtils";
import * as assert from "./troll/assert";

assert.is(isSameSite("https://github.com", "https://github.com"), true);
assert.is(isSameSite("https://github.com", "http://github.com"), true);
assert.is(
  isSameSite("https://github.com:123", "http://github.com:567/foobar"),
  true,
);
assert.is(isSameSite("https://foo.github.com", "https://github.com"), true);
assert.is(isSameSite("https://foo.github.com", "https://bar.github.com"), true);
assert.is(
  isSameSite(
    "https://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]",
    "https://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]",
  ),
  true,
);
assert.is(isSameSite("https://192.0.2.235", "https://192.0.2.235"), true);
assert.is(isSameSite("https://localhost", "https://localhost"), true);
assert.is(isSameSite("https://github.io", "https://github.io"), true);
assert.is(isSameSite("https://ком.рус", "https://xn--j1aef.xn--p1acf"), true);
assert.is(
  isSameSite("https://foo.ком.рус", "https://bar.xn--j1aef.xn--p1acf"),
  true,
);

assert.is(isSameSite("https://foo", "https://bar"), false);
assert.is(isSameSite("https://foo.github.io", "https://bar.github.io"), false);
assert.is(isSameSite("https://foo.github.io", "https://github.io"), false);
assert.is(isSameSite("https://foo.github.io", "https://github.io"), false);
assert.is(isSameSite("some-invalid-url", "some-invalid-url"), false);
assert.is(isSameSite("some-invalid-url", "some-other-invalid-url"), false);
assert.is(isSameSite("https://", "https://"), false);
