export class ResumeViewer {
  constructor(resumeData) {
    this.resumeData = resumeData;
    this.overlay = document.getElementById('resume-overlay');
    this.display = document.getElementById('resume-display');
    this.closeButton = document.getElementById('close-resume');
    this.viewButton = document.getElementById('view-resume-btn');
    this.themeToggle = document.getElementById('theme-toggle');
    this.content = document.getElementById('resume-content');
    this.isDarkTheme = true; // Start with dark theme
    
    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    this.viewButton.addEventListener('click', () => this.show());
    this.closeButton.addEventListener('click', () => this.hide());
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
    
    // Close on overlay click (but not content click)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('visible')) {
        this.hide();
      }
    });

    // Trap focus within overlay when open
    this.overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && this.overlay.classList.contains('visible')) {
        this.trapFocus(e);
      }
    });
  }

  trapFocus(e) {
    const focusableElements = this.overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    
    if (this.isDarkTheme) {
      this.content.classList.remove('light-theme');
      this.themeToggle.textContent = '☀';
      this.themeToggle.setAttribute('title', 'Switch to light theme');
    } else {
      this.content.classList.add('light-theme');
      this.themeToggle.textContent = '🌙';
      this.themeToggle.setAttribute('title', 'Switch to dark theme');
    }
    
    // Save preference to localStorage
    localStorage.setItem('resumeTheme', this.isDarkTheme ? 'dark' : 'light');
  }

  loadThemePreference() {
    const savedTheme = localStorage.getItem('resumeTheme');
    if (savedTheme === 'light') {
      this.isDarkTheme = false;
      this.content.classList.add('light-theme');
      this.themeToggle.textContent = '🌙';
      this.themeToggle.setAttribute('title', 'Switch to dark theme');
    }
  }

  show() {
    this.overlay.classList.add('visible');
    this.loadThemePreference(); // Load saved theme when opening
    this.closeButton.focus();
    document.body.style.overflow = 'hidden';
  }

  hide() {
    this.overlay.classList.remove('visible');
    this.viewButton.focus();
    document.body.style.overflow = '';
  }

  render() {
    const data = this.resumeData;
    
    // Support both new and old data structures
    const name = data.identity ? data.identity.name : data.name;
    const headline = data.identity ? data.identity.headline : data.title;
    const tagline = data.intro && data.intro.short ? data.intro.short : (data.tagline || '');
    const location = data.identity ? data.identity.location : '';
    
    const html = `
      <div class="resume-header">
        <h1 id="resume-title">${this.escapeHtml(name)}</h1>
        <h2>${this.escapeHtml(headline)}</h2>
        ${tagline ? `<p>${this.escapeHtml(tagline)}</p>` : ''}
        ${location ? `<p style="color: #999; font-size: 13px;">${this.escapeHtml(location)}</p>` : ''}
      </div>

      <div class="resume-section">
        <h3>About</h3>
        ${this.renderIntro(data)}
      </div>

      <div class="resume-section">
        <h3>Skills</h3>
        <div class="skills-grid">
          ${Object.entries(data.skills).map(([category, skills]) => `
            <div class="skill-category">
              <h4>${this.escapeHtml(category)}</h4>
              <ul>
                ${skills.map(skill => `<li>${this.escapeHtml(skill)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="resume-section">
        <h3>Experience</h3>
        ${data.experience.map(exp => this.renderExperience(exp)).join('')}
      </div>

      <div class="resume-section">
        <h3>Education</h3>
        ${data.education.map(edu => this.renderEducation(edu)).join('')}
      </div>

      ${data.certifications && data.certifications.length > 0 ? `
        <div class="resume-section">
          <h3>Certifications</h3>
          <ul style="padding-left: 20px;">
            ${data.certifications.map(cert => `
              <li style="margin: 8px 0;">
                <strong style="color: #00ff41;">${this.escapeHtml(cert.name)}</strong>
                ${cert.issuer ? ` - ${this.escapeHtml(cert.issuer)}` : ''}
                ${cert.year ? ` (${cert.year})` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${data.projects && data.projects.length > 0 ? `
        <div class="resume-section">
          <h3>Projects</h3>
          ${data.projects.map(proj => this.renderProject(proj)).join('')}
        </div>
      ` : ''}

      <div class="resume-section">
        <h3>Contact</h3>
        <div class="contact-info">
          <div class="contact-item">
            <strong>Email:</strong> <a href="mailto:${data.contact.email}">${this.escapeHtml(data.contact.email)}</a>
          </div>
          <div class="contact-item">
            <strong>Phone:</strong> ${this.escapeHtml(data.contact.phone)}
          </div>
          <div class="contact-item">
            <strong>Location:</strong> ${this.escapeHtml(data.contact.location)}
          </div>
          <div class="contact-item">
            <strong>Website:</strong> <a href="${data.contact.website}" target="_blank" rel="noopener">${this.escapeHtml(data.contact.website)}</a>
          </div>
          <div class="contact-item">
            <strong>LinkedIn:</strong> <a href="${data.contact.linkedin}" target="_blank" rel="noopener">View Profile</a>
          </div>
          <div class="contact-item">
            <strong>GitHub:</strong> <a href="${data.contact.github}" target="_blank" rel="noopener">View Profile</a>
          </div>
        </div>
      </div>
    `;

    this.display.innerHTML = html;
  }

  renderIntro(data) {
    if (data.intro) {
      if (data.intro.lines) {
        // New structure
        let html = data.intro.lines.map(line => `<p>${this.escapeHtml(line)}</p>`).join('');
        
        if (data.intro.values && data.intro.values.length > 0) {
          html += '<p style="margin-top: 15px;"><strong style="color: #00ff41;">Core Values:</strong></p>';
          html += '<ul style="padding-left: 20px;">';
          html += data.intro.values.map(value => `<li style="margin: 5px 0;">${this.escapeHtml(value)}</li>`).join('');
          html += '</ul>';
        }
        
        return html;
      } else if (Array.isArray(data.intro)) {
        // Old structure
        return data.intro.map(line => `<p>${this.escapeHtml(line)}</p>`).join('');
      }
    }
    return '';
  }

  renderExperience(exp) {
    const title = exp.title || exp.position;
    const location = exp.location || '';
    let period = '';
    
    if (exp.dates) {
      const startDate = exp.dates.start || '';
      const endDate = exp.dates.end || 'Present';
      period = `${startDate} - ${endDate}`;
    } else if (exp.period) {
      period = exp.period;
    }
    
    const items = exp.highlights || exp.description || [];
    
    return `
      <div class="experience-item">
        <h4>
          <span class="company">${this.escapeHtml(exp.company)}</span> - ${this.escapeHtml(title)}
        </h4>
        <div class="period">
          ${this.escapeHtml(period)}
          ${location ? ` | ${this.escapeHtml(location)}` : ''}
          ${exp.employmentType && exp.employmentType.trim() ? ` (${this.escapeHtml(exp.employmentType)})` : ''}
        </div>
        <ul>
          ${items.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  renderEducation(edu) {
    const schoolName = edu.school || edu.institution;
    const location = edu.location || '';
    let period = '';
    
    if (edu.graduationYear) {
      period = `Graduated: ${edu.graduationYear}`;
    } else if (edu.period) {
      period = edu.period;
    }
    
    return `
      <div class="education-item">
        <h4>
          <span class="institution">${this.escapeHtml(schoolName)}</span>
        </h4>
        <div class="period">${this.escapeHtml(edu.degree)}</div>
        <div class="period">
          ${this.escapeHtml(period)}
          ${location ? ` | ${this.escapeHtml(location)}` : ''}
        </div>
        ${edu.highlights && edu.highlights.length > 0 ? `
          <ul>
            ${edu.highlights.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;
  }

  renderProject(proj) {
    const stack = proj.stack || proj.tech || [];
    
    return `
      <div class="experience-item" style="margin-bottom: 20px;">
        <h4 style="color: #00ff41;">${this.escapeHtml(proj.name)}</h4>
        <p style="margin: 8px 0;">${this.escapeHtml(proj.summary || proj.description || '')}</p>
        ${stack.length > 0 ? `
          <p style="color: #999; font-size: 14px; margin: 5px 0;">
            <strong>Tech:</strong> ${stack.map(t => this.escapeHtml(t)).join(', ')}
          </p>
        ` : ''}
        ${proj.links && proj.links.length > 0 ? `
          <p style="margin: 5px 0;">
            ${proj.links.map(link => 
              link.url ? `<a href="${link.url}" target="_blank" rel="noopener">${this.escapeHtml(link.label)}</a>` : ''
            ).filter(l => l).join(' | ')}
          </p>
        ` : proj.link ? `
          <p style="margin: 5px 0;">
            <a href="${proj.link}" target="_blank" rel="noopener">View Project</a>
          </p>
        ` : ''}
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
