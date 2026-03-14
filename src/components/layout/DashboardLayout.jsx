import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
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
  Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const navGroups = [
  {
    title: 'Navigation',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/jobs', label: 'Jobs', icon: Briefcase },
      {
        to: '/assessment-test',
        label: 'Assessment Test',
        icon: MonitorPlay,
        subItems: [
          { label: 'Coding', to: '/assessment/coding' },
          { to: '/ai', label: 'AI Mock' }
        ]
      },
      {
        to: '/practice-dropdown',
        label: 'Practice',
        icon: Brain,
        subItems: [
          { to: '/knowledge-base', label: 'Knowledge Base' },
          { to: '/practice/programming', label: 'Programming' },
          { to: '/grammar', label: 'Grammar' }
        ]
      },
      { to: '/settings', label: 'Settings', icon: Settings },
    ]
  },
  {
    title: 'Shortcuts',
    items: [
      { to: '/resume', label: 'Resume AI', icon: ClipboardList },
      { to: '/profile', label: 'My Account', icon: UserIcon },
    ]
  }
];

function useSidebarCollapsedForCoding() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  // Path format: /assessment/coding/:category/:topicId/:questionSlug
  // We only collapse if we are 5 levels deep (assessment/coding/category/topic/question)
  return parts.length >= 5 && parts[0] === 'assessment' && parts[1] === 'coding';
}

function useSidebarHiddenForProgramming() {
  const { pathname } = useLocation();
  // Hide sidebar (make it mobile-like) ONLY for the lesson page
  const parts = pathname.split('/').filter(Boolean);
  return parts.length >= 4 && parts[0] === 'practice' && parts[1] === 'programming' && (parts[3] === 'lesson' || parts.length >= 5);
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarCollapsed = useSidebarCollapsedForCoding();
  const sidebarHiddenForProg = useSidebarHiddenForProgramming();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const dropdownRef = React.useRef(null);

  const [expandedNavs, setExpandedNavs] = useState({ '/assessment-test': false, '/practice-dropdown': false });

  const toggleNav = (path, e) => {
    e.preventDefault();
    setExpandedNavs(prev => ({ ...prev, [path]: !prev[path] }));
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    ['accessToken', 'refreshToken', 'xsrfToken', 'user'].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-black transition-colors duration-300">
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-50 transform bg-gray-100 dark:bg-zinc-900 transition-all transition-colors duration-300 ease-in-out
            ${sidebarHiddenForProg ? '' : 'md:sticky md:top-0 md:translate-x-0 md:h-screen md:flex-shrink-0'}
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            ${sidebarCollapsed && !sidebarHiddenForProg ? 'md:w-[72px]' : 'w-[240px] md:w-[240px]'}
          `}
        >
          <div className="flex h-full flex-col overflow-hidden">
            {/* Logo row */}
            <div className="flex items-center gap-3 px-4 pt-6 pb-6 shrink-0">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/10 shadow-sm shrink-0">
                <span className="text-[14px] font-black text-slate-800 dark:text-white">KG</span>
              </div>
              {(!sidebarCollapsed || sidebarOpen) && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[14px] font-bold text-slate-800 dark:text-white leading-tight">KareerGrowth</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 truncate mt-0.5 tracking-tight">https://kareergrowth.co...</span>
                </div>
              )}
              {(!sidebarCollapsed || sidebarOpen) && (
                <div className="shrink-0 text-slate-500 dark:text-slate-400 p-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
                </div>
              )}
            </div>

            {/* Nav sections */}
            <div className="flex-grow overflow-y-auto overflow-x-hidden py-2 px-3 no-scrollbar">
              {navGroups.map((group) => (
                <div key={group.title || 'main'} className="space-y-1 mb-6">
                  {group.title && !sidebarCollapsed && (
                    <h3 className="px-3 pb-2 text-[11px] font-normal tracking-wide text-slate-500 dark:text-slate-500 capitalize">
                      {group.title.toLowerCase() === 'main' ? 'Navigation' : group.title}
                    </h3>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map(({ to, label, icon: Icon, subItems }) => {
                      const isExpanded = expandedNavs[to];
                      const hasSubItems = subItems && subItems.length > 0;

                      return (
                        <div key={to} className="flex flex-col">
                          <NavLink
                            to={hasSubItems ? '#' : to}
                            onClick={(e) => {
                              if (hasSubItems) {
                                toggleNav(to, e);
                              } else {
                                setSidebarOpen(false);
                              }
                            }}
                            title={sidebarCollapsed ? label : undefined}
                            className={({ isActive }) => {
                              const isParentActive = hasSubItems && (
                                window.location.pathname.startsWith(to) ||
                                (subItems && subItems.some(sub =>
                                  window.location.pathname === sub.to ||
                                  (sub.to !== '/' && window.location.pathname.startsWith(sub.to + '/')) ||
                                  window.location.pathname.startsWith(sub.to)
                                ))
                              );
                              const activeState = (isActive && !hasSubItems) || isParentActive;
                              return `group flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] font-medium tracking-tight transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-0' : ''} ${activeState
                                ? 'bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white font-semibold'
                                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200/30 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`;
                            }}
                          >
                            {({ isActive }) => {
                              const isParentActive = hasSubItems && (
                                window.location.pathname.startsWith(to) ||
                                (subItems && subItems.some(sub =>
                                  window.location.pathname === sub.to ||
                                  (sub.to !== '/' && window.location.pathname.startsWith(sub.to + '/')) ||
                                  window.location.pathname.startsWith(sub.to)
                                ))
                              );
                              const activeState = (isActive && !hasSubItems) || isParentActive;
                              return (
                                <>
                                  <div className="flex items-center gap-3.5">
                                    <Icon className={`h-[18px] w-[18px] shrink-0 ${activeState ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-500'}`} strokeWidth={activeState ? 2.5 : 2} />
                                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                                  </div>
                                  {!sidebarCollapsed && hasSubItems && (
                                    <ChevronDown
                                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${activeState ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'} ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                  )}
                                </>
                              );
                            }}
                          </NavLink>

                          {/* Sub-items */}
                          {!sidebarCollapsed && hasSubItems && isExpanded && (
                            <div className="ml-5 mt-1 border-l-[1.5px] border-slate-200 dark:border-white/10 pl-3 space-y-0.5">
                              {subItems.map((sub) => (
                                <NavLink
                                  key={sub.to}
                                  to={sub.to}
                                  onClick={() => setSidebarOpen(false)}
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
            </div>

            {/* Dark mode toggle */}
            <div className="px-3 pb-2 shrink-0">
              <button
                onClick={toggleTheme}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium tracking-tight transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDark ? (
                  <Sun className="h-[18px] w-[18px] shrink-0 text-yellow-400" strokeWidth={2} />
                ) : (
                  <Moon className="h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={2} />
                )}
                {!sidebarCollapsed && (
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                )}
              </button>
            </div>

            {/* User profile at bottom */}
            <div className="hidden md:block pb-4 pt-2 px-3 relative shrink-0" ref={dropdownRef}>
              <div
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center gap-3 rounded-xl p-2.5 text-left transition-all cursor-pointer border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${sidebarCollapsed ? 'justify-center p-2' : ''}`}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="User"
                    className="h-[36px] w-[36px] rounded-lg object-cover shadow-sm bg-slate-100 shrink-0 border border-slate-200 dark:border-white/10"
                  />
                ) : (
                  <div className="h-[36px] w-[36px] flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/10 font-semibold text-slate-700 dark:text-white text-[13px] shrink-0">
                    {user?.username?.slice(0, 2).toUpperCase() || 'SH'}
                  </div>
                )}
                {!sidebarCollapsed && (
                  <div className="flex-col flex-1 min-w-0">
                    <span className="text-[13px] font-bold text-slate-800 dark:text-white leading-tight block">
                      {user?.username?.split('@')[0] || 'Sharan'}
                    </span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 tracking-tight truncate mt-0.5 block">
                      {user?.email || user?.username || 'sharan.mn@ifocussystem...'}
                    </span>
                  </div>
                )}
                {!sidebarCollapsed && (
                  <div className="shrink-0 text-slate-400 p-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute left-[calc(100%+8px)] bottom-2 w-64 origin-left rounded-2xl border border-slate-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 shadow-2xl shadow-slate-300/50 dark:shadow-black/50 ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 slide-in-from-left-4 duration-200 z-[100]">
                  <div className="space-y-1">
                    <button
                      onClick={() => { setProfileDropdownOpen(false); navigate('/dashboard/profile'); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <UserIcon className="h-4 w-4 text-slate-400" />
                      My Profile
                    </button>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); navigate('/dashboard/settings'); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                      Settings
                    </button>
                    <button
                      onClick={toggleTheme}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-slate-400" />}
                      {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-bold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4 text-red-400" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile backdrop (also used for desktop when hidden) */}
        {sidebarOpen && sidebarHiddenForProg && (
          <div
            className="fixed inset-0 z-40 bg-black/30 md:block"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}
        {sidebarOpen && !sidebarHiddenForProg && (
          <div
            className="fixed inset-0 z-20 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        {/* Main content Area */}
        <main className="flex-1 flex flex-col relative w-full min-w-0 border-l border-slate-200 dark:border-zinc-900 transition-colors duration-300 bg-white dark:bg-black">

          {/* Top Header Bar */}
          <header className="sticky top-0 z-30 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-900 px-4 md:px-6 py-3 md:py-4 flex items-center gap-4 shrink-0 transition-colors duration-300">
            <button className={`text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 p-1.5 rounded-lg transition-colors ${sidebarHiddenForProg ? 'block' : 'md:hidden'}`} onClick={() => setSidebarOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>

            {!sidebarHiddenForProg && (
              <div className="hidden md:flex text-slate-500 dark:text-slate-400 p-1.5 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[13px] font-normal text-slate-500 dark:text-slate-500">
              {(() => {
                const parts = useLocation().pathname.split('/').filter(Boolean);
                if (sidebarHiddenForProg && parts[2]) {
                  return (
                    <span className="capitalize text-slate-900 dark:text-white font-black text-lg flex items-center gap-2">
                      {parts[2]} Programming
                    </span>
                  );
                }
                const lastSegment = parts[parts.length - 1] || 'Dashboard';
                return (
                  <span className="capitalize text-slate-900 dark:text-white font-bold">
                    {decodeURIComponent(lastSegment).replace(/-/g, ' ')}
                  </span>
                )
              })()}
            </div>

            {/* Mobile theme toggle in header */}
            <button
              onClick={toggleTheme}
              className="ml-auto md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
            </button>
          </header>

          {/* Content Box wrapper - greyed inner panel floating on black bg */}
          <div className={`flex-1 flex flex-col transition-all duration-300 w-full ${['/jobs', '/knowledge-base', '/assessment', '/programming', '/practice'].some(path => useLocation().pathname.startsWith(path)) ? '' : 'p-2 md:p-4'}`}>
            <div className={`w-full flex-1 transition-colors duration-300 flex flex-col ${['/jobs', '/knowledge-base', '/assessment', '/programming', '/practice'].some(path => useLocation().pathname.startsWith(path)) ? '' : 'rounded-[18px] bg-gray-100 dark:bg-zinc-900 px-3 py-3 md:px-4 md:py-4'}`}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
