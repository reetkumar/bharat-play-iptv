<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Bharat Play IPTV

A production-ready Indian IPTV application with AI-powered recommendations, smart search, and category-based channel management. Watch live Indian TV channels directly in your browser with HLS streaming support.

## Features

- **Live TV Streaming** - Watch Indian channels in real-time with HLS support
- **Smart Search** - Find channels quickly with search history
- **Category Filtering** - Browse by News, Music, Movies, and more
- **Favorites** - Save your favorite channels
- **Recently Watched** - Quick access to recently viewed channels
- **AI Recommendations** - Gemini-powered channel suggestions
- **Responsive Design** - Works on desktop and mobile

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Make Commands

- `make app` - Create an optimized production build
- `make run` - Run the app in development mode
- `make install` - Install dependencies

## Tech Stack

- React 19 + TypeScript
- Vite
- TailwindCSS
- Express (backend proxy)
- Gemini AI (recommendations)
- HLS.js / Video.js

## Credits

- Channel data from [IPTV-org](https://github.com/iptv-org/iptv)
- UI icons from [Lucide](https://lucide.dev)
- Animations from [Motion](https://motion.dev)