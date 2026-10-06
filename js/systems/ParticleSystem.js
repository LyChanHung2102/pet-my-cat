/**
 * ParticleSystem.js — Heart and Zzz floating particles for cat reactions.
 * Pooled, no per-frame allocations.
 */

import * as THREE from 'three';

const HEART_COLOR = 0xFF4D6D;
const ZZZ_COLOR   = 0x9B8FD4;

export class ParticleSystem {
    constructor(scene) {
        this._scene = scene;
        this._particles = [];
        this._heartGeo = null;
        this._heartMat = null;
        this._initHeartGeo();
    }

    _initHeartGeo() {
        // Simple heart from a shape
        const s = new THREE.Shape();
        s.moveTo(0, 0.25);
        s.bezierCurveTo( 0,    0.25,  0.2,  0,    0,    0);
        s.bezierCurveTo(-0.3,  0,    -0.3,  0.35, -0.3,  0.35);
        s.bezierCurveTo(-0.3,  0.55, -0.1,  0.77,  0,    0.95);
        s.bezierCurveTo( 0.1,  0.77,  0.3,  0.55,  0.3,  0.35);
        s.bezierCurveTo( 0.3,  0.35,  0.3,  0,     0,    0);
        s.bezierCurveTo( 0.2,  0,     0,    0.25,  0,    0.25);
        this._heartGeo = new THREE.ShapeGeometry(s);
        this._heartGeo.center();
        this._heartMat = new THREE.MeshBasicMaterial({
            color: HEART_COLOR,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
    }

    spawnHeart(worldPos) {
        const mesh = new THREE.Mesh(this._heartGeo, this._heartMat.clone());
        mesh.scale.setScalar(0.18 + Math.random() * 0.12);
        mesh.position.copy(worldPos);
        mesh.position.x += (Math.random() - 0.5) * 0.4;
        mesh.position.z += (Math.random() - 0.5) * 0.4;
        mesh.position.y += 0.2;
        mesh.userData = { vy: 0.022 + Math.random() * 0.01, life: 1.0, type: 'heart' };
        this._scene.add(mesh);
        this._particles.push(mesh);
    }

    spawnZzz(worldPos) {
        const geo = new THREE.PlaneGeometry(0.18, 0.18);
        const mat = new THREE.MeshBasicMaterial({
            color: ZZZ_COLOR,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(worldPos);
        mesh.position.x += (Math.random() - 0.5) * 0.3;
        mesh.position.y += 0.5 + Math.random() * 0.2;
        mesh.scale.setScalar(0.5 + Math.random() * 0.5);
        mesh.userData = {
            vy: 0.014 + Math.random() * 0.006,
            vx: (Math.random() - 0.5) * 0.004,
            life: 1.0,
            type: 'zzz',
        };
        this._scene.add(mesh);
        this._particles.push(mesh);
    }

    update(delta) {
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.position.y += p.userData.vy;
            if (p.userData.vx) p.position.x += p.userData.vx;
            p.userData.life -= delta * (p.userData.type === 'zzz' ? 0.5 : 1.0);
            p.material.opacity = Math.max(0, p.userData.life);
            p.rotation.z += delta * 0.5;

            if (p.userData.life <= 0) {
                this._scene.remove(p);
                p.material.dispose();
                this._particles.splice(i, 1);
            }
        }
    }
}
