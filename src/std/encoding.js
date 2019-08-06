const { fromString, toString } = imports._byteArrayNative;

this.TextEncoder = class TextEncoder {
  constructor() {
    this.encoding = "utf-8";
  }

  encode(str) {
    fromString(str, "UTF-8");
  }
};

this.TextDecoder = class TextDecoder {
  constructor() {
    this.encoding = "utf-8";
  }

  decode(bytes) {
    toString(bytes, "UTF-8");
  }
};
