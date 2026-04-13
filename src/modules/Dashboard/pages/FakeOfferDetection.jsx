import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Upload, 
  CheckCircle2, 
  FileText, 
  ShieldCheck,
  X,
  Loader2,
  Globe,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getOfferVerificationHistory, verifyOfferLetter } from '../../../services/candidateService';

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function FakeOfferDetection() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    address: '',
    ctc: ''
  });
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getOfferVerificationHistory();
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const startVerification = async () => {
    if (!file || !formData.companyName) return;
    
    setIsUploading(true);
    setError(null);
    setVerificationResult(null);
    setUploadProgress(10); // Start progress

    try {
      const data = new FormData();
      data.append('offerLetter', file);
      data.append('companyName', formData.companyName);
      data.append('website', formData.website);
      data.append('address', formData.address);
      data.append('ctc', formData.ctc);

      setUploadProgress(40);
      const result = await verifyOfferLetter(data);
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setVerificationResult(result);
        fetchHistory(); // Refresh history
      }, 500);

    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.message || 'Failed to analyze offer letter');
      setIsUploading(false);
    }
  };

  const handleViewHistoryItem = (item) => {
    setVerificationResult(item.analysis);
    // Scroll to results
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setFormData({ companyName: '', website: '', address: '', ctc: '' });
    setFile(null);
    setVerificationResult(null);
    navigate('/dashboard');
  };

  return (
    <div className="w-full py-6">
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Row 1: Name and Website */}
            <div>
              <label className="text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 block ml-0.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="e.g. Google India"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 block ml-0.5">
                Company Website <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="e.g. www.google.com"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] text-slate-900 dark:text-white"
                required
              />
            </div>

            {/* Row 2: Address and CTC */}
            <div>
              <label className="text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 block ml-0.5">
                Company Address <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter company location"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 block ml-0.5">
                Annual CTC (LPA) <span className="text-red-500">*</span>
              </label>
              <input 
                type="number"
                name="ctc"
                value={formData.ctc}
                onChange={handleInputChange}
                placeholder="e.g. 15"
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 block ml-0.5">
              Upload Offer Letter (PDF, Word) <span className="text-red-500">*</span>
            </label>
            {!file ? (
              <div className="relative group">
                <input 
                  type="file" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept=".pdf,.doc,.docx"
                />
                <div className="border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 rounded-lg p-10 text-center border-dashed group-hover:bg-slate-100 transition-all">
                  <Upload size={24} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-500">Pick some file or Drag here</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/20 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-zinc-800 rounded-md shadow-sm">
                    <FileText size={18} className="text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-200 truncate max-w-[200px]">{file.name}</span>
                </div>
                <button onClick={() => setFile(null)} className="p-1 text-blue-400 hover:text-rose-500 transition-colors">
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm font-semibold"
              >
                <ShieldAlert size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons: Right Aligned */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button 
              onClick={handleCancel}
              className="px-6 py-2 text-[13px] font-bold text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all uppercase tracking-wide"
            >
              Cancel
            </button>
            <button 
              onClick={startVerification}
              disabled={!file || !formData.companyName || isUploading}
              className="px-8 py-2 bg-gradient-to-b from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:brightness-110 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[13px] uppercase tracking-wide flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyzing {uploadProgress}%
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  {verificationResult ? 'Rescan' : 'Verify Offer'}
                </>
              )}
            </button>
          </div>

          {/* Result Below Form */}
          <AnimatePresence>
            {verificationResult && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="pt-6"
              >
                {!verificationResult.isOfferLetter ? (
                  /* Invalid Document State */
                  <div className="p-8 rounded-2xl border bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700 shadow-sm space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-zinc-700 flex items-center justify-center">
                        <FileText size={32} className="text-slate-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Document Type Invalid</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-400">The uploaded file does not appear to be a standard job offer letter.</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-3">
                      <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
                        {verificationResult.finalVerdict}
                      </p>
                    </div>

                    <button 
                      onClick={() => {setFile(null); setVerificationResult(null);}}
                      className="text-[13px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Try another document
                    </button>
                  </div>
                ) : (
                  /* Valid Offer Letter Analysis */
                  <div className={`p-8 rounded-2xl border space-y-8 shadow-sm ${
                    verificationResult.fraudRiskScore === 'HIGH' 
                      ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20' 
                      : verificationResult.fraudRiskScore === 'MEDIUM'
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                          verificationResult.fraudRiskScore === 'HIGH'
                            ? 'bg-rose-500 shadow-rose-500/30'
                            : verificationResult.fraudRiskScore === 'MEDIUM'
                              ? 'bg-amber-500 shadow-amber-500/30'
                              : 'bg-emerald-500 shadow-emerald-500/30'
                        }`}>
                          {verificationResult.fraudRiskScore === 'HIGH' ? <ShieldAlert size={36} className="text-white" /> : <ShieldCheck size={36} className="text-white" />}
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                            {verificationResult.fraudRiskScore === 'HIGH' ? 'High Risk' : verificationResult.fraudRiskScore === 'MEDIUM' ? 'Suspicious' : 'Authentic'}
                          </h3>
                          <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${
                            verificationResult.fraudRiskScore === 'HIGH' ? 'text-rose-600' : verificationResult.fraudRiskScore === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            Trust Score: {verificationResult.confidenceLevel}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidence Level</p>
                        <div className="w-32 h-1.5 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${
                            verificationResult.confidenceLevel > 80 ? 'bg-emerald-500' : verificationResult.confidenceLevel > 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`} style={{ width: `${verificationResult.confidenceLevel}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white/40 dark:bg-black/10 rounded-xl border border-white/60 dark:border-white/5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 leading-relaxed italic">
                        "{verificationResult.finalVerdict}"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Red Flags */}
                      {verificationResult.redFlags?.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest ml-1">Critical Red Flags</p>
                          <div className="space-y-2">
                            {verificationResult.redFlags.map((flag, i) => (
                              <div key={i} className="flex items-start gap-3 p-3.5 bg-rose-500/5 dark:bg-rose-500/10 rounded-xl text-[13px] font-medium text-slate-700 dark:text-zinc-300 border border-rose-100/50">
                                <X size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                {flag}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Genuine Indicators */}
                      {verificationResult.genuineIndicators?.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest ml-1">Authenticity Markers</p>
                          <div className="space-y-2">
                            {verificationResult.genuineIndicators.map((item, i) => (
                              <div key={i} className="flex items-start gap-3 p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl text-[13px] font-medium text-slate-700 dark:text-zinc-300 border border-emerald-100/50">
                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-zinc-700/50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg text-white ${
                          verificationResult.fraudRiskScore === 'HIGH' ? 'bg-rose-500' : verificationResult.fraudRiskScore === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}>
                          <CheckCircle2 size={16} />
                        </div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                          {verificationResult.fraudRiskScore === 'HIGH' 
                            ? 'This document contains multiple high-risk fraud indicators. Proceed with extreme caution.'
                            : verificationResult.fraudRiskScore === 'MEDIUM'
                              ? 'Some inconsistencies were detected. Please verify company details manually.'
                              : 'This offer letter passed automated safety checks and appears authentic.'}
                        </p>
                      </div>
                      <button 
                        onClick={() => {setFile(null); setVerificationResult(null); setFormData({companyName: '', website: '', address: '', ctc: ''})}}
                        className="text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:underline"
                      >
                        Clear Results
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Scans Section (Moved below results) */}
          {history.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 pt-10 border-t border-slate-200 dark:border-zinc-800"
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Clock size={20} className="text-blue-600" />
                Recent Scans
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {history.map((item, idx) => (
                      <motion.div 
                          key={idx}
                          whileHover={{ scale: 1.02, y: -2 }}
                          onClick={() => handleViewHistoryItem(item)}
                          className="group bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-slate-200/60 dark:border-zinc-800 rounded-xl p-4 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden"
                      >
                          <div className="flex items-start justify-between relative z-10">
                              <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    item.analysis.fraudRiskScore === 'HIGH' ? 'bg-rose-500/10 text-rose-500' : 
                                    item.analysis.fraudRiskScore === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500' : 
                                    'bg-emerald-500/10 text-emerald-500'
                                  }`}>
                                      <ShieldCheck size={16} />
                                  </div>
                                  <div className="min-w-0">
                                      <h3 className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight truncate">{item.companyName}</h3>
                                      <p className="text-[10px] text-slate-500 dark:text-zinc-500 font-medium mt-0.5 truncate">
                                          {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                      </p>
                                  </div>
                              </div>

                              <div className="text-right">
                                  <div className={`text-lg font-black italic tracking-tighter leading-none ${
                                      item.analysis.fraudRiskScore === 'HIGH' ? 'text-rose-500' : 
                                      item.analysis.fraudRiskScore === 'MEDIUM' ? 'text-amber-500' : 
                                      'text-emerald-500'
                                  }`}>
                                      {item.analysis.confidenceLevel}<span className="text-[9px] non-italic font-bold ml-0.5">%</span>
                                  </div>
                                  <div className="text-[7px] text-zinc-400 font-black uppercase mt-0.5">SCORE</div>
                              </div>
                          </div>
                      </motion.div>
                  ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
