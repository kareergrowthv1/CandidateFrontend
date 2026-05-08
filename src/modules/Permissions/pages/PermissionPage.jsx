import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Waves from './Waves';
import SpeechBubble from './SpeechBubble';
import Logo1 from '../../../assets/logo1.png';
import { useSpeechSynthesis } from '../../../providers/SpeechSynthesisProvider';
import { areAllRoundsCompleted } from '../../../utils/roundUtils';
import { getLocalItem } from '../../../utils/storageUtils';
import { STREAMING_WS_BASE } from '../../../constants/api';
import { useTestWs } from '../../../context/TestWsContext';
import useToast from '../../../hooks/useToast';

// --- Constants & Enums ---
const STEPS = {
    INSTRUCTIONS: 'instructions',
    GREETING: 'greeting',
    CAMERA_MIC: 'camera_mic',
    CALIBRATION: 'calibration',
    SCREEN_SHARE: 'screen_share',
    LOCATION: 'location',
    SPEAKER_TEST: 'speaker_test',
    COMPLETED: 'completed'
};

const STATUS = {
    IDLE: 'idle',
    PROCESSING: 'processing',
    WAITING_USER: 'waiting_user', // For manual retry buttons
    ERROR: 'error'
};

const PermissionPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const { speakAsync, cancel, isLoaded } = useSpeechSynthesis();
    const ctx = useTestWs();
    const localTestWsRef = useRef(null);
    const testWsRef = ctx?.testWsRef ?? localTestWsRef;
    const videoWsRef = useRef(null);

    // State (must be declared before any useEffect that uses them)
    const [isChecked, setIsChecked] = useState(false);
    const [step, setStep] = useState(STEPS.INSTRUCTIONS);
    const [status, setStatus] = useState(STATUS.IDLE);
    const [currentInstruction, setCurrentInstruction] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showCameraPreview, setShowCameraPreview] = useState(false);
    const mountedRef = useRef(true);
    const streamRef = useRef(null);
    const videoRef = useRef(null);
    const screenStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    // Check if email is verified; do not redirect to completion on mount (stale storage can have old completed summary)
    useEffect(() => {
        const emailVerified = sessionStorage.getItem('emailVerified');
        if (!emailVerified || emailVerified !== 'true') {
            navigate('/test/email', { replace: true });
            return;
        }
        // Redirect to completion only when init_ok has set isAssessmentCompleted (handled later in flow), not from storage here
    }, [navigate]);

    // When coming from /instructions, skip instructions step and go to greeting
    useEffect(() => {
        if (location.state?.fromInstructions) {
            setStep(STEPS.GREETING);
            setIsChecked(true);
        }
    }, [location.state?.fromInstructions]);

    // Test WebSocket: connect as soon as user has left instructions (GREETING or later) so init/init_ok run early
    useEffect(() => {
        if (step === STEPS.INSTRUCTIONS) return;
        // Avoid opening a second connection if one is already open
        if (testWsRef.current && testWsRef.current.readyState === WebSocket.OPEN) return;
        const clientId = sessionStorage.getItem('clientId');
        const positionId = sessionStorage.getItem('positionId');
        const candidateId = sessionStorage.getItem('candidateId');
        const questionSetId = sessionStorage.getItem('questionSetId');
        const assessmentSummaryId = sessionStorage.getItem('assessmentSummaryId') || sessionStorage.getItem('assessment_summary_id') || '';
        const tenantId = sessionStorage.getItem('tenantId');
        if (!clientId || !positionId || !candidateId || !STREAMING_WS_BASE) return;

        const currentExamKey = `${positionId}_${candidateId}_${questionSetId || ''}_${assessmentSummaryId}`;
        const existingWs = testWsRef.current;
        if (existingWs && existingWs.readyState === WebSocket.OPEN) {
            const existingExamKey = existingWs.__examKey || '';
            if (existingExamKey === currentExamKey) return;
            try {
                existingWs.close();
            } catch (_) { }
            testWsRef.current = null;
        }

        const base = STREAMING_WS_BASE.replace(/\/$/, '');
        const wsUrl = `${base}/ws/test`;
        console.log('[Test WebSocket] Connecting to', wsUrl);
        try {
            const testWs = new WebSocket(wsUrl);
            testWs.onopen = () => {
                console.log('[Test WebSocket] Connected');
                const isConversational = sessionStorage.getItem('isConversational') === 'true';
                const initPayload = {
                    type: 'init',
                    client_id: clientId,
                    position_id: positionId,
                    candidate_id: candidateId,
                    question_set_id: questionSetId || '',
                    assessment_summary_id: assessmentSummaryId,
                    tenant_id: tenantId || undefined,
                    is_conversational: isConversational
                };
                testWs.send(JSON.stringify(initPayload));
                console.log('[Test WebSocket] Init sent', { client_id: clientId, position_id: positionId, candidate_id: candidateId });
            };
            testWs.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('[Test WebSocket] Message received', data?.type || 'unknown', data);
                    ctx?.onMessage?.(data);
                    if (data?.type === 'init_ok') {
                        const wsSummaryId = data?.session?.assessment_summary_id || '';
                        if (wsSummaryId) {
                            sessionStorage.setItem('assessmentSummaryId', String(wsSummaryId));
                            sessionStorage.setItem('assessment_summary_id', String(wsSummaryId));
                        }
                        console.log('[Test WebSocket] init_ok – API response (assessmentSummary, nextRound, isAssessmentCompleted):', JSON.stringify({
                            assessmentSummary: data.assessmentSummary,
                            nextRound: data.nextRound,
                            isAssessmentCompleted: data.isAssessmentCompleted,
                            session: data.session
                        }, null, 2));
                        // Only store assessmentSummary if it is valid (not an API error object)
                        const summary = data.assessmentSummary;
                        const isValidSummary = summary != null && typeof summary === 'object' && summary.success !== false && (summary.data != null || summary.round1Assigned != null);
                        if (isValidSummary) {
                            try {
                                const str = typeof summary === 'string' ? summary : JSON.stringify(summary);
                                localStorage.setItem('assessmentSummary', str);
                                sessionStorage.setItem('assessmentSummary', str);
                            } catch (e) {
                                console.warn('[Test WebSocket] Could not store assessmentSummary', e);
                            }
                        } else if (summary && summary.success === false) {
                            console.warn('[Test WebSocket] init_ok contained error as assessmentSummary, not storing:', summary.message || summary);
                        }
                        if (data.nextRound != null) sessionStorage.setItem('wsNextRound', String(data.nextRound));
                        sessionStorage.setItem('isAssessmentCompleted', data.isAssessmentCompleted ? 'true' : 'false');
                        // After WebSocket start: set Test Started and assessment start time only if assessment not already completed
                        if (!data.isAssessmentCompleted) {
                            (async () => {
                                // Removed testEntryService call as it is part of the deleted test flow
                                try {
                                    const { assessmentSummaryService } = await import('../../../services/assessmentSummaryService');
                                    const assessmentStartTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
                                    await assessmentSummaryService.updateAssessmentSummary({ assessmentStartTime });
                                    console.log('[Test WebSocket] Assessment start time updated', assessmentStartTime);
                                } catch (e) {
                                    console.warn('[Test WebSocket] updateAssessmentSummary assessmentStartTime failed', e);
                                }
                            })();
                        }
                    }
                } catch (_) {
                    console.log('[Test WebSocket] Message (raw)', event.data);
                }
            };
            testWs.onerror = (err) => console.warn('[Test WebSocket] Error', err);
            testWs.onclose = () => console.log('[Test WebSocket] Closed');
            testWs.__examKey = currentExamKey;
            testWsRef.current = testWs;
        } catch (e) {
            console.warn('[Test WebSocket] Connect failed:', e);
        }
        // Do not close WebSocket on unmount so round pages and CompletionPage can send test_complete
        return () => { };
    }, [step, testWsRef]);

    // Video WebSocket + screen recording: start when LOCATION step (keep running until unmount)
    useEffect(() => {
        if (step !== STEPS.LOCATION) return;
        if (videoWsRef.current) return; // already started
        const clientId = sessionStorage.getItem('clientId');
        const positionId = sessionStorage.getItem('positionId');
        const candidateId = sessionStorage.getItem('candidateId');
        if (!clientId || !positionId || !candidateId || !STREAMING_WS_BASE) return;

        const base = STREAMING_WS_BASE.replace(/\/$/, '');
        const wsUrl = `${base}/ws/video/${encodeURIComponent(clientId)}/${encodeURIComponent(positionId)}/${encodeURIComponent(candidateId)}`;
        let videoWs;
        try {
            videoWs = new WebSocket(wsUrl);
            videoWsRef.current = videoWs;
        } catch (e) {
            console.warn('Video WebSocket connect failed:', e);
            return;
        }

        const startScreenRecording = () => {
            const stream = screenStreamRef.current;
            if (!stream || stream.getTracks().length === 0) {
                console.warn('[Screen recording] No screen stream yet');
                return;
            }
            if (videoWsRef.current?.readyState !== WebSocket.OPEN) {
                console.warn('[Screen recording] Video WS not open yet');
                return;
            }
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
            let recorder;
            try {
                recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 });
            } catch (err) {
                recorder = new MediaRecorder(stream, { videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 });
            }
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0 && videoWsRef.current?.readyState === WebSocket.OPEN) {
                    videoWsRef.current.send(e.data);
                }
            };
            recorder.onerror = (e) => console.warn('[Screen recording] MediaRecorder error:', e);
            recorder.start(1000);
            console.log('[Screen recording] Started, sending chunks every 1s to backend');
        };

        videoWs.onopen = () => {
            console.log('[Video WebSocket] Connected, starting screen recording');
            startScreenRecording();
        };
        videoWs.onerror = (e) => console.warn('[Video WebSocket] Error', e);
        videoWs.onclose = () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try { mediaRecorderRef.current.stop(); } catch (_) { }
                mediaRecorderRef.current = null;
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((t) => t.stop());
                screenStreamRef.current = null;
            }
        };
        // No cleanup here — recording stays on until component unmounts (see below)
    }, [step]);

    // Cleanup video WS and screen recording only on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try { mediaRecorderRef.current.stop(); } catch (_) { }
                mediaRecorderRef.current = null;
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach((t) => t.stop());
                screenStreamRef.current = null;
            }
            if (videoWsRef.current) {
                try { videoWsRef.current.close(); } catch (_) { }
                videoWsRef.current = null;
            }
        };
    }, []);

    /**
     * Safe wrapper to set instruction text AND speak it using voice provider.
     * Ensures speech fully completes before returning.
     */
    const speakAndShow = async (text) => {
        if (!mountedRef.current || !isLoaded) return;
        setCurrentInstruction(text);
        setIsSpeaking(true); // Set UI state
        try {
            await speakAsync(text);
            // Additional check to ensure speech synthesis has finished
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                // Wait a bit more if still speaking
                await new Promise(resolve => {
                    const checkInterval = setInterval(() => {
                        if (!window.speechSynthesis.speaking) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    // Safety timeout
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 2000);
                });
            }
        } finally {
            if (mountedRef.current) setIsSpeaking(false);
        }
    };

    // --- Retry Helper ---

    const withAutoRetry = async (actionFn, defaultFailureMessage) => {
        const MAX_RETRIES = 3;
        let attempt = 1;

        while (attempt <= MAX_RETRIES) {
            if (!mountedRef.current) return false;
            try {
                return await actionFn();
            } catch (error) {
                console.warn(`Attempt ${attempt} failed:`, error);

                let retryMsg = "Permission denied. Please click Allow when prompted. Retrying...";
                const isCustomError = error.message && error.message.includes("Screen sharing must include audio");

                if (isCustomError) {
                    retryMsg = error.message;
                }

                if (attempt < MAX_RETRIES) {
                    await speakAndShow(retryMsg);
                    attempt++;
                    await new Promise(r => setTimeout(r, 1500));
                } else {
                    const finalFailMsg = isCustomError ? error.message : defaultFailureMessage;
                    setErrorMessage(finalFailMsg);
                    await speakAndShow(finalFailMsg + (isCustomError ? "" : " Please Click Try Again"));
                    setStatus(STATUS.WAITING_USER);
                    return false;
                }
            }
        }
        return false;
    };

    // --- Step Logic ---

    const greetingStep = async () => {
        const toDisplayName = (value, fallback) => {
            const raw = String(value || '').trim();
            if (!raw) return fallback;
            return raw
                .replace(/\s+/g, ' ')
                .split(' ')
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
        };

        const verifiedSessionRaw = localStorage.getItem('verifiedSession');
        let verifiedSession = null;
        try {
            verifiedSession = verifiedSessionRaw ? JSON.parse(verifiedSessionRaw) : null;
        } catch (_) {
            verifiedSession = null;
        }

        const CANDIDATE_NAME = toDisplayName(
            sessionStorage.getItem('candidateName') || verifiedSession?.candidateName,
            'Candidate'
        );
        const COMPANY_NAME = toDisplayName(
            sessionStorage.getItem('companyName') || verifiedSession?.companyName,
            'KareerGrowth'
        );

        // Tiny delay to ensure voices load if first time (utility handles it partly but good to wait)
        await new Promise(r => setTimeout(r, 500));

        const text = `Hello ${CANDIDATE_NAME}, Welcome to ${COMPANY_NAME} test portal.`;
        await speakAndShow(text);

        await new Promise(r => setTimeout(r, 1000));

        if (mountedRef.current) {
            setStep(STEPS.CAMERA_MIC);
            setStatus(STATUS.IDLE);
        }
    };

    const requestCameraMic = async () => {
        const msg = "Next, please provide permissions for the camera and mic.";
        await speakAndShow(msg);

        // Wait for speech to fully complete before showing permission popup
        await new Promise(r => setTimeout(r, 500));

        const action = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            return true; // Success
        };

        const success = await withAutoRetry(action, "Camera and microphone access is required.");

        if (success && mountedRef.current) {
            setShowCameraPreview(true); // Show preview now
            await speakAndShow("Camera and microphone access granted!");
            setStep(STEPS.CALIBRATION);
            setStatus(STATUS.IDLE);
        }
    };

    const runCalibration = async () => {
        try {
            const msg = "Now we'll calibrate the camera for face detection. Please look at the screen.";
            await speakAndShow(msg);

            await new Promise(r => setTimeout(r, 1500));
            await new Promise(r => setTimeout(r, 800));

            if (videoRef.current && streamRef.current && testWsRef.current && testWsRef.current.readyState === WebSocket.OPEN) {
                try {
                    const video = videoRef.current;
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0);
                        const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
                        if (blob) {
                            const reader = new FileReader();
                            const base64 = await new Promise((res, rej) => {
                                reader.onloadend = () => res(reader.result?.toString()?.split(',')[1] || '');
                                reader.onerror = rej;
                                reader.readAsDataURL(blob);
                            });
                            testWsRef.current.send(JSON.stringify({ type: 'calibration_screenshot', image_base64: base64 }));
                            console.log('[Test WebSocket] Calibration screenshot sent');
                        }
                    }
                } catch (err) {
                    console.warn('[Test WebSocket] Calibration screenshot failed:', err);
                }
            } else {
                console.warn('[Test WebSocket] Calibration skipped: WebSocket not open. readyState=', testWsRef.current?.readyState);
            }

            await speakAndShow("Calibration completed successfully.");

            if (mountedRef.current) {
                setStep(STEPS.SCREEN_SHARE);
                setStatus(STATUS.IDLE);
            }
        } catch (e) {
            console.error("Calibration failed", e);
            setErrorMessage("Calibration failed. Please try again.");
            setStatus(STATUS.WAITING_USER);
        }
    };

    const requestScreenShare = async () => {
        const msg = "Please share your entire screen with audio for the test.";
        await speakAndShow(msg);

        // Wait for speech to fully complete before showing permission popup
        await new Promise(r => setTimeout(r, 500));

        const action = async () => {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: 'monitor' },
                audio: true
            });

            if (stream.getAudioTracks().length === 0) {
                stream.getTracks().forEach(t => t.stop());
                throw new Error("Screen sharing must include audio. Please enable audio when sharing your screen and try again.");
            }

            // Keep stream for screen recording; do not stop — we will send it over the video WebSocket
            screenStreamRef.current = stream;
            return true;
        };

        const success = await withAutoRetry(action, "Screen sharing with audio is required.");

        if (success && mountedRef.current) {
            await speakAndShow("Screen sharing with audio started successfully!");
            setStep(STEPS.LOCATION);
            setStatus(STATUS.IDLE);
        }
    };

    const requestLocation = async () => {
        const msg = "Now, please allow access to your location.";
        await speakAndShow(msg);

        // Wait for speech to fully complete before showing permission popup
        await new Promise(r => setTimeout(r, 500));

        const action = async () => {
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
        };

        const success = await withAutoRetry(action, "Location permission is required.");

        if (success && mountedRef.current) {
            await speakAndShow("Location access granted.");
            setStep(STEPS.SPEAKER_TEST);
            setStatus(STATUS.IDLE);
        }
    };

    // Robust ListenForYes Helper
    const listenForYes = () => {
        return new Promise((resolve, reject) => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return resolve("yes");

            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = true;
            recognition.continuous = true;

            recognition.onresult = (e) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    const t = e.results[i][0].transcript;
                    if (e.results[i].isFinal) {
                        finalTranscript += t;
                    } else {
                        interimTranscript += t;
                    }
                }

                const fullText = (finalTranscript + interimTranscript).toLowerCase();
                console.log("Hearing:", fullText);

                if (fullText.includes('yes')) {
                    recognition.stop();
                    resolve('yes');
                }
            };

            recognition.onerror = (e) => {
                console.warn("Recognition error", e);
                resolve(null);
            };

            recognition.onend = () => {
                resolve(null);
            };

            recognition.start();
        });
    };

    const runSpeakerTest = async () => {
        const MAX_ATTEMPTS = 3;
        let attempt = 1;

        if (!streamRef.current) {
            try {
                streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setShowCameraPreview(true);
            } catch (e) {
                console.warn("Lost stream", e);
            }
        }

        try {
            while (attempt <= MAX_ATTEMPTS) {
                if (!mountedRef.current) break;

                const prompt = attempt === 1
                    ? "To test your microphone, please say 'Yes' if you can hear me."
                    : "I didn't catch that. Please say 'Yes' if you can hear me.";

                await speakAndShow(prompt);

                // Start listening IMMEDIATELY (background)
                const recognitionPromise = listenForYes();

                // DELAY UI Updates by 0.5s
                let uiTimer = setTimeout(() => {
                    if (mountedRef.current) {
                        setIsListening(true);
                        setCurrentInstruction("Listening...");
                    }
                }, 500);

                try {
                    // Listen for up to 5 seconds
                    const transcript = await Promise.race([
                        recognitionPromise,
                        new Promise((_, r) => setTimeout(() => r("timeout"), 5000))
                    ]);

                    clearTimeout(uiTimer);
                    setIsListening(false);

                    if (transcript && transcript.includes('yes')) {
                        const confirm = "You said: 'Yes'. Your microphone and speakers appear to be working.";
                        await speakAndShow(confirm);

                        if (mountedRef.current) {
                            setCurrentInstruction("All permissions granted. Starting assessment...");

                            // Use WebSocket init_ok (assessment-summaries API) for routing when available
                            try {
                                const isCompleted = sessionStorage.getItem('isAssessmentCompleted') === 'true';
                                const wsNextRound = sessionStorage.getItem('wsNextRound');

                                if (isCompleted || wsNextRound === 'null' || wsNextRound === '') {
                                    console.log('✅ All rounds completed (from WS init_ok), going to completion page');
                                    showToast('You have completed the test.', 'info');
                                    setTimeout(() => navigate('/completion'), 1500);
                                    setStatus(STATUS.COMPLETED);
                                    return;
                                }
                                if (wsNextRound && ['1', '2', '3', '4'].includes(wsNextRound)) {
                                    setTimeout(() => navigate(`/round-${wsNextRound}`), 1500);
                                    setStatus(STATUS.COMPLETED);
                                    return;
                                }

                                // Fallback: determine from assessment summary in localStorage (e.g. from verify or init_ok)
                                const assessmentSummary = getLocalItem('assessmentSummary');
                                if (assessmentSummary && areAllRoundsCompleted(assessmentSummary)) {
                                    console.log('✅ All rounds completed (from assessmentSummary), going to completion page');
                                    showToast('You have completed the test.', 'info');
                                    setTimeout(() => navigate('/completion'), 1500);
                                    setStatus(STATUS.COMPLETED);
                                    return;
                                }
                                if (assessmentSummary) {
                                    const data = assessmentSummary?.data || assessmentSummary;
                                    let nextRound = null;
                                    if (data.round1Assigned && !data.round1Completed) nextRound = 1;
                                    else if (data.round2Assigned && !data.round2Completed) nextRound = 2;
                                    else if (data.round3Assigned && !data.round3Completed) nextRound = 3;
                                    else if (data.round4Assigned && !data.round4Completed) nextRound = 4;
                                    if (nextRound) {
                                        setTimeout(() => navigate(`/round-${nextRound}`), 1500);
                                    } else {
                                        setTimeout(() => navigate('/completion'), 1500);
                                    }
                                } else {
                                    setTimeout(() => navigate('/round-1'), 1500);
                                }
                            } catch (error) {
                                console.error('Error determining next round:', error);
                                setTimeout(() => navigate('/round-1'), 1500);
                            }
                            setStatus(STATUS.COMPLETED);
                        }
                        return;
                    } else {
                        await speakAndShow("I heard something, but not 'Yes'.");
                    }
                } catch (e) {
                    clearTimeout(uiTimer);
                    setIsListening(false);
                    console.warn("Listen failed/timeout", e);
                }

                attempt++;
                await new Promise(r => setTimeout(r, 1000));
            }

            if (mountedRef.current) {
                const failMsg = "I couldn't detect your microphone response. Please check your settings.";
                await speakAndShow(failMsg);
                setErrorMessage("Speaker test failed.");
                setStatus(STATUS.WAITING_USER);
            }
        } finally {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        }
    };

    // --- Main Effect Watcher ---

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            cancel(); // Cancel any ongoing speech
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [cancel]);

    useEffect(() => {
        const processStep = async () => {
            if (status !== STATUS.IDLE) return;
            if (step === STEPS.INSTRUCTIONS || step === STEPS.COMPLETED) return;

            setStatus(STATUS.PROCESSING);

            switch (step) {
                case STEPS.GREETING:
                    await greetingStep();
                    break;
                case STEPS.CAMERA_MIC:
                    await requestCameraMic();
                    break;
                case STEPS.CALIBRATION:
                    await runCalibration();
                    break;
                case STEPS.SCREEN_SHARE:
                    await requestScreenShare();
                    break;
                case STEPS.LOCATION:
                    await requestLocation();
                    break;
                case STEPS.SPEAKER_TEST:
                    await runSpeakerTest();
                    break;
                default:
                    break;
            }
        };

        processStep();
    }, [step, status]);

    useEffect(() => {
        if (showCameraPreview && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [showCameraPreview, status]);


    // --- Event Handlers ---

    const startFlow = () => {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        setStep(STEPS.GREETING);
        setStatus(STATUS.IDLE);
    };

    const handleRetry = () => {
        setErrorMessage("");
        setStatus(STATUS.IDLE);
    };

    // --- Render ---

    // 1. Instructions (Start Screen)
    if (step === STEPS.INSTRUCTIONS) {
        // Get instructions from sessionStorage
        const instructionsText = sessionStorage.getItem("instructions") || "";
        const instructionsData = sessionStorage.getItem("instructionsData");
        let parsedInstructions = [];

        try {
            if (instructionsData) {
                parsedInstructions = JSON.parse(instructionsData);
            }
        } catch (e) {
            console.error("Error parsing instructions data:", e);
        }

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-x-hidden">
                {/* Header - Full Width */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-20 w-full">
                    <div className="w-full px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src={Logo1} alt="KareerGrowth" className="h-10 w-auto object-contain" />
                        </div>
                        <div className="text-sm font-medium text-gray-500">
                            System Check <span className="text-green-600 ml-1">● Passed</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 w-full px-6 py-8 pb-32">
                    <div className="w-full">
                        {/* Title - Centered */}
                        <div className="w-full text-center mb-6">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                                Assessment Instructions
                            </h1>
                        </div>

                        {/* Display Instructions from API */}
                        {instructionsText && (
                            <div className="w-full">
                                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-normal">
                                    {instructionsText}
                                </div>
                            </div>
                        )}

                        {!instructionsText && parsedInstructions.length > 0 && (
                            <div className="w-full">
                                <div className="space-y-2">
                                    {parsedInstructions.map((inst, idx) => (
                                        <div key={idx} className="text-gray-700">
                                            {inst.instructionType && (
                                                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                                                    {inst.instructionType}
                                                </h3>
                                            )}
                                            <div className="text-sm whitespace-pre-wrap leading-normal">
                                                {inst.instructionText || inst.instruction || ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!instructionsText && parsedInstructions.length === 0 && (
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
                                <div className="flex gap-3">
                                    <div className="shrink-0 text-amber-500">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-amber-800 font-medium">General Instructions</p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Please read the instructions carefully before starting the assessment.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Footer - Full Width */}
                <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="w-full px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <label
                            className="flex items-center gap-3 cursor-pointer group select-none"
                            onClick={(e) => {
                                e.preventDefault();
                                setIsChecked(!isChecked);
                            }}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white group-hover:border-blue-400'}`}>
                                {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900">
                                I agree to the terms and conditions
                            </span>
                        </label>

                        <button
                            onClick={startFlow}
                            disabled={!isChecked}
                            className={`w-full sm:w-auto px-8 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all duration-200 ${isChecked ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            Start Assessment
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Active Flow
    return (
        <div className="h-screen w-screen bg-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
            <div className="text-center flex flex-col items-center max-w-lg w-full relative z-10 space-y-8">

                {/* Instruction Bubble */}
                <SpeechBubble text={currentInstruction} show={!!currentInstruction} />

                {/* Visuals */}
                <div className="flex justify-center items-center h-32">
                    <Waves isSpeaking={isSpeaking || isListening} />
                </div>

                {/* Status / Instructions */}
                <p className="text-gray-400 text-sm animate-pulse">
                    {status === STATUS.PROCESSING ? "Processing..." : "Please follow the voice instructions..."}
                </p>

                {/* Error / Retry */}
                {status === STATUS.WAITING_USER && (
                    <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <p className="text-red-500 font-medium">{errorMessage}</p>
                        <button
                            onClick={handleRetry}
                            className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>

            {/* Camera Preview Bottom Right */}
            {showCameraPreview && (
                <div className="fixed bottom-6 right-6 w-48 h-36 bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] text-white font-medium tracking-wide">REC</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionPage;
