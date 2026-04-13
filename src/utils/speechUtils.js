/**
 * Shared Speech Utility
 * Ensures consistent voice selection and robust speech synthesis across the application.
 * Now includes a subscription model for UI synchronization (lipsync/animations).
 * STRICTLY enforces 'Samantha' or female fallback.
 */

const listeners = new Set();
let isSpeakingState = false;
let currentUtterance = null;
let cachedVoice = null;

export const notifySpeechState = (isSpeaking) => {
    isSpeakingState = isSpeaking;
    listeners.forEach(fn => fn(isSpeaking));
};

export const subscribeToSpeech = (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

// --- STRICT Voice Selection ---
export const getBestVoice = (voices) => {
    if (!voices || voices.length === 0) return null;

    // 1. STRICT PRIORITY: Samantha (requested specifically)
    const samantha = voices.find(v => v.name === 'Samantha');
    if (samantha) return samantha;

    // 2. High Quality Female Fallbacks
    const priorityNames = [
        'Google US English',   // Chrome Female
        'Microsoft Zira',      // Windows Female
        'Karen',               // macOS Female
        'Tessa',               // macOS Female
        'Veena',               // macOS Female
        'Moira'                // macOS Female
    ];

    for (const name of priorityNames) {
        const found = voices.find(v => v.name === name);
        if (found) return found;
    }

    // 3. Fallback: Try to find "female" in name/URI if possible (some browsers don't expose gender prop standardly)
    // or just any en-US that is NOT 'Alex' or 'Fred' (known males)
    const knownMales = ['Alex', 'Fred', 'Daniel', 'Google US English Male'];
    const usVoices = voices.filter(v => v.lang.includes('en-US') && !knownMales.some(m => v.name.includes(m)));

    return usVoices[0] || voices[0];
};

/**
 * Ensures voices are loaded before speaking.
 * Chrome loads voices asynchronously.
 */
const loadVoices = () => {
    return new Promise((resolve) => {
        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
            return;
        }

        // Wait for async load
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve(voices);
        };

        // Timeout if it takes too long (e.g. Safari sometimes doesn't fire event if already loaded empty?)
        setTimeout(() => {
            resolve(window.speechSynthesis.getVoices());
        }, 1000);
    });
};

export const cancelSpeech = () => {
    window.speechSynthesis.cancel();
    currentUtterance = null;
    notifySpeechState(false);
};

export const speakAsync = async (text) => {
    // Ensure we are cancelled first
    window.speechSynthesis.cancel();

    // 1. Wait for voices to be ready (Critical for ensuring we find Samantha)
    const voices = await loadVoices();

    return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        currentUtterance = utterance;

        // 2. Select Voice
        // Reset cache if invalid
        if (!cachedVoice || !voices.find(v => v.name === cachedVoice.name)) {
            cachedVoice = getBestVoice(voices);
            if (cachedVoice) console.log("Selected Voice:", cachedVoice.name);
        }

        if (cachedVoice) {
            utterance.voice = cachedVoice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            notifySpeechState(true);
        };

        const finish = () => {
            currentUtterance = null;
            notifySpeechState(false);
            resolve();
        };

        utterance.onend = finish;
        utterance.onerror = (e) => {
            console.warn("Speech error:", e);
            finish();
        };

        // Safety timeout
        const estimatedTime = Math.max(2000, text.length * 150);
        const timeoutId = setTimeout(() => {
            console.warn(`Speech timeout (${estimatedTime}ms) - forcing resolve`);
            finish();
        }, estimatedTime);

        const originalOnEnd = utterance.onend;
        utterance.onend = () => {
            clearTimeout(timeoutId);
            if (originalOnEnd) originalOnEnd();
        };

        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    });
};
