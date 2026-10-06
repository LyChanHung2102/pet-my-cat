/**
 * CatBehavior.js — Autonomous behavior state machine.
 * Decides what the cat wants to do next. Knows nothing about rendering.
 */

import * as THREE from 'three';
import { CatState, INTERRUPTIBLE } from './CatState.js';
import { CatConfig } from '../config/CatConfig.js';
import { GameConfig } from '../config/GameConfig.js';

function weightedRandom(behaviors) {
    const total = behaviors.reduce((s, b) => s + b.weight, 0);
    let r = Math.random() * total;
    for (const b of behaviors) {
        r -= b.weight;
        if (r <= 0) return b.action;
    }
    return behaviors[0].action;
}

function randBetween(min, max) {
    return min + Math.random() * (max - min);
}

export class CatBehavior {
    constructor() {
        this.state = CatState.IDLE;
        this._stateTimer = 0;
        this._stateDuration = 3;
        this._targetPosition = new THREE.Vector3();
        this._hasTarget = false;
        this._cooldowns = {};
        this._lastInterestPoint = null;
        this.onStateChange = null; // callback(newState, oldState)
    }

    get currentState() { return this.state; }

    /** Called by interaction system to interrupt with user-driven state */
    interrupt(newState) {
        if (!INTERRUPTIBLE.has(this.state) && this.state !== newState) return false;
        this._setState(newState);
        this._stateTimer = 0;
        this._stateDuration = newState === CatState.PETTING ? 999 : 1.5;
        return true;
    }

    /** Resume autonomous behavior after interaction ends */
    resume() {
        this._setState(CatState.IDLE);
        this._stateTimer = 0;
        this._stateDuration = randBetween(
            CatConfig.idleDuration.min,
            CatConfig.idleDuration.max
        );
    }

    update(delta, catPosition, isNight = false) {
        this._stateTimer += delta;

        for (const key in this._cooldowns) {
            this._cooldowns[key] = Math.max(0, this._cooldowns[key] - delta);
        }

        if (this._stateTimer >= this._stateDuration) {
            this._pickNextBehavior(catPosition, isNight);
        }

        return {
            state: this.state,
            targetPosition: this._hasTarget ? this._targetPosition : null,
        };
    }

    _pickNextBehavior(catPosition, isNight = false) {
        // At night, heavily bias toward sleep and sitting
        const behaviors = isNight
            ? CatConfig.behaviors.map(b =>
                b.action === 'sleep' ? { ...b, weight: 50 } :
                b.action === 'sit'   ? { ...b, weight: 25 } :
                b.action === 'walk'  ? { ...b, weight: 10 } :
                { ...b, weight: 5 }
              )
            : CatConfig.behaviors;

        const action = weightedRandom(behaviors);
        this._stateTimer = 0;

        switch (action) {
            case 'walk':
                this._startWalk(catPosition);
                break;
            case 'sit':
                this._setState(CatState.SITTING);
                this._stateDuration = randBetween(
                    CatConfig.sitDuration.min,
                    CatConfig.sitDuration.max
                );
                this._hasTarget = false;
                break;
            case 'sleep':
                this._setState(CatState.SLEEPING);
                this._stateDuration = randBetween(
                    CatConfig.sleepDuration.min,
                    CatConfig.sleepDuration.max
                );
                this._hasTarget = false;
                break;
            case 'explore':
                this._startExplore(catPosition);
                break;
            default: // idle
                this._setState(CatState.IDLE);
                this._stateDuration = randBetween(
                    CatConfig.idleDuration.min,
                    CatConfig.idleDuration.max
                );
                this._hasTarget = false;
        }
    }

    _startWalk(catPosition) {
        const half = GameConfig.PARK_SIZE / 2 - 2;
        this._targetPosition.set(
            randBetween(-half, half),
            0,
            randBetween(-half, half)
        );
        this._hasTarget = true;
        this._setState(CatState.WALKING);
        this._stateDuration = randBetween(
            CatConfig.walkDuration.min,
            CatConfig.walkDuration.max
        );
    }

    _startExplore(catPosition) {
        const points = CatConfig.interestPoints;
        // Pick a point that isn't the last one visited
        const available = points.filter(p => p.id !== this._lastInterestPoint);
        const point = available[Math.floor(Math.random() * available.length)];
        this._lastInterestPoint = point.id;
        this._targetPosition.set(point.position.x, 0, point.position.z);
        this._hasTarget = true;
        this._setState(CatState.WALKING);
        this._stateDuration = 10;
    }

    _setState(newState) {
        if (this.state === newState) return;
        const old = this.state;
        this.state = newState;
        if (this.onStateChange) this.onStateChange(newState, old);
    }
}
