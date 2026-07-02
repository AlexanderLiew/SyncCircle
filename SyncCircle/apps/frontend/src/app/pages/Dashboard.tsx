import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { 
  Clock, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Calendar,
  Sparkles,
  ChevronRight,
  Target,
  Award,
  CheckSquare,
  MessageSquare,
} from "lucide-react";
import { getClasses, getTasks, getMessages, getNotes, getUser } from "../lib/storage";
import { useFriends } from "../hooks/useFriendsApi";
import type { TimetableClass, Task, ChatMessage } from "../types";

export function Dashboard() {
  const navigate = useNavigate();
  const { friends: apiFriends } = useFriends();

  // Load data from localStorage
  const user = getUser();
  const allClasses = getClasses();
  const allTasks = getTasks();
  const messages = getMessages();
  const notes = getNotes();

  // --- Today's Classes ---
  // Map JS Date.getDay() (0=Sun,1=Mon,...6=Sat) to TimetableClass dayOfWeek (0=Mon,...4=Fri)
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const timetableDay = jsDay === 0 ? -1 : jsDay - 1; // -1 for Sunday (no classes)
  const todaysClasses: TimetableClass[] = allClasses
    .filter((cls) => cls.dayOfWeek === timetableDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // --- Upcoming Tasks (incomplete, sorted by due date) ---
  const upcomingTasks: Task[] = allTasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5);

  // --- Recent Messages (latest 4) ---
  const recentMessages: ChatMessage[] = [...messages]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);

  // --- Stats ---
  const incompleteTasks = allTasks.filter((t) => !t.completed).length;
  const friendCount = apiFriends.length;
  const notesCount = notes.length;
  const completedTasks = allTasks.filter((t) => t.completed).length;

  // --- Greeting ---
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = user?.displayName || "Student";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // --- Helpers ---
  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "#f4b8d0";
      case "Medium": return "#d4e8f4";
      case "Low": return "#d4f4e8";
      default: return "#b8a4d4";
    }
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary rounded-3xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6" />
            <span className="text-sm font-medium opacity-90">{today}</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">{greeting}, {displayName}! ☀️</h1>
          <p className="text-lg opacity-90">
            {todaysClasses.length > 0
              ? `You have ${todaysClasses.length} class${todaysClasses.length > 1 ? "es" : ""} today${upcomingTasks.length > 0 ? ` and ${upcomingTasks.length} pending task${upcomingTasks.length > 1 ? "s" : ""}` : ""}. Let's make it productive!`
              : upcomingTasks.length > 0
                ? `No classes today, but you have ${upcomingTasks.length} pending task${upcomingTasks.length > 1 ? "s" : ""}. Time to get ahead!`
                : "No classes or tasks today. Enjoy your free time!"}
          </p>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending Tasks", value: String(incompleteTasks), icon: CheckSquare, color: "#f4b8d0" },
          { label: "Completed", value: String(completedTasks), icon: Target, color: "#d4e8f4" },
          { label: "Study Friends", value: String(friendCount), icon: Users, color: "#b8a4d4" },
          { label: "Notes", value: String(notesCount), icon: BookOpen, color: "#d4f4e8" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card rounded-2xl p-6 border border-border hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer"
            style={{ 
              background: `linear-gradient(135deg, ${stat.color}15 0%, transparent 100%)`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}30` }}
              >
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Today's Classes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-6 border border-border col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#b8a4d4]/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#b8a4d4]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Today's Classes</h2>
                <p className="text-sm text-muted-foreground">
                  {todaysClasses.length > 0
                    ? `${todaysClasses.length} class${todaysClasses.length > 1 ? "es" : ""} scheduled`
                    : "No classes today"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {todaysClasses.length > 0 ? (
              todaysClasses.map((cls, index) => (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-accent/50 transition-all cursor-pointer"
                  style={{ 
                    borderLeft: `4px solid ${cls.color}`,
                    background: `linear-gradient(90deg, ${cls.color}10 0%, transparent 100%)`,
                  }}
                  onClick={() => navigate("/timetable")}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{cls.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                      </span>
                      <span>{cls.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium" style={{ color: cls.color }}>
                      {cls.moduleCode}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No classes scheduled today</p>
                <p className="text-sm mt-1">Enjoy your free day or catch up on tasks!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#f4b8d0]/20 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-[#f4b8d0]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Upcoming Tasks</h2>
              <p className="text-sm text-muted-foreground">
                {upcomingTasks.length > 0
                  ? `${upcomingTasks.length} pending`
                  : "All caught up!"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {upcomingTasks.length > 0 ? (
              upcomingTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="p-3 rounded-xl hover:bg-accent/50 transition-all cursor-pointer"
                  style={{
                    borderLeft: `3px solid ${getPriorityColor(task.priority)}`,
                    background: `linear-gradient(90deg, ${getPriorityColor(task.priority)}10 0%, transparent 100%)`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${getPriorityColor(task.priority)}30`,
                          color: getPriorityColor(task.priority),
                        }}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No pending tasks</p>
                <p className="text-sm mt-1">You're all caught up!</p>
              </div>
            )}
          </div>

          {upcomingTasks.length > 0 && (
            <button
              className="w-full mt-4 py-2 text-sm text-primary hover:bg-accent rounded-xl transition-colors flex items-center justify-center gap-2"
              onClick={() => navigate("/timetable")}
            >
              View all tasks
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Collaboration Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl p-6 border border-border col-span-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d4e8f4]/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#d4e8f4]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">Latest group messages</p>
            </div>
          </div>

          <div className="space-y-3">
            {recentMessages.length > 0 ? (
              recentMessages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-xl hover:bg-accent/50 transition-all"
                >
                  <div className="w-9 h-9 rounded-full bg-[#b8a4d4]/20 flex items-center justify-center flex-shrink-0 text-sm font-medium text-[#b8a4d4]">
                    {msg.senderName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{msg.senderName}</span>
                      <span className="text-xs text-muted-foreground">{formatMessageTime(msg.timestamp)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{msg.content}</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No recent activity</p>
                <p className="text-sm mt-1">Join a study group to start collaborating!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Friends Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d4f4e8]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#d4f4e8]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Friends</h2>
              <p className="text-sm text-muted-foreground">
                {apiFriends.length > 0
                  ? `${apiFriends.length} friends`
                  : "No friends yet"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {apiFriends.length > 0 ? (
              apiFriends.slice(0, 4).map((friend, index) => {
                return (
                  <motion.div
                    key={friend.friendId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all cursor-pointer"
                  >
                    <div className="relative">
                      <div 
                        className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-medium text-sm text-primary"
                      >
                        {friend.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-card"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{friend.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">Friend</p>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No friends added yet</p>
                <p className="text-sm mt-1">Add friends to compare schedules!</p>
              </div>
            )}
          </div>

          {apiFriends.length > 0 && (
            <button
              className="w-full mt-4 py-2 text-sm text-primary hover:bg-accent rounded-xl transition-colors flex items-center justify-center gap-2"
              onClick={() => navigate("/friends")}
            >
              View all friends
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      </div>

      {/* Shared Notes & AI Recommendations */}
      <div className="grid grid-cols-2 gap-6">
        {/* Shared Notes Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card rounded-2xl p-6 border border-border"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d4f4e8]/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#d4f4e8]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Recent Notes</h2>
              <p className="text-sm text-muted-foreground">Your latest notes</p>
            </div>
          </div>

          <div className="space-y-3">
            {notes.length > 0 ? (
              [...notes]
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                .slice(0, 3)
                .map((note, index) => {
                  const noteColors = ["#f4b8d0", "#d4e8f4", "#b8a4d4", "#d4f4e8"];
                  const color = noteColors[index % noteColors.length];
                  return (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="p-4 rounded-xl hover:shadow-md transition-all cursor-pointer"
                      style={{ 
                        background: `linear-gradient(135deg, ${color}15 0%, transparent 100%)`,
                        borderLeft: `3px solid ${color}`
                      }}
                      onClick={() => navigate("/notes")}
                    >
                      <h3 className="font-medium mb-1 truncate">{note.title}</h3>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="truncate">{note.content.slice(0, 50)}{note.content.length > 50 ? "..." : ""}</span>
                      </div>
                    </motion.div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No notes yet</p>
                <p className="text-sm mt-1">Create your first note to get started!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* AI Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-[#b8a4d4]/10 to-[#d4e8f4]/10 rounded-2xl p-6 border border-[#b8a4d4]/30"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#b8a4d4]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#b8a4d4]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Recommendations</h2>
              <p className="text-sm text-muted-foreground">Personalized for you</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white/50 rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#b8a4d4] flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Schedule Overview</h4>
                  <p className="text-sm text-muted-foreground">
                    {todaysClasses.length > 0
                      ? `You have ${todaysClasses.length} class${todaysClasses.length > 1 ? "es" : ""} today. First one starts at ${formatTime(todaysClasses[0].startTime)}.`
                      : "No classes today — a great day to review notes or work on tasks."}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/50 rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f4b8d0] flex items-center justify-center flex-shrink-0">
                  <Award className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Task Progress</h4>
                  <p className="text-sm text-muted-foreground">
                    {incompleteTasks > 0
                      ? `You have ${incompleteTasks} pending task${incompleteTasks > 1 ? "s" : ""}. ${completedTasks > 0 ? `Great work completing ${completedTasks} so far!` : "Let's get started!"}`
                      : completedTasks > 0
                        ? `Amazing! You've completed all ${completedTasks} task${completedTasks > 1 ? "s" : ""}. Keep it up!`
                        : "Add some tasks to start tracking your progress."}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/50 rounded-xl backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#d4e8f4] flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-[#d4e8f4]" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Collaboration Tip</h4>
                  <p className="text-sm text-muted-foreground">
                    {apiFriends.length > 0
                      ? `Compare timetables with your ${apiFriends.length} friend${apiFriends.length > 1 ? "s" : ""} to find study time together.`
                      : "Add friends to compare schedules and find study time together!"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
