# 🎬 AndScene! — Premium Streaming Web Application

**AndScene!** is a modern, responsive streaming client built on React and Vite. It features a stunning **"Liquid Glass"** dark theme, connecting directly to the **TMDB (The Movie Database) API v3** to serve rich, real-time movie, TV, and anime metadata alongside active stream selections.

---

## ✨ Features

- **Liquid Glass Theme**: A premium dark-mode aesthetic utilizing deep navy backdrops (`#0A0A12`), amber highlights, and glassmorphic overlays (`backdrop-filter`) for a clean, modern look.
- **Cinematic Hero Carousel**: High-impact top section featuring Ken Burns zoom transitions, gold glass CTA action buttons, and automatic media rotations.
- **Hover-Expanding Content Cards**: Tactile Netflix-style popout cards that expand smoothly on hover, rendering rating percentages, genres, and video trailer overlays.
- **Centered Media Detail Modal**: Opens full cinematic details in a centered glass window containing synopsis information, credits, cast, and "More Like This" recommendations.
- **Multi-Query Search Overlay**: A full-screen heavily blurred overlay offering real-time multi-search with infinite scrolling, trending search tags, and clean layout grids.
- **Integrated Video Player**: HTML5 video playback container featuring multi-server source switching.
- **Anime Hub**: Fully dedicated section filtering TMDB endpoints specifically for Japanese animation (Genre 16 & keyword 210024).
- **Progressive Web App (PWA)**: Built-in service worker caching using Workbox for offline reliability and smooth asset delivery.

---

## 🛠️ Technology Stack

- **Frontend**: React (v19), Vite (v8)
- **Styling**: Vanilla CSS, Flexbox, CSS Grid, custom HSL-tailored design system variables.
- **Animations**: Framer Motion
- **Networking**: Axios
- **Sliders**: Swiper.js
- **Icons**: Lucide React
- **Service Worker**: Vite PWA Plugin

---

## 🚀 Getting Started

Follow these steps to run the application locally:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) (v18+) and [npm](https://www.npmjs.com/) installed.

### 2. Clone the Repository
```bash
git clone https://github.com/FinnSkers/AndScene.git
cd AndScene
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory and add your TMDB API credentials:
```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
VITE_TMDB_BASE_URL=https://api.themoviedb.org/3
```
> ⚠️ **Warning**: Never commit your `.env` file to remote repositories. The project's `.gitignore` is pre-configured to exclude it.

### 5. Start Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173` (or the port specified in your terminal).

---

## 🎨 Design System Variables

Custom styling tokens are configured globally inside [src/index.css](file:///src/index.css):

| Token | CSS Variable | Value |
| :--- | :--- | :--- |
| **Primary Background** | `--bg-primary` | `#0A0A12` |
| **Accent Glow** | `--accent` | `#F5A623` |
| **Glass Backdrop** | `--bg-glass` | `rgba(16, 16, 28, 0.65)` |
| **Border Subtle** | `--border-subtle` | `rgba(255, 255, 255, 0.08)` |
| **Primary Font** | `--font-primary` | `'Inter', sans-serif` |
| **Display Font** | `--font-display` | `'Space Grotesk', sans-serif` |

---

## 📂 Project Structure

```text
├── dist/                   # Production build outputs
├── public/                 # Static assets
└── src/
    ├── assets/             # Images and design assets
    ├── components/         # Reusable glassmorphic UI elements (Hero, Navbar, ContentCard, etc.)
    ├── context/            # Global state context (Lists, Authentication, Modals)
    ├── data/               # Static dataset configurations
    ├── hooks/              # Custom utility hooks (IntersectionObserver)
    ├── pages/              # Routing views (Home, Browse, Watch, Anime, Login, ProfileSelect)
    ├── services/           # TMDB endpoint integrations
    ├── App.jsx             # Route bindings and providers
    └── index.css           # Global typography and design tokens
```

---

## 📄 License
This project is for educational purposes only. Content metadata is provided courtesy of [The Movie Database (TMDB)](https://www.themoviedb.org/).
