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

  function loadGoogleMapsScript(apiKey) {
    return new Promise(function (resolve, reject) {
      if (window.google && window.google.maps && window.google.maps.places) {
        resolve();
        return;
      }
      window.gm_authFailure = function () {
        setAddressHint(
          "Address suggestions are unavailable. In Google Cloud: enable Maps JavaScript API and Places API, add this exact website URL under key restrictions (including www if you use it), and ensure billing is active.",
          true
        );
      };
      var cbName = "gmapsPlacesCb_" + String(Math.random()).slice(2);
      window[cbName] = function () {
        resolve();
        try {
          delete window[cbName];
        } catch (e) {
          window[cbName] = undefined;
        }
      };
      var s = document.createElement("script");
      s.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(apiKey) +
        "&v=weekly&libraries=places&callback=" +
        cbName;
      s.async = true;
      s.defer = true;
      s.onerror = function () {
        reject(new Error("Google Maps script failed to load"));
      };
      document.head.appendChild(s);
    });
  }

  function fillAddressFieldsFromPlace(place) {
    var comps = place.address_components;
    if (!comps || !comps.length) return;

    var streetNum = "";
    var route = "";
    var city = "";
    var state = "";
    var zip = "";

    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      var t = c.types;
      if (t.indexOf("street_number") >= 0) streetNum = c.long_name;
      if (t.indexOf("route") >= 0) route = c.long_name;
      if (t.indexOf("locality") >= 0) city = c.long_name;
      if (t.indexOf("sublocality") >= 0 && !city) city = c.long_name;
      if (t.indexOf("administrative_area_level_1") >= 0) state = c.short_name;
      if (t.indexOf("postal_code") >= 0) zip = c.long_name;
    }

    var line1 = (streetNum + " " + route).trim();
    var addrEl = document.getElementById("bf-address");
    var cityEl = document.getElementById("bf-city");
    var stateEl = document.getElementById("bf-state");
    var zipEl = document.getElementById("bf-zip");

    if (line1 && addrEl) addrEl.value = line1;
    if (city && cityEl) cityEl.value = city;
    if (state && stateEl) stateEl.value = state;
    if (zip && zipEl) zipEl.value = zip;
  }

  function initAddressAutocomplete() {
    var addressInput = document.getElementById("bf-address");
    if (!addressInput) return;

    fetch(getMapsKeyUrl())
      .then(function (res) {
        if (!res.ok) {
          setAddressHint(
            "Could not load address helper (" + res.status + "). Type the address manually.",
            true
          );
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        if (!data.ok || !data.apiKey) {
          setAddressHint(
            "Add GOOGLE_MAPS_API_KEY in Netlify environment variables and redeploy.",
            true
          );
          return;
        }
        return loadGoogleMapsScript(data.apiKey).then(function () {
          try {
            var ac = new google.maps.places.Autocomplete(addressInput, {
              componentRestrictions: { country: "us" },
              fields: ["address_components", "formatted_address"],
            });
            ac.addListener("place_changed", function () {
              var place = ac.getPlace();
              if (place && place.address_components) {
                fillAddressFieldsFromPlace(place);
                setAddressHint("", false);
              }
            });
            addressInput.setAttribute("autocomplete", "off");
            setAddressHint("Pick your address from the suggestions to fill city and ZIP.", false);
          } catch (err) {
            console.error("Places Autocomplete:", err);
            setAddressHint("Could not start address suggestions. Type the address manually.", true);
          }
        });
      })
      .catch(function () {
        setAddressHint(
          "Address helper failed to load. Use HTTPS on your live site or type the address manually.",
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
