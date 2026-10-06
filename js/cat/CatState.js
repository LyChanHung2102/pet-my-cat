/**
 * CatState.js — Cat state machine constants and transitions.
 */

export const CatState = {
    IDLE:      'IDLE',
    WALKING:   'WALKING',
    SITTING:   'SITTING',
    SLEEPING:  'SLEEPING',
    PETTING:   'PETTING',
    REACTING:  'REACTING',
    PLAYING:   'PLAYING',
    FOLLOWING: 'FOLLOWING',
    EATING:    'EATING',
};

// Which states can be interrupted by user interaction
export const INTERRUPTIBLE = new Set([
    CatState.IDLE,
    CatState.WALKING,
    CatState.SITTING,
    CatState.SLEEPING,
    CatState.FOLLOWING,
]);
