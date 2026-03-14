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
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const key = (emailOrPhone || '').trim();
    if (!key) {
      showToast('Enter your email or mobile number.', 'error');
      return;
    }
    setBusy(true);
    try {
      await authAxiosInstance.post('/auth-session/candidate/forgot-password', {
        emailOrPhone: key,
      });
      setSent(true);
      showToast('If an account exists, you will receive reset instructions.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Request failed.';
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6 lg:bg-slate-50">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl lg:border lg:border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">Check your inbox</h1>
          <p className="mt-2 text-slate-600">
            If an account exists for that email or phone, we’ve sent password reset instructions.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 lg:bg-slate-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl lg:border lg:border-slate-100">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Forgot password?</h1>
        <p className="mt-2 text-slate-600">
          Enter your email or mobile number and we’ll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-700">
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
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </div>
    </div>
  );
}
