# Setup Notes for Archie Crawford Jr Portfolio

## ✅ What's Already Done

Your portfolio is fully functional with real resume data from `resume.json`!

## ✅ Setup Complete!

### Social Profile URLs - DONE ✓

Your contact information is fully configured:

```json
{
  "contact": {
    "email": "archie.crawford1@gmail.com",
    "phone": "7573535324",
    "location": "Atlanta, GA (open to remote)",
    "linkedin": "https://www.linkedin.com/in/archie-crawford-jr-9a71126a/",
    "github": "https://github.com/ArchieCrawford",
    "website": "https://archiecrawford.xyz"
  }
}
```

All commands work:
- ✓ `linkedin` opens your LinkedIn
- ✓ `github` opens your GitHub  
- ✓ `website` opens archiecrawford.xyz
- ✓ Links are clickable in the resume viewer

## 🔧 To Complete Your Setup

### 1. Replace the PDF

Replace `/resume.pdf` with your actual resume PDF file. Right now it's a placeholder.

Users can download it via:
- The "Download PDF" button (top right)
- The `download` terminal command
- The `pdf` alias (shortcut to `download`)

### 2. Optional: Update Projects

The resume.json includes one placeholder project (this 3D Terminal Resume). You can:

**Option A:** Add more projects
```json
{
  "projects": [
    {
      "name": "Your Project Name",
      "summary": "Brief description",
      "stack": ["Tech1", "Tech2"],
      "links": [
        {
          "label": "Live Demo",
          "url": "https://demo.com"
        },
        {
          "label": "GitHub",
          "url": "https://github.com/you/repo"
        }
      ]
    }
  ]
}
```

**Option B:** Remove projects entirely
Just delete the `projects` array from resume.json. The `projects` command will automatically disappear from the terminal.

## 🎮 Testing Your Changes

1. Edit `resume.json`
2. Refresh the page
3. Try these terminal commands:
   - `help` - See all available commands
   - `intro` - Read your bio and values
   - `skills` - View categorized skills
   - `experience` - Browse your work history
   - `education` - See your degrees
   - `certs` - View your certifications
   - `projects` - See your projects
   - `contact` - Get contact info
   - `linkedin` / `github` / `website` - Open profiles (all working!)
   - `pdf` - Download resume (alias for `download`)
4. Try the theme toggle:
   - Click "View Resume" button
   - Click ☀ (sun) icon to switch to light theme
   - Click 🌙 (moon) icon to switch back to dark theme
   - Your preference is saved automatically!

## 🎨 Customization Ideas

### Terminal Prompt
Your prompt is already set to `archie@workstation:~$`. You can change it in resume.json:

```json
{
  "terminal": {
    "prompt": "whatever-you-want $"
  }
}
```

### Add More Aliases
Shortcuts are defined here:

```json
{
  "terminal": {
    "aliases": {
      "pdf": "download",
      "linkedin": "open linkedin",
      "github": "open github",
      "gh": "open github",  // Add more like this
      "work": "experience",
      "edu": "education"
    }
  }
}
```

### Suggested Commands
When the terminal opens, it shows: "intro, skills, experience, projects, contact, download"

You can change this list:

```json
{
  "terminal": {
    "suggestedCommands": ["intro", "skills", "work", "contact"]
  }
}
```

## 📱 Mobile & Accessibility

Already built in:
- ✅ Responsive design (works on phone/tablet)
- ✅ Keyboard navigation (Tab through buttons)
- ✅ Screen reader support (ARIA labels)
- ✅ Touch-friendly UI
- ✅ ESC key closes overlays

## 🚀 Performance

Optimized for fast loading:
- ✅ No build step required
- ✅ Lightweight assets (textures only)
- ✅ Capped pixel ratio for mobile
- ✅ Single fetch for resume.json on startup
- ✅ Efficient particle system

## 📝 Documentation

See these files for more details:
- `README.md` - Full feature list
- `CUSTOMIZATION_GUIDE.md` - Detailed customization instructions
- `resume.json` - Your data (edit this!)

## 🎬 User Experience Flow

1. **Loading (1 second)** - Shows "Initializing..."
2. **Camera swoops in (3 seconds)** - Cinematic intro
3. **UI buttons appear (2 seconds in)** - Top right corner
4. **Terminal appears (3.5 seconds in)** - Ready for commands
5. **Users explore** via terminal OR click "View Resume" button

## ⚡ Ready to Launch!

Your portfolio checklist:
1. [✓] Add LinkedIn URL - DONE
2. [✓] Add GitHub URL - DONE
3. [✓] Add website URL - DONE
4. [ ] Replace resume.pdf with your actual PDF
5. [✓] Test all terminal commands - All working!
6. [✓] Theme toggle working - Both themes look great!
7. [ ] Share the link! 🎉

Almost there! Just replace the PDF and you're production-ready!

## 💡 Pro Tips

**Terminal Power User Mode:**
- Use arrow keys (↑/↓) to recall previous commands
- Press Tab to autocomplete commands
- Type `history` to see all commands you've run
- Aliases work everywhere (try `pdf` instead of `download`)

**Resume Viewer:**
- Click "View Resume" for traditional format
- All content pulls from resume.json
- Fully scrollable with smooth animations
- ESC or click X to close

**Keyboard-Only Navigation:**
- Tab through all interactive elements
- Enter to activate buttons
- ESC to close overlays
- Ctrl/Cmd + K to focus terminal

Your portfolio is production-ready! 🚀
