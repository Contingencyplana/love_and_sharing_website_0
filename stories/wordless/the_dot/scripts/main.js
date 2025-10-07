/* The Dot — tiny, soothing micro-game
   - A soft background and a breathing dot in the center.
   - Click/tap comforts the dot (brief glow + chime).
   - Space toggles Calm mode (slower, softer breath).
   - F toggles fullscreen.
   - Responsive: stays perfectly centered, always square,
     and gently scales across screen sizes.
*/

(() => {
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d", { alpha: false });

  const calmBtn = document.getElementById("calmBtn");
  const fsBtn = document.getElementById("fsBtn");
  const wrap = document.querySelector(".wrap");
  const header = document.querySelector(".topbar");
  const footer = document.querySelector(".bottombar");

  // State
  let width = 0, height = 0, t0 = performance.now();
  let calm = false;
  let comfortPulse = 0; // 0..1
  let hueBase = 200;    // base color hue
  let rafId = 0;

  // Audio (tiny chime, only after user gesture)
  let audioCtx = null;
  function chime() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = 523.25; // C5
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      o.connect(g).connect(audioCtx.destination);
      o.start(now);
      o.stop(now + 0.2);
    } catch {}
  }

  // Resize canvas (always square, responsive scaling)
  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const wrapRect = wrap.getBoundingClientRect();
    const headH = header?.getBoundingClientRect().height || 0;
    const footH = footer?.getBoundingClientRect().height || 0;

    const availableW = Math.floor(wrapRect.width);
    const availableH = Math.floor(wrapRect.height - headH - footH);

    // Keep canvas perfectly square
    const side = Math.min(availableW, availableH);
    width = side;
    height = side;

    // Center the square canvas
    canvas.style.display = "block";
    canvas.style.margin = "0 auto";
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    // Retina-safe scaling
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  function draw(now) {
    const t = (now - t0) / 1000;

    // Breath speed/size
    const speed = calm ? 0.6 : 1.0;
    const breath = (Math.sin(t * speed * Math.PI * 2 / 3) + 1) * 0.5; // 0..1
    const bgHue = (hueBase + 12 * breath) % 360;

    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, `hsl(${bgHue},70%,96%)`);
    g.addColorStop(1, `hsl(${(bgHue + 24) % 360},70%,92%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    // --- Dynamic dot scaling ---
    // Smaller screens = slightly smaller dot, huge screens = slightly larger
    const scaleFactor = clamp(Math.sqrt(width * height) / 600, 0.8, 1.25);

    // Dot position and radius
    const cx = width / 2;
    const cy = height / 2;
    const baseR = Math.min(width, height) * 0.08 * scaleFactor;
    const r = lerp(baseR * 0.92, baseR * 1.08, breath) * (1 + 0.12 * comfortPulse);

    // Soft halo
    const halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.2);
    halo.addColorStop(0, `hsla(${hueBase},85%,60%,0.35)`);
    halo.addColorStop(1, `hsla(${hueBase},85%,60%,0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Core
    const core = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.05, cx, cy, r);
    core.addColorStop(0, "#fff");
    core.addColorStop(1, `hsl(${hueBase},85%,55%)`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Comfort easing
    comfortPulse = Math.max(0, comfortPulse - 0.02);

    rafId = requestAnimationFrame(draw);
  }

  // Interactions
  function comfort() {
    comfortPulse = 1;
    hueBase = (hueBase + 18) % 360;
    chime();
  }

  function toggleCalm() {
    calm = !calm;
    calmBtn.textContent = `Calm: ${calm ? "On" : "Off"}`;
    calmBtn.setAttribute("aria-pressed", String(calm));
  }

  function toggleFullscreen() {
    const target = wrap || document.documentElement;
    if (!document.fullscreenElement) {
      (target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen)?.call(target);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
    }
  }

  // Events
  window.addEventListener("resize", resize);
  document.addEventListener("fullscreenchange", resize);
  document.addEventListener("webkitfullscreenchange", resize); // Safari legacy
  window.addEventListener("orientationchange", () => setTimeout(resize, 50));

  canvas.addEventListener("click", comfort, { passive: true });
  calmBtn.addEventListener("click", toggleCalm);
  fsBtn.addEventListener("click", toggleFullscreen);

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); toggleCalm(); }
    if (e.key.toLowerCase() === "f") { toggleFullscreen(); }
    if (e.key === "Enter") { comfort(); }
  });

  // Start
  resize();
  rafId = requestAnimationFrame(draw);
})();
