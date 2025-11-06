# Museum of Artificial Intelligence - Background Checker

A comprehensive tool for testing and previewing background images, dynamic card layouts, and responsive design for the Museum of Artificial Intelligence web platform. This application provides a flexible environment to experiment with different backgrounds, generate dynamic content, and simulate various device viewports on a single, responsive page.

## ✨ Key Features

### UI & Layout
- **Collapsible Sidebar**: All controls are neatly organized in a sidebar that can be expanded (300px) for full access or collapsed (64px) to icons for a clean view.
- **Responsive Main Page**: The application itself is a fully responsive page.
- **Embedded Device Canvas**: Device previews are rendered proportionally within a centered canvas, not by resizing the entire browser viewport.

### Background Customization
- **Preset Backgrounds**: A collection of curated, AI-themed gradient backgrounds.
- **Image Upload**: Drag-and-drop or browse to upload custom images (`AVIF`, `WebP`, `JPG`, `PNG`, etc.).
- **Background Controls**:
    - **Fit**: `cover`, `contain`, `auto`.
    - **Position**: 9 alignment options.
    - **Repeat**: Toggle for background tiling.
    - **Overlay**: Adjust darkness overlay (0-95%) for text readability.
    - **Blur**: Add a blur effect to the background (0-12px).

### Dynamic Card System
- **AI-Themed Card Generation**: Instantly generate 1-12 cards with relevant AI-related titles and content.
- **Custom Color Picker**: A universal color picker to set the background color for all generated cards.
- **Smart Text Contrast**: Text color (white or black) is automatically chosen to ensure optimal contrast against the selected card color and opacity.
- **Card Opacity**: A slider to control the transparency of the cards, which is linked to a subtle backdrop-blur effect.

### Device & Responsiveness Testing
- **Device Simulation**: Preview your design on various device sizes without resizing your browser.
- **Multiple Viewports**: `Fluid` (responsive), `Mobile`, `Tablet`, and `Desktop`.
- **Rotation**: The `Rotate` button swaps the height and width for `Mobile` and `Tablet` viewports to simulate orientation changes.

### Utilities & Exporting
- **Contrast Meter**: A handy WCAG 2.1 contrast checker for page and card text readability.
- **Help Overlay**: A quick reference for keyboard shortcuts.
- **State Persistence**: Your entire session (backgrounds, settings, cards) is automatically saved to `localStorage`.
- **Exporting**:
    - **Copy CSS**: Get a production-ready CSS snippet for the current background.
    - **Export JSON**: Save the entire application state to a JSON file.
    - **Export PNG**: Download a PNG screenshot of the current device canvas.

## ⌨️ Keyboard Shortcuts

| Key         | Action                        |
|-------------|-------------------------------|
| `←`/`→`     | Previous/Next Background      |
| `1-9`       | Select a Visible Thumbnail    |
| `F`         | Favorite/Unfavorite Background|
| `C`         | Toggle A/B Compare Mode       |
| `Y`         | Copy CSS Snippet              |
| `J`         | Export JSON State             |
| `P`         | Export Canvas as PNG          |
| `M`         | Toggle Contrast Meter Overlay |
| `S`         | Force Save State to LocalStorage|
| `?`         | Toggle Help Overlay           |

## 🔧 Technical Details

### Stack
- **React 18** with TypeScript
- **Vite** for a blazing-fast development experience
- **Tailwind CSS** for utility-first styling

### Architecture
- **Single-File Component**: The entire application is encapsulated within the `BackgroundChooser.tsx` component.
- **State Management**: State is managed using React Hooks (`useState`, `useEffect`, `useMemo`) with persistence via the `localStorage` API.
- **Responsive Design**: The primary layout uses Flexbox, and the dynamic card grid uses CSS Grid's `auto-fit` and `minmax` properties to be container-aware, ensuring it responds correctly within the simulated device canvas.

## 🚀 Development Setup

### Prerequisites
- Node.js (v16 or newer)
- npm or yarn

### Installation & Running
```bash
# 1. Clone the repository
git clone <your-repository-url>
cd BackgroundChecker

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
# The application will be available at http://localhost:5173 (or another port)

# 4. To build for production
npm run build

# 5. To preview the production build
npm run preview
```
