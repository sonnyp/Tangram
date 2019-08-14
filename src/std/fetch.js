const Soup = imports.gi.Soup;

const session = new Soup.Session();

this.fetch = function fetch(url) {
  return new Promise(resolve => {
    const message = new Soup.Message({
      method: "GET",
      uri: Soup.URI.new(url),
    });
    session.queue_message(message, () => {
      resolve({
        json() {
          return JSON.parse(message.response_body.data);
        },
      });
    });
  });
};
