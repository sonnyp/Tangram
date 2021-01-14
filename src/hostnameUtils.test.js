import "./setup";

import { isSameSite } from "./hostnameUtils";
import * as assert from "./troll/assert";

const { URI } = imports.gi.Soup;

assert.is(
  isSameSite(new URI("https://github.com"), new URI("https://github.com")),
  true,
);
assert.is(
  isSameSite(new URI("https://github.com"), new URI("https://github.com")),
  true,
);
assert.is(
  isSameSite(new URI("https://foo.github.com"), new URI("https://github.com")),
  true,
);
assert.is(
  isSameSite(
    new URI("https://foo.github.com"),
    new URI("https://bar.github.com"),
  ),
  true,
);

assert.is(
  isSameSite(
    new URI("https://foo.github.io"),
    new URI("https://bar.github.io"),
  ),
  false,
);
assert.is(
  isSameSite(new URI("https://foo.github.io"), new URI("https://github.io")),
  false,
);
