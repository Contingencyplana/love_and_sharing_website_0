// Simple Harbinger chapter viewer for GitHub Pages
const select = document.getElementById('chapterSelect');
const content = document.getElementById('content');

// Base path to your chapters in the repo
const BASE = '/love_and_sharing_website_0/stories/harbinger/chapters/';

async function loadChapter(file) {
  content.textContent = 'Loading…';
  try {
    const res = await fetch(BASE + file, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    // If it looks like Markdown, render; otherwise keep plain text
    // (We keep everything in .md so this will normally render via marked)
    const html = marked.parse(text);
    content.innerHTML = html || text.replace(/\n/g, '<br>');
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (err) {
    content.innerHTML = `<p>Could not load <code>${file}</code>.</p><p class="muted">${err}</p>`;
  }
}

// Load initial chapter
loadChapter(select.value);

// React to selection changes
select.addEventListener('change', () => loadChapter(select.value));
