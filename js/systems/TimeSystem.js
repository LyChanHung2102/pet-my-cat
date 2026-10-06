/**
 * TimeSystem.js — Day/night cycle driving sky, fog, lights, and stars.
 * One full cycle = 10 real minutes.
 */

import * as THREE from 'three';

const PHASES = [
    {
        name: 'MORNING',
        sky:     new THREE.Color(0xFFD9A0),
        fog:     new THREE.Color(0xFFDDB0),
        ambient: new THREE.Color(0xFFE8C0),
        sun:     new THREE.Color(0xFFCC88),
        ambientIntensity: 0.6,
        sunIntensity: 1.2,
        sunAngle: 0.3,
        stars: 0.0,
    },
    {
        name: 'DAY',
        sky:     new THREE.Color(0xB8E4F9),
        fog:     new THREE.Color(0xC8EAF5),
        ambient: new THREE.Color(0xFFF5E0),
        sun:     new THREE.Color(0xFFF8DC),
        ambientIntensity: 0.7,
        sunIntensity: 1.6,
        sunAngle: 1.2,
        stars: 0.0,
    },
    {
        name: 'SUNSET',
        sky:     new THREE.Color(0xFF8C5A),
        fog:     new THREE.Color(0xFFAA70),
        ambient: new THREE.Color(0xFF9966),
        sun:     new THREE.Color(0xFF7733),
        ambientIntensity: 0.5,
        sunIntensity: 1.0,
        sunAngle: 2.2,
        stars: 0.0,
    },
    {
        name: 'NIGHT',
        sky:     new THREE.Color(0x0D1B2A),
        fog:     new THREE.Color(0x111E2E),
        ambient: new THREE.Color(0x2A3A5A),
        sun:     new THREE.Color(0x334466),
        ambientIntensity: 0.25,
        sunIntensity: 0.2,
        sunAngle: 3.0,
        stars: 1.0,
    },
];

const CYCLE_DURATION = 600; // 10 real minutes

export class TimeSystem {
    constructor(scene, ambientLight, sunLight) {
        this._scene   = scene;
        this._ambient = ambientLight;
        this._sun     = sunLight;
        this._elapsed = CYCLE_DURATION * 0.15; // start mid-morning
        this._phaseName = 'DAY';

        this._skyColor = new THREE.Color();
        this._fogColor = new THREE.Color();

        this._stars = this._buildStars();
        this._scene.add(this._stars);
    }

    get phase() { return this._phaseName; }

    /** 0=day, 1=full night — used to dim butterflies */
    get nightBlend() { return this._nightBlend ?? 0; }

    update(delta) {
        this._elapsed = (this._elapsed + delta) % CYCLE_DURATION;
        const t = this._elapsed / CYCLE_DURATION;

        const count = PHASES.length;
        const raw   = t * count;
        const idx   = Math.floor(raw) % count;
        const next  = (idx + 1) % count;
        const blend = raw - Math.floor(raw);

        const a = PHASES[idx];
        const b = PHASES[next];
        this._phaseName = blend < 0.5 ? a.name : b.name;

        this._skyColor.lerpColors(a.sky, b.sky, blend);
        this._fogColor.lerpColors(a.fog, b.fog, blend);
        this._scene.background.copy(this._skyColor);
        if (this._scene.fog) this._scene.fog.color.copy(this._fogColor);

        this._ambient.color.lerpColors(a.ambient, b.ambient, blend);
        this._ambient.intensity = THREE.MathUtils.lerp(a.ambientIntensity, b.ambientIntensity, blend);

        this._sun.color.lerpColors(a.sun, b.sun, blend);
        this._sun.intensity = THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, blend);
        const angle = THREE.MathUtils.lerp(a.sunAngle, b.sunAngle, blend);
        this._sun.position.set(Math.cos(angle) * 12, Math.sin(angle) * 12, 6);

        // Stars fade in at night
        this._nightBlend = THREE.MathUtils.lerp(a.stars, b.stars, blend);
        this._stars.material.opacity = this._nightBlend * 0.9;
        this._stars.visible = this._nightBlend > 0.01;
    }

    _buildStars() {
        const count = 180;
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.random() * Math.PI * 0.5; // upper hemisphere only
            const r     = 45;
            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi) + 5;
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.35,
            transparent: true,
            opacity: 0,
            depthWrite: false,
        });
        return new THREE.Points(geo, mat);
    }
}
