/**
 * CustomizeUI.js — Cat customization panel (fur, eyes, collar, name).
 * Data-driven. Persists choices via SaveSystem.
 */

import * as THREE from 'three';
import { SaveSystem } from '../systems/SaveSystem.js';

const FUR_OPTIONS = [
    { label: 'Orange', color: 0xD98943 },
    { label: 'Black',  color: 0x2A2A2A },
    { label: 'White',  color: 0xF5F0E8 },
    { label: 'Gray',   color: 0x9E9E9E },
    { label: 'Calico', color: 0xE8A87C },
    { label: 'Cream',  color: 0xF5D5A0 },
];

const EYE_OPTIONS = [
    { label: 'Green', color: 0x4F9C52 },
    { label: 'Blue',  color: 0x4A90D9 },
    { label: 'Amber', color: 0xD4820A },
    { label: 'Teal',  color: 0x2AADAD },
];

const COLLAR_OPTIONS = [
    { label: 'None',  color: null     },
    { label: 'Red',   color: 0xE53935 },
    { label: 'Blue',  color: 0x1E88E5 },
    { label: 'Pink',  color: 0xF06292 },
    { label: 'Green', color: 0x43A047 },
];

export class CustomizeUI {
    constructor(cat) {
        this._cat    = cat;
        this._panel  = document.getElementById('customize-panel');
        this._toggle = document.getElementById('btn-customize');
        this._collar = null;
        this._appearance = { fur: null, eye: null, collar: null };

        if (!this._panel || !this._toggle) return;

        this._buildPanel();
        this._toggle.addEventListener('click', () => this._panel.classList.toggle('panel-open'));
        document.getElementById('customize-close')?.addEventListener('click', () => {
            this._panel.classList.remove('panel-open');
        });

        this._loadAppearance();
    }

    _buildPanel() {
        const body = this._panel.querySelector('.customize-body');
        if (!body) return;

        // Name field
        const nameSection = document.createElement('div');
        nameSection.className = 'customize-section';
        nameSection.innerHTML = `<p class="customize-label">Name</p>`;
        const nameRow = document.createElement('div');
        nameRow.className = 'name-row';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.maxLength = 20;
        nameInput.className = 'name-edit-input';
        nameInput.placeholder = 'Milo';
        nameInput.value = this._cat.stats.name ?? 'Milo';
        nameInput.setAttribute('aria-label', 'Cat name');
        const nameBtn = document.createElement('button');
        nameBtn.className = 'name-save-btn';
        nameBtn.textContent = '✓';
        nameBtn.setAttribute('aria-label', 'Save name');
        nameBtn.addEventListener('click', () => {
            const v = nameInput.value.trim() || 'Milo';
            this._cat.stats.name = v;
            const display = document.getElementById('cat-name-display');
            if (display) display.textContent = v;
            this._saveAppearance();
        });
        nameRow.appendChild(nameInput);
        nameRow.appendChild(nameBtn);
        nameSection.appendChild(nameRow);
        body.appendChild(nameSection);

        this._buildSection(body, 'Fur',    FUR_OPTIONS,    (opt) => { this._applyFur(opt.color);    this._appearance.fur    = opt.color; this._saveAppearance(); });
        this._buildSection(body, 'Eyes',   EYE_OPTIONS,    (opt) => { this._applyEyes(opt.color);   this._appearance.eye    = opt.color; this._saveAppearance(); });
        this._buildSection(body, 'Collar', COLLAR_OPTIONS, (opt) => { this._applyCollar(opt.color); this._appearance.collar = opt.color; this._saveAppearance(); });
    }

    _buildSection(body, title, options, onSelect) {
        const section = document.createElement('div');
        section.className = 'customize-section';

        const label = document.createElement('p');
        label.className = 'customize-label';
        label.textContent = title;
        section.appendChild(label);

        const swatches = document.createElement('div');
        swatches.className = 'customize-swatches';

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'swatch-btn';
            btn.setAttribute('aria-label', opt.label);
            btn.title = opt.label;
            if (opt.color !== null) {
                btn.style.background = `#${opt.color.toString(16).padStart(6, '0')}`;
            } else {
                btn.style.background = 'rgba(0,0,0,0.06)';
                btn.textContent = '✕';
            }
            btn.addEventListener('click', () => {
                onSelect(opt);
                swatches.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            swatches.appendChild(btn);
        });

        section.appendChild(swatches);
        body.appendChild(section);
    }

    _applyFur(color) {
        this._cat.group.traverse(child => {
            if (child.isMesh && child.material?.color && this._isFurColor(child.material.color.getHex())) {
                child.material = child.material.clone();
                child.material.color.setHex(color);
            }
        });
    }

    _applyEyes(color) {
        [this._cat._parts.eyeL, this._cat._parts.eyeR].forEach(eye => {
            if (!eye) return;
            eye.material = eye.material.clone();
            eye.material.color.setHex(color);
        });
    }

    _applyCollar(color) {
        if (this._collar) {
            this._cat.group.remove(this._collar);
            this._collar.geometry.dispose();
            this._collar.material.dispose();
            this._collar = null;
        }
        if (color === null) return;
        const geo = new THREE.TorusGeometry(0.38, 0.055, 8, 20);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
        this._collar = new THREE.Mesh(geo, mat);
        this._collar.position.set(0, 1.05, 0.42);
        this._collar.rotation.x = Math.PI / 2 - 0.3;
        this._collar.castShadow = true;
        this._cat.group.add(this._collar);
    }

    _isFurColor(hex) {
        const r = (hex >> 16) & 0xff;
        const g = (hex >>  8) & 0xff;
        const b =  hex        & 0xff;
        const brightness = (r + g + b) / 3;
        if (brightness < 30) return false;   // pupils
        if (g > 140 && r < 100) return false; // green eyes
        if (b > 140 && r < 100) return false; // blue eyes
        if (r > 200 && g < 120 && b < 140) return false; // nose pink
        return true;
    }

    _saveAppearance() {
        const saved = SaveSystem.load() ?? {};
        saved.appearance = this._appearance;
        saved.name = this._cat.stats.name;
        SaveSystem.save(saved);
    }

    _loadAppearance() {
        const saved = SaveSystem.load();
        if (!saved?.appearance) return;
        const { fur, eye, collar } = saved.appearance;
        if (fur    != null) this._applyFur(fur);
        if (eye    != null) this._applyEyes(eye);
        if (collar != null) this._applyCollar(collar);
        this._appearance = { fur, eye, collar };
    }
}
