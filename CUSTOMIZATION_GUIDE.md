# Customization Guide

## Quick Start

All content is driven by `resume.json`. Edit this file to customize your portfolio.

## Terminal Customization

### Custom Prompt
Set your terminal prompt in the `terminal.prompt` field:

```json
{
  "terminal": {
    "prompt": "archie@workstation:~$"
  }
}
```

This will display before every command input.

### Command Aliases
Create shortcuts for common commands:

```json
{
  "terminal": {
    "aliases": {
      "pdf": "download",
      "gh": "open github",
      "li": "open linkedin"
    }
  }
}
```

Now users can type `pdf` instead of `download`, `gh` instead of `github`, etc.

### Suggested Commands
Show users which commands to try on load:

```json
{
  "terminal": {
    "suggestedCommands": [
      "intro",
      "skills",
      "experience",
      "contact"
    ]
  }
}
```

These will be displayed when the terminal first appears.

## Content Sections

### Identity
Your core information:

```json
{
  "identity": {
    "name": "Archie Crawford Jr",
    "handle": "archie",
    "headline": "Security Engineer • SIEM/Log Analysis",
    "location": "United States (open to remote)"
  }
}
```

- `name`: Full name (required)
- `handle`: Short username for terminal prompt
- `headline`: Professional title/tagline
- `location`: Where you're based

### Intro
Your bio and values:

```json
{
  "intro": {
    "short": "One-line summary for resume viewer header",
    "lines": [
      "First paragraph about your work",
      "Second paragraph about your approach"
    ],
    "values": [
      "Core value 1",
      "Core value 2",
      "Core value 3"
    ]
  }
}
```

- `short`: Tagline for resume overlay
- `lines`: Array of bio paragraphs
- `values`: Your core principles (optional)

### Skills
Categorized technical skills:

```json
{
  "skills": {
    "Security Engineering": [
      "Log collection & correlation",
      "Email security",
      "Vulnerability management"
    ],
    "SIEM / Monitoring": [
      "Splunk",
      "Elastic",
      "LogRhythm"
    ]
  }
}
```

Each category becomes a column in the resume viewer and a section in the terminal output.

### Experience
Your work history:

```json
{
  "experience": [
    {
      "company": "Moderna",
      "title": "Security Engineering",
      "location": "Atlanta, GA",
      "dates": {
        "start": "2022-12",
        "end": "2024-02"
      },
      "employmentType": "Contract",
      "highlights": [
        "Created and managed Windows Event Collector",
        "Built Splunk dashboards",
        "Managed vulnerability scanning"
      ]
    }
  ]
}
```

- Use `dates.end` for past jobs or leave blank for "Present"
- `employmentType` is optional (Full-Time, Contract, Part-Time)
- `highlights` are shown as bullet points

### Education
Academic background:

```json
{
  "education": [
    {
      "school": "Liberty University",
      "degree": "Master of Science, Cyber Security",
      "location": "Lynchburg, VA",
      "graduationYear": 2017,
      "highlights": [
        "GPA: 3.8/4.0",
        "Focus: Network Security"
      ]
    }
  ]
}
```

- `highlights` are optional

### Projects
Side projects or portfolio pieces:

```json
{
  "projects": [
    {
      "name": "3D Terminal Resume",
      "summary": "Interactive portfolio with Three.js",
      "stack": ["Three.js", "HTML/CSS", "JavaScript"],
      "links": [
        {
          "label": "Live",
          "url": "https://example.com"
        },
        {
          "label": "GitHub",
          "url": "https://github.com/user/repo"
        }
      ]
    }
  ]
}
```

- Projects show up in both terminal and resume viewer
- Links can be empty strings if not ready yet

### Certifications
Professional certifications:

```json
{
  "certifications": [
    {
      "name": "CompTIA Security+",
      "issuer": "CompTIA",
      "year": 2020
    }
  ]
}
```

- Creates a `certs` terminal command
- Shows in resume viewer

### Contact
How to reach you:

```json
{
  "contact": {
    "email": "your.email@example.com",
    "phone": "(555) 123-4567",
    "location": "City, State",
    "linkedin": "https://linkedin.com/in/yourprofile",
    "github": "https://github.com/yourusername",
    "website": "https://yoursite.com"
  }
}
```

- Links can be empty strings (`""`) if not ready
- Terminal commands `linkedin` and `github` check for URLs before opening

## Tips

### When Links Aren't Ready
Leave social links as empty strings until you're ready to share them:

```json
{
  "contact": {
    "linkedin": "",
    "github": "",
    "website": ""
  }
}
```

The terminal will show a "not configured" message instead of trying to open blank URLs.

### Testing Locally
Edit `resume.json`, then refresh the page. Changes appear immediately.

### Alias Power Users
Chain commands with aliases for shortcuts:

```json
{
  "terminal": {
    "aliases": {
      "all": "skills",
      "work": "experience",
      "edu": "education",
      "me": "intro"
    }
  }
}
```

Now users can type `me` for intro, `work` for experience, etc.

### Disable Sections
Simply don't include them in `resume.json`:
- No `projects`? Command won't appear
- No `certifications`? Command won't appear
- Commands dynamically generate based on what data exists

## Backwards Compatibility

The code supports both old and new resume.json formats:
- Old: `name`, `title`, `intro` (array)
- New: `identity`, `intro.lines`, `intro.values`

If you have an existing resume.json in the old format, it will still work!
