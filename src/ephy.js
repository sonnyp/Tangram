/* Shameless copy/paste of
 * https://gitlab.gnome.org/GNOME/epiphany/blob/master/embed/web-process-extension/resources/js/ephy.js
 */

/* eslint-env browser */

this.getWebAppName = function getWebAppTitle() {
  const metas = document.getElementsByTagName("meta");
  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i];
    if (meta.name === "application-name") return meta.content;

    // og:site_name is read from the property attribute (standard), but is
    // commonly seen on the web in the name attribute. Both are supported.
    if (
      meta.getAttribute("property") === "og:site_name" ||
      meta.name === "og:site_name"
    )
      return meta.content;
  }
  return null;
};

this.getWebAppIcon = function getWebAppIcon(baseURL) {
  // FIXME: This function could be improved considerably. See the first two answers at:
  // http://stackoverflow.com/questions/21991044/how-to-get-high-resolution-website-logo-favicon-for-a-given-url
  //
  // Also check out: https://www.slightfuture.com/webdev/gnome-web-app-icons
  let iconURL = null;
  let appleTouchIconURL = null;
  let largestIconSize = 0;
  const links = document.getElementsByTagName("link");
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (
      link.rel === "icon" ||
      link.rel === "shortcut icon" ||
      link.rel === "icon shortcut" ||
      link.rel === "shortcut-icon"
    ) {
      const sizes = link.getAttribute("sizes");
      if (!sizes) continue;

      if (sizes === "any") {
        // "any" means a vector, and thus it will always be the largest icon.
        iconURL = link.href;
        break;
      }

      const sizesList = sizes.split(" ");
      for (let j = 0; j < sizesList.length; j++) {
        const size = sizesList[j].toLowerCase().split("x");

        // Only accept square icons.
        if (size.length !== 2 || size[0] !== size[1]) continue;

        // Only accept icons of 96 px (smallest GNOME HIG app icon) or larger.
        // It's better to defer to other icon discovery methods if smaller
        // icons are returned here.
        if (size[0] >= 92 && size[0] > largestIconSize) {
          iconURL = link.href;
          largestIconSize = size[0];
        }
      }
    } else if (
      link.rel === "apple-touch-icon" ||
      link.rel === "apple-touch-icon-precomposed"
    ) {
      // TODO: support more than one possible icon.
      // apple-touch-icon is best touch-icon candidate.
      if (link.rel === "apple-touch-icon" || !appleTouchIconURL)
        appleTouchIconURL = link.href;
      // TODO: Try to retrieve /apple-touch-icon.png, and return it if it exist.
    }
  }

  // HTML icon.
  if (iconURL) return { url: new URL(iconURL, baseURL).href, color: null };

  let iconColor = null;
  let ogpIcon = null;
  const metas = document.getElementsByTagName("meta");
  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i];
    // FIXME: Ought to also search browserconfig.xml
    // See: http://stackoverflow.com/questions/24625305/msapplication-tileimage-favicon-backup
    if (meta.name === "msapplication-TileImage") iconURL = meta.content;
    else if (meta.name === "msapplication-TileColor") iconColor = meta.content;
    else if (
      meta.getAttribute("property") === "og:image" ||
      meta.getAttribute("itemprop") === "image"
    )
      ogpIcon = meta.content;
  }

  // msapplication icon.
  if (iconURL) return { url: new URL(iconURL, baseURL).href, color: iconColor };

  // Apple touch icon.
  if (appleTouchIconURL)
    return { url: new URL(appleTouchIconURL, baseURL).href, color: null };

  // ogp icon.
  if (ogpIcon) return { url: new URL(ogpIcon, baseURL).href, color: null };

  // Last ditch effort: just fallback to the default favicon location.
  return { url: new URL("./favicon.ico", baseURL).href, color: null };
};
