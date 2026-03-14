import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Star, Shield, Zap, Layout, ArrowRight } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { authAxiosInstance } from '../../../config/axiosConfig';
import { CANDIDATE_DEFAULT_ORGANIZATION_ID } from '../../../constants/api';
import {
  MOCK_CREDENTIALS,
  isMockIdentifier,
  isMockOtp,
  isMockPassword,
} from '../../../dummyData/mockAuth';

import dashboardPreview from '../../../assets/ai_resume.png'; // Use existing as placeholder

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder-slate-600 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-50';
const btnCls = 'relative w-full overflow-hidden rounded-xl py-4 text-sm font-black text-white shadow-lg transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 bg-blue-600 uppercase tracking-widest';

/** Normalize mobile to 10 digits only (strip 91, +91, non-digits). */
function toTenDigits(value) {
  if (value == null || value === '') return '';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length <= 10) return digits;
  if (digits.startsWith('91') && digits.length > 10) return digits.slice(-10);
  return digits.slice(0, 10);
}

const getStorage = (rememberMe) => (rememberMe ? localStorage : sessionStorage);

const GoogleIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#0077B5">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5V13.2a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 23 23">
    <path fill="#f3f3f3" d="M0 0h23v23H0z" />
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

const GithubIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { login } = useAuth();

  const [step, setStep] = useState('identifier'); // identifier | password | otp | register
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [identifierType, setIdentifierType] = useState('email'); // 'email' | 'phone'
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem('rememberMe') === 'true'; } catch { return true; }
  });
  const [busy, setBusy] = useState(false);

  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    const key = (emailOrPhone || '').trim();
    if (!key) {
      showToast('Enter email or mobile number.', 'error');
      return;
    }
    setBusy(true);
    try {
      if (isMockIdentifier(key)) {
        showToast(`Mock: OTP sent. Use code: ${MOCK_CREDENTIALS.otp}`, 'info', 8000);
        setIdentifierType('email');
        setStep('otp');
        return;
      }
      const { data } = await authAxiosInstance.post('/auth-session/candidate/check', { emailOrPhone: key });
      if (data && data.notCandidatePortal) {
        showToast('This portal is for candidates only. Please use the admin portal to sign in.', 'error');
        return;
      }
      if (data && data.existsInAuth) {
        setStep('password');
      } else {
        // Not in auth_db, check if in college_candidates (CandidateBackend)
        const detailsRes = await authAxiosInstance.post('/auth-session/candidate/details', {
          emailOrPhone: key,
          organizationId: CANDIDATE_DEFAULT_ORGANIZATION_ID
        });
        const candidate = detailsRes.data?.candidate;
        if (candidate) {
          // Found in DB, send OTP to register
          const otpRes = await authAxiosInstance.post('/auth-session/candidate/send-otp', { emailOrPhone: key });
          if (otpRes.data?.sent) {
            setCandidateName(candidate.candidate_name || '');
            setIdentifierType(key.includes('@') ? 'email' : 'phone');
            setStep('otp');
            showToast('Verification code sent to your ' + (key.includes('@') ? 'email' : 'phone') + '.', 'success');
          }
        } else {
          showToast('Account not found. Please contact support or use a registered email.', 'error');
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Check failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const key = (emailOrPhone || '').trim();
    if (!key || !password) {
      showToast('Email/phone and password are required.', 'error');
      return;
    }
    setBusy(true);
    const storage = getStorage(rememberMe);
    try {
      if (rememberMe) localStorage.setItem('rememberMe', 'true');
      else localStorage.removeItem('rememberMe');

      if (isMockIdentifier(key) && isMockPassword(password)) {
        storage.setItem('accessToken', 'mock-access-token');
        storage.setItem('xsrfToken', 'mock-xsrf-token');
        login({ id: 'mock', email: MOCK_CREDENTIALS.email, username: 'Mock User' });
        if (rememberMe) localStorage.setItem('user', JSON.stringify({ id: 'mock', email: MOCK_CREDENTIALS.email, username: 'Mock User' }));
        showToast('Signed in (mock).', 'success');
        navigate('/dashboard');
        return;
      }
      const { data } = await authAxiosInstance.post('/auth-session/candidate/login', {
        emailOrPhone: key,
        password
      });
      const d = data?.data;
      if (d?.accessToken) {
        storage.setItem('accessToken', d.accessToken);
        if (d.refreshToken) storage.setItem('refreshToken', d.refreshToken);
        if (d.xsrfToken) storage.setItem('xsrfToken', d.xsrfToken);
        const userData = d?.user ? { id: d.user.id, email: d.user.email, username: d.user.username } : { id: '', email: '', username: 'Candidate' };
        login(userData);
        if (rememberMe) localStorage.setItem('user', JSON.stringify(userData));
        showToast('Signed in successfully.', 'success');
        navigate('/dashboard');
      } else {
        showToast('Login failed.', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid credentials.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp) {
      showToast('Enter the verification code.', 'error');
      return;
    }
    setBusy(true);
    try {
      if (isMockOtp(otp)) {
        setStep('register');
        return;
      }
      await authAxiosInstance.post('/auth-session/candidate/verify-otp', {
        emailOrPhone: emailOrPhone.trim(),
        otp
      });
      setStep('register');
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid code.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      showToast('Please set a password.', 'error');
      return;
    }
    setBusy(true);
    const storage = getStorage(rememberMe);
    try {
      const { data } = await authAxiosInstance.post('/auth-session/candidate/register', {
        email: emailOrPhone.includes('@') ? emailOrPhone.trim() : undefined,
        mobile_number: !emailOrPhone.includes('@') ? emailOrPhone.trim() : undefined,
        candidate_name: candidateName,
        password,
        confirmPassword: password,
        organizationId: CANDIDATE_DEFAULT_ORGANIZATION_ID
      });
      const d = data?.data;
      if (d?.accessToken) {
        storage.setItem('accessToken', d.accessToken);
        if (d.refreshToken) storage.setItem('refreshToken', d.refreshToken);
        if (d.xsrfToken) storage.setItem('xsrfToken', d.xsrfToken);
        const userData = { id: d.user.id, email: d.user.email, username: d.user.username };
        login(userData);
        if (rememberMe) localStorage.setItem('user', JSON.stringify(userData));
        showToast('Account set up successfully!', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (step === 'password' || step === 'otp') {
      setStep('identifier');
      setPassword('');
      setOtp('');
    } else if (step === 'register') {
      setStep('otp');
      setPassword('');
    }
  };

  return (
    <div className="flex h-screen w-full bg-white font-['Inter',_sans-serif] overflow-hidden">
      {/* Left Panel: Form */}
      <div className="flex-1 flex flex-col px-6 py-6 md:px-12 lg:px-20 h-full overflow-hidden">
        <header className="mb-8 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">K</span>
            </div>
            <span className="text-xl font-black tracking-tight">KareerGrowth</span>
          </div>
        </header>

        <main className="flex-1 max-w-sm w-full mx-auto flex flex-col justify-center min-h-0 overflow-y-auto no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-3">
                <h1 className="text-3xl font-black text-slate-900 leading-tight">
                  Log in to your account
                </h1>
                <p className="text-sm font-gray-100 text-slate-900">Simple, fast, and no hidden fees!</p>
              </div>

              {step === 'identifier' && (
                <form onSubmit={handleIdentifierSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-900 ml-1">Email or Phone</label>
                    <input
                      type="text"
                      placeholder="Enter your email or phone"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      className={inputCls}
                      autoComplete="username"
                    />
                  </div>
                  <button type="submit" disabled={busy} className={btnCls}>
                    {busy ? 'Checking…' : 'Continue'}
                  </button>
                </form>
              )}

              {step === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-900">Password</label>
                      <button type="button" onClick={goBack} className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline">Change ID</button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputCls} pr-12`}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 hover:text-black"
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={busy} className={btnCls}>
                    {busy ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-900">Verification Code</label>
                      <button type="button" onClick={goBack} className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline">Change ID</button>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className={inputCls}
                    />
                    <p className="text-[10px] text-slate-500 mt-1 pl-1">A code was sent to your {identifierType}.</p>
                  </div>
                  <button type="submit" disabled={busy} className={btnCls}>
                    {busy ? 'Verifying…' : 'Verify & Continue'}
                  </button>
                </form>
              )}

              {step === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-900">Set Account Password</label>
                      <button type="button" onClick={goBack} className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline">Back</button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputCls} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 hover:text-black"
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 pl-1">Hi {candidateName.split(' ')[0]}, please set a password to secure your account.</p>
                  </div>
                  <button type="submit" disabled={busy} className={btnCls}>
                    {busy ? 'Setting up…' : 'Complete Setup'}
                  </button>
                </form>
              )}


              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100 border-dashed"></div>
                </div>
                <div className="relative flex justify-center text-[10px] font-normal uppercase tracking-widest text-slate-900">
                  <span className="bg-white px-2">or continue with</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
                <button className="flex items-center justify-center p-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <GoogleIcon />
                </button>
                <button className="flex items-center justify-center p-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <MicrosoftIcon />
                </button>
                <button className="flex items-center justify-center p-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <LinkedInIcon />
                </button>
                <button className="flex items-center justify-center p-1 rounded-lg hover:bg-slate-50 transition-colors">
                  <GithubIcon />
                </button>
              </div>

              <footer className="pt-4 text-center">

              </footer>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Right Panel: Features */}
      <div className="hidden lg:flex w-[52%] bg-white p-6 h-full overflow-hidden">
        <div className="w-full h-full bg-slate-100 rounded-[2rem] border border-slate-200 shadow-sm p-10 flex flex-col overflow-hidden relative">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Testimonial */}
            <div className="mb-10 shrink-0">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-0.5">
                  <Star size={14} className="fill-blue-500 text-blue-500" />
                  <Star size={14} className="fill-blue-500 text-blue-500" />
                  <Star size={14} className="fill-blue-500 text-blue-500" />
                  <Star size={14} className="fill-blue-500 text-blue-500" />
                  <Star size={14} className="fill-blue-500 text-blue-500 opacity-50" />
                </div>
                <span className="text-sm font-black text-slate-900 underline underline-offset-4 decoration-blue-500/30">4.9 / 5</span>
              </div>
              <p className="text-base font-medium text-slate-900 leading-relaxed mb-2 max-w-md italic">
                "KareerGrowth eased our hiring process. It conducts first round interviews and provides clear scorecards with highlights. We find candidates faster and avoid resume chaos."
              </p>
              <p className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Kartik Mandaville, Founder at Springworks</p>
            </div>

            {/* Dashboard Mockup */}
            <div className="flex-1 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden relative min-h-0">
              <img src={dashboardPreview} alt="Dashboard Preview" className="w-full h-full object-cover p-2 rounded-3xl" />
              <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
            </div>

            {/* Feature Grid */}
            <div className="mt-10 grid grid-cols-3 gap-8 shrink-0">
              <div className="space-y-3">
                <Layout size={20} className="text-slate-900" />
                <h4 className="text-sm font-black text-slate-900 leading-tight">Careers Page</h4>
                <p className="text-[10px] font-medium text-slate-900 leading-relaxed">Create your own customized careers page to start conducting interviews.</p>
              </div>
              <div className="space-y-3">
                <Zap size={20} className="text-slate-900" />
                <h4 className="text-sm font-black text-slate-900 leading-tight">Artificially Intelligent</h4>
                <p className="text-[10px] font-medium text-slate-900 leading-relaxed">Automated interviews that intelligently screen, assess, and prioritize candidates.</p>
              </div>
              <div className="space-y-3">
                <Shield size={20} className="text-slate-900" />
                <h4 className="text-sm font-black text-slate-900 leading-tight">Resume Parsing</h4>
                <p className="text-[10px] font-medium text-slate-900 leading-relaxed">Upload resumes and we'll automatically sort, filter, and send invitations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
