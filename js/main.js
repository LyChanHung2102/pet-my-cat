/**
 * main.js — Application entry point. Wires all systems together.
 */

import * as THREE from 'three';
import { GameConfig, GameState } from './config/GameConfig.js';
import { CatConfig } from './config/CatConfig.js';
import { Park } from './world/Park.js';
import { Butterflies } from './world/Butterflies.js';
import { Cat } from './cat/Cat.js';
import { CatInteraction } from './cat/CatInteraction.js';
import { CameraController } from './core/CameraController.js';
import { AudioManager } from './audio/AudioManager.js';
import { HUD } from './ui/HUD.js';
import { CustomizeUI } from './ui/CustomizeUI.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { TimeSystem } from './systems/TimeSystem.js';

class Game {
    constructor() {
        this._state       = GameState.LOADING;
        this._clock       = new THREE.Clock();
        this._rafId       = null;
        this._interaction = null;

        this._initRenderer();
        this._initScene();
        this._initWorld();
        this._initCat();
        this._initCamera();
        this._initAudio();
        this._initParticles();
        this._initHUD();
        this._loadSave();
        this._initUI();

        window.addEventListener('resize', this._onResize.bind(this));
        this._animate = this._animate.bind(this);
    }

    _initRenderer() {
        this._canvas = document.getElementById('game-canvas');
        this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true });
        this._renderer.setPixelRatio(Math.min(devicePixelRatio, GameConfig.PIXEL_RATIO_CAP));
        this._renderer.setSize(innerWidth, innerHeight);
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this._renderer.toneMappingExposure = 1.05;
    }

    _initScene() {
        this._scene = new THREE.Scene();
    }

    _initWorld() {
        this._park = new Park(this._scene);
        this._timeSystem = new TimeSystem(
            this._scene,
            this._park.ambientLight,
            this._park.sunLight
        );
        this._butterflies = new Butterflies(this._scene);
    }

    _initCat() {
        this._cat = new Cat(this._scene);
        this._cat.onStateChange = (state) => {
            if (state === 'SLEEPING') this._audio?.stopPurr();
        };
    }

    _initCamera() {
        this._camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 120);
        this._cameraCtrl = new CameraController(this._camera, this._canvas);
    }

    _initAudio() {
        this._audio = new AudioManager();
    }

    _initParticles() {
        this._particles = new ParticleSystem(this._scene);
    }

    _initHUD() {
        this._hud = new HUD(this._cat, this._audio);
    }

    _initUI() {
        const startOverlay = document.getElementById('start-overlay');
        const startBtn     = document.getElementById('start-btn');
        const nameInput    = document.getElementById('cat-name-input');
        const catNameEl    = document.getElementById('cat-name-display');
        const hint         = document.getElementById('hint');

        startBtn?.addEventListener('click', async () => {
            const name = nameInput?.value.trim() || CatConfig.name;
            this._cat.stats.name = name;
            if (catNameEl) catNameEl.textContent = name;

            await this._audio.init();
            startOverlay?.classList.add('hidden');
            this._state = GameState.PLAYING;

            this._interaction = new CatInteraction(
                this._camera, this._canvas, this._cat, this._audio, this._particles
            );
            this._cameraCtrl.interaction = this._interaction;
            this._customizeUI = new CustomizeUI(this._cat);

            if (hint) {
                hint.classList.remove('hidden');
                setTimeout(() => hint.classList.add('fade-out'), 3500);
                setTimeout(() => hint.classList.add('hidden'), 4500);
            }

            this._rafId = requestAnimationFrame(this._animate);
        });
    }

    _loadSave() {
        const saved = SaveSystem.load();
        if (!saved) return;
        if (saved.stats) Object.assign(this._cat.stats, saved.stats);
        if (saved.name) {
            this._cat.stats.name = saved.name;
            const el    = document.getElementById('cat-name-display');
            const input = document.getElementById('cat-name-input');
            if (el)    el.textContent = saved.name;
            if (input) input.value   = saved.name;
        }
    }

    _onResize() {
        this._camera.aspect = innerWidth / innerHeight;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(innerWidth, innerHeight);
    }

    _animate(time) {
        this._rafId = requestAnimationFrame(this._animate);
        const delta = Math.min(this._clock.getDelta(), 0.1);

        const isNight = this._timeSystem.phase === 'NIGHT';

        this._timeSystem.update(delta);
        this._park.update(delta);

        // Butterflies hide at night
        const nightBlend = this._timeSystem.nightBlend;
        this._butterflies._butterflies.forEach(b => {
            b.group.visible = nightBlend < 0.8;
        });
        this._butterflies.update(delta);

        this._cat.update(delta, isNight);
        this._cat.setMouseNDC(this._interaction?._mouse ?? null);
        this._cameraCtrl.follow(this._cat.position);
        this._cameraCtrl.update();
        this._interaction?.update(delta);
        this._particles.update(delta);
        this._hud.update(this._timeSystem.phase);

        if (!this._lastSave || time - this._lastSave > 30000) {
            this._lastSave = time;
            SaveSystem.save({ stats: this._cat.stats, name: this._cat.stats.name });
        }

        this._renderer.render(this._scene, this._camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        document.getElementById('start-overlay')?.classList.add('hidden');
        document.getElementById('no-webgl')?.classList.remove('hidden');
        return;
    }
    new Game();
});
