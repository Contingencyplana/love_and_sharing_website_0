/* The Dot — tiny, soothing micro-game
   - A soft background and a breathing dot in the center.
   - Click/tap comforts the dot (brief glow).
   - Space toggles Calm mode (slower, softer breath).
   - F toggles fullscreen.
*/

(() => {
  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d", { alpha: false });

  const calmBtn = document.getElementById("calmBtn");
  const fsBtn = document.getElementById("fsBtn");

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

  // Resize canvas to device pixels
  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rectW = Math.floor(window.innerWidth);
    const rectH = Math.floor(window.innerHeight - 120); // leave room for header/footer
    width = rectW;
    height = Math.max(420, rectH);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
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

    // Dot
    const cx = width / 2;
    const cy = height / 2;
    const baseR = Math.min(width, height) * 0.08;
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
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
    }
  }

  // Events
  window.addEventListener("resize", resize);
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
