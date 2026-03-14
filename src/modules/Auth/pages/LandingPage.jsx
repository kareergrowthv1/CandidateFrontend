import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useToast from '../../../hooks/useToast';
import logo1 from '../../../assets/logo1.png';
import { verifyEmailAndOTP } from '../../../store/slices/testDataSlice';
import artwork from '../../../assets/test_portal_3d_artwork.png';
// import { updateCandidateStatus, CANDIDATE_STATUS } from '../../../services/candidateStatusService';

const LandingPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [email, setEmail] = useState('');
    const [otpValue, setOtpValue] = useState('');

    const handleOtpInput = (e) => {
        const v = e.target.value.replace(/\D/g, '').slice(0, 6);
        setOtpValue(v);
    };

    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleVerify = async (e) => {
        e?.preventDefault();

        if (!email.trim()) {
            showToast('Please enter your email address.', 'error');
            return;
        }

        if (otpValue.length !== 6) {
            showToast('Please enter the 6-digit OTP.', 'error');
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                email: email.trim(),
                verificationCode: otpValue
            };

            // Verify email and OTP using Redux
            const verifyResult = await dispatch(verifyEmailAndOTP(payload));

            if (verifyEmailAndOTP.rejected.match(verifyResult)) {
                const errorMessage = verifyResult.payload?.message ||
                    verifyResult.payload?.error ||
                    'Invalid email or OTP. Please try again.';
                showToast(errorMessage, 'error');
                setIsLoading(false);
                return;
            }

            const interviewData = verifyResult.payload;

            // Log the full response for debugging
            console.log('📋 Full Private Link API Response:', interviewData);
            console.log('📋 Response Structure:', {
                id: interviewData?.id,
                email: interviewData?.email,
                candidateId: interviewData?.candidateId,
                positionId: interviewData?.positionId,
                questionSetId: interviewData?.questionSetId,
                clientId: interviewData?.clientId,
                verificationCode: interviewData?.verificationCode,
                interviewPlatform: interviewData?.interviewPlatform,
                linkExpiresAt: interviewData?.linkExpiresAt,
                linkActiveAt: interviewData?.linkActiveAt,
                interviewTaken: interviewData?.interviewTaken,
                isActive: interviewData?.isActive
            });

            if (interviewData) {
                // Validate required fields
                const requiredFields = {
                    candidateId: interviewData.candidateId,
                    positionId: interviewData.positionId,
                    questionSetId: interviewData.questionSetId,
                    clientId: interviewData.clientId
                };

                const missingFields = Object.entries(requiredFields)
                    .filter(([key, value]) => !value)
                    .map(([key]) => key);

                if (missingFields.length > 0) {
                    console.error('❌ Missing required fields:', missingFields);
                    showToast(`Missing required data: ${missingFields.join(', ')}. Please contact support.`, 'error');
                    setIsLoading(false);
                    return;
                }

                // Check if link has expired
                if (interviewData.linkExpiresAt) {
                    const expiryDate = new Date(interviewData.linkExpiresAt);
                    const currentDate = new Date();

                    // Check if link has expired (comparing full date-time)
                    if (currentDate > expiryDate) {
                        console.log('❌ Link has expired', {
                            currentDate: currentDate.toISOString(),
                            expiryDate: expiryDate.toISOString()
                        });
                        showToast('This test link has expired. Please contact the administrator for a new link.', 'error');
                        setIsLoading(false);
                        return; // Stop execution - don't proceed further
                    } else {
                        console.log('✅ Link is still valid', {
                            currentDate: currentDate.toISOString(),
                            expiryDate: expiryDate.toISOString()
                        });
                    }
                } else {
                    console.warn('⚠️ No link expiry date found, proceeding normally');
                }

                // Determine interview mode based on platform
                let interviewMode = 'browser';
                if (interviewData.interviewPlatform === 'EXE' || interviewData.interviewPlatform === 'DMG') {
                    interviewMode = 'app';
                }

                // Store all test/interview data in sessionStorage
                const storedData = {
                    candidateId: interviewData.candidateId,
                    positionId: interviewData.positionId,
                    questionSetId: interviewData.questionSetId,
                    clientId: interviewData.clientId,
                    email: interviewData.email || email.trim(),
                    candidateName: interviewData.candidateName || '',
                    companyName: interviewData.companyName || '',
                    positionName: interviewData.positionName || '',
                    interviewPlatform: interviewData.interviewPlatform,
                    interviewMode: interviewMode,
                    verificationCode: interviewData.verificationCode,
                    linkExpiresAt: interviewData.linkExpiresAt,
                    linkActiveAt: interviewData.linkActiveAt,
                    interviewTaken: interviewData.interviewTaken,
                    isActive: interviewData.isActive
                };

                // Store individual fields for easy access (tenantId = tenant DB name for AdminBackend)
                sessionStorage.setItem("candidateId", storedData.candidateId);
                sessionStorage.setItem("positionId", storedData.positionId);
                sessionStorage.setItem("questionSetId", storedData.questionSetId);
                sessionStorage.setItem("clientId", storedData.clientId);
                if (interviewData.tenantId) sessionStorage.setItem("tenantId", interviewData.tenantId);
                // Status update removed as part of cleanup
                sessionStorage.setItem("email", storedData.email);
                sessionStorage.setItem("candidateName", storedData.candidateName);
                sessionStorage.setItem("companyName", storedData.companyName);
                sessionStorage.setItem("positionName", storedData.positionName);
                sessionStorage.setItem("interviewPlatform", storedData.interviewPlatform);
                sessionStorage.setItem("interviewMode", storedData.interviewMode);
                sessionStorage.setItem("verificationCode", storedData.verificationCode);
                sessionStorage.setItem("emailVerified", "true");
                sessionStorage.setItem("verificationTimestamp", Date.now().toString());
                sessionStorage.setItem("isConversational", interviewData.isConversational === true ? "true" : "false");
                if (interviewData.crossQuestionCountGeneral != null) sessionStorage.setItem("crossQuestionCountGeneral", String(interviewData.crossQuestionCountGeneral));
                if (interviewData.crossQuestionCountPosition != null) sessionStorage.setItem("crossQuestionCountPosition", String(interviewData.crossQuestionCountPosition));

                // Store instructions from verify response (no API calls after verify)
                if (interviewData.instructions) {
                    sessionStorage.setItem("instructions", interviewData.instructions);
                }
                if (interviewData.instructionsData && interviewData.instructionsData.length > 0) {
                    sessionStorage.setItem("instructionsData", JSON.stringify(interviewData.instructionsData));
                }
                if (interviewData.positionName) sessionStorage.setItem("positionName", interviewData.positionName);
                if (interviewData.questionSetTitle) sessionStorage.setItem("questionSetTitle", interviewData.questionSetTitle);
                localStorage.setItem("verifiedSession", JSON.stringify(interviewData));
                // Store assessment summary and question sections from verify so test portal needs no further API
                const summary = interviewData.assessmentSummary;
                if (summary) {
                    const summaryStr = typeof summary === 'string' ? summary : JSON.stringify(summary);
                    localStorage.setItem("assessmentSummary", summaryStr);
                    sessionStorage.setItem("assessmentSummary", summaryStr);
                    const summaryId = summary?.id || summary?.data?.id || '';
                    if (summaryId) {
                        sessionStorage.setItem("assessmentSummaryId", String(summaryId));
                        sessionStorage.setItem("assessment_summary_id", String(summaryId));
                    }
                } else {
                    // No summary: clear any stale completed state and set a default "not completed" so we never redirect to /completion by mistake
                    sessionStorage.setItem("isAssessmentCompleted", "false");
                    const defaultSummary = {
                        round1Assigned: true,
                        round1Completed: false,
                        round2Assigned: false,
                        round2Completed: false,
                        round3Assigned: false,
                        round3Completed: false,
                        round4Assigned: false,
                        round4Completed: false,
                        isAssessmentCompleted: false,
                    };
                    const defaultStr = JSON.stringify(defaultSummary);
                    sessionStorage.setItem("assessmentSummary", defaultStr);
                    localStorage.setItem("assessmentSummary", defaultStr);
                }
                if (interviewData.questionSectionData) {
                    localStorage.setItem("questionSectionData", typeof interviewData.questionSectionData === 'string' ? interviewData.questionSectionData : JSON.stringify(interviewData.questionSectionData));
                }

                // If assessment is already completed, show message and do not redirect to test flow
                const isCompleted = summary && (summary.isAssessmentCompleted === true || summary.data?.isAssessmentCompleted === true);
                if (isCompleted) {
                    showToast('You have completed the test.', 'info');
                    setIsLoading(false);
                    return;
                }
                sessionStorage.setItem("isAssessmentCompleted", "false");

                showToast('Verification successful!', 'success');

                // Navigate to instructions page (position + question set instructions, then Start → /permissions)
                setTimeout(() => {
                    navigate('/instructions');
                }, 1000);
            } else {
                showToast('Invalid email or OTP. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Verification error:', error);
            const errorMessage = error.response?.data?.message ||
                error.message ||
                'Invalid email or OTP. Please try again.';
            showToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 disabled:opacity-50';

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-white lg:bg-slate-50 font-sans p-0 lg:p-8">
            <div className="flex w-full h-full lg:h-auto lg:min-h-[620px] lg:max-w-6xl overflow-hidden bg-white lg:rounded-[2.5rem] lg:shadow-2xl lg:border lg:border-slate-100">
                {/* Left panel – Full-bleed 3D artwork */}
                <div className="relative hidden lg:flex lg:w-[52%] overflow-hidden">
                    <img
                        src={artwork}
                        alt="Test Portal Artwork"
                        className="h-full w-full object-cover"
                    />
                </div>

                <div className="flex flex-1 items-center justify-center bg-white px-6 py-10 lg:px-16 overflow-auto">
                    <div className="w-full max-w-md">
                        <div className="mb-10 flex flex-col items-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black shadow-xl mb-6">
                                <span className="text-xl font-black text-white">CP</span>
                            </div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-tight text-center">
                                Verify your email
                            </h2>
                            <p className="mt-2 text-sm font-medium text-slate-500 text-center">
                                Enter your details to access the assessment.
                            </p>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-slate-900 ml-1">
                                        Email address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        disabled={isLoading}
                                        className={inputCls}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <label htmlFor="otp" className="text-[11px] font-bold uppercase tracking-widest text-slate-900">
                                            6-digit OTP
                                        </label>
                                        <span className="text-[10px] font-medium text-slate-400">Sent to email</span>
                                    </div>
                                    <input
                                        id="otp"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={otpValue}
                                        onChange={handleOtpInput}
                                        placeholder="000 000"
                                        disabled={isLoading}
                                        className={inputCls}
                                    />
                                    <p className="text-slate-400 text-[10px] ml-1">
                                        Didn&apos;t receive it? Check your spam folder.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`relative w-full overflow-hidden rounded-full py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed ${isLoading ? 'opacity-70' : ''}`}
                                style={{ background: 'linear-gradient(180deg, #FF8C00 0%, #FF6B00 45%, #FF4E00 100%)', boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)' }}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Verifying…
                                    </span>
                                ) : (
                                    'Verify & Start'
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                                Secure Assessment Environment
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
