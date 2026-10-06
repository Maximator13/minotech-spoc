// Script classique, chargé dans <head> avant le rendu : évite le flash de thème.
(function () {
  var dark;
  document.documentElement.classList.add('js');
  try {
    var t = localStorage.getItem('minotech_theme');
    dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {
    dark = false;
  }
  if (dark) document.documentElement.classList.add('dark');
})();
