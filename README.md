# Pocket Arcade — Phase 2

Phase 1 established TypeScript, Phaser 4 and Vite. Phase 2 adds the project
architecture while preserving the temporary WebGL rendering check. It contains
no menus, managers, or gameplay yet. Review this milestone before Phase 3.

## Run

Use Node.js 24 LTS and npm. From this folder:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. If the lockfile is missing, run `npm install`
instead of `npm ci` first. To open it on a phone, connect the phone and computer
to the same Wi-Fi network and use the Network URL printed by Vite. Allow the
development server through your local firewall if necessary.

```bash
npm run typecheck
npm run build
npm run preview
```

`build` checks TypeScript and writes the web application into `dist/`.
`preview` serves that production build locally. Development servers are for
local testing, not production hosting.

## Foundation files

| File | Purpose |
| --- | --- |
| `package.json` | Dependencies and development/build commands |
| `package-lock.json` | Exact installed dependency tree for repeatable installs |
| `tsconfig.json` | Strict TypeScript checking |
| `vite.config.ts` | Vite build configuration; relative asset paths |
| `index.html` | Page entry point, game container and safe-area viewport |
| `src/main.ts` | Phaser initialization and temporary rendering scene |
| `src/config/gameConfig.ts` | WebGL renderer and responsive 360 × 640 canvas |
| `src/style.css` | Fullscreen layout, safe areas and canvas touch behavior |
| `.gitignore` | Excludes dependencies and generated build output |
| `.nvmrc` | Node.js major version for nvm users |

## Review checklist

1. The page displays POCKET ARCADE and “WebGL is running”.
2. The green square moves smoothly from side to side.
3. Resize the browser: the entire portrait canvas stays visible and centered.
4. Rotate a phone: the canvas fits without stretching or page scrolling.
5. Check the browser console for initialization errors.
6. Run the production build and repeat the check through `npm run preview`.

WebGL support is required. No 60 FPS guarantee is implied by this setup;
real-device profiling belongs with gameplay implementation. Phaser's initial
bundle is relatively large; loading optimization will be evaluated later.

## Project architecture

| Location | Responsibility |
| --- | --- |
| `src/core/` | Shared managers and services that do not belong to one game |
| `src/core/contracts/` | Shared TypeScript interfaces such as `MiniGame` |
| `src/scenes/` | Boot, Preload, MainMenu, GameSelect, Settings and Profile scenes |
| `src/games/tiny-tank/` | Tank scene, entities, level management and AI |
| `src/shared/ui/` | Reusable Phaser UI components shared by scenes and games |
| `src/shared/utils/` | Small framework-independent helper functions |
| `src/types/` | Project-wide declarations and data shapes |
| `src/config/` | Shared game configuration |
| `public/assets/` | Original sprites, tiles, UI, music and sound effects |

Small README files record folder ownership. `.gitkeep` files preserve currently
empty folders in Git. Phase 3 adds Boot and Preload scenes and replaces the
temporary scene in `main.ts`. Capacitor, audio, haptics, saves and Tiny Tank
follow the milestones in the project brief.

No external art or audio is used in Phase 1.

## Reference documentation

- Phaser 4.2.1: https://phaser.io/download/release/v4.2.1
- Phaser installation: https://docs.phaser.io/phaser/getting-started/installation
- Vite 7 guide: https://v7.vite.dev/guide/

The project deliberately uses Vite 7 and TypeScript 5.9; these are explicit
major-version choices, not claims that they are the latest releases.
