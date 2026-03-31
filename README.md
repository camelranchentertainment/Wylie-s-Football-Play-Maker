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

### 🤖 AI Coach (powered by Claude)
- Set your team's age group and skill level
- Choose a focus area (run game, passing, red zone, etc.)
- Add coach notes for personalized suggestions
- Upload prior season play data for context
- Generates 4 detailed, age-appropriate play suggestions

---

## 🚀 Getting Started

### Option 1 — Use the Live App
👉 **[Launch Wylie's Football Play Maker](https://YOUR-USERNAME.github.io/wylies-playmaker)**

### Option 2 — Run Locally
1. Download `index.html`
2. Open it in any modern browser (Chrome, Firefox, Edge, Safari)
3. No server or installation needed

---

## 🔑 AI Coach Setup

To use the AI Coach feature you need a free Anthropic API key:

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and generate an API key
3. Click the 🔑 key icon in the app header and paste your key
4. Your key is saved locally in your browser — never shared

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
