/**
 * stageTracker.js — Deterministic pipeline stage tracker
 * ODEL v1 | CAOS_v1
 *
 * Usage:
 *   import { setStage, getStage, STAGES } from './stageTracker.js';
 *   setStage(STAGES.OPENAI_CALL);
 *   ...
 *   getStage(); // => 'OPENAI_CALL'
 */

export const STAGES = {
    AUTH:           'AUTH',
    PROFILE_LOAD:   'PROFILE_LOAD',
    MEMORY_WRITE:   'MEMORY_WRITE',
    HISTORY_LOAD:   'HISTORY_LOAD',
    MEMORY_RECALL:  'MEMORY_RECALL',
    HEURISTICS:     'HEURISTICS',
    PROMPT_BUILD:   'PROMPT_BUILD',
    OPENAI_CALL:    'OPENAI_CALL',
    MESSAGE_SAVE:   'MESSAGE_SAVE',
    RESPONSE_BUILD: 'RESPONSE_BUILD',
    EXECUTION_HOST: 'EXECUTION_HOST', // catch-all — stage unknown
};

let _currentStage = STAGES.EXECUTION_HOST;

export function setStage(stage) {
    _currentStage = stage;
}

export function getStage() {
    return _currentStage;
}