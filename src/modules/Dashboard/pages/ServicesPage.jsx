import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Check, 
  ArrowRight, 
  CreditCard, 
  ShieldCheck, 
  Sparkles,
  Loader2,
  TrendingUp,
  Target,
  Rocket,
  FileText,
  Code2
} from 'lucide-react';
import { paymentService } from '../../../services/paymentService';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { loadRazorpayScript, getRazorpayOptions } from '../../../utils/razorpayUtils';
import { CANDIDATE_DEFAULT_ORGANIZATION_ID } from '../../../constants/api';

const Shimmer = () => (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
);

export default function ServicesPage() {
    const { user, setRegistrationPaid } = useAuth();
    const { showToast } = useToast();
    const [plans, setPlans] = useState([]);
    const [status, setStatus] = useState(null);
    const [credits, setCredits] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [plansRes, statusRes, creditsRes] = await Promise.all([
                paymentService.getPlans(),
                paymentService.getStatus(),
                paymentService.getCredits()
            ]);

            if (plansRes?.success) setPlans(plansRes.data);
            
            // Extract status data robustly
            const statusData = statusRes?.data || statusRes;
            if (statusData?.isActive || statusRes?.success) {
                setStatus(statusData);
            }

            // Extract credits data robustly 
            const creditsData = creditsRes?.data || creditsRes;
            if (creditsData?.hasActivePlan || creditsRes?.success) {
                setCredits(creditsData);
            }
        } catch (error) {
            console.error("Error fetching services data:", error);
            showToast("Failed to load pricing details", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (plan) => {
        if (status?.isActive && status?.planId === plan.id) {
            showToast("You are already on this plan", "info");
            return;
        }

        setBusy(true);
        setSelectedPlanId(plan.id);

        const payload = {
            planId: plan.id,
            organizationId: user.organizationId || CANDIDATE_DEFAULT_ORGANIZATION_ID,
            candidateId: user.id || user.candidate_id || '',
            email: user.email
        };

        try {
            const isUpgrade = status?.isActive;
            const orderRes = isUpgrade 
                ? await paymentService.upgradeOrder(payload)
                : await paymentService.createOrder(payload);

            if (!orderRes.success) throw new Error(orderRes.message || "Order creation failed");

            if (orderRes.isFree) {
                showToast("Plan activated successfully!", "success");
                setRegistrationPaid(true);
                fetchData();
                return;
            }

            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) throw new Error("Payment gateway failed to load");

            const options = getRazorpayOptions({
                orderId: orderRes.data.orderId,
                key: orderRes.data.key,
                amount: orderRes.data.amount,
                email: user.email,
                name: "KareerGrowth",
                description: `Upgrade: ${plan.name} Plan`,
                onSuccess: async (response) => {
                    try {
                        setBusy(true);
                        const verifyRes = await paymentService.verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            candidateId: user.id
                        });

                        if (verifyRes.success) {
                            showToast("Upgrade successful! Welcome to " + plan.name, "success");
                            setRegistrationPaid(true);
                            fetchData();
                        } else {
                            showToast("Verification failed. Please contact support.", "error");
                        }
                    } catch (err) {
                        showToast("Error verifying payment", "error");
                    } finally {
                        setBusy(false);
                    }
                },
                onDismiss: () => setBusy(false)
            });

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error) {
            showToast(error.message || "An error occurred", "error");
            setBusy(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-8 animate-pulse">
                <div className="h-40 bg-slate-100 dark:bg-zinc-800 rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-96 bg-slate-100 dark:bg-zinc-800 rounded-3xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 pt-4 pb-20">
            {/* Credits Overview Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {[
                    { label: 'Allotted Credits', value: credits?.allotted || 0, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { label: 'Utilized Credits', value: credits?.utilized || 0, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-500/10' },
                    { label: 'Remaining Credits', value: credits?.remaining || 0, icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 p-6 rounded-md relative overflow-hidden group hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</span>
                                <span className={`text-[32px] font-black tracking-tighter ${stat.color}`}>
                                    {stat.value}
                                </span>
                            </div>
                            <div className={`p-3 rounded-md ${stat.bg}`}>
                                <stat.icon size={22} className={stat.color} />
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                            <stat.icon size={80} className={stat.color} />
                        </div>
                    </div>
                ))}
            </motion.div>

            <div className="flex flex-col gap-1 mb-10">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Available Subscription Plans</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">Choose a plan that fits your career aspirations and unlock high-fidelity AI services.</p>
            </div>

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                {plans.map((plan) => {
                    const isActive = status?.isActive && status?.planId === plan.id;
                    const isPremium = plan.name?.toLowerCase().includes('premium');
                    const isBusyPlan = busy && selectedPlanId === plan.id;

                    return (
                        <motion.div 
                            key={plan.id}
                            variants={itemVariants}
                            className={`relative flex flex-col p-6 rounded-md border transition-all duration-300 h-full group ${
                                isActive 
                                    ? 'border-blue-600 bg-white dark:bg-zinc-900 shadow-xl shadow-blue-500/5' 
                                    : 'border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 hover:border-blue-200 dark:hover:border-blue-900/40 hover:shadow-lg'
                            }`}
                        >
                            {isPremium && (
                                <div className="absolute -top-3 left-6 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black tracking-tight px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                                    <Sparkles size={8} /> Popular
                                </div>
                            )}

                            {isActive && (
                                <div className="absolute -top-3 right-6 bg-blue-600 text-white text-[9px] font-black tracking-tight px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                                    <Check size={8} /> Active
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-[17px] font-black text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors tracking-tight">{plan.name}</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium min-h-[32px] leading-snug">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">₹{parseFloat(plan.price).toLocaleString()}</span>
                                    <span className="text-[11px] font-bold text-slate-400 tracking-tight">/{plan.duration_months}mo</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-3 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded-sm w-fit">
                                    <Rocket size={14} className="text-blue-600" />
                                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                                        {plan.interview_credits} Credits
                                    </span>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {(plan.features || []).map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <div className="mt-0.5 bg-emerald-500/10 p-1 rounded-sm shrink-0">
                                            <Check size={10} className="text-emerald-500" strokeWidth={3} />
                                        </div>
                                        <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-snug">
                                            {feature.replace(/^[✔\s]+/, '')}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handlePurchase(plan)}
                                disabled={busy || isActive}
                                className={`w-full py-3.5 rounded-md text-[11px] font-black tracking-tight transition-all duration-300 flex items-center justify-center gap-2 ${
                                    isActive
                                        ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/10 hover:-translate-y-0.5'
                                } disabled:opacity-50`}
                            >
                                {isBusyPlan ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : isActive ? (
                                    <>Active</>
                                ) : (
                                    <>Select Plan <ArrowRight size={14} /></>
                                )}
                            </button>
                        </motion.div>
                    );
                })}
            </motion.div>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-16 w-full"
            >
                <div className="flex items-center gap-3 mb-10">
                    <div className="p-2 bg-blue-600 rounded-md shrink-0">
                        <TrendingUp size={18} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Credits Utilization</h2>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">
                            Detailed breakdown of how credits are consumed and deducted across all platform services and feature modules.
                        </p>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* AI Mock Section */}
                    <div className="space-y-6">
                        <h3 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                            <Rocket size={16} className="text-emerald-600" /> AI Mock Interviews
                        </h3>
                        <div className="space-y-8 pl-6 border-l-2 border-slate-100 dark:border-white/5">
                            <div>
                                <h4 className="text-[14px] font-normal text-slate-900 dark:text-white mb-2">Communication Round</h4>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed w-full mb-4">
                                    Master the art of professional expression and conversational intelligence. In this module, you will learn to manage your speaking pace for maximum impact, refine your business vocabulary, and deliver clear, structured responses during high-pressure inquiries. We focus on active listening markers, fluency, and the ability to articulate complex thoughts into simple, actionable professional dialogues. Additionally, you will master non-verbal cues in vocal delivery to project confidence and authority in any interview setting.
                                </p>
                                <div className="space-y-2 mb-6 w-full">
                                    {[
                                        "Master speaking pace and articulation for professional impact.",
                                        "Enhance professional and business vocabulary depth.",
                                        "Improve structured thought delivery and response clarity.",
                                        "Refine active listening markers and overall response fluency."
                                    ].map((point, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                            {point}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">4 Min - 10 Credits</span>
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">8 Min - 15 Credits</span>
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">12 Min - 25 Credits</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[14px] font-normal text-slate-900 dark:text-white mb-2">Technical Round</h4>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed w-full mb-4">
                                    Deepen your technical problem-solving and architectural thinking. This session is designed to help you articulate your code logic with precision, handle complex conceptual inquiries with confidence, and demonstrate deep subject matter expertise. You will learn how to explain system designs, trade-offs, and algorithmic optimizations while maintaining a clear technical narrative that resonates with senior evaluators. The session also covers how to approach edge cases, scalability, and performance bottlenecks during a technical discussion.
                                </p>
                                <div className="space-y-2 mb-6 w-full">
                                    {[
                                        "Articulate complex code logic with technical precision.",
                                        "Master conceptual depth and core subject matter expertise.",
                                        "Demonstrate architectural and system design thinking during interviews.",
                                        "Practice technical narrative building and interviewer buy-in strategies."
                                    ].map((point, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                            {point}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">4 Min - 12 Credits</span>
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">8 Min - 20 Credits</span>
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">12 Min - 30 Credits</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[14px] font-normal text-slate-900 dark:text-white mb-2">HR Management Round</h4>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed w-full mb-4">
                                    Refine your soft skills, situational awareness, and leadership storytelling. You will master the STAR method for behavioral questions, learn situational judgment techniques, and understand how to align your professional achievements with organizational culture. We focus on the psychology of professional interaction, emotional intelligence, and demonstrating your unique value proposition to decision-makers. You will also learn how to handle difficult personality-based questions and articulate your long-term career vision with clarity.
                                </p>
                                <div className="space-y-2 mb-6 w-full">
                                    {[
                                        "Master the STAR method for high-impact behavioral answers.",
                                        "Learn to align background with specific organizational culture values.",
                                        "Enhance situational judgment and situational awareness skills.",
                                        "Demonstrate high emotional intelligence (EQ) and leadership readiness."
                                    ].map((point, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                            {point}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">4 Min - 15 Credits</span>
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">8 Min - 25 Credits</span>
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">12 Min - 35 Credits</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resume & ATS Section */}
                    <div className="space-y-6">
                        <h3 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                            <FileText size={16} className="text-emerald-600" /> Resume & ATS Services
                        </h3>
                        <div className="space-y-10 pl-6 border-l-2 border-slate-100 dark:border-white/5">
                            <div>
                                <h4 className="text-[14px] font-normal text-slate-900 dark:text-white mb-2">ATS Resume Score Analysis</h4>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed w-full mb-4">
                                    Gain a decisive competitive edge with our multi-layered AI ATS scoring engine. This comprehensive diagnostic tool performs a deep scan of your resume against specific industry job descriptions, uncovering critical keyword gaps, formatting inconsistencies, and layout parsing errors that often lead to automated rejection. You will learn how to optimize your document for maximum visibility in talent acquisition databases.
                                </p>
                                <div className="space-y-2 mb-6 w-full">
                                    {[
                                        "Perform high-precision keyword density analysis for niche roles.",
                                        "Diagnose and resolve layout parsing errors for 100% ATS compatibility.",
                                        "Master quantitative achievement storytelling to boost recruiter interest.",
                                        "Identify and eliminate redundant sections that dilute your value proposition."
                                    ].map((point, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                            {point}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">Detailed Report Check - 30 Credits</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[14px] font-normal text-slate-900 dark:text-white mb-2">Resume Templates Utilization</h4>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed w-full mb-4">
                                    Unlock professional excellence with our curated library of industry-vetted resume templates. Engineered by talent acquisition experts, these designs balance aesthetic appeal with technical readability. Whether you are an entry-level professional or a C-suite executive, you will find a design architecture that perfectly showcases your unique career trajectory while maintaining a professional and premium look.
                                </p>
                                <div className="space-y-2 mb-6 w-full">
                                    {[
                                        "Basic Tier: Access to clean, minimal templates perfect for early careers.",
                                        "Professional Tier: High-fidelity designs optimized for mid-level visibility.",
                                        "Premium Tier: Executive-grade layouts with advanced structural customization.",
                                        "Experience automated formatting and multi-industry design standards."
                                    ].map((point, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                            {point}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">Basic - 15 Credits</span>
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">Premium - 25 Credits</span>
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">Pro - 40 Credits</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Technical Section */}
                    <div className="space-y-6">
                        <h3 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                            <Code2 size={16} className="text-emerald-600" /> Technical Skill Development
                        </h3>
                        <div className="space-y-10 pl-6 border-l-2 border-slate-100 dark:border-white/5">
                            <div>
                                <h4 className="text-[14px] font-normal text-slate-900 dark:text-white mb-2">Offline Coding Concepts</h4>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed w-full mb-4">
                                    Propel your technical proficiency with permanent access to our immersive offline coding ecosystem. This module is designed for candidates who want to master the building blocks of software engineering without time pressure. You will dive deep into algorithm complexity, data structure efficiency, and language-specific design patterns, building a foundational expertise that allows you to solve real-world problems with elegance.
                                </p>
                                <div className="space-y-2 mb-6 w-full">
                                    {[
                                        "Permanent lifetime access to all core and advanced coding concepts.",
                                        "Intensive algorithm design tutorials and logical efficiency drills.",
                                        "Master complex architectural patterns and software development life cycles.",
                                        "Practice in a high-performance sandbox environment for interview readiness."
                                    ].map((point, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                            {point}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-[10px] font-medium text-purple-600 dark:text-purple-400">Full Concepts Unlock - 50 Credits</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Footer Note */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-14 p-6 bg-slate-50 dark:bg-white/5 rounded-md border border-slate-100 dark:border-white/5 text-center"
            >
                <div className="flex items-center justify-center gap-2 mb-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">Secure Payment Integration</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
                    All payments are processed securely through Razorpay. By upgrading, you agree to our terms of service and usage policies for AI credits. 
                    Credits are reset monthly according to your billing cycle.
                </p>
            </motion.div>
        </div>
    );
}
