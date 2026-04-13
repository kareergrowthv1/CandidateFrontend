import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LogOut,
  Settings,
  Briefcase,
  MonitorPlay,
  Home,
  Brain,
  ClipboardList,
  User as UserIcon,
  ChevronDown,
  Moon,
  Sun,
  Layout,
  Code2,
  Layers,
  Zap,
  BookOpen,
  MessageSquare,
  FileText,
  CreditCard,
  LayoutGrid,
  Bell,
  Key,
  Menu,
  X,
  Clock,
  Trash2,
  Calendar
} from 'lucide-react';
import axiosInstance from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { paymentService } from '../../services/paymentService';
import ChangePasswordModal from '../common/ChangePasswordModal';
import { getCandidateProfile } from '../../services/candidateService';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [credits, setCredits] = useState(null);
  const dropdownRef = useRef(null);
  const sidebarRef = useRef(null);
  const notifDropdownRef = useRef(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPage, setNotifPage] = useState(0);
  const [hasMoreNotifs, setHasMoreNotifs] = useState(true);
  const NOTIF_LIMIT = 10;

  const [expandedNavs, setExpandedNavs] = useState({
    '/assessment-test': false,
    '/practice-dropdown': false
  });

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Handle outside clicks for mobile profile dropdown & sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Notifications
  const fetchNotifications = async (reset = false) => {
    if (notifLoading || (!hasMoreNotifs && !reset)) return;

    setNotifLoading(true);
    const currentPage = reset ? 0 : notifPage;
    try {
      const res = await axiosInstance.get(`/api/notifications?limit=${NOTIF_LIMIT}&offset=${currentPage * NOTIF_LIMIT}`);
      if (res.data.success) {
        const newNotifs = res.data.data;
        if (reset) {
          setNotifications(newNotifs);
        } else {
          setNotifications(prev => [...prev, ...newNotifs]);
        }
        setHasMoreNotifs(newNotifs.length === NOTIF_LIMIT);
        setNotifPage(currentPage + 1);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  // Time Ago Utility
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  useEffect(() => {
    if (user) {
      fetchNotifications(true);

      // Auto-refresh every 60 seconds
      const interval = setInterval(() => {
        fetchNotifications(true);
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const handleNotifScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      fetchNotifications();
    }
  };

  const dismissNotif = async (id) => {
    try {
      await axiosInstance.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  // Fetch candidate profile to check if added by admin
  const [candidateProfile, setCandidateProfile] = useState(null);
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const profile = await getCandidateProfile(user.id);
          setCandidateProfile(profile);
        } catch (err) {
          console.error('Failed to fetch candidate profile:', err);
        }
      }
    };
    fetchProfile();
  }, [user]);

  // Fetch credits
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await paymentService.getCredits();
        if (res.data?.hasActivePlan) {
          setCredits(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch credits:', err);
      }
    };
    if (user) fetchCredits();
  }, [user]);

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const toggleSubItem = (path) => {
    setExpandedNavs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const navigationSections = [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: Home },
        { label: 'Find Jobs', path: '/jobs', icon: Briefcase },
      ]
    },
    {
      title: 'LEARNING',
      items: [
        {
          label: 'Assessment Test',
          path: '/assessment-test',
          icon: Layers,
          hasSubItems: true,
          subItems: [
            { label: 'Coding Assessments', to: '/assessment/coding' },
            { label: 'AI Mock Interview', to: '/ai' }
          ]
        },
        {
          label: 'Practice Hub',
          path: '/practice-dropdown',
          icon: Zap,
          hasSubItems: true,
          subItems: [
            { label: 'Programming Practice', to: '/practice/programming' },
            { label: 'Knowledge Base', to: '/knowledge-base' },
            { label: 'Grammar Practice', to: '/grammar' }
          ]
        },
      ]
    },
    {
      title: 'RESOURCES',
      items: [
        { label: 'Resume ATS', path: '/resume-template-studio', icon: FileText },
      ]
    },
    {
      title: 'BILLING',
      items: [
        { label: 'Billing & Plans', path: '/billing', icon: CreditCard },
        { label: 'Pricing and Credits', path: '/services', icon: CreditCard },
      ]
    }
  ];

  // Add College Features if assigned to an organization
  const orgId = candidateProfile?.organizationId || user?.organizationId;
  console.log('Sidebar Debug:', { orgId, type: typeof orgId, candidateProfileOrg: candidateProfile?.organizationId, userOrg: user?.organizationId });
  if (orgId && orgId !== 'null' && orgId !== 'undefined' && orgId !== '') {
    navigationSections.splice(1, 0, {
      title: 'COLLEGE',
      items: [
        { label: 'Attendance', path: '/attendance', icon: Calendar },
        { label: 'My Tasks', path: '/tasks', icon: ClipboardList },
      ]
    });
  }

  const handleLogout = async () => {
    try {
      // 1. Call Logout API (handles backend session and httpOnly cookies)
      await axiosInstance.post('/auth-session/logout');
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      // 2. Clear LocalStorage (preserve "Remember Me" keys)
      const allKeys = Object.keys(localStorage);
      const preserveKeys = ['rememberMe', 'rememberMe_email', 'rememberMe_id', 'theme'];
      allKeys.forEach(k => {
        if (!preserveKeys.includes(k)) localStorage.removeItem(k);
      });

      // 3. Clear SessionStorage
      sessionStorage.clear();

      // 4. Clear Cookies (client-side reachable cookies)
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
      }

      // 5. Clear global state and navigate
      logout();
      navigate('/login');
    }
  };

  const sidebarHiddenForProg = location.pathname.startsWith('/programming/');
  // Editor is full-screen — render just the Outlet with no sidebar/header wrapper
  const isFullScreenPage = /^\/resume-template-studio\/.+\/editor/.test(location.pathname);

  if (isFullScreenPage) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen w-full bg-white dark:bg-black font-sans overflow-hidden transition-colors duration-300 text-slate-900 border-none">

      {/* ── Sidebar (Aside matching layoutref.txt UI) ── */}
      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-gray-100 dark:bg-zinc-950 flex flex-col border-r border-slate-200 dark:border-zinc-900 transition-all duration-300
          lg:relative lg:shrink-0
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
          ${sidebarCollapsed ? 'lg:w-0 lg:overflow-hidden lg:border-r-0' : 'lg:w-[240px] lg:translate-x-0'}
          ${sidebarHiddenForProg ? 'lg:hidden lg:-ml-[240px]' : ''}`}
      >
        <div className="flex flex-col h-full overflow-visible">
          {/* Logo row (layoutref.txt ref) */}
          <div className="flex items-center gap-3 px-4 pt-6 pb-6 shrink-0">
            <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/10 shadow-sm shrink-0">
              <span className="text-[14px] font-black text-slate-800 dark:text-white">KG</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[14px] font-bold text-slate-800 dark:text-white leading-tight">KareerGrowth</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate mt-0.5 tracking-tight">https://kareergrowth.co...</span>
            </div>
            <div className="shrink-0 text-slate-500 dark:text-slate-400 p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
            </div>
          </div>

          {/* Navigation Segregated Sections (SuperadminShell pattern) */}
          <nav className="flex-grow overflow-y-auto overflow-x-hidden py-2 px-3 no-scrollbar space-y-4">
            {navigationSections.map((group) => (
              <div key={group.title} className="space-y-1 mb-6">
                <h3 className="px-3 pb-2 text-[11px] font-normal tracking-wide text-slate-500 dark:text-slate-500 capitalize">
                  {group.title.toLowerCase()}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isExpanded = expandedNavs[item.path];
                    const hasSubItems = item.hasSubItems;

                    return (
                      <div key={item.path} className="flex flex-col">
                        <NavLink
                          to={hasSubItems ? '#' : item.path}
                          onClick={(e) => {
                            if (hasSubItems) toggleSubItem(item.path);
                          }}
                          className={({ isActive }) => {
                            const isParentActive = hasSubItems && (
                              location.pathname.startsWith(item.path) || expandedNavs[item.path]
                            );
                            const activeState = (isActive && !hasSubItems) || isParentActive;
                            return `group flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] font-medium tracking-tight transition-all duration-200 ${activeState
                              ? 'bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white font-semibold'
                              : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200/30 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                              }`;
                          }}
                        >
                          <div className="flex items-center gap-3.5">
                            <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive(item.path) ? 2.5 : 2} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {hasSubItems && (
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          )}
                        </NavLink>

                        {/* Sub-items list */}
                        {hasSubItems && isExpanded && (
                          <div className="ml-5 mt-1 border-l-[1.5px] border-slate-200 dark:border-white/10 pl-3 space-y-0.5">
                            {item.subItems.map((sub) => (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={({ isActive }) =>
                                  `block rounded-lg px-3 py-2 text-[13px] font-medium tracking-tight transition-all duration-200 ${isActive
                                    ? 'text-slate-900 dark:text-white font-bold bg-slate-100/50 dark:bg-white/10'
                                    : 'text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                                  }`
                                }
                              >
                                {sub.label}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Dedicated bottom Dark mode toggle row */}
          <div className="px-3 pb-2 shrink-0 border-t border-slate-200 dark:border-white/5 pt-2">
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium tracking-tight transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun className="h-[18px] w-[18px] shrink-0 text-yellow-400" strokeWidth={2} />
              ) : (
                <Moon className="h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={2} />
              )}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          {/* Pop-out User Profile Card (Match layoutref.txt popup) */}
          <div className="pb-4 pt-2 px-3 relative shrink-0" ref={dropdownRef}>
            <div
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className={`flex items-center gap-3 rounded-xl p-2.5 text-left transition-all cursor-pointer border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${profileDropdownOpen ? 'bg-white dark:bg-zinc-800 shadow-lg' : ''}`}
            >
              <div className="h-[36px] w-[36px] flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-white text-[13px] shrink-0 overflow-hidden">
                {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : (user?.name ? user.name.slice(0, 2).toUpperCase() : user?.username?.slice(0, 2).toUpperCase() || 'SH')}
              </div>
              <div className="flex-col flex-1 min-w-0">
                <span className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight block truncate">
                  {user?.name || user?.username?.split('@')[0] || 'Sharan'}
                </span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 tracking-tight truncate mt-0.5 block">
                  {user?.email || user?.username || 'candidate@kareer...'}
                </span>
              </div>
              <div className="shrink-0 text-slate-400 p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
              </div>
            </div>

            {/* Profile Pop-out menu */}
            {profileDropdownOpen && (
              <div className="absolute left-[calc(100%+8px)] bottom-2 w-64 origin-left rounded-2xl border border-slate-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 shadow-2xl shadow-slate-300/50 dark:shadow-black/50 ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 slide-in-from-left-4 duration-200 z-[100]">
                <div className="space-y-1">
                  <button
                    onClick={() => { setProfileDropdownOpen(false); setIsChangePasswordOpen(true); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <Key className="h-4 w-4 text-slate-400" /> Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4 text-red-400" /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content Area (Standard Shell) ── */}
      <main className="flex-1 flex flex-col relative w-full h-full overflow-hidden border-l border-slate-200 dark:border-zinc-900 bg-white dark:bg-black">

        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-black border-b border-gray-100 dark:border-zinc-900 px-4 md:px-6 h-14 flex items-center gap-4 shrink-0 transition-colors duration-300">
          <button className={`text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 p-1.5 rounded-lg transition-colors ${sidebarHiddenForProg ? 'block' : 'lg:hidden'}`} onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {!sidebarHiddenForProg && (
            <button
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className={`hidden lg:flex items-center p-1.5 rounded-lg border transition-colors ${sidebarCollapsed
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400'
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              <Layout className="w-[18px] h-[18px]" />
            </button>
          )}

          <div className="flex items-center gap-2 text-[13px] font-normal text-slate-500 dark:text-slate-500">
            {(() => {
              const parts = location.pathname.split('/').filter(Boolean);

              // Custom handling for AI Mock report to hide raw ID
              if (location.pathname.includes('/ai-mock/report/') || location.pathname.includes('/ai/report/')) {
                return (
                  <span className="capitalize text-slate-900 dark:text-white font-bold">
                    AI Report
                  </span>
                );
              }

              if (sidebarHiddenForProg && parts[2]) {
                const topic = decodeURIComponent(parts[2]).replace(/-/g, ' ');
                return <span className="capitalize text-slate-900 dark:text-white font-black text-lg">{topic}</span>;
              }
              let lastSegment = parts[parts.length - 1] || 'Dashboard';
              if (lastSegment === 'services') lastSegment = 'Pricing and Credits';
              return (
                <span className="capitalize text-slate-900 dark:text-white font-bold">
                  {decodeURIComponent(lastSegment).replace(/-/g, ' ')}
                </span>
              )
            })()}
          </div>

          {/* Header Actions */}
          <div className="ml-auto flex items-center gap-3">
            {credits && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full shadow-sm cursor-help hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                <CreditCard className="w-4 h-4 text-slate-900 dark:text-white" strokeWidth={2.5} />
                <span className="text-[14px] font-black text-slate-900 dark:text-white">{credits.remaining}</span>
                <span className="hidden sm:inline text-[13px] font-semibold text-slate-500 dark:text-slate-400">credits</span>
              </div>
            )}

            <div className="relative" ref={notifDropdownRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg transition-colors relative group ${showNotifications ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {notifications.length > 0 && (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black" />
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl z-[100] overflow-hidden flex flex-col max-h-[500px] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Updates</h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last 24 Hours</span>
                  </div>

                  <div
                    className="flex-1 overflow-y-auto p-2 no-scrollbar"
                    onScroll={handleNotifScroll}
                  >
                    {notifications.length > 0 ? (
                      <div className="space-y-1">
                        {notifications.map((notif) => (
                          <div
                            key={notif._id}
                            className="group relative flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-white/5"
                          >
                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <div className="flex-1 min-w-0 pr-6">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${notif.type === 'global' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                  {notif.type === 'global' ? (notif.title || 'System Update') : 'Resume Report'}
                                </span>
                                <span className="text-[10px] text-slate-300 dark:text-slate-700">•</span>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                  {formatTimeAgo(notif.createdAt)}
                                </span>
                              </div>
                              <p className="text-[13px] text-slate-800 dark:text-white leading-snug font-semibold">
                                {notif.message}
                              </p>
                            </div>
                            <button
                              onClick={() => dismissNotif(notif._id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {notifLoading && (
                          <div className="p-4 text-center">
                            <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {!hasMoreNotifs && notifications.length > 5 && (
                          <div className="p-4 text-center text-[11px] text-slate-400">
                            You're all caught up!
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center mb-3">
                          <Bell className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">No new updates</p>
                        <p className="text-[12px] text-slate-500 mt-1">Check back later for any fresh updates from the last 24 hours.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Gray Box Architecture (Standard Platform Layout) ── */}
        <div className="flex-1 flex flex-col overflow-hidden relative p-2 md:p-3 bg-white dark:bg-black border-none">
          <div className="w-full h-full rounded-[18px] bg-gray-100 dark:bg-zinc-900 flex flex-col overflow-hidden relative shadow-inner">
            <div className="h-2 w-full shrink-0 bg-transparent z-10 transition-colors"></div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth px-3 md:px-4 custom-scrollbar">
              <Outlet />
            </div>
            <div className="h-2 w-full shrink-0 bg-transparent z-10 transition-colors"></div>
          </div>
        </div>
      </main>

      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
