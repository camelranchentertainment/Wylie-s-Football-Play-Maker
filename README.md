# 🏈 Wylie's Football Play Maker

A professional, browser-based football play designer built for coaches. Design offensive and defensive plays, manage a full play library, build QB wristband cards, and get AI-powered play suggestions — all in a single file, no installation required.

---

## ✨ Features

### 🎨 Play Designer
- Interactive canvas-based field with yard markers and line of scrimmage
- Offense and Defense design modes
- Place, move, and label players with drag-and-drop
- Draw multi-waypoint routes with arrowheads (solid, dashed, motion, block styles)
- Undo history (up to 40 states)

### 📋 Formation Library
**Offense:** Pro Set, I-Formation, Shotgun, Spread/Trips, Pistol, Singleback, Power I, Wildcat

**Defense:** 4-3, 3-4, Nickel, Dime, 46 Bear, Cover 2, Zero Blitz, Man Coverage

### 💾 Play Library
- Save plays with auto-generated thumbnails
- Tag by type: Run, Pass, Screen, Trick, Red Zone, Defense, Special
- Search and filter your saved plays
- Stored locally in your browser (no account needed)

### 📎 QB Wristband Builder
- Select up to 24 plays from your library
- Choose column layout (3, 4, or 5 columns)
- Print-ready wristband card output

### 🤖 AI Play Builder (powered by Claude)
- Describe a play in plain English right inside the Designer
- Claude generates a real, editable play — players placed, routes drawn, not just text
- Calibrated to your team's age group and skill level
- Review and tweak the AI's draft with the same manual tools, then approve it into your library (or discard and regenerate)

---

## 🚀 Getting Started

### Option 1 — Use the Live App
👉 **[Launch Wylie's Football Play Maker](https://YOUR-USERNAME.github.io/wylies-playmaker)**

### Option 2 — Run Locally
1. Download `index.html`
2. Open it in any modern browser (Chrome, Firefox, Edge, Safari)
3. No server or installation needed

---

## 🔑 AI Play Builder Setup

The AI Play Builder runs through a server-side API route (`/api/build-play`) so your Anthropic API key never touches the browser. To enable it on your own deployment:

1. Go to [console.anthropic.com](https://console.anthropic.com) and generate an API key
2. Add it to your Vercel project as the `ANTHROPIC_API_KEY` environment variable
3. Redeploy — the AI Play Builder in the Designer will start working automatically

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Select tool |
| `P` | Place player |
| `R` | Route drawing tool |
| `D` | Delete tool |
| `L` | Label tool |
| `Ctrl+Z` | Undo |
| `Ctrl+S` | Save play |
| `Esc` | Cancel / deselect |
| `Enter` | Finish route |

---

## 🛠️ Tech Stack

- **Vanilla JavaScript** — no frameworks
- **HTML5 Canvas** — field and player rendering
- **localStorage** — play library persistence
- **Anthropic Claude API** — AI coaching suggestions
- Single `.html` file — fully self-contained

---

## 📁 Project Structure

```
wylies-playmaker/
├── index.html    ← The entire app (open this in a browser)
└── README.md     ← This file
```

---

## 📜 License

MIT — free to use, modify, and share.

---

*Built with ❤️ for football coaches everywhere.*
