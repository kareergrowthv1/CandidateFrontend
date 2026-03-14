import React from 'react';
import { motion } from 'framer-motion';

const SpeechBubble = ({ text = '', show = true }) => {
    const words = text.trim().split(/\s+/);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: show ? 1 : 0, y: show ? 0 : 10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            // Added mb-8 for spacing from the waves logic
            className="relative bg-white text-gray-900 px-6 py-4 rounded-2xl shadow-lg max-w-md text-center mx-auto mb-8 z-10"
            style={{
                boxShadow: '0 0 12px rgba(99,102,241,0.3)',
            }}
        >
            <div className="flex flex-wrap justify-center gap-x-1 gap-y-1 leading-relaxed text-lg font-normal">
                {words.map((word, i) => (
                    <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            delay: i * 0.1, // slightly faster reading
                            duration: 0.3,
                            ease: 'easeOut',
                        }}
                    >
                        {word}
                    </motion.span>
                ))}
            </div>

            {/* Bubble tail - pointing DOWN to the assistant/wave */}
            <div className="absolute left-1/2 -bottom-2 transform -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-sm"></div>
        </motion.div>
    );
};

export default SpeechBubble;
