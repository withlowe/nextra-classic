// Client runtime: theme toggle, mobile menu, folder collapse, search.
// No framework — the pages are static HTML.
(function () {
  "use strict";

  var root = document.documentElement;

  // ---------------------------------------------------------------- theme
  document.querySelectorAll("[data-theme-toggle]").forEach(function (toggle) {
    function flip() {
      var dark = root.classList.contains("dark");
      root.classList.remove("light", "dark");
      root.classList.add(dark ? "light" : "dark");
      try {
        localStorage.setItem("theme", dark ? "light" : "dark");
      } catch (error) {
        /* private mode */
      }
    }
    toggle.addEventListener("click", flip);
    toggle.addEventListener("keydown", function (event) {
      if (event.key === "Enter") flip();
    });
  });

  // ------------------------------------------------------------ mobile nav
  var sidebar = document.querySelector("[data-sidebar]");
  document.querySelectorAll("[data-menu-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (!sidebar) return;
      var open = !sidebar.classList.contains("hidden");
      sidebar.classList.toggle("hidden", open);
      sidebar.classList.toggle("md:block", open);
      button.setAttribute("aria-expanded", String(!open));
    });
  });

  // -------------------------------------------------------- folder collapse
  document.querySelectorAll(".sidebar li > button").forEach(function (button) {
    button.addEventListener("click", function () {
      var panel = button.nextElementSibling;
      if (!panel) return;
      var open = panel.style.display !== "none";
      panel.style.display = open ? "none" : "initial";
      button.setAttribute("aria-expanded", String(!open));
    });
  });

  // --------------------------------------------------------------- search
  var indexNode = document.getElementById("search-index");
  var entries = [];
  try {
    entries = indexNode ? JSON.parse(indexNode.textContent || "[]") : [];
  } catch (error) {
    entries = [];
  }

  /** Substring match, ranked: title over heading, earlier over later. */
  function search(query) {
    var needle = query.trim().toLowerCase();
    if (!needle) return [];
    var hits = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var at = entry.title.toLowerCase().indexOf(needle);
      if (at === -1) continue;
      hits.push({
        title: entry.title,
        route: entry.route,
        at: at,
        rank: (entry.depth || 0) * 100 + at,
      });
    }
    hits.sort(function (a, b) {
      return a.rank - b.rank || a.title.length - b.title.length;
    });
    return hits.slice(0, 20);
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
    });
  }

  document.querySelectorAll(".nextra-search").forEach(function (container) {
    var input = container.querySelector("input");
    if (!input) return;

    var list = null;
    var overlay = null;
    var results = [];
    var active = 0;

    function close() {
      if (list) list.remove();
      if (overlay) overlay.remove();
      list = null;
      overlay = null;
    }

    function render() {
      close();
      if (!results.length) return;

      overlay = document.createElement("div");
      overlay.className = "search-overlay z-10";
      overlay.addEventListener("click", close);
      container.appendChild(overlay);

      list = document.createElement("ul");
      list.className =
        "shadow-md list-none p-0 m-0 absolute left-0 md:right-0 rounded mt-1 border top-100 divide-y z-20 w-full md:w-auto";

      results.forEach(function (hit, index) {
        var link = document.createElement("a");
        link.className = "block no-underline";
        link.href = hit.route;

        var item = document.createElement("li");
        item.className = index === active ? "p-2 active" : "p-2";
        var needle = input.value.trim();
        item.innerHTML =
          escapeHtml(hit.title.slice(0, hit.at)) +
          '<span class="highlight">' +
          escapeHtml(hit.title.substr(hit.at, needle.length)) +
          "</span>" +
          escapeHtml(hit.title.slice(hit.at + needle.length));

        item.addEventListener("mouseover", function () {
          active = index;
          paintActive();
        });

        link.appendChild(item);
        list.appendChild(link);
      });

      container.appendChild(list);
    }

    function paintActive() {
      if (!list) return;
      var items = list.querySelectorAll("li");
      for (var i = 0; i < items.length; i++) {
        items[i].className = i === active ? "p-2 active" : "p-2";
      }
    }

    function move(delta) {
      if (!results.length) return;
      active = (active + delta + results.length) % results.length;
      paintActive();
      var items = list ? list.querySelectorAll("li") : [];
      if (items[active] && items[active].scrollIntoView) {
        items[active].scrollIntoView({ block: "nearest" });
      }
    }

    input.addEventListener("input", function () {
      results = search(input.value);
      active = 0;
      render();
    });

    input.addEventListener("focus", function () {
      if (input.value) {
        results = search(input.value);
        render();
      }
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || (event.ctrlKey && event.key === "n")) {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowUp" || (event.ctrlKey && event.key === "p")) {
        event.preventDefault();
        move(-1);
      } else if (event.key === "Enter" && results[active]) {
        event.preventDefault();
        window.location.href = results[active].route;
      } else if (event.key === "Escape") {
        close();
        input.blur();
      }
    });

    input.addEventListener("blur", function () {
      // Let a click on a result land before the list disappears.
      setTimeout(close, 150);
    });
  });

  // "/" focuses search, matching the placeholder's promise.
  window.addEventListener("keydown", function (event) {
    var tag = document.activeElement
      ? document.activeElement.tagName.toLowerCase()
      : "";
    if (["input", "select", "button", "textarea"].indexOf(tag) !== -1) return;
    if (event.key === "/") {
      event.preventDefault();
      var visible = Array.prototype.filter.call(
        document.querySelectorAll(".nextra-search input"),
        function (input) {
          return input.offsetParent !== null;
        },
      );
      if (visible[0]) visible[0].focus();
    }
  });
})();
