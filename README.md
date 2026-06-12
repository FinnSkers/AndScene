# 🎬 AndScene! — Premium Streaming Web Experience

<div align="center">
  <img src="https://img.shields.io/badge/React-2026-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-v8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/WebRTC-P2P%20Voice-333333?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/Vercel-Deploys-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</div>

<br />

**AndScene!** is a premium, fully-featured movie, TV series, and anime streaming application built using React, Vite, and Supabase. Crafted with a stunning, high-fidelity **Liquid Glass** dark theme, AndScene! provides direct integration with the **TMDB (The Movie Database) API v3** to curate metadata, and supports custom ad-free scraper server playback, P2P social lobbies, and AI recommendations.

---

## 🌟 Key Features

### 💎 Phase 2 Premium Enhancements
*   **📊 Watch Stats Analytics Dashboard**: A dedicated personal dashboard summarizing streaming achievements:
    *   **Milestone Grid**: Track total hours streamed, watchlist size, completion rate, and current daily watch streaks.
    *   **SVG Radar Preference Chart**: An inline spider-web radar chart displaying your favorite genres calculated from your actual watching patterns.
    *   **Activity Heatmap Grid**: A GitHub-style 365-day check-in grid displaying active streaming days with hover tooltip details.
    *   **Stream Badges**: Unlock milestones (e.g., *Night Owl*, *Marathoner*, *Sci-Fi Voyager*) as you watch.
*   **🔮 AI Vibe Matcher Curator**: A floating, conversational AI chatbot interface that matches suggestions directly to your mood. Integrates with Gemini AI models with a keyword-matching database fallback.
*   **🎮 Premium Native Video Player controls**: Ad-free native player overlay with timeline scrubbing, volume control, custom playback speeds, local SRT/VTT subtitle uploading, mobile swipe gestures, and keyboard hotkeys.
*   **🔄 Smart Resume & Cross-Device Sync**: Tracks your exact video player timestamps locally and saves percentage progress to Supabase, prompting you to resume where you left off on any device.
*   **👥 P2P Social Watch Parties**: Create lobby channels and stream content in perfect synchronization with your friends. Features a sidebar panel with episode navigators, group chat, and real-time WebRTC audio/video call tiles.

### 🎨 Design & Layout
*   **Liquid Glass Aesthetics**: Deep navy backgrounds (`#0A0A12`) with shifting ambient gradient meshes, glassmorphic card overlays, and subtle film grain overlay textures.
*   **Rich Browse Cards**: Netflix-style hover expansions that reveal descriptions, genre tags, match percentages, runtimes, and immediate play actions.
*   **Otaku Hub**: A dedicated dashboard specializing in Japanese animation (TMDB genre 16 & keyword 210024) complete with anime spotlight banner.

---

## 🛠️ Technology Stack

*   **Frontend Framework**: React 19 + Vite 8
*   **State Management & Database**: Supabase (Auth, Postgres DB, and Realtime Channels)
*   **Styling & Motion**: Vanilla CSS (CSS Grid & Flexbox) + Framer Motion
*   **Icons**: Lucide React
*   **Service Worker**: Vite PWA Plugin + Workbox caching
*   **Scraper Server**: Node.js + Express + Axios

---

## 🚀 Getting Started

> [!IMPORTANT]
> To run the complete application, ensure you have both the React frontend and the Scraper backend running locally.

### 1. Clone & Install
```bash
git clone https://github.com/FinnSkers/AndScene.git
cd AndScene
npm install
```

### 2. Configure Frontend Environment
Create a `.env` file in the root directory:
```env
VITE_TMDB_API_KEY=your_tmdb_api_key_here
VITE_TMDB_BASE_URL=https://api.themoviedb.org/3
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MASTER_PASSWORD=admin_page_access_password
```

### 3. Setup Scraper Backend
AndScene! includes a scraping server located in the `/server` folder to resolve streams.
```bash
cd server
npm install
node index.js
```
The server will start listening on `http://localhost:3001`.

### 4. Start Frontend
In a new terminal window in the root directory:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 📂 Project Structure

```text
├── server/                 # Scraper server backend (resolving direct stream endpoints)
│   ├── index.js            # Express API endpoints
│   └── package.json        
├── public/                 # Static assets & PWA manifest configurations
└── src/
    ├── assets/             # Global image assets
    ├── components/         # Reusable glass UI components (Player, AI chat, Navbar, etc.)
    ├── context/            # Global context providers (Supabase database synchronizations)
    ├── hooks/              # Custom React hooks (Intersection Observer triggers)
    ├── pages/              # Routing pages (Stats, Watch Party, Browse, Anime, Admin)
    ├── services/           # TMDB and Supabase clients
    ├── App.jsx             # Route registers & transitions wrapper
    └── index.css           # Global design tokens and animations
```

---

## 📄 License
This project is for educational and showcase purposes only. Video metadata is pulled courtesy of [The Movie Database (TMDB)](https://www.themoviedb.org/).
