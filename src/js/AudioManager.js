/**
 * AudioManager.js
 * Quản lý âm thanh cho ứng dụng Nựng Mèo WebGL (Pet My Cat 3D).
 * Hỗ trợ phát tiếng ngáy ngủ (Snore loop), tiếng purr.mp3 (rền khi nựng) và meow.mp3 (kêu thích thú).
 */

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.isInitialized = false;
        this.isMuted = false;

        // Buffers
        this.buffers = {
            purr: null,
            meow: null
        };

        // Purr State
        this.purrSource = null;
        this.purrGain = null;
        this.isPurring = false;
        this.purrIntensity = 0.5;

        // Snore State
        this.snoreOsc = null;
        this.snoreGain = null;
        this.isSnoring = false;

        // Synthesizer Fallback Nodes
        this.purrLfo = null;
        this.purrFilter = null;
        this.noiseNode = null;

        this.lastMeowTime = 0;
    }

    /**
     * Khởi tạo Web Audio Context sau thao tác click của người dùng
     */
    async init() {
        if (this.isInitialized) return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.warn('Web Audio API không được hỗ trợ trên trình duyệt này.');
            return;
        }

        this.ctx = new AudioContextClass();
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        this.isInitialized = true;
        console.log('🔊 AudioManager initialized:', this.ctx.state);

        await this.loadAudioFiles();
    }

    /**
     * Nạp file purr.mp3 và meow.mp3 từ assets/audio/
     */
    async loadAudioFiles() {
        if (!this.ctx) return;

        try {
            const [purrRes, meowRes] = await Promise.all([
                fetch('assets/audio/purr.mp3').catch(() => null),
                fetch('assets/audio/meow.mp3').catch(() => null)
            ]);

            if (purrRes && purrRes.ok) {
                const arrayBuf = await purrRes.arrayBuffer();
                this.buffers.purr = await this.ctx.decodeAudioData(arrayBuf);
                console.log('✅ Đã tải file purr.mp3');
            }

            if (meowRes && meowRes.ok) {
                const arrayBuf = await meowRes.arrayBuffer();
                this.buffers.meow = await this.ctx.decodeAudioData(arrayBuf);
                console.log('✅ Đã tải file meow.mp3');
            }
        } catch (err) {
            console.log('ℹ️ Sử dụng Web Audio Synthesizer fallback cho tiếng mèo.');
        }
    }

    /**
     * Phát tiếng thở ngáy ngủ nhè nhẹ khi mèo ở trạng thái SLEEPING
     */
    playSnore() {
        if (!this.isInitialized || this.isMuted || this.isSnoring) return;
        this.isSnoring = true;

        const now = this.ctx.currentTime;
        this.snoreOsc = this.ctx.createOscillator();
        this.snoreOsc.type = 'sine';
        this.snoreOsc.frequency.setValueAtTime(60, now);

        // LFO tạo nhịp thở ngáy 1.2Hz
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(1.2, now);
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(0.04, now);

        this.snoreGain = this.ctx.createGain();
        this.snoreGain.gain.setValueAtTime(0.01, now);

        lfo.connect(lfoGain);
        lfoGain.connect(this.snoreGain.gain);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, now);

        this.snoreOsc.connect(filter);
        filter.connect(this.snoreGain);
        this.snoreGain.connect(this.ctx.destination);

        this.snoreOsc.start(now);
        lfo.start(now);
    }

    stopSnore() {
        if (this.snoreGain && this.ctx) {
            this.snoreGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
        }
        if (this.snoreOsc) {
            try { this.snoreOsc.stop(this.ctx.currentTime + 0.25); } catch(e) {}
            this.snoreOsc = null;
        }
        this.isSnoring = false;
    }

    /**
     * Method playPurr(): Phát tiếng rên tiếng mèo (loop khi đang nựng)
     */
    playPurr() {
        if (!this.isInitialized || this.isMuted) return;

        // Dừng âm thanh ngáy nếu đang ngáy
        this.stopSnore();

        if (this.buffers.purr) {
            if (!this.purrSource) {
                this.purrSource = this.ctx.createBufferSource();
                this.purrSource.buffer = this.buffers.purr;
                this.purrSource.loop = true;

                this.purrGain = this.ctx.createGain();
                this.purrGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

                this.purrSource.connect(this.purrGain);
                this.purrGain.connect(this.ctx.destination);
                this.purrSource.start(0);
                this.isPurring = true;
            }
            return;
        }

        if (!this.isPurring) {
            this.isPurring = true;
            this.setupSynthPurr();
        }
    }

    /**
     * Method stopPurr(): Dừng tiếng rên
     */
    stopPurr() {
        if (this.purrSource) {
            try {
                this.purrSource.stop();
                this.purrSource.disconnect();
            } catch (e) {}
            this.purrSource = null;
        }

        if (this.purrGain && this.ctx) {
            this.purrGain.gain.setTargetAtTime(0.001, this.ctx.currentTime, 0.2);
        }

        this.isPurring = false;
    }

    /**
     * Method playMeow(): Phát tiếng mèo meo meo (phát 1 lần khi click/chạm)
     */
    playMeow() {
        if (!this.isInitialized || this.isMuted) return;

        this.stopSnore();

        const now = Date.now();
        if (now - this.lastMeowTime < 800) return;
        this.lastMeowTime = now;

        if (this.buffers.meow) {
            const source = this.ctx.createBufferSource();
            source.buffer = this.buffers.meow;
            source.loop = false;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.7, this.ctx.currentTime);

            source.connect(gain);
            gain.connect(this.ctx.destination);
            source.start(0);
            return;
        }

        this.synthMeow();
    }

    /**
     * Synthesizer Purr Generator (Brown noise + LFO 24Hz)
     */
    setupSynthPurr() {
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }

        this.noiseNode = this.ctx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        this.purrFilter = this.ctx.createBiquadFilter();
        this.purrFilter.type = 'lowpass';
        this.purrFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

        this.purrLfo = this.ctx.createOscillator();
        this.purrLfo.type = 'sine';
        this.purrLfo.frequency.setValueAtTime(24, this.ctx.currentTime);

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

        this.purrGain = this.ctx.createGain();
        this.purrGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

        this.purrLfo.connect(lfoGain);
        lfoGain.connect(this.purrGain.gain);

        this.noiseNode.connect(this.purrFilter);
        this.purrFilter.connect(this.purrGain);
        this.purrGain.connect(this.ctx.destination);

        this.noiseNode.start(0);
        this.purrLfo.start(0);
    }

    setPurrIntensity(intensity) {
        if (!this.isInitialized || this.isMuted) return;
        this.purrIntensity = Math.min(1.0, Math.max(0.0, intensity));

        if (this.purrGain && this.ctx) {
            const targetGain = 0.05 + (this.purrIntensity * 0.4);
            this.purrGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
        }
    }

    synthMeow() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';

        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.45);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(1400, now + 0.15);
        filter.frequency.linearRampToValueAtTime(600, now + 0.45);
        filter.Q.setValueAtTime(3.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.48);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopPurr();
            this.stopSnore();
        }
        return this.isMuted;
    }
}
