let overlay = null;

export function openCredits() {
  if (!overlay) overlay = buildOverlay();
  overlay.classList.add('visible');
  overlay.querySelector('button').focus();
  if (!overlay.dataset.loaded) {
    overlay.dataset.loaded = '1';
    const body = overlay.querySelector('.credits-body');
    fetch('./CREDITS.md')
      .then((response) => {
        if (!response.ok) throw new Error('missing credits');
        return response.text();
      })
      .then((text) => {
        body.textContent = text.trim();
      })
      .catch(() => {
        body.textContent = 'Asset credits could not be loaded. See CREDITS.md in the project.';
      });
  }
}

export function closeCredits() {
  overlay?.classList.remove('visible');
}

function buildOverlay() {
  const style = document.createElement('style');
  style.textContent = `
    #credits-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      z-index: 4000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    #credits-overlay.visible { display: flex; }
    #credits-card {
      width: min(720px, 100%);
      max-height: min(80vh, 760px);
      overflow: auto;
      background: #07140d;
      color: #e7ffe7;
      border: 2px solid #00ff41;
      border-radius: 10px;
      padding: 22px 22px 28px;
      box-shadow: 0 0 30px rgba(0, 255, 65, 0.25);
      font-family: 'Courier New', monospace;
    }
    #credits-card h2 { margin: 0 0 12px; color: #00ff41; font-size: 20px; }
    #credits-card .credits-body { white-space: pre-wrap; line-height: 1.45; font-size: 13px; }
    #credits-close {
      float: right;
      background: transparent;
      color: #00ff41;
      border: 2px solid #00ff41;
      border-radius: 6px;
      padding: 6px 10px;
      font-family: inherit;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'credits-overlay';
  root.innerHTML = `
    <div id="credits-card" role="dialog" aria-modal="true" aria-labelledby="credits-title">
      <button id="credits-close" type="button">Close</button>
      <h2 id="credits-title">Asset credits</h2>
      <div class="credits-body">Loading credits…</div>
    </div>
  `;
  document.body.appendChild(root);
  root.querySelector('#credits-close').addEventListener('click', closeCredits);
  root.addEventListener('click', (event) => {
    if (event.target === root) closeCredits();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('visible')) {
      event.stopPropagation();
      closeCredits();
    }
  });
  return root;
}
