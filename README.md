# GET SHEET DONE
五线谱阅读练习 / Staff Reading Trainer

An interactive drill tool for reading treble-clef notation. Each round presents a randomly generated note on a five-line staff (rendered with [VexFlow](https://github.com/0xfe/vexflow)) and lets the learner answer using their preferred system: solfege, letter names, numbered notation, or labeled piano keys. The interface supports both Chinese and English copy.

## Product Highlights

- 🎼 **Single-focus drills** – One note, centered staff, instant feedback to build recognition speed.
- 🔁 **Smart randomizer** – Prevents immediate repeats so learners see fresh prompts each round.
- 🎯 **Adaptive feedback** – Correct answers advance automatically; wrong answers reveal the right solution and require a manual “Next” tap.
- 🌐 **Localization** – Toggle between English and Chinese UI strings.
- 🎵 **Flexible answer modes** – Switch among solfege (default), letter names, numbered notation, or a playable piano strip.
- 📊 **Lightweight stats** – Track question count, total answered, and running accuracy.

## Tech Stack

- [React Router](https://reactrouter.com/) v7 for routing and server rendering
- [React 19](https://react.dev/) with TypeScript
- [Tailwind CSS](https://tailwindcss.com/) (v4) for utility-first styling
- [VexFlow](https://www.vexflow.com/) for SVG staff rendering

## Getting Started

This repo uses `pnpm`. If you prefer `npm` or `yarn`, adapt the commands accordingly.

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:5173` to use the practice tool. Edits in `app/routes/home.tsx` hot-reload automatically.

## Building & Running

```bash
pnpm build   # bundles client + server assets
pnpm start   # serves the production build
```

Compiled assets live in `build/client`, and the server entry is `build/server/index.js`.

## Usage Notes

1. Open the Settings card to switch language or answer mode at any time.
2. In solfege/letter/number modes, pick from the multiple-choice grid.
3. In piano mode, tap the matching key label. Solfege cues appear beneath each key for quick recall.
4. Wrong answers reveal the correct label and unlock a “Next question” button so learners pause before moving on.

## Docker (Optional)

The included `Dockerfile` can produce a deployable image:

```bash
docker build -t sheet-music .
docker run -p 3000:3000 sheet-music
```

Deploy the resulting container to any platform that supports Docker (Fly.io, Railway, ECS, Cloud Run, etc.).

---

Happy practicing! Let me know if you ship this somewhere and I’ll cheer you on. 🎹
