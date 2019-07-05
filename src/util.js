/* exported once */
function once(object, signal) {
  return new Promise(resolve => {
    const handlerId = object.connect(signal, function handler(self, ...params) {
      object.disconnect(handlerId);
      resolve(params);
    });
  });
}
