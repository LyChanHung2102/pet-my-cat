/**
 * Park.js — Builds the cozy low-poly park environment.
 * ~20×20 unit area with grass, path, trees, flowers, rocks, pond, bench, cat house.
 */

import * as THREE from 'three';

function randBetween(a, b) { return a + Math.random() * (b - a); }

export class Park {
    constructor(scene) {
        this.scene = scene;
        this.ambientLight = null;
        this.sunLight = null;
        this._pondMat = null;
        this._t = 0;
        this._build();
    }

    update(delta) {
        this._t += delta;
        // Gentle pond shimmer
        if (this._pondMat) {
            this._pondMat.opacity = 0.78 + Math.sin(this._t * 1.2) * 0.06;
        }
    }

    _build() {
        this._addGround();
        this._addPath();
        this._addPond();
        this._addTrees();
        this._addFlowers();
        this._addRocks();
        this._addBench();
        this._addCatHouse();
        this._addSky();
        this._addLights();
    }

    _addGround() {
        const geo = new THREE.PlaneGeometry(22, 22, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x7EC850, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }

    _addPath() {
        // Winding dirt path using a few ellipses
        const pathMat = new THREE.MeshStandardMaterial({ color: 0xC4A265, roughness: 1.0 });
        const segments = [
            { x: 0,   z: 0,   rx: 1.2, rz: 5.5, ry: 0.3 },
            { x: 3,   z: 3,   rx: 1.0, rz: 4.0, ry: 0.8 },
            { x: -3,  z: -3,  rx: 1.0, rz: 4.0, ry: -0.5 },
        ];
        segments.forEach(s => {
            const geo = new THREE.CylinderGeometry(s.rx, s.rz, 0.02, 20);
            geo.scale(1, 1, 1);
            const mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(s.rx, s.rz, 0.02, 20),
                pathMat
            );
            mesh.position.set(s.x, 0.01, s.z);
            mesh.rotation.y = s.ry;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        });
    }

    _addPond() {
        // Water surface
        const pondGeo = new THREE.CircleGeometry(2.2, 32);
        const pondMat = new THREE.MeshStandardMaterial({
            color: 0x5BA4CF,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85,
        });
        const pond = new THREE.Mesh(pondGeo, pondMat);
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(5, 0.02, -5);
        this._pondMat = pondMat;
        this.scene.add(pond);

        // Pond rim
        const rimGeo = new THREE.TorusGeometry(2.2, 0.18, 8, 32);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(5, 0.05, -5);
        rim.receiveShadow = true;
        this.scene.add(rim);

        // Lily pads
        const lilyMat = new THREE.MeshStandardMaterial({ color: 0x4A8C3F, roughness: 0.8 });
        [[4.5, -4.8], [5.6, -5.4], [4.8, -5.8]].forEach(([x, z]) => {
            const geo = new THREE.CircleGeometry(0.3 + Math.random() * 0.15, 10);
            const mesh = new THREE.Mesh(geo, lilyMat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(x, 0.04, z);
            this.scene.add(mesh);
        });
    }

    _addTrees() {
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B5E3C, roughness: 0.9 });
        const positions = [
            [-7, -7], [7, -7], [-7, 7], [7, 7],
            [-8, 0], [8, 1], [0, -8], [1, 8],
            [-5, 6], [6, -3],
        ];
        positions.forEach(([x, z]) => {
            const height = randBetween(2.5, 4.0);
            const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, height * 0.4, 8);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(x, height * 0.2, z);
            trunk.castShadow = true;
            this.scene.add(trunk);

            // 2-layer foliage
            const colors = [0x3A7D44, 0x4A9455, 0x2D6B38];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const leafMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

            [0, 0.6].forEach((offset, i) => {
                const r = 1.2 - i * 0.3;
                const h = 1.8 - i * 0.3;
                const leafGeo = new THREE.ConeGeometry(r, h, 8);
                const leaf = new THREE.Mesh(leafGeo, leafMat);
                leaf.position.set(x, height * 0.4 + offset + h / 2, z);
                leaf.castShadow = true;
                this.scene.add(leaf);
            });
        });
    }

    _addFlowers() {
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x4A8C3F, roughness: 0.8 });
        const petalColors = [0xFF8FAB, 0xFFD166, 0xEF476F, 0xFFB347, 0xC77DFF];
        const clusterCenters = [[-4, -4], [3, 6], [-6, 3], [2, -7]];

        clusterCenters.forEach(([cx, cz]) => {
            for (let i = 0; i < 6; i++) {
                const x = cx + randBetween(-1.2, 1.2);
                const z = cz + randBetween(-1.2, 1.2);
                const stemH = randBetween(0.2, 0.4);

                const stemGeo = new THREE.CylinderGeometry(0.025, 0.025, stemH, 6);
                const stem = new THREE.Mesh(stemGeo, stemMat);
                stem.position.set(x, stemH / 2, z);
                this.scene.add(stem);

                const color = petalColors[Math.floor(Math.random() * petalColors.length)];
                const petalMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
                const petalGeo = new THREE.SphereGeometry(0.1, 8, 6);
                const petal = new THREE.Mesh(petalGeo, petalMat);
                petal.position.set(x, stemH + 0.08, z);
                petal.scale.set(1.2, 0.7, 1.2);
                this.scene.add(petal);
            }
        });
    }

    _addRocks() {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x9E9E9E, roughness: 0.95 });
        const positions = [[-3, 4], [4, 2], [-5, -2], [2, -5], [6, 6]];
        positions.forEach(([x, z]) => {
            const s = randBetween(0.15, 0.35);
            const geo = new THREE.DodecahedronGeometry(s, 0);
            const mesh = new THREE.Mesh(geo, rockMat);
            mesh.position.set(x, s * 0.5, z);
            mesh.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            this.scene.add(mesh);
        });
    }

    _addBench() {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xA0522D, roughness: 0.8 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 });

        const benchGroup = new THREE.Group();
        benchGroup.position.set(-6, 0, 2);
        benchGroup.rotation.y = 0.4;

        // Seat
        const seatGeo = new THREE.BoxGeometry(1.6, 0.08, 0.45);
        const seat = new THREE.Mesh(seatGeo, woodMat);
        seat.position.y = 0.45;
        seat.castShadow = true;
        benchGroup.add(seat);

        // Back
        const backGeo = new THREE.BoxGeometry(1.6, 0.5, 0.06);
        const back = new THREE.Mesh(backGeo, woodMat);
        back.position.set(0, 0.72, -0.2);
        back.castShadow = true;
        benchGroup.add(back);

        // Legs
        [[-0.65, 0.2], [0.65, 0.2], [-0.65, -0.2], [0.65, -0.2]].forEach(([x, z]) => {
            const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6);
            const leg = new THREE.Mesh(legGeo, metalMat);
            leg.position.set(x, 0.22, z);
            benchGroup.add(leg);
        });

        benchGroup.traverse(c => { if (c.isMesh) c.receiveShadow = true; });
        this.scene.add(benchGroup);
    }

    _addCatHouse() {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xD2A679, roughness: 0.8 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xC0392B, roughness: 0.7 });

        const houseGroup = new THREE.Group();
        houseGroup.position.set(6, 0, 5);
        houseGroup.rotation.y = -0.6;

        // Walls
        const wallGeo = new THREE.BoxGeometry(1.2, 0.9, 1.0);
        const walls = new THREE.Mesh(wallGeo, woodMat);
        walls.position.y = 0.45;
        walls.castShadow = true;
        houseGroup.add(walls);

        // Roof
        const roofGeo = new THREE.ConeGeometry(0.9, 0.6, 4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.2;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        houseGroup.add(roof);

        // Door hole (dark circle)
        const doorGeo = new THREE.CircleGeometry(0.22, 12);
        const doorMat = new THREE.MeshBasicMaterial({ color: 0x2C1810 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 0.38, 0.51);
        houseGroup.add(door);

        houseGroup.traverse(c => { if (c.isMesh) c.receiveShadow = true; });
        this.scene.add(houseGroup);
    }

    _addSky() {
        this.scene.background = new THREE.Color(0xB8E4F9);
        this.scene.fog = new THREE.FogExp2(0xC8EAF5, 0.035);
    }

    _addLights() {
        this.ambientLight = new THREE.AmbientLight(0xFFF5E0, 0.7);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xFFF8DC, 1.6);
        this.sunLight.position.set(8, 12, 6);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width  = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far  = 40;
        this.sunLight.shadow.camera.left = this.sunLight.shadow.camera.bottom = -12;
        this.sunLight.shadow.camera.right = this.sunLight.shadow.camera.top  =  12;
        this.sunLight.shadow.bias = -0.001;
        this.scene.add(this.sunLight);

        const fill = new THREE.DirectionalLight(0xADD8E6, 0.4);
        fill.position.set(-6, 4, -6);
        this.scene.add(fill);
    }
}
