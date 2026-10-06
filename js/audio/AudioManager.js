/**
 * AudioManager.js — Web Audio API manager with synth fallback.
 */

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.isReady = false;
        this.isMuted = false;
        this._buffers = {};
        this._purrSource = null;
        this._purrGain = null;
        this._lastMeow = 0;
    }

    async init() {
        if (this.isReady) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        this.isReady = true;
        this._loadFiles();
    }

    async _loadFiles() {
        const files = { purr: 'assets/audio/purr.mp3', meow: 'assets/audio/meow.mp3' };
        for (const [key, url] of Object.entries(files)) {
            try {
                const res = await fetch(url);
                if (!res.ok) continue;
                const buf = await res.arrayBuffer();
                this._buffers[key] = await this.ctx.decodeAudioData(buf);
            } catch (_) { /* use synth fallback */ }
        }
    }

    playMeow() {
        if (!this.isReady || this.isMuted) return;
        const now = Date.now();
        if (now - this._lastMeow < 700) return;
        this._lastMeow = now;
        if (this._buffers.meow) {
            this._playBuffer(this._buffers.meow, 0.7);
        } else {
            this._synthMeow();
        }
    }

    playPurr() {
        if (!this.isReady || this.isMuted || this._purrSource) return;
        if (this._buffers.purr) {
            this._purrGain = this.ctx.createGain();
            this._purrGain.gain.value = 0.35;
            this._purrSource = this.ctx.createBufferSource();
            this._purrSource.buffer = this._buffers.purr;
            this._purrSource.loop = true;
            this._purrSource.connect(this._purrGain);
            this._purrGain.connect(this.ctx.destination);
            this._purrSource.start();
        } else {
            this._synthPurr();
        }
    }

    stopPurr() {
        if (this._purrSource) {
            try { this._purrSource.stop(); } catch (_) {}
            this._purrSource = null;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) this.stopPurr();
        return this.isMuted;
    }

    _playBuffer(buffer, gain = 0.6) {
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const g = this.ctx.createGain();
        g.gain.value = gain;
        src.connect(g);
        g.connect(this.ctx.destination);
        src.start();
    }

    _synthMeow() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(360, now + 0.42);
        const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(900, now);
        f.Q.value = 3;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.45, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
        osc.connect(f); f.connect(g); g.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.46);
    }

    _synthPurr() {
        const now = this.ctx.currentTime;
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i++) {
            const w = Math.random() * 2 - 1;
            data[i] = last = (last + 0.02 * w) / 1.02 * 3.5;
        }
        this._purrSource = this.ctx.createBufferSource();
        this._purrSource.buffer = buf;
        this._purrSource.loop = true;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 140;
        this._purrGain = this.ctx.createGain();
        this._purrGain.gain.value = 0.2;
        this._purrSource.connect(filt);
        filt.connect(this._purrGain);
        this._purrGain.connect(this.ctx.destination);
        this._purrSource.start();
    }
}
