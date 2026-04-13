import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { paymentService } from '../../../services/paymentService';
import { loadRazorpayScript, getRazorpayOptions } from '../../../utils/razorpayUtils';
import { CANDIDATE_DEFAULT_ORGANIZATION_ID } from '../../../constants/api';

const PlanCard = ({ plan, onSelect, isBusy, isSelected }) => {
  const isFree = parseFloat(plan.price) === 0;
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`relative flex flex-col p-6 rounded-3xl border transition-all h-full ${
        isSelected 
          ? 'border-blue-600 ring-4 ring-blue-50 bg-white' 
          : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      {plan.name === 'Premium' && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
          Most Popular
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-xl font-black text-slate-900 mb-2">{plan.name}</h3>
        <p className="text-xs text-slate-500 line-clamp-2 h-8">{plan.description}</p>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-slate-900">₹{parseFloat(plan.price).toLocaleString()}</span>
          <span className="text-sm font-bold text-slate-400">/{plan.duration_months} mo</span>
        </div>
        <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mt-2">
          {plan.interview_credits} Interview Credits
        </p>
      </div>

      <ul className="space-y-4 mb-6 flex-1">
        {(plan.features || []).map((feature, i) => {
          const cleanFeature = feature.replace(/^[✔\s]+/, '');
          return (
            <li key={i} className="flex items-start gap-3">
              <div className="mt-0.5 bg-green-500 p-0.5 rounded-full shrink-0">
                <Check size={10} className="text-white" />
              </div>
              <span className="text-xs font-medium text-slate-700 leading-relaxed">{cleanFeature}</span>
            </li>
          );
        })}
        <li className="flex items-start gap-3">
          <div className="mt-0.5 bg-green-500 p-0.5 rounded-full shrink-0">
            <Check size={10} className="text-white" />
          </div>
          <span className="text-xs font-medium text-slate-700 leading-relaxed">
            {(() => {
                const level = plan.permissions?.round1ReportLevel || 'none';
                const labels = { 
                  complete: 'Complete AI Analysis report', 
                  standard: 'Standard AI Analysis report', 
                  min: 'Minimal AI Analysis report', 
                  none: 'No AI Analysis report' 
                };
                return labels[level] || labels.none;
              })()}
          </span>
        </li>
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isBusy}
        className={`w-full py-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${
          isFree
            ? 'bg-slate-900 text-white hover:bg-black'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isBusy && isSelected ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <>
            {isFree ? 'Get Started' : 'Select Plan'}
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </motion.div>
  );
};

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, setRegistrationPaid } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => {
    const checkStatusAndFetchPlans = async () => {
      try {
        setLoading(true);
        // 1. Check if user already has an active plan
        const statusRes = await paymentService.getStatus();
        if (statusRes.success && statusRes.isActive) {
          navigate("/dashboard");
          return;
        }

        // 2. If no active plan, fetch available plans
        const plansRes = await paymentService.getPlans();
        if (plansRes.success) {
          setPlans(plansRes.data);
        }
      } catch (error) {
        showToast("Failed to load subscription details.", "error");
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      checkStatusAndFetchPlans();
    }
  }, [user, navigate]);

  const handleSelectPlan = async (plan) => {
    if (!user) {
      showToast("Please sign in first.", "error");
      navigate("/login");
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

    console.log("Creating order with payload:", payload);

    if (!payload.organizationId || !payload.candidateId || !payload.email) {
      console.error("Missing fields in payload:", payload);
      showToast("Missing required user information. Please try re-logging.", "error");
      setBusy(false);
      return;
    }

    try {
      // 1. Create Order (Use PUT for upgrades from Free, POST for new/other)
      const isUpgrade = user.plan_name === 'Free' || user.plan_id === '0cfc16a9-0a73-4993-ad54-0a1076f0bd70';
      
      const orderRes = isUpgrade 
        ? await paymentService.upgradeOrder(payload)
        : await paymentService.createOrder(payload);

      if (!orderRes.success) {
        throw new Error(orderRes.message || "Order creation failed");
      }

      // 2. If Free Plan, redirect immediately
      if (orderRes.isFree) {
        showToast("Plan activated successfully!", "success");
        setRegistrationPaid(true);
        navigate("/dashboard");
        return;
      }

      // 3. Paid Plan: Load Razorpay
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Check your internet connection.");
      }

      const options = getRazorpayOptions({
        orderId: orderRes.data.orderId,
        key: orderRes.data.key,
        amount: orderRes.data.amount,
        email: user.email,
        name: "KareerGrowth",
        description: `Subscription: ${plan.name} Plan`,
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
              showToast("Payment successful! Welcome to " + plan.name + ".", "success");
              setRegistrationPaid(true);
              navigate("/dashboard");
            } else {
              showToast("Verification failed. Please contact support.", "error");
            }
          } catch (err) {
            showToast("Error verifying payment.", "error");
          } finally {
            setBusy(false);
          }
        },
        onDismiss: () => {
          setBusy(false);
        }
      });

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      showToast(error.message || "An error occurred.", "error");
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-500 font-medium">Fetching best plans for you...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter',_sans-serif] pt-10 pb-10 px-6">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-2"
          >
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">K</span>
            </div>
            <span className="text-xl font-black tracking-tight">KareerGrowth</span>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto"
          >
            Choose a plan that fits your career goals. Get access to AI-powered interviews, 
            detailed feedback, and premium job placements.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="h-full"
            >
              <PlanCard 
                plan={plan} 
                onSelect={handleSelectPlan} 
                isBusy={busy}
                isSelected={selectedPlanId === plan.id}
              />
            </motion.div>
          ))}
        </div>


      </div>
    </div>
  );
}
