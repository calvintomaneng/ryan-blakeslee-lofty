// Global JS
(() => {
  const d = document;

  const isDesktop = () =>
    typeof matchMedia !== "undefined" &&
    matchMedia("(hover:hover) and (pointer:fine)").matches;

  const normalizePath = (path) =>
    ("/" + (path || "").replace(/^\/+|\/+$/g, "")).replace(/\/+/g, "/");

  let activeDropdown = null;
  let closeTimer = 0;
  let observer;
  let observerTimer;
  let pointer = { x: -1, y: -1 };
  const hoverPadding = 80;

  function fixTextContent() {
    d.querySelectorAll("p.copyright-p, p.cr").forEach((el) => {
      let text = el.textContent || "";
      if (!text) return;

      text = text
        .replace(/Powered by\s*Lofty\s*Inc\./gi, "RYAN+BLAKESLEE")
        .replace(/Copyright/gi, "©");

      if (el.textContent !== text) {
        el.textContent = text;
      }
    });

    d.querySelectorAll("a, p").forEach((el) => {
      let text = el.textContent || "";
      if (!text || !text.includes("+1(")) return;

      text = text.replace(
        /\+1\((\d{3})\)\s*(\d{3})-(\d{4})/g,
        "+1 ($1) $2-$3"
      );

      if (el.textContent !== text) {
        el.textContent = text;
      }
    });
  }

  function fixPrivacyTermsTarget() {
    d.querySelectorAll('a[href="/site/privacy-terms"]').forEach((a) => {
      if (a.getAttribute("target") === "_blank") {
        a.setAttribute("target", "_self");
      }
    });
  }

  function markParentMenuLinks() {
    d.querySelectorAll("li.menu-item.has-child > a.has-child-a").forEach((a) => {
      if (a.dataset.nn) return;

      a.dataset.nn = "1";
      a.setAttribute("role", "button");
    });
  }

  function addParentClickGuard() {
    if (window.__rbGuard) return;
    window.__rbGuard = 1;

    d.addEventListener(
      "click",
      (e) => {
        if (!isDesktop()) return;

        const link =
          e.target &&
          e.target.closest &&
          e.target.closest('a[data-nn="1"]');

        if (link) {
          e.preventDefault();
        }
      },
      true
    );
  }

  function injectSubmenuActiveCSS() {
    if (d.getElementById("rbSubCSS")) return;

    const style = d.createElement("style");
    style.id = "rbSubCSS";
    style.textContent = `
      .header-container .submenu a.rbA {
        color: var(--header-hovercolor, #2FC7C3) !important;
      }

      .header-container .menu-item.has-child.rbP > a {
        color: var(--header-hovercolor, #2FC7C3) !important;
      }
    `;
    d.head.appendChild(style);
  }

  function markActiveSubmenuLink() {
    injectSubmenuActiveCSS();

    const currentPath = normalizePath(location.pathname);

    d.querySelectorAll(".header-container .submenu a.rbA").forEach((a) => {
      a.classList.remove("rbA");
    });

    d.querySelectorAll(".header-container .menu-item.has-child.rbP").forEach(
      (li) => {
        li.classList.remove("rbP");
      }
    );

    d.querySelectorAll(".header-container .submenu a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || /^(https?:|mailto:|tel:)/i.test(href)) return;

      const linkPath = normalizePath(href.split("?")[0].split("#")[0]);

      if (linkPath === currentPath) {
        a.classList.add("rbA");

        const parent = a.closest(".menu-item.has-child");
        if (parent) {
          parent.classList.add("rbP");
        }
      }
    });
  }

  function injectDropdownCSS() {
    if (d.getElementById("rbDDCSS")) return;

    const style = d.createElement("style");
    style.id = "rbDDCSS";
    style.textContent = `
      .header-container .menu-item.has-child > .wrapper {
        display: block !important;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        pointer-events: none;
        transition:
          opacity 0.28s ease,
          transform 0.28s ease,
          visibility 0s linear 0.28s;
      }

      .header-container .menu-item.has-child.is-open > .wrapper {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
        pointer-events: auto;
        transition:
          opacity 0.28s ease,
          transform 0.28s ease,
          visibility 0s;
      }
    `;
    d.head.appendChild(style);
  }

  function openDropdown(li) {
    if (activeDropdown && activeDropdown !== li) {
      activeDropdown.classList.remove("is-open");
    }

    activeDropdown = li;
    li.classList.add("is-open");
    clearTimeout(closeTimer);
  }

  function closeDropdown() {
    if (!activeDropdown) return;

    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (activeDropdown) {
        activeDropdown.classList.remove("is-open");
        activeDropdown = null;
      }
    }, 160);
  }

  function isInsideDropdownArea(li, x, y) {
    let rect = li.getBoundingClientRect();

    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom + hoverPadding
    ) {
      return true;
    }

    const wrapper =
      li.classList.contains("is-open") && li.querySelector(":scope > .wrapper");

    if (!wrapper) return false;

    rect = wrapper.getBoundingClientRect();

    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }

  function initDropdownHover() {
    injectDropdownCSS();

    d.querySelectorAll(
      ".header-container .left-menu > .menu-item.has-child, .header-container .right-menu > .menu-item.has-child"
    ).forEach((li) => {
      if (li.dataset.rbdd) return;
      li.dataset.rbdd = "1";

      const link = li.querySelector(":scope > a");
      if (link) {
        li.style.paddingLeft = "0";
        li.style.paddingRight = "0";

        link.style.display = "flex";
        link.style.alignItems = "center";
        link.style.width = "100%";
        link.style.paddingLeft = "40px";
        link.style.paddingRight = "40px";
      }

      li.addEventListener("pointerenter", () => openDropdown(li));

      const wrapper = li.querySelector(":scope > .wrapper");
      if (wrapper) {
        wrapper.addEventListener("pointerenter", () => openDropdown(li));
      }
    });

    if (window.__rbDDOnce) return;
    window.__rbDDOnce = 1;

    d.addEventListener(
      "pointermove",
      (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;

        if (!activeDropdown) return;

        if (isInsideDropdownArea(activeDropdown, pointer.x, pointer.y)) {
          openDropdown(activeDropdown);
        } else {
          closeDropdown();
        }
      },
      { passive: true }
    );

    d.addEventListener(
      "pointerdown",
      () => {
        if (
          activeDropdown &&
          !isInsideDropdownArea(activeDropdown, pointer.x, pointer.y)
        ) {
          closeDropdown();
        }
      },
      { passive: true }
    );
  }

  function run() {
    try {
      fixTextContent();
    } catch (e) {}

    try {
      fixPrivacyTermsTarget();
    } catch (e) {}

    try {
      markParentMenuLinks();
    } catch (e) {}

    try {
      addParentClickGuard();
    } catch (e) {}

    try {
      markActiveSubmenuLink();
    } catch (e) {}

    try {
      initDropdownHover();
    } catch (e) {}
  }

  function armObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(() => {
      run();

      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        if (observer) observer.disconnect();
      }, 2000);
    });

    observer.observe(d.documentElement, {
      childList: true,
      subtree: true,
    });

    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      if (observer) observer.disconnect();
    }, 2000);
  }

  run();
  armObserver();

  addEventListener("pageshow", armObserver, { passive: true });

  d.addEventListener(
    "visibilitychange",
    () => {
      if (!d.hidden) armObserver();
    },
    { passive: true }
  );

  addEventListener("popstate", () => {
    try {
      markActiveSubmenuLink();
    } catch (e) {}
  });
})();
