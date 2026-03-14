import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const generateWavePath = ({
    width,
    height,
    amplitude,
    frequency,
    phase,
    concentrationFactor,
    verticalShift,
    direction,
}) => {
    const centerY = height / 2;
    const centerX = width / 2;
    let path = '';

    for (let x = 0; x <= width; x++) {
        const distance = Math.abs(x - centerX);
        const normalizedDist = distance / (width * concentrationFactor);
        let envelope = Math.exp(-Math.pow(normalizedDist, 2));

        // ✅ Boost center region more sharply
        const centerBoost = 1 + 1.5 * Math.exp(-Math.pow(normalizedDist * 2, 2)); // sharp peak
        envelope *= centerBoost;

        const y =
            centerY + amplitude * envelope * Math.sin(frequency * x + direction * phase) + verticalShift;

        path += `${x === 0 ? 'M' : 'L'}${x},${y} `;
    }

    return path;
};

const SiriWave = ({
    isSpeaking = false, // Changed prop name to match PermissionPage usage (isActive -> isSpeaking) or I can change PermissionPage
    // Actually PermissionPage passes 'isActive'. I should probably stick to matching the PROP name or change PermissionPage.
    // The reference uses 'isSpeaking'.
    // I'll stick to 'isSpeaking' and update PermissionPage to pass 'isSpeaking={isActive}' or similar.
    // Wait, let's keep the props flexible.
    isActive, // I will alias this
    width = 400,
    height = 200,
    animationSpeed = 0.08,
    startColor = '#e754ec',
    midColor = '#4a7fff',
    endColor = '#00f7ff',
    className = '',
}) => {
    // Alias isActive to isSpeaking if provided
    const speaking = isSpeaking || isActive;

    const [phase, setPhase] = useState(0);
    const animationRef = useRef(null);

    useEffect(() => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);

        const animate = () => {
            if (speaking) {
                setPhase((prev) => prev + animationSpeed);
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        if (speaking) {
            animationRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [speaking, animationSpeed]);

    const waveConfig = speaking
        ? [
            [
                { amplitude: 6, frequency: 0.02, opacity: 0.35, direction: 1, verticalShift: 0 },
                { amplitude: 5, frequency: 0.025, opacity: 0.3, direction: -1, verticalShift: -1 },
            ],
            [
                { amplitude: 4, frequency: 0.03, opacity: 0.25, direction: 1, verticalShift: 1 },
                { amplitude: 3, frequency: 0.034, opacity: 0.2, direction: -1, verticalShift: 0 },
            ],
        ]
        : [
            [
                { amplitude: 1.5, frequency: 0.02, opacity: 0.1, direction: 1, verticalShift: 0 },
                { amplitude: 1, frequency: 0.025, opacity: 0.08, direction: -1, verticalShift: -0.5 },
            ],
        ];

    return (
        <div
            className={`flex justify-center items-center ${className}`}
            style={{ height: `${height}px`, width: `${width}px` }}
        >
            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                className="w-full h-full"
            >
                <defs>
                    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={startColor} />
                        <stop offset="50%" stopColor={midColor} />
                        <stop offset="100%" stopColor={endColor} />
                    </linearGradient>

                    {/* ✅ Blur and Glow Filter */}
                    <filter id="waveBlur" x="-10%" y="-10%" width="120%" height="120%">
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <AnimatePresence>
                    {waveConfig.map((group, groupIndex) => (
                        <g
                            key={`group-${groupIndex}`}
                            filter="url(#waveGlow)"
                            opacity={speaking ? 1 : 0.7}
                        >
                            {group.map((wave, waveIndex) => {
                                const phaseOffset = groupIndex * 0.4 + waveIndex * 0.3;
                                return (
                                    <motion.path
                                        key={`wave-${groupIndex}-${waveIndex}`}
                                        d={generateWavePath({
                                            width,
                                            height,
                                            amplitude: wave.amplitude,
                                            frequency: wave.frequency,
                                            phase: phase + phaseOffset,
                                            concentrationFactor: 0.18,
                                            verticalShift: wave.verticalShift,
                                            direction: wave.direction,
                                        })}
                                        fill="url(#waveGradient)"
                                        fillOpacity={wave.opacity}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, transition: { duration: 0.4 } }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                );
                            })}
                        </g>
                    ))}
                </AnimatePresence>
            </svg>
        </div>
    );
};

export default SiriWave;
