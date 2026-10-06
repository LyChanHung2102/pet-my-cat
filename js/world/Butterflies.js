/**
 * Butterflies.js — A few ambient butterflies fluttering around the park.
 * Each butterfly is two flat quads (wings) on a simple figure-8 flight path.
 */

import * as THREE from 'three';

const WING_COLORS = [0xFF8FAB, 0xFFD166, 0xC77DFF, 0x74C0FC, 0xA8E6CF];
const PATHS = [
    { cx: -3, cz: -3, r: 2.5, speed: 0.4, height: 1.2 },
    { cx:  4, cz:  2, r: 2.0, speed: 0.55, height: 1.5 },
    { cx: -1, cz:  5, r: 1.8, speed: 0.35, height: 1.0 },
];

export class Butterflies {
    constructor(scene) {
        this._scene = scene;
        this._butterflies = [];
        this._t = 0;
        this._build();
    }

    _build() {
        PATHS.forEach((path, i) => {
            const color = WING_COLORS[i % WING_COLORS.length];
            const group = new THREE.Group();

            const wingGeo = new THREE.PlaneGeometry(0.22, 0.16);
            const mat = new THREE.MeshBasicMaterial({
                color,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.85,
            });

            const wingL = new THREE.Mesh(wingGeo, mat);
            wingL.position.x = -0.11;
            const wingR = new THREE.Mesh(wingGeo, mat.clone());
            wingR.position.x =  0.11;

            group.add(wingL, wingR);
            this._scene.add(group);

            this._butterflies.push({ group, wingL, wingR, path, offset: i * 2.1 });
        });
    }

    update(delta) {
        this._t += delta;
        this._butterflies.forEach(({ group, wingL, wingR, path, offset }) => {
            const t = this._t * path.speed + offset;

            // Elliptical orbit
            group.position.x = path.cx + Math.cos(t) * path.r;
            group.position.z = path.cz + Math.sin(t * 2) * path.r * 0.5;
            group.position.y = path.height + Math.sin(t * 3) * 0.2;

            // Face direction of travel
            const dx = -Math.sin(t) * path.r;
            const dz =  Math.cos(t * 2) * path.r;
            if (Math.abs(dx) + Math.abs(dz) > 0.01) {
                group.rotation.y = Math.atan2(dx, dz);
            }

            // Wing flap
            const flap = Math.sin(this._t * 8 + offset) * 0.5;
            wingL.rotation.y =  flap;
            wingR.rotation.y = -flap;
        });
    }
}
