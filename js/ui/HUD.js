/**
 * HUD.js — Minimal HUD: affection bar, hunger bar, mood, state, action buttons.
 */

export class HUD {
    constructor(cat, audioManager) {
        this.cat   = cat;
        this.audio = audioManager;

        this._affectionFill = document.getElementById('affection-fill');
        this._hungerFill    = document.getElementById('hunger-fill');
        this._moodText      = document.getElementById('mood-text');
        this._stateText     = document.getElementById('cat-state');
        this._nameDisplay   = document.getElementById('cat-name-display');
        this._timeDisplay   = document.getElementById('time-of-day');
        this._muteBtn       = document.getElementById('btn-mute');

        this._bindButtons();
    }

    _bindButtons() {
        document.getElementById('btn-pet')?.addEventListener('click', () => {
            this.cat.react();
        });

        document.getElementById('btn-play')?.addEventListener('click', () => {
            this.cat.play();
        });

        document.getElementById('btn-call')?.addEventListener('click', () => {
            this.cat.moveTo({ x: 0, z: 0 });
            this.audio?.playMeow();
        });

        document.getElementById('btn-feed')?.addEventListener('click', () => {
            this.cat.stats.hunger   = Math.max(0,   this.cat.stats.hunger   - 40);
            this.cat.stats.happiness = Math.min(100, this.cat.stats.happiness + 10);
            this.cat.react();
            this.audio?.playMeow();
        });

        this._muteBtn?.addEventListener('click', () => {
            if (!this.audio) return;
            const muted = this.audio.toggleMute();
            this._muteBtn.textContent = muted ? '🔇' : '🔊';
            this._muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
        });
    }

    /** Called every frame from main loop */
    update(timePhase) {
        const { affection, happiness, hunger } = this.cat.stats;

        if (this._affectionFill) {
            this._affectionFill.style.width = `${Math.round(affection)}%`;
        }
        if (this._hungerFill) {
            // Hunger bar fills red as hunger increases
            this._hungerFill.style.width = `${Math.round(hunger)}%`;
        }

        const mood = happiness > 70 ? 'Happy 😸'
                   : happiness > 40 ? 'Content 😺'
                   : 'Lonely 😿';
        if (this._moodText) this._moodText.textContent = mood;

        const stateLabels = {
            IDLE:      'Relaxing',
            WALKING:   'Exploring',
            SITTING:   'Sitting',
            SLEEPING:  'Sleeping 💤',
            PETTING:   'Purring ❤️',
            REACTING:  'Surprised!',
            PLAYING:   'Playing!',
            FOLLOWING: 'Following',
            EATING:    'Eating 🐟',
        };
        if (this._stateText) {
            this._stateText.textContent = stateLabels[this.cat.state] ?? this.cat.state;
        }

        if (this._timeDisplay && timePhase) {
            const icons = { MORNING: '🌅', DAY: '☀️', SUNSET: '🌇', NIGHT: '🌙' };
            this._timeDisplay.textContent = icons[timePhase] ?? '';
        }
    }
}
