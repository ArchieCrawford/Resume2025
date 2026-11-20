import { sortExperienceChronologically, formatPanelDates } from './places.js';

let root = null;
let onClose = null;
let onTry3d = null;

export function showFallback(resume, options = {}) {
  onClose = options.onClose || null;
  onTry3d = options.onTry3d || null;
  if (!root) root = build(resume, options.reason || '');
  else if (options.reason) {
    const reason = root.querySelector('.fallback-reason');
    if (reason) reason.textContent = options.reason;
  }
  root.classList.add('visible');
  root.querySelector('button').focus();
}

export function hideFallback() {
  root?.classList.remove('visible');
}

function build(resume, reason) {
  ensureStyle();
  const jobs = sortExperienceChronologically(resume.experience || []);
  const jobHtml = jobs.map((job) => cardForJob(job)).join('');
  const education = (resume.education || []).map((edu) => `
    <li><strong>${esc(edu.school || edu.institution || '')}</strong> — ${esc(edu.degree || '')}
      ${edu.graduationYear ? ` (${esc(edu.graduationYear)})` : ''}
      ${edu.location ? `, ${esc(edu.location)}` : ''}</li>
  `).join('');
  const certs = (resume.certifications || []).map((cert) => `
    <li>${esc(cert.name)}${cert.issuer ? ` (${esc(cert.issuer)})` : ''}</li>
  `).join('');
  const contact = resume.contact || {};

  const el = document.createElement('div');
  el.id = 'career-fallback';
  el.innerHTML = `
    <div class="fallback-card" role="document" aria-labelledby="fallback-title">
      <div class="fallback-bar">
        <button type="button" id="fallback-back">Back to terminal</button>
        <button type="button" id="fallback-try3d">Try the 3D neighborhood</button>
      </div>
      <h1 id="fallback-title">${esc(resume.identity?.name || 'Career')} — text neighborhood</h1>
      <p class="fallback-reason">${esc(reason)}</p>
      <p>The same jobs as the walkable street, oldest first. This view does not start a 3D scene.</p>
      <h2>Experience</h2>
      ${jobHtml || '<p>No experience listed.</p>'}
      <h2>Education</h2>
      <ul>${education || '<li>None listed.</li>'}</ul>
      <h2>Certifications</h2>
      <ul>${certs || '<li>None listed.</li>'}</ul>
      <h2>Contact</h2>
      <ul>
        ${contact.email ? `<li>Email: <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></li>` : ''}
        ${contact.phone ? `<li>Phone: ${esc(contact.phone)}</li>` : ''}
        ${contact.location ? `<li>Location: ${esc(contact.location)}</li>` : ''}
        ${contact.linkedin ? `<li><a href="${esc(contact.linkedin)}">LinkedIn</a></li>` : ''}
        ${contact.github ? `<li><a href="${esc(contact.github)}">GitHub</a></li>` : ''}
        ${contact.website ? `<li><a href="${esc(contact.website)}">Website</a></li>` : ''}
      </ul>
    </div>
  `;
  document.body.appendChild(el);
  el.querySelector('#fallback-back').addEventListener('click', () => onClose?.());
  el.querySelector('#fallback-try3d').addEventListener('click', () => onTry3d?.());
  return el;
}

function cardForJob(job) {
  const dates = formatPanelDates(job.dates || {});
  const highlights = (job.highlights || job.description || [])
    .map((item) => `<li>${esc(item)}</li>`)
    .join('');
  return `
    <article class="fallback-job">
      <h3>${esc(job.company || '')}</h3>
      <p><strong>${esc(job.title || job.position || '')}</strong></p>
      <p>${esc(dates)}${job.location ? ` · ${esc(job.location)}` : ''}${job.employmentType ? ` · ${esc(job.employmentType)}` : ''}</p>
      <ul>${highlights}</ul>
    </article>
  `;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function ensureStyle() {
  if (document.getElementById('career-fallback-style')) return;
  const style = document.createElement('style');
  style.id = 'career-fallback-style';
  style.textContent = `
    #career-fallback {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 2800;
      overflow: auto;
      background: #06110c;
      color: #e7ffe7;
      font-family: 'Courier New', monospace;
    }
    #career-fallback.visible { display: block; }
    .fallback-card { max-width: 860px; margin: 0 auto; padding: 24px 20px 64px; }
    .fallback-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .fallback-bar button, #career-fallback a {
      background: transparent;
      color: #00ff41;
      border: 2px solid #00ff41;
      border-radius: 6px;
      padding: 8px 12px;
      font-family: inherit;
      cursor: pointer;
    }
    #career-fallback h1 { color: #00ff41; font-size: 24px; margin: 0 0 8px; }
    #career-fallback h2 { color: #00ff41; font-size: 18px; border-bottom: 1px solid #00ff41; padding-bottom: 4px; }
    #career-fallback h3 { margin-bottom: 4px; }
    .fallback-reason { color: #b7e7c2; }
    .fallback-job { border-left: 3px solid #00ff41; padding-left: 14px; margin: 16px 0; }
    #career-fallback a { border: none; padding: 0; text-decoration: underline; }
  `;
  document.head.appendChild(style);
}
