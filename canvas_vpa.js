/*
  Yavapai College — Division III: Visual & Performing Arts (VPA)
  Sub-account Theme JavaScript

  Features:
  - Adds a keyboard-accessible “VPA Hub” drawer with quick links
  - Adds discipline tags to Dashboard course cards based on common prefixes

  Maintenance note:
  - Canvas DOM can change. This script uses multiple fallback selectors and fails gracefully.
*/

(function () {
  "use strict";

  // =========================
  // Config (edit these)
  // =========================
  var VPA = window.VPA_BRAND || {
    enabled: true,
    hubTitle: "VPA Hub",
    hubSubtitle: "Division III · Visual & Performing Arts · Yavapai College",
    hubLinks: [
      { label: "Programs", href: "#", kicker: "Explore areas of study" },
      { label: "Events & Performances", href: "#", kicker: "What’s on stage" },
      { label: "Student Showcase", href: "#", kicker: "Work & portfolios" },
      { label: "Faculty & Staff", href: "#", kicker: "Connect and collaborate" },
      { label: "Contact / Advising", href: "#", kicker: "Get help planning" }
    ],
    // If you want to restrict to a specific sub-account by Canvas account ID,
    // set allowedAccountIds: [123, 456]. Otherwise leave empty for “wherever installed”.
    allowedAccountIds: []
  };

  // =========================
  // Utilities
  // =========================
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function getEnvAccountId() {
    try {
      if (window.ENV && typeof window.ENV.ACCOUNT_ID !== "undefined") {
        return Number(window.ENV.ACCOUNT_ID);
      }
    } catch (e) {}
    return null;
  }

  function withinAllowedAccount() {
    if (!VPA.allowedAccountIds || VPA.allowedAccountIds.length === 0) return true;
    var id = getEnvAccountId();
    if (id == null) return false;
    return VPA.allowedAccountIds.indexOf(id) !== -1;
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function createEl(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") el.className = attrs[k];
        else if (k === "text") el.textContent = attrs[k];
        else if (k === "html") el.innerHTML = attrs[k];
        else el.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else if (c) el.appendChild(c);
    });
    return el;
  }

  function isDashboard() {
    // Dashboard tends to have body class or URL /?dashboard
    return (
      /\/\?$/.test(location.pathname) ||
      location.pathname === "/" ||
      !!qs(".ic-Dashboard") ||
      !!qs(".ic-DashboardCard")
    );
  }

  // =========================
  // 1) VPA Hub drawer
  // =========================
  function injectHub() {
    // Try a few places to insert a small button near the top UI.
    var mount =
      qs(".ic-app-header__main-navigation") ||
      qs(".ic-app-header__secondary-navigation") ||
      qs(".ic-app-header") ||
      qs("#wrapper");

    if (!mount) return;

    // Avoid double-injection
    if (qs(".vpa-hub__button")) return;

    var btn = createEl(
      "button",
      {
        type: "button",
        class: "vpa-hub__button",
        "aria-haspopup": "dialog",
        "aria-expanded": "false"
      },
      [
        createEl("span", { class: "vpa-hub__button-badge", "aria-hidden": "true" }),
        createEl("span", { text: "VPA" })
      ]
    );

    // Drawer + backdrop
    var backdrop = createEl("div", { class: "vpa-hub__backdrop vpa-hidden", tabindex: "-1" });
    var drawer = createEl("div", {
      class: "vpa-hub__drawer vpa-hidden",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": VPA.hubTitle
    });

    var header = createEl("div", { class: "vpa-hub__header" }, [
      createEl("p", { class: "vpa-hub__title", text: VPA.hubTitle }),
      createEl("p", { class: "vpa-hub__subtitle", text: VPA.hubSubtitle })
    ]);

    var content = createEl("div", { class: "vpa-hub__content" });

    var section = createEl("div", { class: "vpa-hub__section" }, [
      createEl("p", { class: "vpa-hub__section-title", text: "Quick links" })
    ]);

    var list = createEl("div", { class: "vpa-hub__linklist" });
    (VPA.hubLinks || []).forEach(function (item) {
      var a = createEl("a", {
        class: "vpa-hub__link",
        href: item.href || "#",
        target: item.href && item.href.indexOf("http") === 0 ? "_blank" : "_self",
        rel: item.href && item.href.indexOf("http") === 0 ? "noopener noreferrer" : ""
      }, [
        createEl("span", { text: item.label || "Link" }),
        createEl("span", { class: "vpa-hub__kicker", text: item.kicker || "" })
      ]);
      list.appendChild(a);
    });

    section.appendChild(list);

    var closeBtn = createEl("button", { type: "button", class: "vpa-hub__close", text: "Close" });
    closeBtn.addEventListener("click", closeHub);

    content.appendChild(section);
    content.appendChild(closeBtn);

    drawer.appendChild(header);
    drawer.appendChild(content);

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    // Insert button at the *start* of the mount area (subtle, doesn’t fight nav)
    mount.insertBefore(btn, mount.firstChild);

    var lastFocused = null;

    function openHub() {
      lastFocused = document.activeElement;
      backdrop.classList.remove("vpa-hidden");
      drawer.classList.remove("vpa-hidden");
      btn.setAttribute("aria-expanded", "true");
      // focus first link or close
      var firstFocusable = qs("a, button", drawer);
      if (firstFocusable) firstFocusable.focus();
      document.addEventListener("keydown", onKeyDown);
      drawer.addEventListener("keydown", trapFocus);
    }

    function closeHub() {
      backdrop.classList.add("vpa-hidden");
      drawer.classList.add("vpa-hidden");
      btn.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", onKeyDown);
      drawer.removeEventListener("keydown", trapFocus);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeHub();
      }
    }

    function trapFocus(e) {
      if (e.key !== "Tab") return;
      var focusables = qsa('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', drawer)
        .filter(function (el) { return el.offsetParent !== null; });
      if (focusables.length === 0) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) closeHub();
      else openHub();
    });

    backdrop.addEventListener("click", closeHub);
  }

  // =========================
  // 2) Discipline tags on Dashboard cards
  // =========================
  function inferDiscipline(text) {
    var t = (text || "").toUpperCase();

    // Expand/adjust these to match Yavapai course naming conventions.
    var rules = [
      { key: "THEA", label: "Theatre" },
      { key: "THR", label: "Theatre" },
      { key: "DRAMA", label: "Theatre" },
      { key: "MUS", label: "Music" },
      { key: "CHOIR", label: "Music" },
      { key: "BAND", label: "Music" },
      { key: "ART", label: "Art" },
      { key: "DRAW", label: "Art" },
      { key: "PAINT", label: "Art" },
      { key: "PHOTO", label: "Photography" },
      { key: "DANC", label: "Dance" },
      { key: "FILM", label: "Film" },
      { key: "MEDIA", label: "Media Arts" },
      { key: "DESIGN", label: "Design" }
    ];

    for (var i = 0; i < rules.length; i++) {
      if (t.indexOf(rules[i].key) !== -1) return rules[i].label;
    }
    return null;
  }

  function tagDashboardCards() {
    if (!isDashboard()) return;

    var cards = qsa(".ic-DashboardCard");
    if (cards.length === 0) return;

    cards.forEach(function (card) {
      if (card.querySelector(".vpa-discipline-tag")) return;

      var titleEl =
        card.querySelector(".ic-DashboardCard__header-title") ||
        card.querySelector(".ic-DashboardCard__header") ||
        card;

      var titleText = titleEl ? titleEl.textContent : "";
      var label = inferDiscipline(titleText);
      if (!label) return;

      var tag = createEl("div", { class: "vpa-discipline-tag" }, [
        createEl("span", { class: "vpa-discipline-tag__dot", "aria-hidden": "true" }),
        createEl("span", { text: label })
      ]);

      // Insert beneath title if possible
      var headerContent = card.querySelector(".ic-DashboardCard__header_content") || titleEl;
      if (headerContent) headerContent.appendChild(tag);
    });
  }

  // Re-run on partial page loads (Canvas is SPA-like)
  function observeForChanges() {
    var target = document.body;
    if (!target || !window.MutationObserver) return;

    var obs = new MutationObserver(function () {
      // keep it cheap
      tagDashboardCards();
      injectHub();
    });

    obs.observe(target, { childList: true, subtree: true });
  }

  // =========================
  // Init
  // =========================
  onReady(function () {
    if (!VPA.enabled) return;
    if (!withinAllowedAccount()) return;

    injectHub();
    tagDashboardCards();
    observeForChanges();
  });
})();