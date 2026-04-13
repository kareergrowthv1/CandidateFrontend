import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock,
    Info,
    Plus,
    Sun
} from 'lucide-react';
import axiosInstance from '../../../config/axiosConfig';
import { useAuth } from '../../../context/AuthContext';

const AttendancePage = () => {
    const { user } = useAuth();
    const [attendanceData, setAttendanceData] = useState({});
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [semesterStats, setSemesterStats] = useState(null);
    const [liveTime, setLiveTime] = useState(new Date());
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveForm, setLeaveForm] = useState({
        leaveType: 'Sick',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: ''
    });
    const [submittingLeave, setSubmittingLeave] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setLiveTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatOrdinal = (day) => {
        if (day > 3 && day < 21) return day + 'th';
        switch (day % 10) {
            case 1: return day + "st";
            case 2: return day + "nd";
            case 3: return day + "rd";
            default: return day + "th";
        }
    };

    const formattedToday = `Today: ${formatOrdinal(liveTime.getDate())} ${liveTime.toLocaleString('default', { month: 'long' })} ${liveTime.getFullYear()}`;
    const formattedTime = liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    useEffect(() => {
        fetchAttendance();
        fetchLeaves();
    }, [currentDate]);

    const fetchAttendance = async () => {
        try {
            const res = await axiosInstance.get(`/candidates/attendance`);
            if (res.data.success) {
                // Backend returns { subjects: [], attendance: {}, semesterStats: {} }
                setAttendanceData(res.data.data.attendance || {});
                setSubjects(res.data.data.subjects || []);
                setSemesterStats(res.data.data.semesterStats || null);
            }
        } catch (err) {
            console.error('Failed to fetch attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaves = async () => {
        try {
            const res = await axiosInstance.get('/candidates/leave/list');
            if (res.data.success) {
                setLeaves(res.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch leaves:', err);
        }
    };

    const [subjects, setSubjects] = useState([]);

    const handleApplyLeave = async (e) => {
        e.preventDefault();
        setSubmittingLeave(true);
        try {
            const res = await axiosInstance.post('/candidates/leave/apply', leaveForm);
            if (res.data.success) {
                setShowLeaveModal(false);
                setLeaveForm({
                    leaveType: 'Sick',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    reason: ''
                });
                fetchLeaves();
            }
        } catch (err) {
            console.error('Apply leave error:', err);
        } finally {
            setSubmittingLeave(false);
        }
    };

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    
    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };
    
    const getStatusForSubjectDate = (subjectId, day) => {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const dayKey = String(day).padStart(2, '0');
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 1. Check subject-specific attendance records (Efficient Object Lookup)
        const status = attendanceData[subjectId]?.months?.[monthKey]?.[dayKey];
        if (status) {
            return status === 'Present' || status === 'P' ? 'P' : status === 'Absent' || status === 'A' ? 'A' : status === 'Leave' || status === 'L' ? 'L' : status;
        }

        // 2. Check approved leaves (Global)
        const approvedLeave = leaves.find(l => {
            if (l.status !== 'Approved') return false;
            const start = (l.startDate || '').split('T')[0];
            const end = (l.endDate || '').split('T')[0];
            return dateStr >= start && dateStr <= end;
        });
        if (approvedLeave) return 'L';

        return null;
    };

    // Calculate stats from the object-based attendanceData
    const stats = semesterStats || {
        present: 0,
        absent: 0,
        leave: 0,
        totalMarked: 0,
        overallPercentage: 0
    };

    const attendancePercentage = stats.overallPercentage || 0;

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="p-0 font-sans text-slate-900">
            {/* Top Section: Hero & Stats (Separate Boxes) */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4 items-stretch">
                {/* Time/Date Box */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-1 min-w-[240px]">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Sun size={13} />
                        <span className="text-[10px] font-semibold tracking-wide uppercase">Realtime Insight</span>
                    </div>
                    <div className="text-2xl font-semibold tracking-tight text-slate-900">
                        {formattedTime}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {formattedToday}
                    </div>
                </div>

                {/* Stats Box (One box for all 4 stats) */}
                <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Attendance', value: `${attendancePercentage}%`, icon: CalendarIcon },
                        { label: 'Present', value: stats.totalPresent || 0, icon: CheckCircle2 },
                        { label: 'Absent', value: stats.totalAbsent || 0, icon: XCircle },
                        { label: 'On Leave', value: stats.totalLeave || 0, icon: Clock },
                    ].map((stat, i) => (
                        <div key={stat.label} className="flex flex-col gap-0.5 justify-center">
                            <div className="flex items-center gap-2 text-slate-400">
                                <stat.icon size={11} />
                                <span className="text-[10px] font-semibold uppercase tracking-wider">{stat.label}</span>
                            </div>
                            <div className="text-xl font-semibold text-slate-900">{stat.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content: Modular Attendance Matrix */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Attendance Matrix</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Subject-wise daily attendance record for {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 border border-slate-100 rounded-lg p-1">
                            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-50 rounded-md transition-colors text-slate-400">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-50 rounded-md transition-colors text-slate-400">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        <button
                            onClick={() => setShowLeaveModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-black transition-all"
                        >
                            <Plus size={16} />
                            Apply Leave
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto no-scrollbar flex-1">
                    <table className="w-full text-[11px] border-separate border-spacing-0 min-w-max">
                        <thead className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md">
                            <tr>
                                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sticky left-0 bg-slate-50/90 z-50 border-b border-r border-slate-200 min-w-[60px]">SL NO</th>
                                <th className="px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sticky left-[60px] bg-slate-50/90 z-50 border-b border-r-2 border-r-slate-300 border-b-slate-200 min-w-[200px] shadow-[4px_0_12px_rgba(0,0,0,0.03)]">Subjects</th>
                                {(() => {
                                    const days = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
                                    const headers = [];
                                    const today = new Date();
                                    const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

                                    for (let d = 1; d <= days; d++) {
                                        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                        const dayName = weekDays[dayDate.getDay()];
                                        const isToday = today.getDate() === d && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
                                        
                                        headers.push(
                                            <th key={d} className={`px-2 py-3 border-b border-r border-slate-200 min-w-[45px] transition-colors ${isToday ? 'bg-blue-50/70' : ''}`}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`text-[12px] font-bold ${isToday ? 'text-blue-700' : 'text-slate-900'}`}>{d}</span>
                                                    <span className={`text-[8px] font-bold tracking-tighter uppercase ${isToday ? 'text-blue-500' : 'text-slate-400'}`}>{dayName}</span>
                                                </div>
                                            </th>
                                        );
                                    }
                                    return headers;
                                })()}
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.length > 0 ? (
                                subjects.map((subject, idx) => (
                                    <tr key={subject.id} className="hover:bg-slate-100/40 transition-colors group">
                                        <td className="px-4 py-2 text-slate-400 sticky left-0 bg-white z-20 border-b border-r border-slate-200 text-center font-mono group-hover:bg-slate-50/50 transition-colors">
                                            {String(idx + 1).padStart(2, '0')}
                                        </td>
                                        <td className="px-6 py-2 sticky left-[60px] bg-white z-20 border-b border-r-2 border-r-slate-300 group-hover:bg-slate-50/50 font-medium text-slate-800 transition-colors shadow-[4px_0_12px_rgba(0,0,0,0.03)]">
                                            {subject.name}
                                        </td>
                                        {(() => {
                                            const days = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
                                            const cells = [];
                                            const today = new Date();
                                            for (let d = 1; d <= days; d++) {
                                                const status = getStatusForSubjectDate(subject.id, d);
                                                const isToday = today.getDate() === d && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
                                                cells.push(
                                                    <td key={d} className={`px-1 py-1 border-b border-r border-slate-100 group-hover:bg-slate-50/30 transition-colors text-center align-middle ${isToday ? 'bg-blue-50/30' : ''}`}>
                                                        <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-[11px] font-bold transition-all
                                                            ${status === 'P' ? 'text-blue-600' :
                                                              status === 'A' ? 'text-rose-500' :
                                                              status === 'L' ? 'text-amber-500' :
                                                              'text-slate-200 opacity-40'}
                                                        `}>
                                                            {status || '·'}
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            return cells;
                                        })()}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={33} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        No subjects assigned for your current academic branch.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Legend Footer */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leave</span>
                    </div>
                </div>
            </div>
            {/* Apply Leave Modal */}
            <AnimatePresence>
                {showLeaveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm"
                            onClick={() => setShowLeaveModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden border border-slate-200 shadow-lg"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900">Apply for Leave</h3>
                                <button onClick={() => setShowLeaveModal(false)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                    <Plus className="rotate-45 text-slate-400" size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleApplyLeave} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Leave Type</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-transparent text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all appearance-none"
                                        value={leaveForm.leaveType}
                                        onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                                    >
                                        <option value="Sick">Sick Leave</option>
                                        <option value="Personal">Personal Leave</option>
                                        <option value="Event">Institutional Event</option>
                                        <option value="Medical">Medical Emergency</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-transparent text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                                            value={leaveForm.startDate}
                                            onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-transparent text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                                            value={leaveForm.endDate}
                                            onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Reason</label>
                                    <textarea
                                        className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-transparent text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all min-h-[100px] resize-none"
                                        placeholder="Explain your reason for leave..."
                                        value={leaveForm.reason}
                                        onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={submittingLeave}
                                        className="w-full py-3 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                                    >
                                        {submittingLeave ? 'Submitting...' : 'Submit Application'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AttendancePage;
