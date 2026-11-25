# Interactive 3D Resume Portfolio

An immersive 3D web experience featuring a stylized hacker desk environment with an interactive terminal interface for exploring resume content.

## Features

### 🎬 Cinematic 3D Scene
- Stylized 3D "hacker desk" environment built with Three.js
- Cinematic camera animation that sweeps from overview to close-up
- Atmospheric effects: floating dust particles, pulsing monitor glow, rain-streaked window
- Performance optimized for both desktop and mobile

### 💻 Interactive Terminal
- Full-featured terminal overlay with command history
- Tab completion for commands
- Arrow keys to navigate command history
- All resume data driven from `resume.json`

### 📄 Resume Commands
- `intro` - Learn about the person (shows bio and core values)
- `skills` - View technical skills by category
- `experience` - Browse work history with dates and highlights
- `education` - See educational background
- `projects` - View personal/side projects (if defined in resume.json)
- `walk` or `explore` - Leave the desk for a toy career circuit (also the **Drive the career** button). Stand up and hop into the kart, or start driving. Jobs from `resume.json` are landmarks along the road, oldest first, and driving into one opens that role. `credits` lists the 3D asset licenses. Esc, or **Back to terminal**, returns here. Reduced motion or a very low-power device gets a text list instead of the 3D scene.
- `certs` - View certifications (if defined in resume.json)
- `contact` - Get contact information
- `download` - Download resume PDF
- `linkedin` - Open LinkedIn profile
- `github` - Open GitHub profile
- `website` - Open personal website
- `help` - See all available commands (including aliases)
- `clear` - Clear terminal screen
- `history` - View command history
- `whoami` - Display user identity

### 🔗 Command Aliases
Supports custom command aliases defined in `resume.json`:
- `pdf` → `download`
- `linkedin` → `open linkedin`
- `github` → `open github`

Type any alias and it will automatically execute the target command!

### 🎨 Professional Resume Viewer
- Beautiful overlay with formatted resume content
- "View Resume" button for traditional resume view
- "Download PDF" button for easy download
- **Dark/Light theme toggle** (☀/🌙 button) with smooth transitions
- Theme preference persists using localStorage
- Fully responsive design
- Smooth animations and transitions

### ♿ Accessibility Features
- Keyboard-only navigation support
- Proper ARIA labels and roles
- Focus trap in modal dialogs
- Screen reader friendly
- ESC key to close overlays
- Tab navigation through all interactive elements

### 📱 Mobile Support
- Responsive design adapts to all screen sizes
- Touch-friendly UI elements
- Optimized performance with capped pixel ratio
- Mobile-specific layout adjustments

## File Structure

```
├── index.html          # Main HTML with styles and structure
├── main.js             # App initialization and orchestration
├── scene.js            # 3D scene setup (desk, laptop, room)
├── particles.js        # Particle system for atmospheric effects
├── camera.js           # Camera animation controller
├── terminal.js         # Terminal logic and command handling
├── resumeViewer.js     # Resume overlay component
├── config.js           # Configuration constants
├── resume.json         # Resume data (single source of truth)
├── resume.pdf          # Downloadable PDF resume
├── CREDITS.md          # Licenses for the neighborhood models
├── world/              # Lazy-loaded career circuit (physics kart, landmarks)
└── assets/world/       # Compressed glTF, sky, and ground texture
```

## Customization

### Update Resume Content
Edit `resume.json` to update all resume information. This file is fetched once on startup and drives both the terminal commands and resume viewer.

The structure supports:
- **Identity**: Name, headline, handle (for terminal prompt), location
- **Terminal config**: Custom prompt, suggested commands, command aliases
- **Intro**: Bio lines and core values
- **Skills**: Categorized technical skills
- **Experience**: Job history with dates, locations, highlights
- **Education**: Degrees with graduation years
- **Projects**: Personal/side projects with tech stack and links
- **Certifications**: Professional certifications
- **Contact**: Email, phone, social links

Example structure:
```json
{
  "identity": {
    "name": "Your Name",
    "handle": "yourhandle",
    "headline": "Your Professional Title",
    "location": "Your Location"
  },
  "terminal": {
    "prompt": "yourhandle@workstation:~$",
    "aliases": {
      "pdf": "download",
      "gh": "open github"
    }
  },
  "intro": {
    "short": "One-liner about you",
    "lines": ["Bio paragraph 1", "Bio paragraph 2"],
    "values": ["Value 1", "Value 2"]
  },
  "skills": {
    "Category 1": ["Skill 1", "Skill 2"],
    "Category 2": ["Skill 3", "Skill 4"]
  },
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "dates": { "start": "2022-01", "end": "2024-02" },
      "location": "City, State",
      "employmentType": "Full-Time",
      "highlights": ["Achievement 1", "Achievement 2"]
    }
  ]
}
```

### Replace PDF
Replace `resume.pdf` with your actual resume PDF file.

### Customize Appearance
Edit `config.js` to adjust:
- Colors and lighting
- Camera animation timing
- Particle effects
- Fog settings

## Browser Support

Works on all modern browsers that support:
- ES6 Modules
- WebGL
- CSS Grid and Flexbox

## Performance

- Optimized for fast loading
- No build step required
- Uses CDN for Three.js
- Efficient particle system
- Texture-based materials
- Capped pixel ratio for mobile

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus terminal input
- `ESC` - Close resume overlay
- `Tab` - Autocomplete terminal commands
- `↑/↓` - Navigate command history
- `Tab` - Navigate between UI elements

## License

Free to use and customize for your own portfolio.
