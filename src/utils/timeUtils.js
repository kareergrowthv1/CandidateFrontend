/**
 * Time utility functions for converting between formats and managing timers
 */

/**
 * Convert hh:mm:ss format to total seconds
 * @param {string} timeString - Time in hh:mm:ss format (e.g., "01:30:00")
 * @returns {number} Total seconds
 */
export const timeStringToSeconds = (timeString) => {
  if (!timeString || typeof timeString !== 'string') {
    return 0;
  }

  const parts = timeString.split(':');
  if (parts.length !== 3) {
    return 0;
  }

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Convert total seconds to hh:mm:ss format
 * @param {number} totalSeconds - Total seconds
 * @returns {string} Time in hh:mm:ss format
 */
export const secondsToTimeString = (totalSeconds) => {
  if (!totalSeconds || totalSeconds < 0) {
    return '00:00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Format seconds to mm:ss for display
 * @param {number} seconds - Total seconds
 * @returns {string} Time in mm:ss format
 */
export const formatTime = (seconds) => {
  if (!seconds || seconds < 0) {
    return '00:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Get current timestamp in ISO-8601 format
 * @returns {string} ISO-8601 timestamp
 */
export const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Calculate time difference in minutes between two ISO-8601 timestamps
 * @param {string} startTime - Start time in ISO-8601 format
 * @param {string} endTime - End time in ISO-8601 format
 * @returns {number} Time difference in minutes (rounded)
 */
export const calculateTimeDifference = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return 0;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  const diffMinutes = Math.round(diffMs / 60000);

  return diffMinutes > 0 ? diffMinutes : 0;
};

export default {
  timeStringToSeconds,
  secondsToTimeString,
  formatTime,
  getCurrentTimestamp,
  calculateTimeDifference,
};
