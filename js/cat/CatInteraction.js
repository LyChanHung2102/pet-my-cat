/**
 * CatInteraction.js — Raycasting, petting gestures, region detection.
 * Communicates with Cat via its public interface only.
 *
 * Conflict resolution with CameraController:
 *   - pointerdown on cat mesh → interaction takes over, sets e.stopPropagation via flag
 *   - pointerdown on empty space → camera orbits
 *   - We expose `isCatHit` so CameraController can skip orbit when interaction is active.
 */

import * as THREE from 'three';

export class CatInteraction {
    constructor(camera, domElement, cat, audioManager, particles) {
        this.camera = camera;
        this.domElement = domElement;
        this.cat = cat;
        this.audio = audioManager;
        this.particles = particles;

        this._raycaster = new THREE.Raycaster();
        this._mouse     = new THREE.Vector2();
        this._lastPos   = new THREE.Vector2();
        this._curPos    = new THREE.Vector2(); // reused, no per-frame alloc
        this._isDown    = false;
        this._isPetting = false;
        this._strokeDist = 0;
        this._velocity   = 0;
        this._lastTime   = 0;
        this._zzzTimer   = 0;

        // Exposed so CameraController can read it
        this.isCatHit = false;

        this.onPetCountChange = null;
        this.petCount = 0;

        this._bindEvents();
    }

    get mouseNDC() { return this._mouse; }

    _bindEvents() {
        const el = this.domElement;
        el.addEventListener('pointerdown',   this._onDown.bind(this));
        el.addEventListener('pointermove',   this._onMove.bind(this));
        el.addEventListener('pointerup',     this._onUp.bind(this));
        el.addEventListener('pointercancel', this._onUp.bind(this));
    }

    _toNDC(e) {
        const r = this.domElement.getBoundingClientRect();
        this._mouse.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
        this._mouse.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
    }

    _hitTest() {
        this._raycaster.setFromCamera(this._mouse, this.camera);
        const hits = this._raycaster.intersectObject(this.cat.mesh, true);
        return hits.length > 0 ? hits[0] : null;
    }

    _onDown(e) {
        this._toNDC(e);
        this._lastPos.set(e.clientX, e.clientY);
        this._lastTime = performance.now();
        this._strokeDist = 0;

        const hit = this._hitTest();
        this.isCatHit = !!hit;

        if (hit) {
            this._isDown = true;
            this.cat.react();
            if (this.audio) this.audio.playMeow();
            if (this.particles) this.particles.spawnHeart(hit.point);
        }
    }

    _onMove(e) {
        this._toNDC(e);
        if (!this._isDown) return;

        const now = performance.now();
        const dt  = Math.max(1, now - this._lastTime);
        this._curPos.set(e.clientX, e.clientY);
        const dist = this._curPos.distanceTo(this._lastPos);
        this._velocity = dist / dt;
        this._lastPos.copy(this._curPos);
        this._lastTime = now;

        const hit = this._hitTest();
        if (hit) {
            const gentle = this._velocity > 0.04 && this._velocity < 4.0;
            if (gentle) {
                if (!this._isPetting) {
                    this._isPetting = true;
                    this.cat.pet();
                    if (this.audio) this.audio.playPurr();
                }
                this._strokeDist += dist;
                if (this._strokeDist > 130) {
                    this._strokeDist = 0;
                    this.petCount++;
                    if (this.onPetCountChange) this.onPetCountChange(this.petCount);
                    if (this.petCount % 5 === 0 && this.audio) this.audio.playMeow();
                    if (this.particles) this.particles.spawnHeart(hit.point);
                }
                this.cat.stats.affection = Math.min(100, this.cat.stats.affection + 0.5);
                this.cat.stats.happiness = Math.min(100, this.cat.stats.happiness + 0.35);
            }
        } else if (this._isPetting) {
            this._endPet();
        }
    }

    _onUp() {
        this._isDown  = false;
        this.isCatHit = false;
        if (this._isPetting) this._endPet();
    }

    _endPet() {
        this._isPetting = false;
        this.cat.endPet();
        if (this.audio) this.audio.stopPurr();
    }

    update(delta) {
        // Zzz particles while sleeping
        if (this.particles && this.cat.state === 'SLEEPING') {
            this._zzzTimer += delta;
            if (this._zzzTimer > 1.4) {
                this._zzzTimer = 0;
                const p = this.cat.position.clone();
                p.y += 1.6;
                this.particles.spawnZzz(p);
            }
        } else {
            this._zzzTimer = 0;
        }

        // Passive stat decay
        this.cat.stats.happiness = Math.max(0,   this.cat.stats.happiness - delta * 0.4);
        this.cat.stats.energy    = Math.max(0,   this.cat.stats.energy    - delta * 0.25);
        this.cat.stats.hunger    = Math.min(100, this.cat.stats.hunger    + delta * 0.6);
    }
}
