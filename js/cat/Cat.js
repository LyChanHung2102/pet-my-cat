/**
 * Cat.js — Procedural cat mesh + public interface.
 * Behavior system communicates through: moveTo, stop, sit, sleep, react, pet, play, lookAt.
 * This file can later be replaced with a GLBCat using the same interface.
 */

import * as THREE from 'three';
import { CatConfig } from '../config/CatConfig.js';
import { GameConfig } from '../config/GameConfig.js';
import { CatAnimation } from './CatAnimation.js';
import { CatBehavior } from './CatBehavior.js';
import { CatState } from './CatState.js';

const HALF_PARK = GameConfig.PARK_SIZE / 2 - 1.5;

export class Cat {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.name = 'cat';
        this._parts = {};
        this._mouseNDC = null;

        this._behavior = new CatBehavior();
        this._behavior.onStateChange = (s) => this._onStateChange(s);

        this._buildMesh();
        this._animation = new CatAnimation(this._parts);

        scene.add(this.group);

        // Public stats (driven by interaction system)
        this.stats = { ...CatConfig.stats };

        this.onStateChange = null; // callback(state)
    }

    // ── Public interface ──────────────────────────────────────────────────────

    get mesh() { return this.group; }
    get state() { return this._behavior.currentState; }
    get position() { return this.group.position; }

    moveTo(pos) {
        this._behavior.interrupt(CatState.WALKING);
        this._behavior._targetPosition.set(pos.x ?? 0, 0, pos.z ?? 0);
        this._behavior._hasTarget = true;
    }

    stop()   { this._behavior.interrupt(CatState.IDLE); }
    sit()    { this._behavior.interrupt(CatState.SITTING); }
    sleep()  { this._behavior.interrupt(CatState.SLEEPING); }
    play()   { this._behavior.interrupt(CatState.PLAYING); this._behavior._stateDuration = 4; }

    react() {
        this._behavior.interrupt(CatState.REACTING);
        this._behavior._stateDuration = 1.0;
        this._animation.triggerReaction();
    }

    pet() {
        this._behavior.interrupt(CatState.PETTING);
        this._animation.triggerPetReaction();
    }

    endPet() {
        this._behavior.resume();
    }

    lookAt(worldPos) {
        const dir = worldPos.clone().sub(this.group.position);
        dir.y = 0;
        if (dir.lengthSq() > 0.001) {
            const angle = Math.atan2(dir.x, dir.z);
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, angle, 0.1);
        }
    }

    setMouseNDC(ndc) { this._mouseNDC = ndc; }

    update(delta, isNight = false) {
        const result = this._behavior.update(delta, this.group.position, isNight);

        if (result.targetPosition) {
            this._moveToward(result.targetPosition, delta);
        } else if (result.state !== CatState.WALKING) {
            // Smoothly stop
        }

        this._animation.update(delta, result.state, this._mouseNDC);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _moveToward(target, delta) {
        const pos = this.group.position;
        const dx = target.x - pos.x;
        const dz = target.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.15) {
            this._behavior._hasTarget = false;
            this._behavior._stateTimer = this._behavior._stateDuration; // trigger next
            return;
        }

        const speed = CatConfig.walkSpeed;
        const step = Math.min(speed * delta, dist);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;

        // Clamp to park bounds
        pos.x = THREE.MathUtils.clamp(pos.x, -HALF_PARK, HALF_PARK);
        pos.z = THREE.MathUtils.clamp(pos.z, -HALF_PARK, HALF_PARK);

        // Face direction of travel
        const angle = Math.atan2(dx, dz);
        this.group.rotation.y = THREE.MathUtils.lerp(
            this.group.rotation.y, angle, CatConfig.turnSpeed * delta
        );

        // Walking bob
        this.group.position.y = Math.abs(Math.sin(Date.now() * 0.008)) * 0.04;
    }

    _onStateChange(newState) {
        if (this.onStateChange) this.onStateChange(newState);
    }

    _buildMesh() {
        const { furColor, bellyColor, eyeColor, noseColor } = CatConfig.appearance;

        const furMat   = new THREE.MeshStandardMaterial({ color: furColor,   roughness: 0.7 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.6 });
        const eyeMat   = new THREE.MeshStandardMaterial({ color: eyeColor,   roughness: 0.2, metalness: 0.1 });
        const noseMat  = new THREE.MeshStandardMaterial({ color: noseColor,  roughness: 0.3 });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        // Body
        const bodyGeo = new THREE.SphereGeometry(0.72, 20, 16);
        bodyGeo.scale(1, 0.82, 1.15);
        const body = new THREE.Mesh(bodyGeo, furMat);
        body.position.set(0, 0.72, 0);
        body.castShadow = true;
        body.userData.baseY = 0.72;
        this.group.add(body);
        this._parts.body = body;

        // Belly
        const bellyGeo = new THREE.SphereGeometry(0.5, 16, 12);
        bellyGeo.scale(0.78, 0.65, 0.95);
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.set(0, 0.65, 0.2);
        this.group.add(belly);

        // Head
        const headGeo = new THREE.SphereGeometry(0.52, 20, 16);
        headGeo.scale(1.08, 0.98, 1.0);
        const head = new THREE.Mesh(headGeo, furMat);
        head.position.set(0, 1.32, 0.58);
        head.castShadow = true;
        head.name = 'cat_head';
        this.group.add(head);
        this._parts.head = head;

        // Ears
        const earGeo = new THREE.ConeGeometry(0.18, 0.32, 12);
        const earL = new THREE.Mesh(earGeo, furMat);
        earL.position.set(-0.28, 1.76, 0.52);
        earL.rotation.set(-0.1, 0, 0.3);
        earL.castShadow = true;
        const earR = new THREE.Mesh(earGeo, furMat);
        earR.position.set(0.28, 1.76, 0.52);
        earR.rotation.set(-0.1, 0, -0.3);
        earR.castShadow = true;
        this.group.add(earL, earR);
        this._parts.earL = earL;
        this._parts.earR = earR;

        // Inner ears
        const innerEarGeo = new THREE.ConeGeometry(0.1, 0.2, 10);
        const innerMat = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, roughness: 0.5 });
        const iEarL = new THREE.Mesh(innerEarGeo, innerMat);
        iEarL.position.set(-0.28, 1.76, 0.52);
        iEarL.rotation.set(-0.1, 0, 0.3);
        const iEarR = new THREE.Mesh(innerEarGeo, innerMat);
        iEarR.position.set(0.28, 1.76, 0.52);
        iEarR.rotation.set(-0.1, 0, -0.3);
        this.group.add(iEarL, iEarR);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.075, 14, 10);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.19, 1.38, 1.06);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.19, 1.38, 1.06);
        this.group.add(eyeL, eyeR);
        this._parts.eyeL = eyeL;
        this._parts.eyeR = eyeR;

        // Pupils
        const pupilGeo = new THREE.SphereGeometry(0.04, 10, 8);
        const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
        pupilL.position.set(-0.19, 1.38, 1.13);
        const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
        pupilR.position.set(0.19, 1.38, 1.13);
        this.group.add(pupilL, pupilR);

        // Nose
        const noseGeo = new THREE.SphereGeometry(0.055, 10, 8);
        noseGeo.scale(1.2, 0.8, 1);
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 1.28, 1.12);
        this.group.add(nose);

        // Legs (stored for walking animation)
        const legGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.45, 10);
        const legPositions = [
            [-0.38, 0.22, 0.55], [0.38, 0.22, 0.55],
            [-0.42, 0.22, -0.42], [0.42, 0.22, -0.42],
        ];
        const legs = [];
        legPositions.forEach(([x, y, z]) => {
            const leg = new THREE.Mesh(legGeo, furMat);
            leg.position.set(x, y, z);
            leg.userData.baseY = y;
            leg.castShadow = true;
            this.group.add(leg);
            legs.push(leg);
        });
        this._parts.legs = legs;

        // Paws
        const pawGeo = new THREE.SphereGeometry(0.14, 12, 8);
        pawGeo.scale(1, 0.55, 1.2);
        const pawMat = new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.6 });
        legPositions.forEach(([x, , z]) => {
            const paw = new THREE.Mesh(pawGeo, pawMat);
            paw.position.set(x, 0.02, z + (z > 0 ? 0.08 : -0.08));
            paw.castShadow = true;
            this.group.add(paw);
        });

        // Tail
        const tailGroup = new THREE.Group();
        tailGroup.position.set(0, 0.58, -0.88);
        const tailNodes = [];
        let parent = tailGroup;
        for (let i = 0; i < 7; i++) {
            const r = 0.085 - i * 0.008;
            const segGeo = new THREE.CylinderGeometry(r, r + 0.008, 0.22, 10);
            segGeo.translate(0, 0.11, 0);
            const seg = new THREE.Mesh(segGeo, i % 2 === 0 ? furMat : bellyMat);
            seg.castShadow = true;
            if (i > 0) seg.position.y = 0.2;
            parent.add(seg);
            tailNodes.push(seg);
            parent = seg;
        }
        this.group.add(tailGroup);
        this._parts.tailNodes = tailNodes;
        this._parts.tailGroup = tailGroup;
    }
}
