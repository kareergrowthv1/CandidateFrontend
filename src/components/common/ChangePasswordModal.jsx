import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { authAxiosInstance } from '../../config/axiosConfig';
import { useToast } from '../../context/ToastContext';
import { Link } from 'react-router-dom';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleInputChange = (field, value, setter) => {
    setter(value);
    // Clear error for this field when user types
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setFieldErrors({ newPassword: 'Password must be at least 8 characters long' });
      return;
    }

    setLoading(true);
    try {
      await authAxiosInstance.post('/auth-session/change-password', {
        oldPassword,
        newPassword
      });
      showToast('Secure Update: Your password has been successfully updated.', 'success');
      onClose();
      // Reset fields
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors) {
        // Backend validation failed (express-validator)
        const backendErrors = {};
        err.response.data.errors.forEach(error => {
          const field = error.field || error.path || error.param;
          backendErrors[field] = error.msg || error.message;
        });
        setFieldErrors(backendErrors);
        showToast('Security Requirements Not Met: Please check the highlighted fields.', 'warning');
      } else if (err.response?.status === 401) {
        setFieldErrors({ oldPassword: 'The current password provided is incorrect' });
        showToast('Authentication Failed: Incorrect current password.', 'error');
      } else {
        const msg = err.response?.data?.message || err.message || 'Operation Failed: Unable to update password at this time.';
        showToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900"
        >
          {/* Header */}
          <div className="relative h-28 bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Lock size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Change Password</h2>
                <p className="text-blue-100 text-sm">Update your account credentials</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Old Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Current Password
                </label>
                <div className="relative group">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => handleInputChange('oldPassword', e.target.value, setOldPassword)}
                    required
                    className={`w-full rounded-xl border ${fieldErrors.oldPassword ? 'border-red-500 bg-red-50/10' : 'border-slate-200 bg-slate-50'} px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/10`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.oldPassword && (
                  <p className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1 uppercase tracking-tight">
                    <AlertCircle size={12} /> {fieldErrors.oldPassword}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  New Password
                </label>
                <div className="relative group">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value, setNewPassword)}
                    required
                    className={`w-full rounded-xl border ${fieldErrors.newPassword ? 'border-red-500 bg-red-50/10' : 'border-slate-200 bg-slate-50'} px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/10`}
                    placeholder="Min 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.newPassword && (
                  <div className="mt-2 rounded-xl bg-red-50 p-3 text-red-600 dark:bg-red-900/10 animate-in fade-in slide-in-from-top-1 border border-red-100 dark:border-red-900/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle size={14} className="shrink-0" />
                      <p className="text-[11px] font-bold uppercase tracking-wider">Validation Error</p>
                    </div>
                    <p className="text-xs font-medium mb-2">{fieldErrors.newPassword}</p>
                    <div className="grid grid-cols-1 gap-1 pl-1">
                      {[
                        'At least 8 characters long',
                        'At least one uppercase letter (A-Z)',
                        'At least one lowercase letter (a-z)',
                        'At least one number (0-9)',
                        'At least one special character (!@#$%^&*)'
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10.5px]">
                          <div className="h-1 w-1 rounded-full bg-red-400" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Confirm New Password
                </label>
                <div className="relative group">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value, setConfirmPassword)}
                    required
                    className={`w-full rounded-xl border ${fieldErrors.confirmPassword ? 'border-red-500 bg-red-50/10' : 'border-slate-200 bg-slate-50'} px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/10`}
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="flex items-center gap-1.5 px-1 text-[11px] font-bold text-red-500 animate-in fade-in slide-in-from-top-1 uppercase tracking-tight">
                    <AlertCircle size={12} /> {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Security Note / Forgot Link */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <ShieldCheck size={14} className="text-blue-500" />
                  <span>Secure verified updates</span>
                </div>
                <Link
                  to="/forgot-password"
                  onClick={onClose}
                  className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline decoration-blue-300 underline-offset-4"
                >
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/10 transition-all hover:bg-blue-700 hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ChangePasswordModal;
