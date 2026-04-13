import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../../context/ToastContext';
import { authAxiosInstance } from '../../../config/axiosConfig';
import { ArrowLeft } from 'lucide-react';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100';
const btnCls =
  'relative w-full overflow-hidden rounded-full py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-inset ring-white/20 transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60';
const btnStyle = {
  background: 'linear-gradient(180deg, #FF8C00 0%, #FF6B00 45%, #FF4E00 100%)',
  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
};

export default function ForgotPassword() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('identifier'); // identifier | reset
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const key = (emailOrPhone || '').trim();
    if (!key) {
      showToast('Enter your email or mobile number.', 'error');
      return;
    }
    setBusy(true);
    try {
      const { data } = await authAxiosInstance.post('/auth-session/candidate/forgot-password', {
        emailOrPhone: key,
      });
      if (data.success) {
        setStep('reset');
        showToast(data.message || 'Verification code sent.', 'success');
        if (data.otp) {
          showToast(`Dev Mode OTP: ${data.otp}`, 'info', 10000);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Request failed.';
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp) return showToast('Enter the verification code.', 'error');
    if (!newPassword || newPassword.length < 6) return showToast('Password must be at least 6 characters.', 'error');
    if (newPassword !== confirmPassword) return showToast('Passwords do not match.', 'error');

    setBusy(true);
    try {
      const { data } = await authAxiosInstance.post('/auth-session/candidate/reset-password', {
        emailOrPhone,
        otp,
        newPassword
      });
      if (data.success) {
        showToast('Password reset successfully. Please login.', 'success');
        navigate('/login');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Reset failed.';
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 lg:bg-slate-50 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl lg:border lg:border-slate-100 dark:bg-zinc-900 dark:border-zinc-800">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        {step === 'identifier' ? (
          <>
            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Forgot password?</h1>
            <p className="mt-2 text-slate-600 dark:text-zinc-400">
              Enter your email or mobile number and we’ll send you a verification code to reset your password.
            </p>
            <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-zinc-300">
                  Email or mobile number
                </label>
                <input
                  type="text"
                  placeholder="Enter email or mobile"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className={inputCls}
                  autoComplete="username"
                />
              </div>
              <button type="submit" disabled={busy} className={btnCls} style={btnStyle}>
                {busy ? 'Sending…' : 'Send verification code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
            <p className="mt-2 text-slate-600 dark:text-zinc-400">
              Enter the code sent to <span className="font-bold text-orange-600">{emailOrPhone}</span> and set your new password.
            </p>
            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-zinc-300">
                  Verification Code (OTP)
                </label>
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-zinc-300">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-700 dark:text-zinc-300">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              <button type="submit" disabled={busy} className={btnCls} style={btnStyle}>
                {busy ? 'Resetting…' : 'Reset Password'}
              </button>
              <button 
                type="button" 
                onClick={() => setStep('identifier')}
                className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Resend code
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
