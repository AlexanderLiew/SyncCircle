import { Outlet, NavLink, useNavigate, Link } from "react-router";
import {
  Home,
  Calendar,
  BookOpen,
  Sparkles,
  Users,
  User,
  Search,
  Bell,
  LogOut,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useWorkato } from "../hooks/useWorkato";
import { useTaskNotifications } from "../hooks/useTaskNotifications";
import { useAuth } from "../hooks/useAuth";
import { getTasks } from "../lib/storage";
import { SyncCircleLogo } from "./SyncCircleLogo";
import type { Task } from "../types";

const navItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/timetable", label: "Timetable", icon: Calendar },
  { path: "/notes", label: "Notes", icon: BookOpen },
  { path: "/ai-planner", label: "AI Planner", icon: Sparkles },
  { path: "/friends", label: "Friends", icon: Users },
  { path: "/profile", label: "Profile", icon: User },
];

export function Layout() {
  const navigate = useNavigate();
  const { retryPendingSyncs } = useWorkato();
  const { pendingCount, checkNow } = useTaskNotifications();
  const { user: authUser, logout } = useAuth();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Derive user display info — prefer localStorage (user can update in settings) over Cognito
  const localUser = (() => { try { const raw = localStorage.getItem('synccircle_user'); return raw ? JSON.parse(raw) : null; } catch { return null; } })();
  const displayName = localUser?.displayName || authUser?.displayName || "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close bell dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Retry any pending syncs from previous sessions on app load
  useEffect(() => {
    retryPendingSyncs();
  }, [retryPendingSyncs]);

  // Get tasks due today/tomorrow for the bell panel
  const upcomingTasks = (() => {
    const tasks = getTasks();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
    return tasks.filter((t: Task) => !t.completed && t.dueDate && (t.dueDate === todayStr || t.dueDate === tomorrowStr));
  })();

  const handleLogout = () => {
    logout();
    localStorage.removeItem("synccircle_auth");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="block cursor-pointer hover:opacity-80 transition-opacity" aria-label="Navigate to Dashboard">
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <SyncCircleLogo size={28} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">
                  SyncCircle
                </h1>
                <p className="text-xs text-muted-foreground">Sync your study circle</p>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`
              }
            >
              {({ isActive }) => (
                <motion.div
                  className="flex items-center gap-3 w-full"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "" : "opacity-70"}`} />
                  <span>{item.label}</span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile in Sidebar */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#d4e8f4] to-[#d4f4e8] flex items-center justify-center">
              <span className="text-lg">✨</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">🔥 12 day streak</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-sidebar-border transition-colors opacity-60 hover:opacity-100"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notes, friends, modules..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications bell + dropdown */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(!bellOpen)}
                className="relative p-2 rounded-xl hover:bg-accent transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">Notifications</span>
                      </div>
                      <button
                        onClick={() => { checkNow(); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Refresh
                      </button>
                    </div>

                    {/* Task alerts */}
                    <div className="max-h-72 overflow-y-auto">
                      {upcomingTasks.length === 0 ? (
                        <div className="px-4 py-8 text-center text-muted-foreground">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-medium">All clear!</p>
                          <p className="text-xs mt-1">No tasks due today or tomorrow.</p>
                        </div>
                      ) : (
                        upcomingTasks.map((task: Task) => {
                          const today = new Date();
                          const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                          const isToday = task.dueDate === todayStr;
                          return (
                            <div key={task.id} className={`px-4 py-3 border-b border-border/50 last:border-0 ${isToday ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                              <div className="flex items-start gap-3">
                                <span className="text-lg mt-0.5">{isToday ? '⏰' : '📅'}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{task.title}</p>
                                  <p className={`text-xs mt-0.5 ${isToday ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                                    {isToday
                                      ? task.dueTime ? `Due today at ${task.dueTime} SGT` : 'Due today'
                                      : task.dueTime ? `Due tomorrow at ${task.dueTime} SGT` : 'Due tomorrow'}
                                  </p>
                                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-1 font-medium ${
                                    task.priority === 'High' ? 'bg-red-100 text-red-600' :
                                    task.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
                                    'bg-green-100 text-green-600'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-border bg-muted/30 text-center">
                      <button
                        onClick={() => { navigate('/timetable'); setBellOpen(false); }}
                        className="text-xs text-primary hover:underline"
                      >
                        View all tasks →
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow">
              <span className="text-white text-sm font-medium">{initials}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
