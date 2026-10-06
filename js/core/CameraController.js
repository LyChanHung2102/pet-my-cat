/**
 * CameraController.js — Smooth third-person camera with orbit, zoom, and damping.
 * Skips orbit drag when interaction.isCatHit is true so petting and orbiting don't conflict.
 */

import * as THREE from 'three';

const MIN_DIST  = 3;
const MAX_DIST  = 14;
const MIN_POLAR = 0.15;
const MAX_POLAR = Math.PI / 2 - 0.05;
const DAMPING   = 0.08;

export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        /** Assign a CatInteraction instance after creation to prevent orbit/pet conflict */
        this.interaction = null;

        this._target     = new THREE.Vector3();
        this._targetGoal = new THREE.Vector3();
        this._theta      = 0.4;
        this._phi        = 0.9;
        this._dist       = 8;
        this._thetaGoal  = this._theta;
        this._phiGoal    = this._phi;
        this._distGoal   = this._dist;

        this._isPointerDown = false;
        this._lastX = 0;
        this._lastY = 0;
        this._pinchDist = 0;

        this._bindEvents();
    }

    follow(position) {
        this._targetGoal.copy(position).add(new THREE.Vector3(0, 0.8, 0));
    }

    update() {
        this._theta = THREE.MathUtils.lerp(this._theta, this._thetaGoal, DAMPING);
        this._phi   = THREE.MathUtils.lerp(this._phi,   this._phiGoal,   DAMPING);
        this._dist  = THREE.MathUtils.lerp(this._dist,  this._distGoal,  DAMPING);
        this._target.lerp(this._targetGoal, DAMPING);

        const x = this._target.x + this._dist * Math.sin(this._phi) * Math.sin(this._theta);
        const y = this._target.y + this._dist * Math.cos(this._phi);
        const z = this._target.z + this._dist * Math.sin(this._phi) * Math.cos(this._theta);

        this.camera.position.set(x, Math.max(0.5, y), z);
        this.camera.lookAt(this._target);
    }

    _bindEvents() {
        const el = this.domElement;
        el.addEventListener('pointerdown', this._onDown.bind(this));
        el.addEventListener('pointermove', this._onMove.bind(this));
        el.addEventListener('pointerup',   this._onUp.bind(this));
        el.addEventListener('wheel',       this._onWheel.bind(this), { passive: true });
        el.addEventListener('touchstart',  this._onTouchStart.bind(this), { passive: true });
        el.addEventListener('touchmove',   this._onTouchMove.bind(this),  { passive: true });
    }

    _catIsHit() {
        return this.interaction?.isCatHit === true;
    }

    _onDown(e) {
        if (e.pointerType === 'touch') return;
        if (this._catIsHit()) return;
        this._isPointerDown = true;
        this._lastX = e.clientX;
        this._lastY = e.clientY;
    }

    _onMove(e) {
        if (!this._isPointerDown || e.pointerType === 'touch') return;
        if (this._catIsHit()) { this._isPointerDown = false; return; }
        const dx = e.clientX - this._lastX;
        const dy = e.clientY - this._lastY;
        this._lastX = e.clientX;
        this._lastY = e.clientY;
        this._thetaGoal -= dx * 0.005;
        this._phiGoal = THREE.MathUtils.clamp(this._phiGoal + dy * 0.005, MIN_POLAR, MAX_POLAR);
    }

    _onUp() { this._isPointerDown = false; }

    _onWheel(e) {
        this._distGoal = THREE.MathUtils.clamp(this._distGoal + e.deltaY * 0.01, MIN_DIST, MAX_DIST);
    }

    _onTouchStart(e) {
        if (e.touches.length === 2) {
            this._pinchDist = this._getTouchDist(e.touches);
        } else if (e.touches.length === 1 && !this._catIsHit()) {
            this._lastX = e.touches[0].clientX;
            this._lastY = e.touches[0].clientY;
        }
    }

    _onTouchMove(e) {
        if (e.touches.length === 2) {
            const d = this._getTouchDist(e.touches);
            this._distGoal = THREE.MathUtils.clamp(
                this._distGoal + (this._pinchDist - d) * 0.02, MIN_DIST, MAX_DIST
            );
            this._pinchDist = d;
        } else if (e.touches.length === 1 && !this._catIsHit()) {
            const dx = e.touches[0].clientX - this._lastX;
            const dy = e.touches[0].clientY - this._lastY;
            this._lastX = e.touches[0].clientX;
            this._lastY = e.touches[0].clientY;
            this._thetaGoal -= dx * 0.006;
            this._phiGoal = THREE.MathUtils.clamp(this._phiGoal + dy * 0.006, MIN_POLAR, MAX_POLAR);
        }
    }

    _getTouchDist(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
