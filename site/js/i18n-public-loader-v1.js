/* Loads only the public locale that the visitor selected, with English as a
   deterministic fallback. Locale bundles extend the same in-memory objects so
   changing language never requires downloading the private workspace copy. */
(function () {
  "use strict";

  var supported = ["en", "pt", "fr", "es", "de", "tr", "ar", "zh", "ru", "ko"];
  var script = document.currentScript;
  var baseUrl = new URL("i18n-public/", script && script.src ? script.src : document.baseURI);
  var pending = {};
  var bundleVersions = {"en":"5eed8d7729ff","pt":"172dc818bbbd","fr":"ccc94e18a9f1","es":"5e104d1d7c9e","de":"92dcb96e19ea","tr":"57695da819a0","ar":"aca5bd116278","zh":"aa5c65a8bd02","ru":"9c85723b09de","ko":"d49ca18f2111"};
  window.VOZEN_I18N = window.VOZEN_I18N || {};

  function safeLocale(value) {
    return supported.indexOf(value) >= 0 ? value : "en";
  }

  function load(locale) {
    locale = safeLocale(locale);
    if (window.VOZEN_I18N[locale]) return Promise.resolve(locale);
    if (pending[locale]) return pending[locale];
    pending[locale] = new Promise(function (resolve, reject) {
      var element = document.createElement("script");
      element.src = new URL(locale + ".js?v=" + bundleVersions[locale], baseUrl).href;
      element.async = true;
      element.onload = function () { resolve(locale); };
      element.onerror = function () {
        delete pending[locale];
        reject(new Error("Could not load public locale " + locale));
      };
      document.head.appendChild(element);
    });
    return pending[locale];
  }

  var localizedRoute = document.documentElement.getAttribute("data-vozen-localized-route");
  var pathLocale = location.pathname.split('/')[1];
  var routeLocale = supported.indexOf(pathLocale) >= 0 ? pathLocale : null;
  var selected = routeLocale ? safeLocale(routeLocale) : "en";
  if (!routeLocale) {
    try { selected = safeLocale(localStorage.getItem("vozen.lang") || "en"); } catch (_) {}
  }
  window.vozenLocalizedUrl = localizedRoute ? function (locale) {
    locale = safeLocale(locale);
    var suffix = localizedRoute === "home" ? "" : localizedRoute + "/";
    return "/" + (locale === "en" ? "" : locale + "/") + suffix + location.search + location.hash;
  } : null;
  window.vozenLoadPublicLocale = load;
  window.vozenPublicI18nReady = load("en")
    .then(function () { return selected === "en" ? "en" : load(selected); })
    .catch(function () { return load("en"); });
}());
