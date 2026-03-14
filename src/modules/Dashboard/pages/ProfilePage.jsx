import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Calendar, Shield, BadgeCheck,
  Star, Code2, Award, FileText, Download, Target,
  ChevronRight, MapPin, Briefcase, ExternalLink,
  Camera, Settings, LogOut, Play, Plus, Clock, Loader2, GraduationCap, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getCandidateProfile } from '../../../services/candidateService';
import { getPracticeResponseStats } from '../../../services/codingPracticeService';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      try {
        setLoading(true);
        const [profileData, statsData] = await Promise.all([
          getCandidateProfile(user.id),
          getPracticeResponseStats(user.id)
        ]);
        setProfile(profileData);
        setStats(statsData);
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
        setError('Failed to load profile details.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Joined Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const topicIdToName = (topicId) => {
    if (!topicId || typeof topicId !== 'string') return 'Coding';
    const parts = topicId.split('-');
    const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const num = parts[1] ? ` ${parts[1]}` : '';
    return name + num;
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-[#FF6B00] animate-spin" />
        <p className="text-[10px] font-bold text-black uppercase tracking-[0.2em]">Syncing Profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-black text-center px-4">
        <p className="font-bold mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-gradient-to-br from-[#FF6B00] to-[#FF4E00] text-white rounded-lg font-bold hover:scale-105 transition-all shadow-md shadow-orange-100"
        >
          Retry
        </button>
      </div>
    );
  }

  const nameInitials = profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'C';
  const solvedCount = Object.keys(stats?.byQuestion || {}).length;
  const totalStars = Object.values(stats?.byTopic || {}).reduce((acc, curr) => acc + (curr.totalStars || 0), 0);
  const joinedDate = formatDate(profile?.createdAt);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  };

  // Parse skills from JSON
  let skillsList = [];
  if (profile?.skills) {
    try {
      const parsed = typeof profile.skills === 'string' ? JSON.parse(profile.skills) : profile.skills;
      if (Array.isArray(parsed)) skillsList = parsed;
    } catch (e) {
      console.error('Failed to parse skills:', e);
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full max-w-full px-4 md:px-0 pt-6 md:pt-0 mx-auto space-y-6 pb-12"
    >
      {/* Header Section - Mobile Optimized (Title Top, Buttons Below Flex-Wrap) */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-xl font-bold text-black tracking-tight flex items-center gap-3">
          Profile Settings <span className="text-orange-500 pointer-events-none text-xl">✨</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2.5">
          <button className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FF4E00] text-white font-bold text-[10px] uppercase tracking-widest hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-sm border border-orange-400/20">
            <HelpCircle size={15} />
            Need Help?
          </button>
          <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-black font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
            <Settings size={15} />
            Settings
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-bold text-[10px] uppercase tracking-wider hover:bg-red-100 transition-all flex items-center gap-2"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5">
        {/* Left Column: Profile Card */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center h-full">
            <div className="relative group mb-5">
              <div className="w-28 h-28 rounded-full border-4 border-orange-50 p-1 shadow-inner relative overflow-hidden">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-3xl font-bold text-slate-300">
                  {nameInitials}
                </div>
              </div>
              <button className="absolute bottom-1 right-1 p-2 bg-white rounded-full shadow-md border border-slate-100 text-[#FF6B00] hover:scale-110 transition-all">
                <Camera size={14} />
              </button>
            </div>

            <h2 className="text-lg font-bold text-black mb-1">{profile?.name || 'Candidate'}</h2>
            <p className="text-[10px] font-bold text-black uppercase tracking-[0.2em] mb-6 opacity-40">CAN ID: <span className="font-normal lowercase">{profile?.code || 'can-guest'}</span></p>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="px-3 py-1.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded-lg border border-orange-100 uppercase tracking-tighter flex items-center gap-1.5">
                <Shield size={12} /> Official
              </span>
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-100 uppercase tracking-tighter flex items-center gap-1.5">
                <MapPin size={12} /> Remote
              </span>
            </div>

            <p className="text-[12px] font-normal text-black mb-6 px-2 leading-relaxed opacity-70">
              Passionate developer focused on building high-quality, responsive web applications with modern user experiences.
            </p>

            <div className="w-full text-left pt-6 border-t border-slate-50 mt-auto">
              <h3 className="text-[10px] font-bold text-black uppercase tracking-widest mb-4">Skill Stack</h3>
              <div className="flex flex-wrap gap-2">
                {skillsList.length > 0 ? skillsList.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-slate-50 text-black text-[10px] font-normal rounded-lg border border-slate-100 hover:border-orange-200 transition-colors cursor-default">
                    {skill}
                  </span>
                )) : (
                  <span className="text-[10px] text-black opacity-30 italic">-</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Middle Column: Detailed Stats & Info */}
        <div className="lg:col-span-6 space-y-4 md:space-y-5">
          {/* Stats Bar - Vibrant Icons and Bold Typography */}
          <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2 md:gap-4">
            {[
              { label: 'Status', value: profile?.status || 'Active', icon: Award, color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
              { label: 'Stars', value: totalStars, icon: Star, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
              { label: 'Solved', value: solvedCount, icon: Code2, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
              { label: 'Joined', value: joinedDate, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
            ].map((stat, i) => (
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                key={i}
                className="bg-white p-2.5 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 md:gap-3 transition-all"
              >
                <div className={`h-8 w-8 md:h-11 md:w-11 rounded-lg md:rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} border ${stat.border} shadow-sm`}>
                  <stat.icon className="w-4 h-4 md:w-[22px] md:h-[22px]" />
                </div>
                <div className="text-center overflow-hidden w-full space-y-0.5 md:space-y-1">
                  <p className="text-[8px] md:text-[11px] font-bold text-black uppercase tracking-widest leading-none whitespace-nowrap">{stat.label}</p>
                  <p className="text-[8px] md:text-[10px] font-normal text-black truncate px-0.5 opacity-60">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Info Card - Typography Hierarchy Swapped */}
          <motion.div variants={itemVariants} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[14px] font-bold text-black uppercase tracking-widest">Personal Details</h3>
              <button className="text-[11px] font-bold text-orange-600 uppercase tracking-widest hover:underline decoration-1 underline-offset-4">Edit Profile</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              {[
                { label: 'Email Address', value: profile?.email || '-', icon: Mail },
                { label: 'Phone Number', value: profile?.mobileNumber || '-', icon: Phone },
                { label: 'Current Role', value: profile?.currentRole || '-', icon: Briefcase },
                { label: 'Location', value: profile?.location || '-', icon: MapPin },
                { label: 'Academic Year', value: profile?.academicYear || '-', icon: GraduationCap },
                { label: 'Joined On', value: joinedDate, icon: Calendar },
              ].map((info, i) => (
                <div key={i} className="flex items-start gap-5 group">
                  <div className="p-3 rounded-xl bg-slate-50 text-slate-300 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors shadow-sm">
                    <info.icon size={18} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[12px] font-bold uppercase tracking-tight text-black">{info.label}</p>
                    <p className="text-[12px] font-normal text-black opacity-60 leading-tight">{info.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Resume & Documents */}
          <motion.div variants={itemVariants} className="bg-[#020617] rounded-2xl p-6 shadow-xl text-white flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 p-4 opacity-[0.04] pointer-events-none group-hover:opacity-[0.08] transition-opacity">
              <FileText size={180} />
            </div>
            <div className="flex items-center gap-5 relative" >
              <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform shadow-2xl">
                <FileText size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight">Candidate Resume</h3>
                <p className="text-[9px] text-white/30 font-bold uppercase tracking-[0.2em] italic">Latest Version 2026</p>
              </div>
            </div>

            <div className="flex gap-4 relative w-full md:w-auto">
              {profile?.resumeUrl ? (
                <>
                  <a
                    href={profile.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-white text-slate-900 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                  >
                    <ExternalLink size={16} /> View
                  </a>
                  <a
                    href={profile.resumeUrl}
                    download
                    className="flex-1 md:flex-none flex items-center justify-center p-3 bg-white/10 border border-white/10 rounded-xl text-white hover:bg-white/20 transition-all shadow-md"
                  >
                    <Download size={16} />
                  </a>
                </>
              ) : (
                <button className="w-full md:w-auto px-8 py-3 bg-white/5 border border-white/10 text-white/20 rounded-xl font-bold text-[11px] uppercase tracking-widest cursor-not-allowed">
                  No Resume
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Learning Path */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
              <h3 className="text-[12px] font-bold text-black uppercase tracking-[0.2em]">Learning Path</h3>
            </div>

            <div className="space-y-4">
              {stats?.byTopic && Object.entries(stats.byTopic).slice(0, 4).map(([topicId, topicData]) => (
                <div key={topicId} className="group p-5 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:border-orange-200 hover:bg-orange-50/20 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-black uppercase tracking-widest opacity-80">{topicIdToName(topicId)}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-600 border border-orange-100 uppercase">
                      {topicData.attempted} Solved
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        className={s <= (topicData.totalStars / (topicData.attempted || 1)) ? "fill-amber-400 text-amber-500" : "text-slate-200"}
                      />
                    ))}
                    <div className="ml-auto">
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1.5 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
              {(!stats?.byTopic || Object.keys(stats.byTopic).length === 0) && (
                <div className="py-14 text-center space-y-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 border border-slate-100 shadow-inner">
                    <Code2 size={24} />
                  </div>
                  <p className="text-[10px] text-black font-bold uppercase tracking-[0.1em] px-4 leading-relaxed italic opacity-30">Solve problems to unlock your path!</p>
                </div>
              )}
            </div>
            <button className="w-full mt-6 py-3.5 text-[10px] font-bold text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 transition-all uppercase tracking-widest bg-white shadow-sm">
              Explore All Topics
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProfilePage;
