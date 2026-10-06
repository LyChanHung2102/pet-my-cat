# Pet Your Cat 🐾

A cozy interactive 3D virtual-pet experience built with HTML, CSS, JavaScript, and Three.js.

## How to Run Locally

Serve the project root with any static file server (required for ES module imports):

```bash
# Python
python -m http.server 8080

# Node (npx)
npx serve .

# VS Code
# Use the "Live Server" extension and open index.html
```

Then open `http://localhost:8080` in a modern browser.

## How to Deploy

Upload the entire project folder as a static website to any host:
- GitHub Pages
- Netlify (drag & drop the folder)
- Vercel
- AWS S3 + CloudFront

No build step required.

## Project Structure

```
pet-your-cat/
├── index.html              # Entry point
├── css/
│   └── style.css           # All styles
├── js/
│   ├── main.js             # App entry — wires all systems
│   ├── config/
│   │   ├── GameConfig.js   # Renderer, park, performance settings
│   │   └── CatConfig.js    # Cat stats, personality, behavior weights
│   ├── cat/
│   │   ├── Cat.js          # Procedural cat mesh + public interface
│   │   ├── CatBehavior.js  # Autonomous state machine
│   │   ├── CatAnimation.js # Procedural animations (independent of behavior)
│   │   ├── CatInteraction.js # Raycasting, petting, gesture detection
│   │   └── CatState.js     # State constants
│   ├── world/
│   │   └── Park.js         # 3D park environment
│   ├── core/
│   │   └── CameraController.js # Third-person camera with damping
│   ├── audio/
│   │   └── AudioManager.js # Web Audio with synth fallback
│   ├── ui/
│   │   └── HUD.js          # Minimal HUD
│   └── systems/
│       └── SaveSystem.js   # localStorage save/load
└── assets/
    ├── models/             # Place cat.glb here for production model
    ├── textures/
    └── audio/              # Place purr.mp3, meow.mp3 here
```

## Where Assets Go

| Asset | Path |
|-------|------|
| Production cat model | `assets/models/cat.glb` |
| Purr sound | `assets/audio/purr.mp3` |
| Meow sound | `assets/audio/meow.mp3` |
| Textures | `assets/textures/` |

Audio files are optional — the app uses a Web Audio synthesizer fallback.

## How the Cat State Machine Works

States: `IDLE → WALKING → SITTING → SLEEPING → PETTING → REACTING → PLAYING`

- `CatBehavior.js` runs the autonomous loop using weighted random behavior selection
- User interaction calls `cat.pet()`, `cat.react()`, `cat.play()` etc.
- `INTERRUPTIBLE` states can be interrupted by user input
- After petting ends, `cat.endPet()` resumes autonomous behavior

## How to Replace the Cat Model

1. Place your rigged GLB at `assets/models/cat.glb`
2. Create `js/cat/GLBCat.js` implementing the same interface as `Cat.js`:
   - `get mesh`, `get state`, `get position`
   - `moveTo(pos)`, `stop()`, `sit()`, `sleep()`, `react()`, `pet()`, `endPet()`, `play()`, `lookAt(pos)`, `setMouseNDC(ndc)`, `update(delta)`
3. In `main.js`, swap `import { Cat }` for `import { GLBCat as Cat }`

The behavior, interaction, camera, and HUD systems require no changes.

## How to Configure the Park

Edit `js/config/GameConfig.js`:
- `PARK_SIZE` — playable area size in world units
- `SHADOW_MAP_SIZE` — shadow quality
- `FOG_DENSITY` — atmosphere density

## How to Configure Cat Personality

Edit `js/config/CatConfig.js`:
- `personality` — friendliness, curiosity, energy, playfulness, independence
- `behaviors` — weighted list controlling autonomous behavior frequency
- `interestPoints` — named positions the cat will explore
- `stats` — starting affection, happiness, energy, hunger values

## How to Configure Interaction Zones

Interaction zones are detected via raycasting against named meshes in `Cat.js`.
Mesh names (`cat_head`, `cat_body`) map to reaction types in `CatInteraction.js`.

## How to Add Future AI-Generated Cats

1. Generate a rigged GLB from your pipeline
2. Validate: model loads, skeleton exists, animations exist, bounding box is reasonable
3. Implement `GLBCat.js` using `THREE.GLTFLoader` and `THREE.AnimationMixer`
4. Expose the same public interface as `Cat.js`
5. Swap the import in `main.js`

The rest of the application is unaffected.

## Current Phase

Phase 1 complete — Playable 3D prototype with:
- Cozy low-poly park (grass, path, pond, trees, flowers, rocks, bench, cat house)
- Procedural cat with full body, animations, and state machine
- Autonomous behavior (walk, idle, sit, sleep, explore interest points)
- Touch/mouse petting with raycasting
- Third-person camera with orbit, zoom, pinch-to-zoom
- Minimal HUD (affection bar, mood, action buttons)
- Web Audio with synth fallback
- localStorage save system
- WebGL fallback screen
