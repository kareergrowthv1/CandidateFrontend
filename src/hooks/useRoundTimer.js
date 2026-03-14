/**
 * Custom hook for managing round timer countdown
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { timeStringToSeconds, formatTime } from '../utils/timeUtils';

/**
 * Hook for managing round timer
 * @param {string} initialTime - Initial time in hh:mm:ss format
 * @param {Function} onExpire - Callback when timer expires
 * @returns {Object} Timer state and controls
 */
export const useRoundTimer = (initialTime, onExpire) => {
  const [timeLeft, setTimeLeft] = useState(() => initialTime ? timeStringToSeconds(initialTime) : 0);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Initialize timer with initial time
  useEffect(() => {
    if (initialTime) {
      const seconds = timeStringToSeconds(initialTime);
      setTimeLeft(seconds);
      setIsExpired(false);
    }
  }, [initialTime]);

  // Timer countdown logic (do not depend on onExpire so interval is not recreated every render)
  useEffect(() => {
    if (!isRunning || isExpired) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer expired - stop immediately
          setIsExpired(true);
          setIsRunning(false);

          // Clear interval immediately
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Defer callback to next tick so it runs after this state update (avoids "Cannot update ToastProvider while rendering GeneralRoundTestPage")
          if (onExpireRef.current && mountedRef.current) {
            const cb = onExpireRef.current;
            setTimeout(() => {
              if (mountedRef.current) {
                try {
                  cb();
                } catch (error) {
                  console.error('Error in timer expiry callback:', error);
                }
              }
            }, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isExpired]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!isExpired && timeLeft > 0) {
      setIsRunning(true);
    }
  }, [isExpired, timeLeft]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newTime) => {
    setIsRunning(false);
    setIsExpired(false);
    if (newTime) {
      const seconds = timeStringToSeconds(newTime);
      setTimeLeft(seconds);
    } else if (initialTime) {
      const seconds = timeStringToSeconds(initialTime);
      setTimeLeft(seconds);
    }
  }, [initialTime]);

  const getFormattedTime = useCallback(() => {
    return formatTime(timeLeft);
  }, [timeLeft]);

  return {
    timeLeft,
    isRunning,
    isExpired,
    formattedTime: getFormattedTime(),
    start,
    pause,
    reset,
  };
};

export default useRoundTimer;
