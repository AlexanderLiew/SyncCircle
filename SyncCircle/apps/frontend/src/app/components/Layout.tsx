import { Outlet, NavLink, useNavigate, Link } from "react-router";
import {
  Home,
  Calendar,
  BookOpen,
  Sparkles,
  Users,
  MessageSquare,
  User,
  Settings as SettingsIcon,
  Search,
  Bell,
  LogOut,
} from "lucide-react";
import { useEffect } from "react";
import { motion } from "motion/react";
import { useWorkato } from "../hooks/useWorkato";

const navItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/timetable", label: "Timetable", icon: Calendar },
  { path: "/notes", label: "Notes", icon: BookOpen },
  { path: "/ai-planner", label: "AI Planner", icon: Sparkles },
  { path: "/friends", label: "Friends", icon: Users },
  { path: "/group-chat", label: "Group Chat", icon: MessageSquare },
  { path: "/profile", label: "Profile", icon: User },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Layout() {
  const navigate = useNavigate();
  const { retryPendingSyncs } = useWorkato();

  // Retry any pending syncs from previous sessions on app load
  useEffect(() => {
    retryPendingSyncs();
  }, [retryPendingSyncs]);

  const handleLogout = () => {
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
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#b8a4d4] to-[#f4b8d0] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-[#b8a4d4] to-[#f4b8d0] bg-clip-text text-transparent">
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
              <p className="font-medium truncate">Emma Wilson</p>
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
            {/* Notifications */}
            <button className="relative p-2 rounded-xl hover:bg-accent transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full"></span>
            </button>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#b8a4d4] to-[#f4b8d0] flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow">
              <span className="text-white">EW</span>
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
