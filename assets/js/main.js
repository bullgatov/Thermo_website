(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var navToggle = document.querySelector(".nav-toggle");
  var siteNav = document.getElementById("site-nav");
  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var open = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }

  var submenuBtn = document.querySelector(".nav-link--button[data-submenu]");
  var subId = submenuBtn && submenuBtn.getAttribute("data-submenu");
  var subEl = subId ? document.getElementById("sub-" + subId) : null;
  if (submenuBtn && subEl) {
    submenuBtn.addEventListener("click", function () {
      if (window.innerWidth > 900) return;
      var expanded = submenuBtn.getAttribute("aria-expanded") === "true";
      submenuBtn.setAttribute("aria-expanded", expanded ? "false" : "true");
      subEl.hidden = expanded;
    });
  }

  var zipForm = document.getElementById("zip-form");
  var zipMsg = document.getElementById("zip-msg");
  var zipModal = document.getElementById("zip-modal");
  var zipModalBody = document.getElementById("zip-modal-body");
  var supportedZips = {
    "19087": true,
    "19312": true,
    "19333": true,
    "19301": true,
    "19355": true,
    "19341": true,
    "19380": true,
    "19425": true,
    "19460": true,
    "19406": true,
  };

  function openModal() {
    if (!zipModal) return;
    zipModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!zipModal) return;
    zipModal.hidden = true;
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-close-modal]").forEach(function (el) {
    el.addEventListener("click", closeModal);
  });

  if (zipForm && zipMsg) {
    zipForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("zip-input");
      var zip = input && input.value.trim();
      if (!/^\d{5}$/.test(zip)) {
        zipMsg.textContent = "Please enter a valid 5-digit ZIP code.";
        return;
      }
      if (supportedZips[zip]) {
        zipMsg.textContent =
          "Great news — we currently service ZIP " +
          zip +
          ". You can book online below.";
      } else {
        zipMsg.textContent =
          "ZIP " +
          zip +
          " is currently outside our primary service area. Please call (445) 201-1404 to confirm availability.";
      }
    });
  }

  function getSubmitLeadUrl() {
    if (typeof window.SUBMIT_LEAD_URL === "string" && window.SUBMIT_LEAD_URL) {
      return window.SUBMIT_LEAD_URL;
    }
    return "/.netlify/functions/submit-lead";
  }

  function getMapsKeyUrl() {
    if (typeof window.MAPS_KEY_URL === "string" && window.MAPS_KEY_URL) {
      return window.MAPS_KEY_URL;
    }
    return "/.netlify/functions/maps-key";
  }

  var bfPlaceAutocomplete = null;

  function setAddressHint(message, isError) {
    var el = document.getElementById("bf-address-hint");
    if (!el) return;
    el.textContent = message || "";
    if (isError) {
      el.classList.add("is-error");
    } else {
      el.classList.remove("is-error");
    }
  }

  function syncAddressFromWidget() {
    var h = document.getElementById("bf-address");
    if (!h || !bfPlaceAutocomplete) return;
    var v =
      typeof bfPlaceAutocomplete.value === "string"
        ? bfPlaceAutocomplete.value.trim()
        : "";
    if (v) h.value = v;
  }

  function appendManualAddressFallback() {
    var mount = document.getElementById("bf-address-slot");
    var hid = document.getElementById("bf-address");
    if (!mount || !hid || mount.querySelector(".bf-address-manual")) return;
    var inp = document.createElement("input");
    inp.type = "text";
    inp.className = "bf-address-manual";
    inp.required = true;
    inp.setAttribute("autocomplete", "street-address");
    inp.placeholder = "Street address (include city if no suggestions)";
    inp.addEventListener("input", function () {
      hid.value = inp.value;
    });
    mount.appendChild(inp);
  }

  function loadGoogleMapsScript(apiKey) {
    return new Promise(function (resolve, reject) {
      function afterApiLoaded() {
        if (typeof google.maps.importLibrary === "function") {
          return google.maps.importLibrary("places");
        }
        return Promise.resolve();
      }
      if (window.google && window.google.maps) {
        afterApiLoaded().then(function () {
          resolve();
        }).catch(reject);
        return;
      }
      window.gm_authFailure = function () {
        setAddressHint(
          "Address suggestions are unavailable. In Google Cloud: enable Maps JavaScript API and Places API (New), allow those APIs on this key, add your site under HTTP referrer restrictions (with and without www if you use both), and ensure billing is active.",
          true
        );
      };
      var cbName = "gmapsPlacesCb_" + String(Math.random()).slice(2);
      window[cbName] = function () {
        afterApiLoaded()
          .then(function () {
            resolve();
            try {
              delete window[cbName];
            } catch (e) {
              window[cbName] = undefined;
            }
          })
          .catch(reject);
      };
      var s = document.createElement("script");
      s.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(apiKey) +
        "&v=weekly&libraries=places&loading=async&callback=" +
        cbName;
      s.async = true;
      s.defer = true;
      s.onerror = function () {
        reject(new Error("Google Maps script failed to load"));
      };
      document.head.appendChild(s);
    });
  }

  function componentLongText(c) {
    if (c.longText != null) return c.longText;
    if (c.long_name != null) return c.long_name;
    return "";
  }

  function componentShortText(c) {
    if (c.shortText != null) return c.shortText;
    if (c.short_name != null) return c.short_name;
    return "";
  }

  function fillAddressFieldsFromComponents(comps) {
    if (!comps || !comps.length) return;

    var streetNum = "";
    var route = "";
    var city = "";
    var state = "";
    var zip = "";

    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      var t = c.types || [];
      if (t.indexOf("street_number") >= 0) streetNum = componentLongText(c);
      if (t.indexOf("route") >= 0) route = componentLongText(c);
      if (t.indexOf("locality") >= 0) city = componentLongText(c);
      if (t.indexOf("sublocality") >= 0 && !city) city = componentLongText(c);
      if (t.indexOf("administrative_area_level_1") >= 0) {
        state = componentShortText(c);
      }
      if (t.indexOf("postal_code") >= 0) zip = componentLongText(c);
    }

    var line1 = (streetNum + " " + route).trim();
    var addrHidden = document.getElementById("bf-address");
    var cityEl = document.getElementById("bf-city");
    var stateEl = document.getElementById("bf-state");
    var zipEl = document.getElementById("bf-zip");

    if (line1 && addrHidden) addrHidden.value = line1;
    if (city && cityEl) cityEl.value = city;
    if (state && stateEl) stateEl.value = state;
    if (zip && zipEl) zipEl.value = zip;
  }

  function fillAddressFieldsFromPlace(place) {
    var comps = place.addressComponents || place.address_components;
    fillAddressFieldsFromComponents(comps);
  }

  function initAddressAutocomplete() {
    var mount = document.getElementById("bf-address-slot");
    var addrHidden = document.getElementById("bf-address");
    if (!mount || !addrHidden) return;

    fetch(getMapsKeyUrl())
      .then(function (res) {
        if (!res.ok) {
          appendManualAddressFallback();
          setAddressHint(
            "Could not load address helper (" + res.status + "). Enter your address manually.",
            true
          );
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        if (!data.ok || !data.apiKey) {
          appendManualAddressFallback();
          setAddressHint(
            "Add GOOGLE_MAPS_API_KEY in Netlify environment variables and redeploy.",
            true
          );
          return;
        }
        return loadGoogleMapsScript(data.apiKey).then(function () {
          try {
            var PlaceAutocompleteElement =
              google.maps.places.PlaceAutocompleteElement;
            if (!PlaceAutocompleteElement) {
              appendManualAddressFallback();
              setAddressHint(
                "This browser cannot load address suggestions. Enter your address manually.",
                true
              );
              return;
            }
            mount.innerHTML = "";
            bfPlaceAutocomplete = null;

            var placeAutocomplete = new PlaceAutocompleteElement({});
            placeAutocomplete.includedRegionCodes = ["us"];
            placeAutocomplete.placeholder =
              "Start typing your street address";
            mount.appendChild(placeAutocomplete);
            bfPlaceAutocomplete = placeAutocomplete;

            (function stabilizeAddressAutocompleteOnMobile() {
              var root = document.documentElement;
              function useInstantScroll() {
                root.style.scrollBehavior = "auto";
              }
              function clearScrollOverride() {
                root.style.scrollBehavior = "";
              }
              placeAutocomplete.addEventListener("focusin", useInstantScroll, true);
              placeAutocomplete.addEventListener("input", useInstantScroll);
              placeAutocomplete.addEventListener("focusout", clearScrollOverride, true);
            })();

            placeAutocomplete.addEventListener("gmp-select", function (ev) {
              var placePrediction =
                ev.placePrediction != null
                  ? ev.placePrediction
                  : ev.detail && ev.detail.placePrediction;
              if (!placePrediction) return;
              var place = placePrediction.toPlace();
              place
                .fetchFields({ fields: ["addressComponents"] })
                .then(function () {
                  fillAddressFieldsFromPlace(place);
                  setAddressHint("", false);
                })
                .catch(function (err) {
                  console.error("Places fetchFields:", err);
                  syncAddressFromWidget();
                });
            });

            setAddressHint(
              "Pick your address from the suggestions to fill city and ZIP.",
              false
            );
          } catch (err) {
            console.error("PlaceAutocompleteElement:", err);
            mount.innerHTML = "";
            bfPlaceAutocomplete = null;
            appendManualAddressFallback();
            setAddressHint(
              "Could not start address suggestions. Enter your address manually.",
              true
            );
          }
        });
      })
      .catch(function () {
        appendManualAddressFallback();
        setAddressHint(
          "Address helper failed to load. Use HTTPS on your live site or enter the address manually.",
          true
        );
      });
  }

  initAddressAutocomplete();

  var bookForm = document.getElementById("book-form");
  var bookMsg = document.getElementById("book-msg");
  if (bookForm && bookMsg) {
    bookForm.addEventListener("submit", function (e) {
      e.preventDefault();
      syncAddressFromWidget();
      var addrHidden = document.getElementById("bf-address");
      if (!addrHidden || !String(addrHidden.value || "").trim()) {
        setAddressHint(
          "Please enter your street address. Choosing a suggestion fills city and ZIP automatically.",
          true
        );
        return;
      }
      if (!bookForm.reportValidity()) return;

      var submitBtn = bookForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
      }
      bookMsg.textContent = "Sending…";
      bookMsg.removeAttribute("data-state");

      var payload = {
        name: (document.getElementById("bf-name") || {}).value,
        phone: (document.getElementById("bf-phone") || {}).value,
        email: (document.getElementById("bf-email") || {}).value,
        address: (document.getElementById("bf-address") || {}).value,
        city: (document.getElementById("bf-city") || {}).value,
        state: (document.getElementById("bf-state") || {}).value,
        zip: (document.getElementById("bf-zip") || {}).value,
        appliance: (document.getElementById("bf-appliance") || {}).value,
        brand_model: (document.getElementById("bf-brand") || {}).value,
        issue: (document.getElementById("bf-issue") || {}).value,
        preferred_date: (document.getElementById("bf-date") || {}).value,
        window: (document.getElementById("bf-window") || {}).value,
      };

      fetch(getSubmitLeadUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              return { ok: res.ok, status: res.status, data: data };
            });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.ok) {
            bookMsg.textContent =
              "Thank you — your request was sent. We will contact you shortly.";
            bookMsg.setAttribute("data-state", "success");
            bookForm.reset();
            var st = document.getElementById("bf-state");
            if (st) st.value = "PA";
          } else {
            var err =
              (result.data && result.data.error) ||
              "Something went wrong. Please call us or try again.";
            bookMsg.textContent = err;
            bookMsg.setAttribute("data-state", "error");
          }
        })
        .catch(function () {
          bookMsg.textContent =
            "Could not send your request. If you opened this page as a file, use the deployed site or run netlify dev.";
          bookMsg.setAttribute("data-state", "error");
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }
})();
