import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Search, CheckCircle2 } from 'lucide-react';
import kgLogo from '../../assets/logo.png';

const AILoader = ({ message = "KareerGrowth AI Intelligence" }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
            <div className="max-w-md w-full p-8 text-center space-y-8">
                {/* Central Logo & Pulse */}
                <div className="relative inline-block">
                    <motion.div
                        animate={{
                            scale: [1, 1.15, 1],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl"
                    />
                    <div className="relative h-24 w-24 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/10 flex items-center justify-center overflow-hidden mx-auto">
                        <img src={kgLogo} alt="KG" className="w-[70%] h-[70%] object-contain" />
                    </div>
                </div>

                {/* Animated Text */}
                <div className="space-y-3">
                    <motion.h3 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter"
                    >
                        {message}
                    </motion.h3>
                    <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles className="w-4 h-4" />
                        </motion.div>
                        Analyzing Professional Potential
                    </div>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-4 max-w-xs mx-auto">
                    {[
                        { icon: Search, text: "Extracting Resume Insights..." },
                        { icon: Brain, text: "AI Pattern Matching..." },
                        { icon: CheckCircle2, text: "Generating Detailed Report..." }
                    ].map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.8 }}
                            className="flex items-center gap-3 text-left"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{step.text}</span>
                        </motion.div>
                    ))}
                </div>

                {/* Custom Progress Bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 5, ease: "easeInOut" }}
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                    />
                </div>
                
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Precision Assessment in Progress
                </p>
            </div>
        </div>
    );
};

export default AILoader;
