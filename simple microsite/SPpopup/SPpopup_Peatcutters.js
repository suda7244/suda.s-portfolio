
console.log("✅ popup js loaded (Peatcutters always show version)");

var purecookieTitle = "This website is a student project.";
var purecookieDesc = "Visit the real website: ";
var purecookieLink = '<a href="https://www.peatcutterscroft.com/" target="_blank">Peatcutter&rsquo;s Croft B&amp;B</a>';
var purecookieButton = "Understood";

function pureFadeIn(elem, display) {
  var el = document.getElementById(elem);
  el.style.opacity = 0;
  el.style.display = display || "block";
  (function fade() {
    var val = parseFloat(el.style.opacity);
    if (!((val += 0.02) > 1)) {
      el.style.opacity = val;
      requestAnimationFrame(fade);
    }
  })();
}

function pureFadeOut(elem) {
  var el = document.getElementById(elem);
  el.style.opacity = 1;
  (function fade() {
    if ((el.style.opacity -= 0.02) < 0) {
      el.style.display = "none";
    } else {
      requestAnimationFrame(fade);
    }
  })();
}

function cookieConsent() {
  console.log("✅ always showing popup (Peatcutters)");
  document.body.innerHTML +=
    '<div class="cookieConsentContainer" id="cookieConsentContainer">' +
    '<div class="cookieTitle"><a>' + purecookieTitle + '</a></div>' +
    '<div class="cookieDesc"><p>' + purecookieDesc + ' ' + purecookieLink + '</p></div>' +
    '<div class="cookieButton"><a onClick="purecookieDismiss();">' + purecookieButton + '</a></div>' +
    '</div>';
  pureFadeIn("cookieConsentContainer");
}

function purecookieDismiss() {
  pureFadeOut("cookieConsentContainer");
}

window.addEventListener("load", function () {
  console.log("✅ window loaded, triggering always-on popup (Peatcutters)");
  cookieConsent();
});
