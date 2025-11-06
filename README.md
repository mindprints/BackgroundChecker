# Museum of Artificial Intelligence - Background Checker

A comprehensive tool for testing background images, card layouts, and responsive design for the Museum of Artificial Intelligence exhibition platform. This application allows you to experiment with different backgrounds, generate dynamic content, test mobile responsiveness, and optimize visual readability.

## 🌟 Features

### Background Management
- **Preset Backgrounds**: 10+ curated AI-themed gradient backgrounds
- **Image Upload**: Drag & drop or browse to upload custom images (AVIF, WebP, JPG, PNG, GIF, BMP, SVG)
- **Background Controls**:
  - Fit modes: cover, contain, auto
  - Position selector: 9 positioning options
  - Repeat toggle for background patterns
  - Overlay darkness control (0-95%)
  - Blur effect (0-12px)

### Dynamic Card System
- **AI-Themed Card Generation**: Generate 1-12 cards with relevant AI content
- **Custom Color Picker**: Universal card background color customization
- **Smart Text Selection**: Automatic white/black text selection for optimal contrast
- **Card Opacity**: Dynamic transparency with linked blur effects
- **Responsive Layout**: Auto-fit grid that adapts to screen size

### Device Testing
- **Multiple Viewport Sizes**:
  - Fluid (100% responsive)
  - Mobile Portrait (390×844)
  - Mobile Landscape (844×390)
  - Tablet (820×1180)
  - Desktop (1440×900)
- **Rotation Support**: Mobile and tablet viewports can be rotated
- **Automatic Layout**: Single column on mobile, multi-column on larger screens

### Visual Enhancement
- **Dark/Light Mode**: Toggle between dark and light interface themes
- **Contrast Meter**: WCAG AA/AAA compliance checking for text readability
- **Backdrop Effects**: Optional blur and transparency effects
- **CSS Export**: Generate production-ready CSS snippets

### Export Capabilities
- **CSS Snippets**: Copy background CSS with one click
- **JSON Configuration**: Export complete state configuration
- **PNG Export**: Generate high-quality preview images
- **Local Storage**: Automatic state persistence across sessions

## 🎮 How to Use

### Getting Started
1. **Open the application** in your web browser
2. **Upload background images** via drag & drop or the "Upload" button
3. **Select from presets** using the thumbnail chooser at the bottom
4. **Generate cards** using the "Cards" control and "Random" button

### Background Controls
- **Fit**: Choose how background images scale (cover, contain, or auto)
- **Position**: Set background alignment (9 positions available)
- **Repeat**: Enable background pattern repetition
- **Overlay**: Adjust darkness overlay (0-95%) for text readability
- **Blur**: Add blur effect to background (0-12px)

### Card Customization
- **Color Picker**: Click the color square to choose card background color
- **Card Count**: Set number of cards to generate (1-12)
- **Random**: Generate new AI-themed cards with random content
- **Opacity**: Adjust card transparency (0-100%)

### Device Testing
- **Device Selector**: Choose viewport size for testing
- **Rotation**: Rotate mobile/tablet viewports for orientation testing
- **Responsive Grid**: Automatically adapts card layout to screen size

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←/→` | Previous/next background |
| `1-9` | Select thumbnail by number |
| `F` | Favorite current background |
| `C` | Toggle A/B compare mode |
| `H` | Hide/show header and thumbnails |
| `U` | Toggle header visibility |
| `T` | Toggle thumbnail visibility |
| `Y` | Copy CSS snippet to clipboard |
| `J` | Export JSON configuration |
| `P` | Export PNG preview |
| `M` | Toggle contrast meter |
| `D` | Toggle dark mode |
| `S` | Save current state to localStorage |
| `?` or `/` | Show/hide help |

## 🎨 Card Generation

The card generation system creates AI-themed content with relevant titles and descriptions:

### Sample Card Titles
- AI Revolution
- Neural Networks
- Machine Learning
- Deep Learning
- Computer Vision
- Natural Language Processing
- Robotics
- Automation
- Data Science
- Predictive Analytics
- Pattern Recognition
- Algorithm Design
- Quantum Computing
- Edge Computing
- Cloud AI
- AI Ethics
- Autonomous Systems
- Smart Cities
- Digital Transformation
- Tech Innovation
- Future of Work
- Human-AI Collaboration
- AI Safety
- Machine Consciousness

### Generated Content
Each card includes descriptive content about AI topics, providing realistic layout testing scenarios for the Museum of Artificial Intelligence exhibition.

## 📱 Mobile Responsiveness

The application automatically adapts to mobile devices:
- **Single Column Layout**: Cards stack vertically on mobile screens
- **Touch-Friendly Controls**: All buttons and inputs work on touch devices
- **Responsive Grid**: Auto-fit CSS grid ensures proper spacing
- **Mobile Device Testing**: Dedicated mobile portrait and landscape options

## 🔧 Technical Details

### Built With
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for utility-first styling
- **HTML5 Canvas** for PNG export functionality
- **Local Storage** for state persistence

### Architecture
- **Component-Based**: Modular React components for maintainability
- **Type Safety**: Full TypeScript implementation
- **State Management**: React hooks with localStorage integration
- **Responsive Design**: Mobile-first approach with Tailwind utilities

### File Structure
```
BackgroundChecker/
├── src/
│   ├── BackgroundChooser.tsx    # Main application component
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Global styles
├── public/                      # Static assets
├── package.json                 # Dependencies and scripts
├── tailwind.config.js          # Tailwind configuration
├── vite.config.js              # Vite configuration
└── README.md                   # This file
```

## 🚀 Development

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd BackgroundChecker

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Customization
- **Presets**: Modify the `PRESETS` array in `BackgroundChooser.tsx` to change default backgrounds
- **Card Content**: Update `cardTitles` and `cardContents` arrays in `generateRandomCards()` function
- **Device Sizes**: Modify the `DEVICES` array to add or change viewport options
- **Styling**: Customize Tailwind classes or modify `tailwind.config.js`

## 🎯 Use Cases

- **UI/UX Designers**: Test card layouts and background combinations
- **Web Developers**: Validate responsive design and accessibility
- **Museum Curators**: Preview background options for exhibition displays
- **Content Creators**: Generate AI-themed content for testing layouts
- **Accessibility Auditors**: Use contrast meter for WCAG compliance

## 🔄 State Management

The application automatically saves and restores:
- Selected background and settings
- Generated card content
- Custom color choices
- Device viewport preferences
- UI preferences (dark mode, hidden elements)

## 📊 Export Formats

### CSS Export
```css
/* Background */
.selector {
  background-image: url('path/to/image.jpg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  position: relative;
}

/* Overlay */
.selector::before {
  content: ""; position: absolute; inset: 0;
  background: rgba(0,0,0,0.35);
  pointer-events: none;
}
```

### JSON Export
```json
{
  "items": [...],
  "index": 0,
  "fit": "cover",
  "repeat": false,
  "pos": "center center",
  "overlay": 0.35,
  "blur": 0,
  "device": "fluid",
  "rotate": false,
  "cardOpacity": 0.08,
  "darkMode": false,
  "cardColor": "#000000",
  "cardCount": 6,
  "generatedCards": [...]
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly across different devices
5. Submit a pull request

## 📄 License

This project is part of the Museum of Artificial Intelligence exhibition platform.

---

**Museum of Artificial Intelligence** - Exhibition platform for the history and future of computation. Prototype layout to evaluate background imagery, readability, and motion.