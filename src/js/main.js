/**
 * main.js
 * Điểm khởi chạy ứng dụng 3D "Nựng Mèo WebGL" (Pet My Cat 3D).
 * Tích hợp State Machine (SLEEPING / AWAKE), Zzz 3D Particle Generator,
 * LERP Sleeping Pose ➔ Comfort Wake-up Animation & Web Audio Snore/Purr System.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AudioManager } from './AudioManager.js';
import { InteractionManager } from './Interaction.js';

class CatApp {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        this.clock = new THREE.Clock();

        // Core Three.js Components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Managers
        this.audioManager = new AudioManager();
        this.interaction = null;

        // Objects, Bones & Animation States
        this.catGroup = new THREE.Group();
        this.catState = 'SLEEPING'; // 'SLEEPING' | 'AWAKE'
        this.bones = {
            head: null,
            neck: null,
            spine: null,
            tail: null
        };
        this.proceduralParts = {};
        this.isProcedural = false;
        this.blinkTimer = 0;

        // Squish Effect Targets
        this.scaleTarget = new THREE.Vector3(1, 1, 1);
        this.bounceVelocity = 0;

        // Zzz Floating Particle System cho Trạng thái Ngủ
        this.zzzParticles = [];
        this.zzzTimer = 0;

        this.cameraViews = [
            { pos: new THREE.Vector3(0, 2.2, 4.5), target: new THREE.Vector3(0, 0.8, 0) },
            { pos: new THREE.Vector3(3.5, 2.0, 3.0), target: new THREE.Vector3(0, 0.8, 0) },
            { pos: new THREE.Vector3(0, 4.5, 0.1), target: new THREE.Vector3(0, 0.5, 0) }
        ];
        this.currentViewIdx = 0;

        // Pipeline Init
        this.initScene();
        this.initLights();
        this.initFloorAndEnv();
        this.loadCatModel();
        this.initInteraction();
        this.initUI();

        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Start Render Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffeaa7);
        this.scene.fog = new THREE.FogExp2(0xffeaa7, 0.05);

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.copy(this.cameraViews[0].pos);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
        this.controls.minDistance = 2.0;
        this.controls.maxDistance = 8.0;
        this.controls.target.copy(this.cameraViews[0].target);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.85);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xfffaed, 1.4);
        mainLight.position.set(4, 6, 4);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.bias = -0.0005;

        const d = 3;
        mainLight.shadow.camera.left = -d;
        mainLight.shadow.camera.right = d;
        mainLight.shadow.camera.top = d;
        mainLight.shadow.camera.bottom = -d;

        this.scene.add(mainLight);

        const rimLight = new THREE.DirectionalLight(0x70a1ff, 0.4);
        rimLight.position.set(-4, 3, -4);
        this.scene.add(rimLight);
    }

    initFloorAndEnv() {
        const floorGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.3, 64);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0xdfe6e9,
            roughness: 0.4
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.15;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const rugGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.04, 48);
        const rugMat = new THREE.MeshStandardMaterial({
            color: 0xff758c,
            roughness: 0.8
        });
        const rug = new THREE.Mesh(rugGeo, rugMat);
        rug.position.y = 0.02;
        rug.receiveShadow = true;
        this.scene.add(rug);
    }

    loadCatModel() {
        const loader = new GLTFLoader();

        loader.load(
            'assets/models/cat.glb',
            (gltf) => {
                console.log('✅ Đã tải mô hình GLTF cat.glb!');
                const model = gltf.scene;

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                    if (child.isBone || child.type === 'Bone') {
                        const boneName = child.name.toLowerCase();
                        if (boneName.includes('head')) this.bones.head = child;
                        if (boneName.includes('neck')) this.bones.neck = child;
                        if (boneName.includes('spine')) this.bones.spine = child;
                        if (boneName.includes('tail')) this.bones.tail = child;
                    }
                });

                model.scale.set(1, 1, 1);
                this.catGroup.add(model);
                this.scene.add(this.catGroup);
                this.interaction.setTargetCat(this.catGroup);
            },
            undefined,
            () => {
                console.log('ℹ️ Sử dụng Mèo 3D Procedural với hệ thống Trạng Thái Ngủ 💤 & Nựng 😸');
                this.buildProceduralCat();
            }
        );
    }

    buildProceduralCat() {
        this.isProcedural = true;

        const catFurMat = new THREE.MeshStandardMaterial({
            color: 0xff8c2b,
            roughness: 0.6
        });

        const whiteMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5
        });

        // Thân (Body)
        const bodyGeo = new THREE.SphereGeometry(0.75, 32, 32);
        bodyGeo.scale(1, 0.85, 1.2);
        const body = new THREE.Mesh(bodyGeo, catFurMat);
        body.position.set(0, 0.75, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        body.name = 'cat_body';
        this.catGroup.add(body);
        this.bones.spine = body;

        // Bụng trắng
        const bellyGeo = new THREE.SphereGeometry(0.55, 32, 32);
        bellyGeo.scale(0.8, 0.7, 1.0);
        const belly = new THREE.Mesh(bellyGeo, whiteMat);
        belly.position.set(0, 0.68, 0.18);
        this.catGroup.add(belly);

        // Đầu (Head)
        const headGeo = new THREE.SphereGeometry(0.55, 32, 32);
        headGeo.scale(1.1, 0.95, 1.0);
        const head = new THREE.Mesh(headGeo, catFurMat);
        head.position.set(0, 1.35, 0.6);
        head.castShadow = true;
        head.name = 'cat_head';
        this.catGroup.add(head);

        this.bones.head = head;
        this.proceduralParts.head = head;

        // Tai Mèo
        const earGeo = new THREE.ConeGeometry(0.2, 0.35, 16);
        const earL = new THREE.Mesh(earGeo, catFurMat);
        earL.position.set(-0.3, 1.8, 0.55);
        earL.rotation.set(-0.1, 0, 0.3);
        earL.castShadow = true;

        const earR = new THREE.Mesh(earGeo, catFurMat);
        earR.position.set(0.3, 1.8, 0.55);
        earR.rotation.set(-0.1, 0, -0.3);
        earR.castShadow = true;

        this.catGroup.add(earL, earR);

        // Mắt Mèo (Eyes)
        const eyeGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00b894 });
        
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.2, 1.42, 1.08);

        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.2, 1.42, 1.08);

        this.catGroup.add(eyeL, eyeR);
        this.proceduralParts.eyeLeft = eyeL;
        this.proceduralParts.eyeRight = eyeR;

        // Mũi hồng
        const noseGeo = new THREE.ConeGeometry(0.06, 0.08, 8);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xff758c, roughness: 0.3 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 1.32, 1.15);
        nose.rotation.x = Math.PI;
        this.catGroup.add(nose);

        // Chân (Paws)
        const pawGeo = new THREE.SphereGeometry(0.18, 16, 16);
        pawGeo.scale(1, 0.6, 1.3);

        const pawFL = new THREE.Mesh(pawGeo, whiteMat);
        pawFL.position.set(-0.4, 0.15, 0.7);
        pawFL.castShadow = true;

        const pawFR = new THREE.Mesh(pawGeo, whiteMat);
        pawFR.position.set(0.4, 0.15, 0.7);
        pawFR.castShadow = true;

        const pawBL = new THREE.Mesh(pawGeo, whiteMat);
        pawBL.position.set(-0.45, 0.15, -0.5);
        pawBL.castShadow = true;

        const pawBR = new THREE.Mesh(pawGeo, whiteMat);
        pawBR.position.set(0.45, 0.15, -0.5);
        pawBR.castShadow = true;

        this.catGroup.add(pawFL, pawFR, pawBL, pawBR);

        // Đuôi Mèo
        this.tailGroup = new THREE.Group();
        this.tailGroup.position.set(0, 0.6, -0.85);

        const tailSegments = 6;
        this.tailNodes = [];
        let parentNode = this.tailGroup;

        for (let i = 0; i < tailSegments; i++) {
            const segGeo = new THREE.CylinderGeometry(0.09 - i * 0.01, 0.1 - i * 0.01, 0.2, 16);
            segGeo.translate(0, 0.1, 0);
            const segMesh = new THREE.Mesh(segGeo, i % 2 === 0 ? catFurMat : whiteMat);
            segMesh.castShadow = true;
            if (i > 0) segMesh.position.y = 0.18;
            parentNode.add(segMesh);
            this.tailNodes.push(segMesh);
            parentNode = segMesh;
        }

        this.bones.tail = this.tailGroup;
        this.catGroup.add(this.tailGroup);
        this.scene.add(this.catGroup);
        this.interaction.setTargetCat(this.catGroup);
    }

    /**
     * Khởi tạo Interaction Manager và các Callbacks
     */
    initInteraction() {
        this.interaction = new InteractionManager(
            this.camera,
            this.scene,
            this.renderer.domElement,
            this.audioManager
        );

        const stateBadge = document.getElementById('cat-state-badge');
        const hintText = document.getElementById('hint-text');
        const happinessFill = document.getElementById('happiness-fill');
        const happinessVal = document.getElementById('happiness-val');
        const petCountVal = document.getElementById('pet-count');

        // Callback chuyển đổi Trạng thái (SLEEPING ↔ AWAKE)
        this.interaction.onStateChange = (newState) => {
            this.catState = newState;

            if (newState === 'SLEEPING') {
                if (stateBadge) {
                    stateBadge.innerText = '💤 Đang ngủ...';
                    stateBadge.className = 'state-badge sleeping';
                }
                if (hintText) {
                    hintText.innerHTML = '💡 <strong>Hướng dẫn:</strong> Bé mèo đang ngủ khò khò... Hãy chạm hoặc vuốt nhẹ lên bé để đánh thức và nựng nhé! 💤';
                }
                if (this.audioManager) {
                    this.audioManager.stopPurr();
                    this.audioManager.playSnore();
                }
            } else if (newState === 'AWAKE') {
                if (stateBadge) {
                    stateBadge.innerText = '😸 Thỏa mãn 100%';
                    stateBadge.className = 'state-badge awake';
                }
                if (hintText) {
                    hintText.innerHTML = '✨ <strong>Đang nựng:</strong> Vuốt chuột hoặc ngón tay liên tục để bé mèo rên purr rủ rỉ nhé! ❤️';
                }
                if (this.audioManager) {
                    this.audioManager.stopSnore();
                }
            }
        };

        this.interaction.onHappinessChange = (val) => {
            const pct = Math.round(val);
            if (happinessFill) happinessFill.style.width = `${pct}%`;
            if (happinessVal) happinessVal.innerText = `${pct}%`;
        };

        this.interaction.onPetCountChange = (count) => {
            if (petCountVal) petCountVal.innerText = count;
        };

        this.interaction.onPetStart = () => {
            this.scaleTarget.set(1.06, 0.94, 1.06);
        };

        this.interaction.onPetting = (velocity) => {
            const squishAmount = Math.min(0.18, velocity * 0.08);
            this.scaleTarget.set(
                1.0 + squishAmount,
                1.0 - squishAmount * 1.2,
                1.0 + squishAmount
            );
        };

        this.interaction.onCatClick = () => {
            this.bounceVelocity = 0.12;
            this.scaleTarget.set(1.15, 0.85, 1.15);
        };

        this.interaction.onPetEnd = () => {
            this.scaleTarget.set(1.0, 1.0, 1.0);
        };
    }

    initUI() {
        const startOverlay = document.getElementById('start-overlay');
        const startBtn = document.getElementById('start-btn');
        const soundBtn = document.getElementById('toggle-sound-btn');
        const cameraBtn = document.getElementById('change-camera-btn');
        const audioBadge = document.getElementById('audio-status');

        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                await this.audioManager.init();
                if (startOverlay) startOverlay.classList.add('hidden');
                if (audioBadge) {
                    audioBadge.innerText = 'Đã bật 🔊';
                    audioBadge.classList.add('active');
                }
                // Phát tiếng ngáy ngủ ban đầu
                if (this.catState === 'SLEEPING') {
                    this.audioManager.playSnore();
                }
            });
        }

        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const isMuted = this.audioManager.toggleMute();
                if (audioBadge) {
                    audioBadge.innerText = isMuted ? 'Đã tắt 🔇' : 'Đã bật 🔊';
                    audioBadge.classList.toggle('active', !isMuted);
                }
            });
        }

        if (cameraBtn) {
            cameraBtn.addEventListener('click', () => {
                this.currentViewIdx = (this.currentViewIdx + 1) % this.cameraViews.length;
                const view = this.cameraViews[this.currentViewIdx];
                this.camera.position.copy(view.pos);
                this.controls.target.copy(view.target);
            });
        }
    }

    /**
     * Tạo hạt biểu tượng Zzz 3D bay lên từ đầu mèo khi ngủ
     */
    spawnZzzParticle() {
        if (!this.bones.head) return;

        const headPos = new THREE.Vector3();
        this.bones.head.getWorldPosition(headPos);

        // Tạo Mesh hạt hình chữ Z đại diện Zzz
        const zGeo = new THREE.BoxGeometry(0.12, 0.12, 0.04);
        const zMat = new THREE.MeshBasicMaterial({
            color: 0x6c5ce7,
            transparent: true,
            opacity: 0.8
        });
        const zMesh = new THREE.Mesh(zGeo, zMat);
        zMesh.position.copy(headPos);
        zMesh.position.x += (Math.random() - 0.5) * 0.2;
        zMesh.position.y += 0.3;
        zMesh.position.z += (Math.random() - 0.5) * 0.2;

        zMesh.userData = {
            vy: 0.012 + Math.random() * 0.008,
            vx: (Math.random() - 0.5) * 0.005,
            life: 1.0,
            scale: 0.6 + Math.random() * 0.6
        };
        zMesh.scale.setScalar(zMesh.userData.scale);

        this.scene.add(zMesh);
        this.zzzParticles.push(zMesh);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Vòng lặp Render chính
     */
    animate() {
        requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        this.controls.update();
        if (this.interaction) {
            this.interaction.update(delta);
        }

        // 1. Quản lý trạng thái Nằm Ngủ (SLEEPING) vs Thức Dậy Thỏa Mãn (AWAKE)
        const headBone = this.bones.head;

        if (this.catState === 'SLEEPING') {
            // Nhắm mắt khi ngủ
            if (this.proceduralParts.eyeLeft && this.proceduralParts.eyeRight) {
                this.proceduralParts.eyeLeft.scale.y = THREE.MathUtils.lerp(this.proceduralParts.eyeLeft.scale.y, 0.05, 0.1);
                this.proceduralParts.eyeRight.scale.y = THREE.MathUtils.lerp(this.proceduralParts.eyeRight.scale.y, 0.05, 0.1);
            }

            // Đầu cúi nhẹ ngủ nghiêng
            if (headBone) {
                headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, 0.25, 0.05);
                headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, 0.2, 0.05);
                headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, 0.15, 0.05);
            }

            // Nhịp thở chậm rãi của giấc ngủ (1.2Hz)
            if (this.catGroup) {
                this.catGroup.position.y = Math.sin(time * 1.5) * 0.012;
            }

            // Sinh hạt Zzz bay bồng bềnh
            this.zzzTimer += delta;
            if (this.zzzTimer > 1.2) {
                this.spawnZzzParticle();
                this.zzzTimer = 0;
            }

        } else if (this.catState === 'AWAKE') {
            // Mở mắt to tròn khi được nựng
            if (this.proceduralParts.eyeLeft && this.proceduralParts.eyeRight) {
                this.proceduralParts.eyeLeft.scale.y = THREE.MathUtils.lerp(this.proceduralParts.eyeLeft.scale.y, 1.0, 0.15);
                this.proceduralParts.eyeRight.scale.y = THREE.MathUtils.lerp(this.proceduralParts.eyeRight.scale.y, 1.0, 0.15);
            }

            // LERP đầu nhìn theo con trỏ chuột
            if (headBone && this.interaction) {
                const mouseX = this.interaction.mouse.x;
                const mouseY = this.interaction.mouse.y;
                const targetYaw = mouseX * 0.45;
                const targetPitch = -mouseY * 0.35;

                headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetYaw, 0.08);
                headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, targetPitch, 0.08);
                headBone.rotation.z = THREE.MathUtils.lerp(headBone.rotation.z, 0, 0.08);
            }
        }

        // 2. Co giãn lún thịt (Squish) & Bounce
        if (this.catGroup) {
            this.catGroup.scale.lerp(this.scaleTarget, 0.12);
            this.scaleTarget.lerp(new THREE.Vector3(1, 1, 1), 0.05);

            if (this.bounceVelocity > 0.001) {
                this.catGroup.position.y += this.bounceVelocity;
                this.bounceVelocity *= 0.85;
            }
        }

        // 3. Animation Đuôi ngoáy nhịp nhàng
        if (this.isProcedural && this.tailNodes) {
            const tailSpeed = this.catState === 'AWAKE' ? 4.0 : 1.2;
            this.tailNodes.forEach((node, idx) => {
                node.rotation.z = Math.sin(time * tailSpeed - idx * 0.4) * 0.15;
            });
        }

        // 4. Cập nhật các hạt Zzz bay bổng
        for (let i = this.zzzParticles.length - 1; i >= 0; i--) {
            const z = this.zzzParticles[i];
            z.position.y += z.userData.vy;
            z.position.x += z.userData.vx;
            z.userData.life -= delta * 0.6;
            z.material.opacity = z.userData.life * 0.8;

            if (z.userData.life <= 0) {
                this.scene.remove(z);
                z.geometry.dispose();
                z.material.dispose();
                this.zzzParticles.splice(i, 1);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new CatApp();
});
