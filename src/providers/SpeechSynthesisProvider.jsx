import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const SpeechSynthesisContext = createContext();

/**
 * SpeechSynthesisProvider - Provides voice synthesis functionality throughout the app
 * Similar to Reference implementation for consistent voice experience
 */
export function SpeechSynthesisProvider({ children }) {
  const [voices, setVoices] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const synth = window.speechSynthesis;

    if (!synth) {
      console.warn("Speech synthesis not supported in this browser");
      return;
    }

    function loadVoices() {
      const loadedVoices = synth.getVoices();
      if (loadedVoices.length) {
        setVoices(loadedVoices);
        setIsLoaded(true);
        console.log(`✅ Loaded ${loadedVoices.length} voices`);
      }
    }

    // Load voices immediately
    loadVoices();

    // Listen for voice changes (Chrome loads voices asynchronously)
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, []);

  /**
   * Get the best voice for speech synthesis
   * Preference: Microsoft Zira, Google US English, Microsoft David, Microsoft Mark
   */
  const getBestVoice = useCallback((voices) => {
    if (!voices || voices.length === 0) return null;

    const preferenceList = [
      "Microsoft Zira",
      "Google US English",
      "Microsoft David",
      "Microsoft Mark",
      "Samantha",
      "Karen",
      "Tessa"
    ];

    for (const name of preferenceList) {
      const v = voices.find(v => v.name === name);
      if (v) return v;
    }

    // Fallback to any English voice
    return voices.find(v => v.lang && v.lang.toLowerCase().startsWith("en")) || voices[0];
  }, []);

  /**
   * Speak text using speech synthesis
   * Supports event handlers for fine control from components
   */
  const speak = useCallback(
    ({
      text,
      voiceName = null,
      rate = 1,
      pitch = 1,
      volume = 1,
      onstart,
      onend,
      onerror
    }) => {
      if (!isLoaded || !window.speechSynthesis) {
        console.warn("Speech synthesis not ready");
        return;
      }

      // Cancel any ongoing speech - DISABLED to prevent interruption
      // window.speechSynthesis.cancel();

      const utterance = new window.SpeechSynthesisUtterance(text);

      // Select voice
      if (voiceName) {
        const selectedVoice = voices.find(v => v.name === voiceName);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      } else {
        // Use best available voice
        const bestVoice = getBestVoice(voices);
        if (bestVoice) {
          utterance.voice = bestVoice;
        }
      }

      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // Allow event handlers
      if (onstart) utterance.onstart = onstart;
      if (onend) utterance.onend = onend;
      if (onerror) utterance.onerror = onerror;

      window.speechSynthesis.speak(utterance);

      // Resume if paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    },
    [voices, isLoaded, getBestVoice]
  );

  /**
   * Speak text asynchronously (returns a Promise)
   */
  const speakAsync = useCallback((text, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!isLoaded || !window.speechSynthesis) {
        console.warn("Speech synthesis not ready");
        resolve();
        return;
      }

      const {
        voiceName = null,
        rate = 1,
        pitch = 1,
        volume = 1
      } = options;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Small delay to let cancel complete cleanly
      setTimeout(() => {
        const utterance = new window.SpeechSynthesisUtterance(text);

        // Select voice
        if (voiceName) {
          const selectedVoice = voices.find(v => v.name === voiceName);
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        } else {
          const bestVoice = getBestVoice(voices);
          if (bestVoice) {
            utterance.voice = bestVoice;
          }
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        let hasResolved = false;

        utterance.onend = () => {
          if (!hasResolved) {
            hasResolved = true;
            // Small delay to ensure speech is fully finished
            setTimeout(() => {
              resolve();
            }, 100);
          }
        };

        utterance.onerror = (error) => {
          console.warn("Speech error:", error);
          if (!hasResolved) {
            hasResolved = true;
            resolve(); // Resolve instead of reject to prevent unhandled errors
          }
        };

        window.speechSynthesis.speak(utterance);

        // Resume if paused
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        // Safety timeout - ensure we don't wait forever
        const estimatedTime = Math.max(3000, text.length * 100);
        setTimeout(() => {
          if (!hasResolved) {
            // Check if still speaking
            if (window.speechSynthesis.speaking) {
              console.warn("Speech timeout - still speaking, forcing resolve");
              window.speechSynthesis.cancel();
            }
            hasResolved = true;
            resolve();
          }
        }, estimatedTime);
      }, 50); // End of setTimeout delay after cancel
    });
  }, [voices, isLoaded, getBestVoice]);

  /**
   * Cancel any ongoing speech
   */
  const cancel = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return (
    <SpeechSynthesisContext.Provider value={{ voices, isLoaded, speak, speakAsync, cancel, getBestVoice }}>
      {children}
    </SpeechSynthesisContext.Provider>
  );
}

/**
 * Hook to use speech synthesis functionality
 */
export function useSpeechSynthesis() {
  const context = useContext(SpeechSynthesisContext);
  if (!context) {
    throw new Error("useSpeechSynthesis must be used within SpeechSynthesisProvider");
  }
  return context;
}
