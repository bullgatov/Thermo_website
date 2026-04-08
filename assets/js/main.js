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
