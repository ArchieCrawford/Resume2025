# Changelog

## Latest Updates

### ✨ New Features Added

#### Theme Toggle (Latest)
- **Dark/Light theme toggle** for resume viewer
- Click ☀ (sun icon) to switch to light theme
- Click 🌙 (moon icon) to switch back to dark theme
- Theme preference persists using localStorage
- Smooth color transitions between themes
- Light theme uses green color scheme matching the hacker aesthetic
- Mobile responsive with proper button sizing

#### Contact Information Updated
- ✅ Email: archie.crawford1@gmail.com
- ✅ Phone: 7573535324
- ✅ Location: Atlanta, GA (open to remote)
- ✅ LinkedIn: https://www.linkedin.com/in/archie-crawford-jr-9a71126a/
- ✅ GitHub: https://github.com/ArchieCrawford
- ✅ Website: https://archiecrawford.xyz

#### New Terminal Commands
- `website` - Opens archiecrawford.xyz in new tab
- All social commands (`linkedin`, `github`, `website`) now fully functional
- Commands check for URLs before opening (graceful error handling)

### 🎨 Theme System Details

#### Dark Theme (Default)
- Background: Deep dark blue (#0a0a15)
- Primary color: Matrix green (#00ff41)
- Secondary: Lighter green (#66cc88)
- Text: Light gray (#e0e0e0)
- Borders: Glowing green with shadow effects

#### Light Theme
- Background: Clean white (#ffffff)
- Primary color: Forest green (#2d5016)
- Secondary: Olive green (#4a7c2e)
- Text: Dark gray/black (#1a1a1a)
- Borders: Subtle green with soft shadows

Both themes maintain the hacker/terminal aesthetic while providing comfortable reading options.

### 🔧 Technical Implementation

#### localStorage Integration
```javascript
// Theme preference saved on toggle
localStorage.setItem('resumeTheme', 'dark' or 'light');

// Loads automatically when opening resume viewer
loadThemePreference();
```

#### CSS Transitions
All color properties transition smoothly (0.3s ease):
- Background colors
- Text colors
- Border colors
- Box shadows

#### Accessibility
- Theme toggle button has proper ARIA labels
- Focus states work in both themes
- High contrast maintained in both themes
- Keyboard navigation fully supported

### 📱 Responsive Design

Theme toggle adapts on mobile:
- Smaller button size (32px vs 36px)
- Proper spacing from close button
- Touch-friendly hit areas
- Extra top padding on resume content

### 🎯 User Experience Flow

1. User clicks "View Resume" button
2. Resume overlay opens (loads saved theme preference)
3. User can toggle between dark/light themes
4. Preference saves automatically
5. Next visit remembers their choice

### 🚀 What's Working Now

- ✅ Real resume data from Archie Crawford Jr
- ✅ All 9 work experiences rendered
- ✅ Skills across 6 categories
- ✅ Education: 2 degrees
- ✅ Certifications displayed
- ✅ Projects section
- ✅ Contact with all URLs working
- ✅ Terminal with 15+ commands
- ✅ Command aliases (pdf, linkedin, github)
- ✅ Dark/Light theme toggle
- ✅ Theme persistence
- ✅ Mobile responsive throughout
- ✅ Keyboard navigation
- ✅ Screen reader support

### 📝 Remaining Tasks

- [ ] Replace `/resume.pdf` with actual PDF file

That's the only thing left! Everything else is production-ready.

## Future Enhancement Ideas

- Add print styles for resume viewer
- Add "Copy to Clipboard" for contact info
- Add email obfuscation for spam protection
- Add social share buttons
- Add analytics tracking
- Add command autocomplete hints
- Add command suggestions based on history
- Add easter eggs in terminal
- Add ASCII art for intro command
- Add typing animation for command output
