/**
 * Storage utilities for sessionStorage and localStorage
 */

/**
 * Get item from sessionStorage
 * @param {string} key - Storage key
 * @returns {any|null} Stored value or null
 */
export const getSessionItem = (key) => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    return sessionStorage.getItem(key);
  }
};

/**
 * Set item in sessionStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export const setSessionItem = (key, value) => {
  try {
    sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (e) {
    console.error('Error setting sessionStorage item:', e);
  }
};

/**
 * Remove item from sessionStorage
 * @param {string} key - Storage key
 */
export const removeSessionItem = (key) => {
  sessionStorage.removeItem(key);
};

/**
 * Clear all sessionStorage
 */
export const clearSessionStorage = () => {
  sessionStorage.clear();
};

/** Keys that may be in sessionStorage (test flow) instead of localStorage */
const SESSION_KEYS = ['questionSectionData', 'assessmentSummary'];

/**
 * Get item from localStorage, or sessionStorage for test-flow keys
 * @param {string} key - Storage key
 * @returns {any|null} Stored value or null
 */
export const getLocalItem = (key) => {
  try {
    const fromSession = SESSION_KEYS.includes(key) ? sessionStorage.getItem(key) : null;
    const item = fromSession || localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    const fromSession = SESSION_KEYS.includes(key) ? sessionStorage.getItem(key) : null;
    return fromSession || localStorage.getItem(key);
  }
};

/**
 * Set item in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export const setLocalItem = (key, value) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (e) {
    console.error('Error setting localStorage item:', e);
  }
};

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export const removeLocalItem = (key) => {
  localStorage.removeItem(key);
};

/**
 * Clear all localStorage
 */
export const clearLocalStorage = () => {
  localStorage.clear();
};

/** Round instructions cache key (per round) for refresh: questionCount, timeAllocated, completedCount */
export const ROUND_INSTRUCTIONS_KEY = (round) => `roundInstructions_${round}`;

/**
 * Get saved round instructions from localStorage (for display after refresh)
 * @param {number} round - Round number (1-4)
 * @returns {{ round, questionCount, timeAllocated, completedCount, instructions? }|null}
 */
export const getRoundInstructions = (round) => {
  try {
    const raw = localStorage.getItem(ROUND_INSTRUCTIONS_KEY(round));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

/**
 * Save round instructions to localStorage (updated from WebSocket data)
 */
export const setRoundInstructions = (round, data) => {
  try {
    localStorage.setItem(ROUND_INSTRUCTIONS_KEY(round), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving round instructions:', e);
  }
};

export default {
  getSessionItem,
  setSessionItem,
  removeSessionItem,
  clearSessionStorage,
  getLocalItem,
  setLocalItem,
  removeLocalItem,
  clearLocalStorage,
  getRoundInstructions,
  setRoundInstructions,
  ROUND_INSTRUCTIONS_KEY,
};
