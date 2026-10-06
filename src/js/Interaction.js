/**
 * Interaction.js
 * Quản lý Raycasting, Bắt sự kiện chuột/cảm ứng, tính toán vận tốc nựng (Mouse Velocity),
 * Idle Timer quản lý chuyển đổi Trạng thái Ngủ (SLEEPING) và Nựng (AWAKE).
 */

import * as THREE from 'three';

export class InteractionManager {
    /**
     * @param {THREE.Camera} camera 
     * @param {THREE.Scene} scene 
     * @param {HTMLElement} domElement 
     * @param {AudioManager} audioManager 
     */
    constructor(camera, scene, domElement, audioManager) {
        this.camera = camera;
        this.scene = scene;
        this.domElement = domElement;
        this.audioManager = audioManager;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // State Tracking (Mặc định bắt đầu ở SLEEPING)
        this.currentState = 'SLEEPING'; // 'SLEEPING' | 'AWAKE'
        this.idleTimer = 0;
        this.IDLE_SLEEP_TIMEOUT = 5.5; // Sau 5.5s ngưng nựng sẽ tự nhắm mắt ngủ

        this.isPointerDown = false;
        this.isHoveringCat = false;
        this.lastPointerPos = new THREE.Vector2();
        this.lastTimestamp = 0;
        this.mouseVelocity = 0;
        this.strokeDistance = 0;
        this.happiness = 0;
        this.petCount = 0;
        this.targetCatMesh = null;

        // Callbacks
        this.onStateChange = null;  // Thông báo khi chuyển đổi giữa SLEEPING và AWAKE
        this.onPetStart = null;
        this.onPetting = null;
        this.onPetEnd = null;
        this.onCatClick = null;
        this.onHappinessChange = null;
        this.onPetCountChange = null;

        this.hearts = [];

        this.bindEvents();
    }

    bindEvents() {
        const el = this.domElement;

        el.addEventListener('pointerdown', this.onPointerDown.bind(this));
        el.addEventListener('pointermove', this.onPointerMove.bind(this));
        el.addEventListener('pointerup', this.onPointerUp.bind(this));
        el.addEventListener('pointerleave', this.onPointerUp.bind(this));

        el.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.updatePointerCoords(e.touches[0]);
            }
        }, { passive: true });
    }

    setTargetCat(catMesh) {
        this.targetCatMesh = catMesh;
    }

    updatePointerCoords(event) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Đánh thức mèo từ SLEEPING sang AWAKE
     */
    wakeUpCat() {
        this.idleTimer = 0;
        if (this.currentState !== 'AWAKE') {
            this.currentState = 'AWAKE';
            if (this.onStateChange) {
                this.onStateChange('AWAKE');
            }
        }
    }

    onPointerDown(event) {
        this.isPointerDown = true;
        this.updatePointerCoords(event);
        this.lastPointerPos.set(event.clientX, event.clientY);
        this.lastTimestamp = performance.now();
        this.strokeDistance = 0;

        const hit = this.checkRaycastHit();
        if (hit) {
            // Đánh thức mèo khi chạm vào
            this.wakeUpCat();

            if (this.onPetStart) {
                this.onPetStart(hit);
            }

            if (this.audioManager) {
                this.audioManager.playMeow();
            }
            this.spawnHeart(hit.point);

            if (this.onCatClick) {
                this.onCatClick(hit);
            }
        }
    }

    onPointerMove(event) {
        this.updatePointerCoords(event);
        const now = performance.now();
        const dt = Math.max(1, now - this.lastTimestamp);

        const currentPos = new THREE.Vector2(event.clientX, event.clientY);
        const distance = currentPos.distanceTo(this.lastPointerPos);
        this.mouseVelocity = distance / dt;

        this.lastPointerPos.copy(currentPos);
        this.lastTimestamp = now;

        const hit = this.checkRaycastHit();

        if (hit) {
            if (!this.isHoveringCat) {
                this.isHoveringCat = true;
                if (this.onPetStart) this.onPetStart(hit);
            }

            if (this.isPointerDown || distance > 2) {
                this.wakeUpCat();
                this.handlePetting(distance, this.mouseVelocity, hit);
            }
        } else {
            if (this.isHoveringCat) {
                this.isHoveringCat = false;
                if (this.audioManager) this.audioManager.stopPurr();
                if (this.onPetEnd) this.onPetEnd();
            }
        }
    }

    onPointerUp() {
        if (this.isPointerDown) {
            this.isPointerDown = false;
            this.mouseVelocity = 0;
            if (this.audioManager) {
                this.audioManager.stopPurr();
            }
            if (this.onPetEnd) {
                this.onPetEnd();
            }
        }
    }

    checkRaycastHit() {
        if (!this.targetCatMesh) return null;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.targetCatMesh, true);
        return intersects.length > 0 ? intersects[0] : null;
    }

    handlePetting(distance, velocity, hit) {
        const isGentlePetting = velocity > 0.05 && velocity < 3.5;

        if (isGentlePetting) {
            this.happiness = Math.min(100, this.happiness + 0.8);
            if (this.onHappinessChange) {
                this.onHappinessChange(this.happiness);
            }

            if (this.audioManager) {
                this.audioManager.playPurr();
                this.audioManager.setPurrIntensity(Math.min(1.0, velocity * 0.5));
            }

            if (this.onPetting) {
                this.onPetting(velocity, hit);
            }

            this.strokeDistance += distance;
            if (this.strokeDistance > 150) {
                this.petCount++;
                this.strokeDistance = 0;
                if (this.onPetCountChange) {
                    this.onPetCountChange(this.petCount);
                }

                if (this.petCount % 5 === 0 && this.audioManager) {
                    this.audioManager.playMeow();
                }
            }

            if (Math.random() < 0.25) {
                this.spawnHeart(hit.point);
            }
        }
    }

    spawnHeart(position) {
        if (!this.heartGeometry) {
            const x = 0, y = 0;
            const heartShape = new THREE.Shape();
            heartShape.moveTo(x + 0.25, y + 0.25);
            heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.2, y, x, y);
            heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
            heartShape.bezierCurveTo(x - 0.3, y + 0.55, x - 0.1, y + 0.77, x + 0.25, y + 0.95);
            heartShape.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
            heartShape.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
            heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

            const extrudeSettings = { depth: 0.1, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
            this.heartGeometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
            this.heartGeometry.center();
            this.heartMaterial = new THREE.MeshStandardMaterial({
                color: 0xff4757,
                roughness: 0.2,
                metalness: 0.1,
                emissive: 0xff6b81,
                emissiveIntensity: 0.4
            });
        }

        const heartMesh = new THREE.Mesh(this.heartGeometry, this.heartMaterial);
        heartMesh.scale.setScalar(0.22 + Math.random() * 0.15);
        heartMesh.position.copy(position);
        heartMesh.position.x += (Math.random() - 0.5) * 0.3;
        heartMesh.position.z += (Math.random() - 0.5) * 0.3;

        heartMesh.userData = {
            vy: 0.02 + Math.random() * 0.015,
            rotSpeed: (Math.random() - 0.5) * 0.08,
            life: 1.0
        };

        this.scene.add(heartMesh);
        this.hearts.push(heartMesh);
    }

    /**
     * Cập nhật đếm thời gian Idle để tự động ngủ lại sau 5.5 giây
     */
    update(delta) {
        if (!this.isPointerDown) {
            // Đếm thời gian ngưng nựng
            this.idleTimer += delta;

            // Giảm chỉ số hạnh phúc theo thời gian
            if (this.happiness > 0) {
                this.happiness = Math.max(0, this.happiness - delta * 3.5);
                if (this.onHappinessChange) {
                    this.onHappinessChange(this.happiness);
                }
            }

            // Tự động ngủ lại nếu qua thời gian timeout
            if (this.idleTimer > this.IDLE_SLEEP_TIMEOUT && this.currentState === 'AWAKE') {
                this.currentState = 'SLEEPING';
                if (this.onStateChange) {
                    this.onStateChange('SLEEPING');
                }
            }
        } else {
            this.idleTimer = 0;
        }

        // Cập nhật các hạt trái tim
        for (let i = this.hearts.length - 1; i >= 0; i--) {
            const h = this.hearts[i];
            h.position.y += h.userData.vy;
            h.rotation.y += h.userData.rotSpeed;
            h.userData.life -= delta * 1.2;
            h.scale.multiplyScalar(0.98);

            if (h.userData.life <= 0 || h.scale.x < 0.05) {
                this.scene.remove(h);
                h.geometry.dispose();
                this.hearts.splice(i, 1);
            }
        }
    }
}
