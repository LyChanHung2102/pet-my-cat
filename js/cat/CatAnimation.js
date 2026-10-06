/**
 * CatAnimation.js — Procedural animations for the cat mesh parts.
 * Completely independent from behavior logic.
 */

import * as THREE from 'three';
import { CatState } from './CatState.js';

export class CatAnimation {
    constructor(parts) {
        this.parts = parts;
        this._t = 0;
        this._state = CatState.IDLE;
        this._petReactTimer = 0;
        this._reactTimer = 0;
        this._happyTimer = 0;
        // Pose lerp targets
        this._bodyTargetY  = 0.72;
        this._headTargetX  = 0;
        this._headTargetY  = 0;
        this._headTargetZ  = 0;
    }

    update(delta, state, mouseNDC) {
        this._t += delta;
        this._state = state; // store for sub-methods that need it

        this._animateTail(state);
        this._animateEars(state);
        this._animateBreathing(state);
        this._animateEyes();
        this._animateLegs();
        this._animatePose(state);

        if (state === CatState.PETTING) {
            this._petReactTimer = 0.4;
        }
        if (this._petReactTimer > 0) {
            this._petReactTimer -= delta;
            if (this.parts.head) {
                this.parts.head.rotation.x = THREE.MathUtils.lerp(
                    this.parts.head.rotation.x, -0.18, 0.12
                );
            }
        }

        if (state === CatState.REACTING) {
            this._reactTimer = 0.6;
        }
        if (this._reactTimer > 0) {
            this._reactTimer -= delta;
            if (this.parts.head) {
                this.parts.head.rotation.y = THREE.MathUtils.lerp(
                    this.parts.head.rotation.y,
                    Math.sin(this._t * 8) * 0.3,
                    0.2
                );
            }
        }

        if (state === CatState.PLAYING) {
            this._happyTimer += delta;
            if (this.parts.body) {
                this.parts.body.rotation.y = Math.sin(this._happyTimer * 6) * 0.15;
            }
        } else {
            this._happyTimer = 0;
        }

        // Head follows mouse when awake and idle/sitting
        if (mouseNDC && (state === CatState.IDLE || state === CatState.SITTING || state === CatState.PETTING)) {
            if (this.parts.head) {
                const targetY = mouseNDC.x * 0.5;
                const targetX = -mouseNDC.y * 0.3;
                this.parts.head.rotation.y = THREE.MathUtils.lerp(this.parts.head.rotation.y, targetY, 0.06);
                this.parts.head.rotation.x = THREE.MathUtils.lerp(this.parts.head.rotation.x, targetX, 0.06);
            }
        }
    }

    _animateTail(state) {
        if (!this.parts.tailNodes) return;
        const speed = state === CatState.PLAYING ? 5.0
                    : state === CatState.PETTING  ? 4.0
                    : state === CatState.SLEEPING ? 0.5
                    : 2.0;
        const amp   = state === CatState.SLEEPING ? 0.05 : 0.18;
        this.parts.tailNodes.forEach((node, i) => {
            node.rotation.z = Math.sin(this._t * speed - i * 0.5) * amp;
        });
    }

    _animateEars(state) {
        if (!this.parts.earL || !this.parts.earR) return;
        const twitch = state === CatState.REACTING
            ? Math.sin(this._t * 12) * 0.15
            : 0;
        this.parts.earL.rotation.z = THREE.MathUtils.lerp(this.parts.earL.rotation.z,  0.3 + twitch, 0.1);
        this.parts.earR.rotation.z = THREE.MathUtils.lerp(this.parts.earR.rotation.z, -0.3 - twitch, 0.1);
    }

    _animateBreathing(state) {
        // Body Y is fully managed by _animatePose; this drives scale for subtle chest expansion
        if (!this.parts.body) return;
        const amp = state === CatState.SLEEPING ? 0.018 : 0.010;
        const spd = state === CatState.SLEEPING ? 1.0 : 1.8;
        const s = 1 + Math.sin(this._t * spd) * amp;
        this.parts.body.scale.y = THREE.MathUtils.lerp(this.parts.body.scale.y, s, 0.1);
    }

    _animateEyes() {
        if (!this.parts.eyeL || !this.parts.eyeR) return;
        const targetY = this._state === CatState.SLEEPING ? 0.05 : 1.0;
        this.parts.eyeL.scale.y = THREE.MathUtils.lerp(this.parts.eyeL.scale.y, targetY, 0.1);
        this.parts.eyeR.scale.y = THREE.MathUtils.lerp(this.parts.eyeR.scale.y, targetY, 0.1);
    }

    triggerPetReaction() {
        this._petReactTimer = 0.5;
    }

    triggerReaction() {
        this._reactTimer = 0.8;
    }

    _animateLegs() {
        if (!this.parts.legs) return;
        const walking = this._state === CatState.WALKING;
        const speed = walking ? 8.0 : 0;
        const amp   = walking ? 0.08 : 0;
        this.parts.legs.forEach((leg, i) => {
            const phase = (i === 0 || i === 3) ? 0 : Math.PI;
            const target = leg.userData.baseY + Math.sin(this._t * speed + phase) * amp;
            leg.position.y = THREE.MathUtils.lerp(leg.position.y, target, 0.2);
        });
    }

    _animatePose(state) {
        // Sitting: body lowers, head tilts slightly down
        // Sleeping: body lowers more, head droops forward
        let bodyY  = this.parts.body?.userData.baseY ?? 0.72;
        let headRx = 0;
        let headRz = 0;

        if (state === CatState.SITTING) {
            bodyY  = (this.parts.body?.userData.baseY ?? 0.72) - 0.18;
            headRx = 0.1;
        } else if (state === CatState.SLEEPING) {
            bodyY  = (this.parts.body?.userData.baseY ?? 0.72) - 0.28;
            headRx = 0.35;
            headRz = 0.18;
        }

        if (this.parts.body) {
            // Override breathing baseY with pose target
            const breathOffset = Math.sin(this._t * (state === CatState.SLEEPING ? 1.0 : 1.8))
                * (state === CatState.SLEEPING ? 0.025 : 0.012);
            this.parts.body.position.y = THREE.MathUtils.lerp(
                this.parts.body.position.y, bodyY + breathOffset, 0.05
            );
        }

        if (this.parts.head && state !== CatState.PETTING && state !== CatState.REACTING) {
            this.parts.head.rotation.x = THREE.MathUtils.lerp(this.parts.head.rotation.x, headRx, 0.05);
            this.parts.head.rotation.z = THREE.MathUtils.lerp(this.parts.head.rotation.z, headRz, 0.05);
        }
    }
