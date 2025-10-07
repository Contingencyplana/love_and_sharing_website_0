/* Wordless Storybook — 32-page template
   - Works with or without real images.
   - If window.STORY_PAGES is an array of 1..32 image paths, those are used.
   - Otherwise, we render gentle, colourful placeholders.
*/

(() => {
  const TOTAL_PAGES = 32;
  const pagesFromConfig = Array.isArray(window.STORY_PAGES) ? window.STORY_PAGES.filter(Boolean) : null;

  const stage = document.getElementById("stage");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const dotsWrap = document.getElementById("dots");
  const pageIndicator = document.getElementById("pageIndicator");
  const autoBtn = document.getElementById("autoBtn");

  let current = getStartIndexFromHash() ?? 0; // 0-based
  let autoTimer = null;
  let isAuto = false;

  // Build pages
  const pages = [];

  if (pagesFromConfig && pagesFromConfig.length > 0) {
    // Use provided images (pad/repeat if fewer than 32 to avoid breaking)
    for (let i = 0; i < TOTAL_PAGES; i++) {
      const src = pagesFromConfig[i] ?? pagesFromConfig[pagesFromConfig.length - 1];
      pages.push(makeImagePage(i, src));
    }
  } else {
    // Generate 32 soft placeholder pages
    for (let i = 0; i < TOTAL_PAGES; i++) {
      pages.push(makePlaceholderPage(i));
    }
  }

  // Add pages to stage
  pages.forEach(p => stage.appendChild(p));

  // Build dots
  const dots = [];
  for (let i = 0; i < TOTAL_PAGES; i++) {
    const d = document.createElement("button");
    d.className = "sb-dot";
    d.setAttribute("aria-label", `Go to page ${i+1}`);
    d.addEventListener("click", () => goTo(i));
    dots.push(d);
    dotsWrap.appendChild(d);
  }

  // Navigation handlers
  prevBtn.addEventListener("click", () => goTo((current - 1 + TOTAL_PAGES) % TOTAL_PAGES));
  nextBtn.addEventListener("click", () => goTo((current + 1) % TOTAL_PAGES));

  // Click/tap anywhere on the page area advances
  stage.addEventListener("click", (e) => {
    // Avoid advancing when clicking an interactive element (e.g., image link in the future)
    if (e.target.closest("button,a")) return;
    goTo((current + 1) % TOTAL_PAGES);
  });

  // Keyboard: Left/Right arrows, Home/End
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo((current - 1 + TOTAL_PAGES) % TOTAL_PAGES); }
    if (e.key === "ArrowRight") { e.preventDefault(); goTo((current + 1) % TOTAL_PAGES); }
    if (e.key === "Home") { e.preventDefault(); goTo(0); }
    if (e.key === "End") { e.preventDefault(); goTo(TOTAL_PAGES - 1); }
  });

  // Basic swipe
  let touchStartX = null;
  stage.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, {passive:true});
  stage.addEventListener("touchend", (e) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 30) {
      if (dx > 0) goTo((current - 1 + TOTAL_PAGES) % TOTAL_PAGES);
      else goTo((current + 1) % TOTAL_PAGES);
    }
    touchStartX = null;
  });

  // Auto-dream
  autoBtn.addEventListener("click", () => {
    isAuto = !isAuto;
    if (isAuto) startAuto();
    else stopAuto();
    autoBtn.textContent = `Auto-dream: ${isAuto ? "On" : "Off"}`;
    autoBtn.setAttribute("aria-pressed", String(isAuto));
  });

  // Hash navigation: #p=7 means page 7 (1-based)
  window.addEventListener("hashchange", () => {
    const idx = getStartIndexFromHash();
    if (typeof idx === "number") goTo(idx);
  });

  // Init
  goTo(current);
  stage.focus();

  // --- functions ---

  function goTo(idx) {
    current = clamp(idx, 0, TOTAL_PAGES - 1);
    // visible class
    pages.forEach((p, i) => {
      p.classList.toggle("is-visible", i === current);
    });
    // dots
    dots.forEach((d, i) => d.classList.toggle("is-active", i === current));
    // indicator
    pageIndicator.textContent = `${current + 1} / ${TOTAL_PAGES}`;
    // update hash (1-based)
    const newHash = `#p=${current + 1}`;
    if (location.hash !== newHash) {
      history.replaceState(null, "", newHash);
    }
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => {
      goTo((current + 1) % TOTAL_PAGES);
    }, 3500); // gentle pace
  }

  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = null;
  }

  function getStartIndexFromHash() {
    const m = location.hash.match(/p=(\d+)/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= 1 && n <= TOTAL_PAGES) return n - 1;
    return null;
    }

  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  function makeImagePage(i, src) {
    const page = document.createElement("section");
    page.className = "sb-page";
    page.setAttribute("role", "img");
    page.setAttribute("aria-label", `Page ${i+1}`);
    page.innerHTML = `
      <img class="sb-img" src="${src}" alt="Page ${i+1}" decoding="async" />
      <div class="sb-page-num">Page ${String(i+1).padStart(2,'0')}</div>
    `;
    return page;
  }

  function makePlaceholderPage(i) {
    const page = document.createElement("section");
    page.className = "sb-page";
    page.setAttribute("role", "img");
    page.setAttribute("aria-label", `Page ${i+1}`);

    // soft gradient background varies per page
    const hue = (i * 360 / TOTAL_PAGES) % 360;
    page.style.setProperty("--page-hue", hue);

    page.innerHTML = `
      <div class="sb-placeholder">
        <div class="sb-dot"></div>
        <div class="sb-label">Page ${String(i+1).padStart(2,'0')}</div>
      </div>
    `;
    return page;
  }
})();

