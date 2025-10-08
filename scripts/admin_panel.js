(() => {
  const overlay = document.getElementById("adminOverlay");
  const openBtn = document.getElementById("adminPanelOpen");
  const closeBtn = document.getElementById("adminPanelClose");
  const workspace = document.getElementById("adminWorkspace");
  const storybookList = document.getElementById("storybookList");
  const statusEl = document.getElementById("adminStatus");

  if (!overlay || !openBtn || !closeBtn || !workspace || !storybookList) {
    return;
  }

  const FILE_ACTIONS = new Set(["new-storybook", "add-pages", "replace-pages"]);
  let activeAction = null;
  let storybooks = [];
  let selectedStorybook = null;

  openBtn.addEventListener("click", () => {
    overlay.hidden = false;
    overlay.dataset.open = "true";
    statusEl.textContent = "";
    fetchStorybooks();
  });

  closeBtn.addEventListener("click", hideOverlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideOverlay();
  });
  document.addEventListener("keydown", (e) => {
    if (overlay.dataset.open === "true" && e.key === "Escape") hideOverlay();
  });

  document.querySelectorAll(".admin-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeAction = btn.dataset.action;
      renderWorkspace(btn.textContent || "Action");
    });
  });

  function hideOverlay() {
    overlay.hidden = true;
    overlay.dataset.open = "false";
    workspace.innerHTML = '<p class="workspace-placeholder">Choose an action to begin.</p>';
  }

  async function fetchStorybooks() {
    try {
      const res = await fetch("http://localhost:5001/api/storybooks");
      if (!res.ok) throw new Error("Unable to load storybooks");
      storybooks = await res.json();
      renderStorybookList();
    } catch (err) {
      storybooks = [];
      renderStorybookList();
      setStatus(err.message || "Failed to fetch storybooks.", true);
    }
  }

  function renderStorybookList() {
    storybookList.innerHTML = "";
    if (!Array.isArray(storybooks) || storybooks.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No storybooks yet";
      li.setAttribute("aria-live", "polite");
      storybookList.appendChild(li);
      return;
    }
    storybooks.forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      if (name === selectedStorybook) li.classList.add("is-selected");
      li.addEventListener("click", () => selectStorybook(name));
      li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectStorybook(name);
        }
      });
      storybookList.appendChild(li);
    });
  }

  function selectStorybook(name) {
    selectedStorybook = name;
    renderStorybookList();
    if (FILE_ACTIONS.has(activeAction)) {
      // Update hidden field if present
      const picker = workspace.querySelector("select[name='storybook']");
      if (picker) picker.value = name;
    }
  }

  function renderWorkspace(actionLabel) {
    if (FILE_ACTIONS.has(activeAction)) {
      workspace.innerHTML = createUploadMarkup(actionLabel);
      const dropZone = workspace.querySelector(".drop-zone");
      const fileInput = workspace.querySelector("input[type='file']");
      const storybookSelect = workspace.querySelector("select[name='storybook']");
      const form = workspace.querySelector("form");

      if (storybookSelect && storybooks.length) {
        storybookSelect.innerHTML = storybooks.map((s) => `<option value="${s}">${s}</option>`).join("");
        if (selectedStorybook) storybookSelect.value = selectedStorybook;
        else selectStorybook(storybookSelect.value);
      }

      ;["dragenter", "dragover"].forEach((evt) => {
        dropZone.addEventListener(evt, (e) => {
          e.preventDefault();
          dropZone.classList.add("is-dragover");
        });
      });
      ;["dragleave", "drop"].forEach((evt) => {
        dropZone.addEventListener(evt, (e) => {
          if (evt === "dragleave" && e.target !== dropZone) return;
          dropZone.classList.remove("is-dragover");
        });
      });
      dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files || []).filter(isImageFile);
        if (!files.length) {
          setStatus("Only PNG or JPG files are accepted.", true);
          return;
        }
        handleUpload(form, files);
      });

      dropZone.querySelector(".drop-zone__button").addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        const files = Array.from(fileInput.files || []).filter(isImageFile);
        if (!files.length) {
          setStatus("No compatible images selected.", true);
          return;
        }
        handleUpload(form, files);
      });
    } else {
      workspace.innerHTML = `<div class="workspace-placeholder">${actionLabel} is coming soon.✨</div>`;
    }
  }

  function createUploadMarkup(actionLabel) {
    const label = actionLabel || "Upload";
    const storybookOptions = Array.isArray(storybooks)
      ? storybooks.map((s) => `<option value="${s}">${s}</option>`).join("")
      : "";

    return `
      <form class="upload-form">
        <h3>${label}</h3>
        <div class="form-grid">
          <label>
            Storybook name
            <input type="text" name="storybookOverride" placeholder="e.g. dawn_awakening" />
          </label>
          <label>
            Or pick existing
            <select name="storybook">
              ${storybookOptions}
            </select>
          </label>
          <label>
            Start page (optional)
            <input type="number" name="startPage" min="1" placeholder="1" />
          </label>
          <label class="checkbox">
            <input type="checkbox" name="normalizeHeight" checked /> Normalize height to 1024px
          </label>
        </div>
        <div class="drop-zone" tabindex="0">
          <p>Drag & drop PNG or JPG files here</p>
          <p>or</p>
          <button type="button" class="drop-zone__button">Browse files</button>
          <input type="file" accept="image/png, image/jpeg" multiple />
        </div>
      </form>
    `;
  }

  function isImageFile(file) {
    return file && /image\/(png|jpeg)/i.test(file.type);
  }

  async function handleUpload(form, files) {
    if (!form) return;

    const fd = new FormData();
    files.forEach((file) => fd.append("files", file));

    const storybookOverride = form.storybookOverride.value.trim();
    const storybookName = storybookOverride || form.storybook.value || "";
    fd.append("storybook", storybookName);
    fd.append("action", activeAction || "upload");

    const startPage = form.startPage.value ? parseInt(form.startPage.value, 10) : "";
    if (startPage) fd.append("start_page", String(startPage));
    fd.append("normalize_height", form.normalizeHeight.checked ? "true" : "false");

    setStatus("Uploading…", false, true);

    try {
      const headers = {};
      const token = localStorage.getItem("ls_admin_token");
      if (token) headers["X-Admin-Token"] = token;

      const res = await fetch("http://localhost:5001/api/upload", {
        method: "POST",
        headers,
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Upload failed (${res.status})`);
      }

      const data = await res.json().catch(() => ({}));
      const location = data?.location ? ` Saved to ${data.location}.` : "";
      setStatus(`Upload complete.${location}`, false);
      fetchStorybooks();
    } catch (err) {
      setStatus(err.message || "Upload failed.", true);
    }
  }

  function setStatus(message, isError = false, isBusy = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", !!isError);
    statusEl.classList.toggle("is-busy", !!isBusy);
  }
})();
