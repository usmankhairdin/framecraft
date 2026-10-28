/* Framecraft: MIT mechanics adapted from Nookwell / Taskline Lite. Full notices in licenses/. */
(() => {
  "use strict";
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const desktopInput = matchMedia("(hover: hover) and (pointer: fine)");
  const menuBreakpoint = matchMedia("(min-width: 900px)");
  const main = document.getElementById("main");
  const footer = document.getElementById("site-footer");
  const toggle = document.getElementById("menu-toggle");
  const panel = document.getElementById("mobile-menu");
  const menuScroll = document.getElementById("menu-scroll");
  let viewerSmooth, viewerBar;
  let pageSmooth,
    menuSmooth,
    menuOpen = false,
    menuClosing = false;
  let menuTimer,
    menuRevision = 0,
    lockY = 0,
    locked = false,
    savedOverflow = "";
  let pageBar, menuBar;

  // All active Lenis regions share this one millisecond animation clock.
  const scrollers = new Set();
  let clock = 0;
  function tick(time) {
    for (const scroller of scrollers) scroller.raf(time);
    clock = scrollers.size ? requestAnimationFrame(tick) : 0;
  }
  function register(scroller) {
    scrollers.add(scroller);
    if (!clock) clock = requestAnimationFrame(tick);
    return scroller;
  }
  function destroy(scroller) {
    if (!scroller) return;
    scrollers.delete(scroller);
    scroller.destroy();
    if (!scrollers.size && clock) {
      cancelAnimationFrame(clock);
      clock = 0;
    }
  }
  function smoothFor(wrapper) {
    if (
      reduced.matches ||
      !desktopInput.matches ||
      typeof window.Lenis !== "function"
    )
      return;
    try {
      return register(
        new window.Lenis({
          ...(wrapper ? { wrapper, content: wrapper.firstElementChild } : {}),
          autoRaf: false,
          smoothWheel: true,
          syncTouch: false,
          lerp: 0.12,
          anchors: false,
          prevent: (node) =>
            node.closest?.(".scroll-rail") ||
            node.closest?.("textarea,input,[contenteditable=true]") ||
            (!wrapper && node.closest?.("#mobile-menu, #photo-viewer")),
        }),
      );
    } catch {
      return undefined;
    }
  }
  function configureMotion() {
    destroy(pageSmooth);
    destroy(menuSmooth);
    destroy(viewerSmooth);
    viewerSmooth = document.getElementById("photo-viewer")?.open
      ? smoothFor(document.getElementById("viewer-scroll"))
      : undefined;
    pageSmooth = smoothFor();
    menuSmooth = menuOpen ? smoothFor(menuScroll) : undefined;
    if (locked) pageSmooth?.stop();
  }
  configureMotion();
  reduced.addEventListener("change", configureMotion);
  desktopInput.addEventListener("change", configureMotion);

  function focusTarget(target) {
    if (target && !target.matches("a,button,input,textarea,summary,[tabindex]"))
      target.tabIndex = -1;
    target?.focus({ preventScroll: true });
  }
  function goTo(hash, focusAfter) {
    let target;
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return;
    }
    if (!target) return;
    if (location.hash !== hash) history.pushState(null, "", hash);
    if (pageSmooth && !reduced.matches) {
      pageSmooth.scrollTo(target, {
        duration: 0.8,
        onComplete: () => focusTarget(focusAfter || target),
      });
    } else {
      target.scrollIntoView({
        block: "start",
        behavior: reduced.matches ? "instant" : "smooth",
      });
      focusTarget(focusAfter || target);
    }
  }

  // A replacement is installed only after its geometry and handlers exist.
  function installScrollbar(region, label, host) {
    const page = region === window;
    const rail = document.createElement("div");
    rail.className = "scroll-rail" + (page ? "" : " scroll-rail--local");
    const thumb = document.createElement("div");
    thumb.className = "scroll-thumb";
    thumb.setAttribute("role", "scrollbar");
    thumb.setAttribute("aria-label", label);
    thumb.setAttribute("aria-orientation", "vertical");
    thumb.setAttribute("aria-controls", page ? "page-scroll" : region.id);
    thumb.setAttribute("aria-valuemin", "0");
    thumb.tabIndex = 0;
    rail.append(thumb);
    host.append(rail);
    let idle,
      max = 0,
      travel = 0,
      grab = 0,
      dragging = false;
    const current = () => (page ? window.scrollY : region.scrollTop);
    function activity() {
      rail.classList.add("is-active");
      clearTimeout(idle);
      idle = setTimeout(() => rail.classList.remove("is-active"), 1000);
    }
    function update() {
      const viewport = page ? innerHeight : region.clientHeight;
      const total = page
        ? Math.max(root.scrollHeight, document.body.scrollHeight)
        : region.scrollHeight;
      max = Math.max(0, total - viewport);
      rail.hidden =
        max <= 1 ||
        (page && locked) ||
        (!page &&
          (!!region.closest("[hidden]") ||
            (!!region.closest("dialog") && !region.closest("dialog").open)));
      if (rail.hidden) {
        thumb.tabIndex = -1;
        return;
      }
      thumb.tabIndex = 0;
      const track = rail.clientHeight;
      const size = Math.min(track, Math.max(28, (track * viewport) / total));
      travel = Math.max(0, track - size);
      thumb.style.height = size + "px";
      thumb.style.transform = `translateY(${max ? Math.min(1, current() / max) * travel : 0}px)`;
      thumb.setAttribute("aria-valuemax", String(Math.round(max)));
      thumb.setAttribute(
        "aria-valuenow",
        String(Math.round(Math.min(max, Math.max(0, current())))),
      );
      thumb.setAttribute(
        "aria-valuetext",
        `${max ? Math.round((current() / max) * 100) : 0}%`,
      );
    }
    function setScroll(value) {
      const next = Math.max(0, Math.min(max, value));
      const smooth = page
        ? pageSmooth
        : region.id === "menu-scroll"
          ? menuSmooth
          : viewerSmooth;
      if (smooth) smooth.scrollTo(next, { immediate: true, force: true });
      else if (page) window.scrollTo({ top: next, behavior: "instant" });
      else region.scrollTop = next;
      update();
      activity();
    }
    thumb.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      focusTarget(thumb);
      update();
      grab = event.clientY - thumb.getBoundingClientRect().top;
      dragging = true;
      rail.classList.add("is-dragging");
      thumb.setPointerCapture(event.pointerId);
      activity();
    });
    thumb.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const y = event.clientY - rail.getBoundingClientRect().top - grab;
      setScroll(travel ? (y / travel) * max : 0);
    });
    const endDrag = () => {
      dragging = false;
      rail.classList.remove("is-dragging");
      activity();
    };
    thumb.addEventListener("pointerup", endDrag);
    thumb.addEventListener("pointercancel", endDrag);
    thumb.addEventListener("lostpointercapture", endDrag);
    thumb.addEventListener("keydown", (event) => {
      const viewport = page ? innerHeight : region.clientHeight;
      const delta = {
        ArrowUp: -40,
        ArrowDown: 40,
        PageUp: -viewport * 0.85,
        PageDown: viewport * 0.85,
      };
      if (event.key in delta || event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setScroll(
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? max
              : current() + delta[event.key],
        );
      }
    });
    region.addEventListener(
      "scroll",
      () => {
        update();
        activity();
      },
      { passive: true },
    );
    window.addEventListener("resize", update, { passive: true });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(update);
      observer.observe(page ? document.body : region.firstElementChild);
    }
    update();
    (page ? root : region).classList.add(
      page ? "has-page-scrollbar" : "has-local-scrollbar",
    );
    return { update };
  }
  try {
    pageBar = installScrollbar(window, "Page scroll", document.body);
  } catch {
    root.classList.remove("has-page-scrollbar");
  }
  try {
    menuBar = installScrollbar(menuScroll, "Navigation scroll", panel);
  } catch {
    menuScroll.classList.remove("has-local-scrollbar");
  }

  function lockBackground() {
    if (locked) return;
    locked = true;
    lockY = window.scrollY;
    savedOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    pageSmooth?.stop();
    main.inert = true;
    footer.inert = true;
    pageBar?.update();
  }
  function unlockBackground() {
    root.style.overflow = savedOverflow;
    main.inert = false;
    footer.inert = false;
    locked = false;
    // No fixed-body layout substitution: native scroll position stays intact.
    if (Math.abs(window.scrollY - lockY) > 1)
      window.scrollTo({ top: lockY, behavior: "instant" });
    pageSmooth?.start();
    pageBar?.update();
  }
  function openMenu() {
    clearTimeout(menuTimer);
    ++menuRevision;
    menuOpen = true;
    menuClosing = false;
    panel.hidden = false;
    panel.inert = false;
    panel.classList.remove("is-closing");
    lockBackground();
    // Commit the offscreen start state before the reversible CSS transition.
    panel.getBoundingClientRect();
    root.classList.add("menu-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation");
    destroy(menuSmooth);
    menuSmooth = smoothFor(menuScroll);
    menuBar?.update();
    focusTarget(panel.querySelector("nav a"));
  }
  function closeMenu(after, immediate = false) {
    if (!menuOpen && !menuClosing) {
      after?.();
      return;
    }
    clearTimeout(menuTimer);
    const revision = ++menuRevision;
    menuOpen = false;
    menuClosing = true;
    panel.classList.add("is-closing");
    panel.inert = true;
    root.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
    const finish = () => {
      if (revision !== menuRevision) return;
      menuClosing = false;
      panel.hidden = true;
      panel.classList.remove("is-closing");
      destroy(menuSmooth);
      menuSmooth = undefined;
      unlockBackground();
      menuBar?.update();
      if (after) after();
      else
        focusTarget(
          toggle.offsetParent
            ? toggle
            : document.querySelector(".primary-nav a"),
        );
    };
    if (immediate || reduced.matches) finish();
    else menuTimer = setTimeout(finish, 280);
  }
  toggle.addEventListener("click", () => (menuOpen ? closeMenu() : openMenu()));
  document.addEventListener("keydown", (event) => {
    if (!menuOpen && !menuClosing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === "Tab") {
      const controls = [
        toggle,
        ...panel.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex="0"]',
        ),
      ];
      const at = controls.indexOf(document.activeElement);
      if (event.shiftKey && at <= 0) {
        event.preventDefault();
        focusTarget(controls.at(-1));
      } else if (!event.shiftKey && (at === controls.length - 1 || at < 0)) {
        event.preventDefault();
        focusTarget(toggle);
      }
    }
  });
  menuBreakpoint.addEventListener("change", () => {
    if (menuBreakpoint.matches) closeMenu(null, true);
  });
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (
      !link ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return;
    const hash = link.getAttribute("href");
    if (!hash || hash === "#") return;
    event.preventDefault();
    if (panel.contains(link)) closeMenu(() => goTo(hash));
    else goTo(hash);
  });
  // Native keyboard/drag input interrupts any in-flight eased page travel.
  document.addEventListener(
    "keydown",
    (event) => {
      if (
        locked ||
        ![
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ].includes(event.key) ||
        event.target.closest("input,textarea,button,summary,[role=scrollbar]")
      )
        return;
      pageSmooth?.scrollTo(window.scrollY, { immediate: true });
    },
    true,
  );
  toggle.hidden = false;
  root.classList.add("enhanced");

  document.querySelectorAll(".faq-item").forEach((details) => {
    const summary = details.querySelector("summary");
    const answer = details.querySelector(".faq-answer");
    if (!details.animate) return;
    let expanded = details.open,
      animation,
      revision = 0;
    function change(next) {
      const version = ++revision;
      const start = details.getBoundingClientRect().height;
      animation?.cancel();
      animation = undefined;
      expanded = next;
      details.open = true;
      details.dataset.expanded = String(next);
      details.style.height = "auto";
      const border =
        parseFloat(getComputedStyle(details).borderBottomWidth) || 0;
      const end = next
        ? details.getBoundingClientRect().height
        : summary.getBoundingClientRect().height + border;
      if (reduced.matches) {
        details.open = next;
        details.style.height = "";
        details.style.overflow = "";
        return;
      }
      details.style.height = start + "px";
      details.style.overflow = "hidden";
      animation = details.animate(
        [{ height: start + "px" }, { height: end + "px" }],
        {
          duration: Math.min(240, 180 + Math.abs(end - start) * 0.15),
          easing: "cubic-bezier(.22,.61,.36,1)",
          fill: "both",
        },
      );
      animation.onfinish = () => {
        if (version !== revision) return;
        details.open = expanded;
        details.style.height = "";
        details.style.overflow = "";
        animation?.cancel();
        animation = undefined;
      };
    }
    summary.addEventListener("click", (event) => {
      event.preventDefault();
      change(!expanded);
    });
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => {
        if (animation) change(expanded);
      });
      observer.observe(answer);
      observer.observe(summary);
    }
    reduced.addEventListener("change", () => {
      if (animation) change(expanded);
    });
  });
  document.fonts?.ready.then(() => {
    pageBar?.update();
    menuBar?.update();
  });
  // Deep links work after fonts/layout settle, without a decorative entrance.
  window.addEventListener("load", () => {
    if (location.hash && location.hash !== "#top") {
      let target;
      try {
        target = document.getElementById(
          decodeURIComponent(location.hash.slice(1)),
        );
      } catch {
        return;
      }
      if (target) {
        if (pageSmooth) pageSmooth.scrollTo(target, { immediate: true });
        else target.scrollIntoView({ block: "start", behavior: "instant" });
      }
    }
  });

  // Illustrative photographs. These are not represented as studio commissions.
  const photographs = {
    garden: {
      title: "Modern volumes",
      category: "Architecture",
      image: "assets/img/garden-house.jpg",
      alt: "White and charcoal geometric house under a blue sky",
      caption: "A study of proportion, glazing and strong horizontal lines.",
      credit: "Illustrative stock photograph · Pexels image 323780.",
    },
    ceramics: {
      title: "A study in ceramics",
      category: "Objects",
      image: "assets/img/ceramic-study.jpg",
      alt: "White ceramic vessels against a textured dark background on blue fabric",
      caption:
        "An arrangement of sculptural forms with deliberate space around each object.",
      credit:
        "Illustrative stock photograph · Valentin Ivantsov / Pexels image 34902344.",
    },
    kitchen: {
      title: "Light through the room",
      category: "Interiors",
      image: "assets/img/window-room.jpg",
      alt: "Unoccupied bright kitchen with sheer curtains, wood flooring and brick backsplash",
      caption:
        "Soft daylight, open space and a quiet transition between materials.",
      credit:
        "Illustrative stock photograph · Max Vakhtbovych / Pexels image 7587365.",
    },
    facade: {
      title: "The rhythm of windows",
      category: "Architecture",
      image: "assets/img/white-facade.jpg",
      alt: "White urban building with a repeated pattern of small windows",
      caption:
        "A low viewpoint emphasizes the facade's repetition and the meeting of volumes.",
      credit:
        "Illustrative stock photograph · Elina Volkova / Pexels image 25186381.",
    },
    headphones: {
      title: "Form in focus",
      category: "Objects",
      image: "assets/img/headphone-study.jpg",
      alt: "Black over-ear headphones on a neutral light surface",
      caption:
        "An isolated product frame that keeps construction, texture and silhouette in view.",
      credit:
        "Illustrative stock photograph · Vladislav Anchuk / Pexels image 30428610. No brand endorsement is implied.",
    },
    living: {
      title: "The everyday interior",
      category: "Interiors",
      image: "assets/img/living-space.jpg",
      alt: "Empty living room with sofa, rug, dining area and open kitchen",
      caption:
        "A wider frame connects the living and dining spaces rather than treating them as separate details.",
      credit: "Illustrative stock photograph · Pexels image 1643383.",
    },
  };
  const photoKeys = Object.keys(photographs);
  const visibleKeys = () => {
    const category = document.querySelector(
      'input[name="category"]:checked',
    ).value;
    return photoKeys.filter(
      (key) => category === "all" || photographs[key].category === category,
    );
  };
  document.querySelectorAll('input[name="category"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      document.querySelectorAll("[data-category]").forEach((frame) => {
        frame.hidden =
          radio.value !== "all" && frame.dataset.category !== radio.value;
      });
      const count = visibleKeys().length;
      document.getElementById("filter-status").textContent =
        `Showing ${count} ${radio.value === "all" ? "photographs" : radio.value.toLowerCase() + " photographs"}`;
      pageBar?.update();
    });
  });
  const form = document.getElementById("enquiry-form");
  const output = document.getElementById("draft-output");
  const draftText = document.getElementById("draft-text");
  const status = document.getElementById("draft-status");
  const notes = document.getElementById("project-notes");
  let reference,
    prepared = "";
  function clearDraft() {
    prepared = "";
    output.hidden = true;
    status.textContent = "";
    pageBar?.update();
  }
  function fitNotes() {
    notes.style.minHeight = "145px";
    notes.style.height = "auto";
    const height = Math.max(145, notes.scrollHeight + 2);
    notes.style.height = height + "px";
    notes.style.minHeight = height + "px";
  }
  function setReference(key) {
    const photo = photographs[key];
    reference = photo ? key : undefined;
    const image = document.getElementById("reference-image");
    image.hidden = !photo;
    document.getElementById("clear-reference").hidden = !photo;
    document.getElementById("reference-title").textContent = photo
      ? photo.title
      : "No frame selected yet.";
    document.getElementById("reference-description").textContent = photo
      ? `${photo.category} reference. An image direction to discuss, not a commission request.`
      : "Choose any photograph from the contact sheet, or start with your own idea.";
    if (photo) {
      image.src = photo.image;
      image.alt = "Selected reference: " + photo.alt;
      form
        .querySelectorAll('input[name="subject"]')
        .forEach((radio) => (radio.checked = radio.value === photo.category));
    }
    clearDraft();
  }
  document.querySelectorAll("[data-select]").forEach((button) => {
    button.disabled = false;
    button.addEventListener("click", () => {
      setReference(button.dataset.select);
      goTo("#enquiry", document.getElementById("project-name"));
    });
  });
  document.getElementById("clear-reference").addEventListener("click", () => {
    setReference();
    focusTarget(document.querySelector(".reference-panel a"));
  });

  const viewer = document.getElementById("photo-viewer");
  const viewerScroll = document.getElementById("viewer-scroll");
  const viewerImage = document.getElementById("viewer-image");
  let activeKey,
    viewerKeys = photoKeys,
    returnFocus,
    afterClose,
    closing = false,
    viewerAnimation,
    viewerRevision = 0;
  function renderPhoto(key) {
    const photo = photographs[key];
    if (!photo) return;
    activeKey = key;
    document.getElementById("viewer-title").textContent = photo.title;
    document.getElementById("viewer-category").textContent = photo.category;
    document.getElementById("viewer-caption").textContent = photo.caption;
    document.getElementById("viewer-credit").textContent = photo.credit;
    document.getElementById("viewer-position").textContent =
      `${viewerKeys.indexOf(key) + 1} of ${viewerKeys.length} photographs`;
    viewerImage.src = photo.image;
    viewerImage.alt = photo.alt;
    viewerScroll.scrollTop = 0;
    viewerSmooth?.scrollTo(0, { immediate: true, force: true });
    viewerBar?.update();
  }
  function openViewer(key, trigger) {
    if (!photographs[key]) return;
    ++viewerRevision;
    viewerAnimation?.cancel();
    closing = false;
    afterClose = undefined;
    returnFocus = trigger;
    const current = visibleKeys();
    viewerKeys = current.includes(key) ? current : photoKeys;
    renderPhoto(key);
    if (!viewer.open) viewer.showModal();
    lockBackground();
    destroy(viewerSmooth);
    viewerSmooth = smoothFor(viewerScroll);
    if (!viewerBar)
      viewerBar = installScrollbar(
        viewerScroll,
        "Photograph viewer scroll",
        viewer,
      );
    viewerBar.update();
    focusTarget(document.getElementById("viewer-close"));
    if (!reduced.matches && viewer.animate)
      viewerAnimation = viewer.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 180,
        easing: "ease-out",
      });
  }
  function closeViewer(after) {
    if (!viewer.open || closing) return;
    const revision = ++viewerRevision;
    closing = true;
    afterClose = typeof after === "function" ? after : undefined;
    viewerAnimation?.cancel();
    if (reduced.matches || !viewer.animate) viewer.close();
    else {
      viewerAnimation = viewer.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 160,
        easing: "ease-out",
      });
      viewerAnimation.onfinish = () => {
        if (revision === viewerRevision) viewer.close();
      };
    }
  }
  if (typeof viewer.showModal === "function") {
    document.querySelectorAll("[data-photo]").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        openViewer(link.dataset.photo, link);
      });
    });
    document
      .getElementById("viewer-close")
      .addEventListener("click", closeViewer);
    viewer.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeViewer();
    });
    viewer.addEventListener("close", () => {
      ++viewerRevision;
      viewerAnimation?.cancel();
      destroy(viewerSmooth);
      viewerSmooth = undefined;
      closing = false;
      unlockBackground();
      viewerBar?.update();
      const after = afterClose;
      afterClose = undefined;
      if (after) after();
      else focusTarget(returnFocus);
    });
    viewer.addEventListener("click", (event) => {
      if (event.target !== viewer) return;
      const rect = viewer.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        closeViewer();
    });
    const previous = () =>
      renderPhoto(
        viewerKeys[
          (viewerKeys.indexOf(activeKey) - 1 + viewerKeys.length) %
            viewerKeys.length
        ],
      );
    const next = () =>
      renderPhoto(
        viewerKeys[(viewerKeys.indexOf(activeKey) + 1) % viewerKeys.length],
      );
    document.getElementById("viewer-prev").addEventListener("click", previous);
    document.getElementById("viewer-next").addEventListener("click", next);
    viewer.addEventListener("keydown", (event) => {
      if (event.target.closest('input,textarea,[role="scrollbar"]')) return;
      const actions = {
        ArrowLeft: previous,
        ArrowRight: next,
        Home: () => renderPhoto(viewerKeys[0]),
        End: () => renderPhoto(viewerKeys.at(-1)),
      };
      if (actions[event.key]) {
        event.preventDefault();
        actions[event.key]();
      }
    });
    document
      .getElementById("viewer-reference")
      .addEventListener("click", () => {
        setReference(activeKey);
        closeViewer(() =>
          goTo("#enquiry", document.getElementById("project-name")),
        );
      });
    viewerImage.addEventListener("load", () => {
      viewerSmooth?.resize();
      viewerBar?.update();
    });
    reduced.addEventListener("change", () => {
      if (!reduced.matches) return;
      viewerAnimation?.cancel();
      if (closing && viewer.open) viewer.close();
    });
  }
  form.addEventListener("input", clearDraft);
  form.addEventListener("change", clearDraft);
  notes.addEventListener("input", fitNotes);
  window.addEventListener("resize", fitNotes, { passive: true });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const uses = data.getAll("usage");
    prepared = [
      "FRAMECRAFT — UNSENT PHOTOGRAPHY ENQUIRY",
      "",
      `Working title: ${data.get("project").trim()}`,
      `Subject: ${data.get("subject")}`,
      `Intended image use: ${uses.length ? uses.join(", ") : "To discuss"}`,
      `Visual reference: ${reference ? photographs[reference].title + " / " + photographs[reference].category : "No reference selected"}`,
      `Project notes: ${data.get("notes").trim() || "None added"}`,
      "",
      "This is an unsent brief, not a quote or booking.",
      "Agree the scope, availability, usage rights, deliverables and fee directly with your photographer.",
    ].join("\n");
    draftText.textContent = prepared;
    output.hidden = false;
    status.textContent =
      "Draft created on this page. Nothing has been sent or stored.";
    pageBar?.update();
    focusTarget(document.getElementById("draft-heading"));
    if (pageSmooth) pageSmooth.scrollTo(output, { duration: 0.6 });
    else
      output.scrollIntoView({
        block: "nearest",
        behavior: reduced.matches ? "instant" : "smooth",
      });
  });
  form.addEventListener("reset", () => {
    setReference();
    clearDraft();
    setTimeout(fitNotes, 0);
  });
  document.getElementById("download-draft").addEventListener("click", () => {
    if (!prepared) return;
    const url = URL.createObjectURL(
      new Blob([prepared], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "framecraft-unsent-project-brief.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "Draft download requested. No message has been sent.";
  });
  document.getElementById("year").textContent = new Date().getFullYear();
  form.querySelector('button[type="submit"]').disabled = false;
  notes.style.overflow = "hidden";
  fitNotes();
})();
