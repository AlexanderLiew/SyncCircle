import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  MapPin,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Trash2,
  CalendarCheck,
  Loader2,
  XCircle,
  AlertCircle,
  Upload,
  Link2,
  Unlink,
  Download,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "../components/ui/popover";
import { getClasses, saveClass, deleteClass, getFriends } from "../lib/storage";
import { getTasks, saveTask, deleteTask } from "../lib/storage";
import { validateClassForm } from "../lib/validators";
import { useGoogleCalendar } from "../hooks/useGoogleCalendar";
import { fireDeadlineEmailIfTomorrow } from "../hooks/useTaskNotifications";
import { parseICSFromFile } from "../lib/ics-parser";
import { apiClient } from "../lib/api-client";
import { formatSGTDate, sgtWeekStartWithOffset, sgtWeekEndWithOffset } from "../lib/sgt";
import { toast } from "sonner";
import type { TimetableClass, Task, Friend } from "../types";

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];

const timeLabels = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM",
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * Convert "HH:mm" string to a grid row index (0-based).
 * "08:00" -> 0, "09:00" -> 1, etc.
 */
function timeToRow(time: string): number {
  const [hours] = time.split(":").map(Number);
  return Math.max(0, Math.min(timeSlots.length - 1, hours - 8));
}

/**
 * Calculate duration in rows between start and end time strings.
 */
function durationInRows(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  return Math.max(1, Math.round((endMinutes - startMinutes) / 60));
}

const priorityColors: Record<string, string> = {
  High: "text-red-500",
  Medium: "text-yellow-500",
  Low: "text-green-500",
};

const priorityBg: Record<string, string> = {
  High: "bg-red-500/10",
  Medium: "bg-yellow-500/10",
  Low: "bg-green-500/10",
};

const CLASS_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
];

interface ClassFormData {
  title: string;
  moduleCode: string;
  location: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  color: string;
}

const EMPTY_FORM: ClassFormData = {
  title: "",
  moduleCode: "",
  location: "",
  dayOfWeek: 0,
  startTime: "09:00",
  endTime: "10:00",
  color: CLASS_COLORS[0],
};

function ClassCard({
  classItem,
  onClick,
}: {
  classItem: TimetableClass;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-3 rounded-xl shadow-md hover:shadow-lg transition-all h-full cursor-pointer"
      style={{ backgroundColor: classItem.color, color: "#fff" }}
      onClick={onClick}
    >
      <h4 className="font-semibold mb-1 text-sm leading-tight">{classItem.title}</h4>
      {classItem.moduleCode && (
        <div className="text-xs opacity-90 mb-1">{classItem.moduleCode}</div>
      )}
      <div className="flex items-center gap-1 text-xs opacity-90">
        <MapPin className="w-3 h-3" />
        {classItem.location}
      </div>
      {classItem.source === "imported" && (
        <div className="mt-1 text-[10px] bg-white/20 rounded px-1 inline-block">imported</div>
      )}
    </motion.div>
  );
}

function getDueDateStatus(dueDateStr: string): 'overdue' | 'today' | 'tomorrow' | 'upcoming' | null {
  if (!dueDateStr) return null;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayMs = new Date(todayStr).getTime();
  const dueMs = new Date(dueDateStr).getTime();
  const diff = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return 'upcoming';
}

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const dueDateStatus = task.dueDate && !task.completed ? getDueDateStatus(task.dueDate) : null;

  const dueBadge = {
    overdue: { label: 'Overdue', class: 'bg-red-100 text-red-600 border border-red-200' },
    today:   { label: 'Due today', class: 'bg-orange-100 text-orange-600 border border-orange-200' },
    tomorrow:{ label: 'Due tomorrow', class: 'bg-amber-100 text-amber-600 border border-amber-200' },
    upcoming:{ label: null, class: '' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-center gap-3 p-4 rounded-xl border border-border bg-card transition-all hover:shadow-sm ${
        task.completed ? 'opacity-60' : ''
      } ${dueDateStatus === 'overdue' ? 'border-red-200 bg-red-50/30' : ''}`}
    >
      <button
        onClick={() => onToggle(task)}
        className="flex-shrink-0 transition-colors"
        aria-label={task.completed ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </p>
        <div className="flex items-center flex-wrap gap-2 mt-1">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-SG', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          )}
          {dueDateStatus && dueDateStatus !== 'upcoming' && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dueBadge[dueDateStatus].class}`}>
              {dueBadge[dueDateStatus].label}
            </span>
          )}
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${priorityBg[task.priority]} ${priorityColors[task.priority]}`}>
            <Flag className="w-3 h-3" />
            {task.priority}
          </span>
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        aria-label={`Delete "${task.title}"`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function Timetable() {
  const [classes, setClasses] = useState<TimetableClass[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState('calendar');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TimetableClass | null>(null);
  const [formData, setFormData] = useState<ClassFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Google Calendar
  const {
    isConnected: isGoogleConnected,
    isInitialized: isGoogleInitialized,
    isLoading: isGoogleLoading,
    syncStatus,
    connect: connectGoogle,
    disconnect: disconnectGoogle,
    syncToGoogle,
    importFromGoogle,
  } = useGoogleCalendar();

  // Friends & Filter
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [showMyClasses, setShowMyClasses] = useState(true);

  // ICS import
  const icsInputRef = useRef<HTMLInputElement>(null);

  // Week navigation (for Pull from Google)
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute week range labels
  const getWeekStartWithOffset = (offset: number) => sgtWeekStartWithOffset(offset);
  const getWeekEndWithOffset = (offset: number) => sgtWeekEndWithOffset(offset);

  // Task form state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskPriority, setTaskPriority] = useState<Task['priority']>('Medium');
  const [taskFormError, setTaskFormError] = useState('');

  // Load data from localStorage on mount
  useEffect(() => {
    setClasses(getClasses());
    setTasks(getTasks());

    // Load friends: from API (real auth) or localStorage (dev bypass)
    const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
    if (DEV_BYPASS) {
      setFriends(getFriends());
    } else {
      // Fetch from backend API
      apiClient.get<{ friends: { friendId: string; displayName: string; createdAt: string }[] }>('/friends')
        .then((data) => {
          // Map API friends to the Friend type expected by the filter view
          const mapped: Friend[] = data.friends.map((f) => ({
            id: f.friendId,
            userId: 'me',
            friendId: f.friendId,
            displayName: f.displayName,
            status: 'online' as const,
            timetable: [], // will be fetched on-demand when toggled
          }));
          setFriends(mapped);
        })
        .catch(() => {
          // Fallback to localStorage if API fails
          setFriends(getFriends());
        });
    }
  }, []);

  // Sync timetable to backend (fire-and-forget, best effort)
  const syncTimetableToBackend = useCallback((updatedClasses: TimetableClass[]) => {
    const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
    if (DEV_BYPASS) {
      console.log('[Timetable] Dev bypass — skipping backend sync');
      return;
    }
    apiClient.put('/timetable', { classes: updatedClasses })
      .then(() => console.log('[Timetable] ✅ Synced to backend:', updatedClasses.length, 'classes'))
      .catch((err) => console.warn('[Timetable] ❌ Backend sync failed:', err));
  }, []);

  const handleSyncToGoogleCalendar = async () => {
    if (classes.length === 0) {
      toast.info("No classes to sync. Add some classes first.");
      return;
    }
    await syncToGoogle(classes);
  };

  // Connect and auto-sync all classes after connection
  const handleConnectGoogle = async () => {
    await connectGoogle();
    // After connecting, auto-sync all existing classes
    if (classes.length > 0) {
      // Small delay to ensure token is stored
      setTimeout(async () => {
        await syncToGoogle(classes);
      }, 500);
    }
  };

  const handleImportFromGoogle = async () => {
    const imported = await importFromGoogle(weekOffset);
    if (imported.length > 0) {
      imported.forEach((cls) => saveClass(cls));
      const updatedClasses = getClasses();
      setClasses(updatedClasses);
      syncTimetableToBackend(updatedClasses);
      toast.success(`Imported ${imported.length} events from Google Calendar`);
    }
  };

  const handleICSImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseICSFromFile(file);
      if (imported.length === 0) {
        toast.info("No classes found in the .ics file (weekday events only).");
        return;
      }
      imported.forEach((cls) => saveClass(cls));
      const updatedClasses = getClasses();
      setClasses(updatedClasses);
      syncTimetableToBackend(updatedClasses);
      toast.success(`Imported ${imported.length} class(es) from ${file.name}`);
    } catch {
      toast.error("Failed to parse .ics file. Please check the file format.");
    }
    // Reset input so same file can be re-imported
    if (icsInputRef.current) icsInputRef.current.value = '';
  };

  const handleToggleFriend = useCallback((friendId: string) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
        // Fetch friend's timetable from API (if not in dev bypass)
        const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
        if (!DEV_BYPASS) {
          console.log('[Timetable] Fetching timetable for friend:', friendId);
          apiClient.get<{ classes: TimetableClass[]; updatedAt: string | null }>(
            `/friends/${friendId}/timetable`
          ).then((data) => {
            console.log('[Timetable] ✅ Got friend timetable:', data.classes.length, 'classes', data);
            if (data.classes.length > 0) {
              // Update the friend's timetable in local state
              setFriends((prevFriends) =>
                prevFriends.map((f) =>
                  f.id === friendId || f.friendId === friendId
                    ? { ...f, timetable: data.classes }
                    : f
                )
              );
            }
          }).catch((err) => {
            console.warn('[Timetable] ❌ Failed to fetch friend timetable:', err);
          });
        }
      }
      return next;
    });
  }, []);

  // Friend overlay colors
  const FRIEND_COLORS = [
    '#3b82f6', '#f59e0b', '#10b981', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  ];

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // --- Class Dialog Handlers ---

  const openAddDialog = () => {
    setEditingClass(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (cls: TimetableClass) => {
    setEditingClass(cls);
    setFormData({
      title: cls.title,
      moduleCode: cls.moduleCode,
      location: cls.location,
      dayOfWeek: cls.dayOfWeek,
      startTime: cls.startTime,
      endTime: cls.endTime,
      color: cls.color,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleFormChange = (field: keyof ClassFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for field on change
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmitClass = () => {
    const result = validateClassForm({
      title: formData.title,
      moduleCode: formData.moduleCode,
      location: formData.location,
      dayOfWeek: formData.dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
    });

    if (!result.valid) {
      setFormErrors(result.errors);
      return;
    }

    const cls: TimetableClass = {
      id: editingClass ? editingClass.id : crypto.randomUUID(),
      title: formData.title.trim(),
      moduleCode: formData.moduleCode.trim(),
      location: formData.location.trim(),
      dayOfWeek: formData.dayOfWeek as 0 | 1 | 2 | 3 | 4,
      startTime: formData.startTime,
      endTime: formData.endTime,
      color: formData.color,
      source: editingClass ? editingClass.source : "personal",
    };

    saveClass(cls);
    const updatedClasses = getClasses();
    setClasses(updatedClasses);
    syncTimetableToBackend(updatedClasses);
    // Auto-sync to Google Calendar if connected
    if (isGoogleConnected) {
      syncToGoogle([cls]);
    }
    setDialogOpen(false);
    setEditingClass(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
  };

  const handleDeleteClass = () => {
    if (editingClass) {
      deleteClass(editingClass.id);
      const updatedClasses = getClasses();
      setClasses(updatedClasses);
      syncTimetableToBackend(updatedClasses);
      setDialogOpen(false);
      setEditingClass(null);
      setFormData(EMPTY_FORM);
      setFormErrors({});
    }
  };

  const handleToggleTask = (task: Task) => {
    const updated: Task = {
      ...task,
      completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : undefined,
    };
    saveTask(updated);
    setTasks(getTasks());
  };

  const handleDeleteTask = (id: string) => {
    deleteTask(id);
    setTasks(getTasks());
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    setTaskFormError('');

    if (!taskTitle.trim()) {
      setTaskFormError('Task title is required');
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: taskTitle.trim(),
      dueDate: taskDueDate || undefined,
      dueTime: (taskDueDate && taskDueTime) ? taskDueTime : undefined,
      priority: taskPriority,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    saveTask(newTask);
    setTasks(getTasks());

    // Fire email immediately if due date is tomorrow
    fireDeadlineEmailIfTomorrow(newTask);

    // Reset form and close dialog
    setTaskTitle('');
    setTaskDueDate('');
    setTaskDueTime('');
    setTaskPriority('Medium');
    setTaskFormError('');
    setTaskDialogOpen(false);
  };

  // Get today's date string in YYYY-MM-DD for the min date on the date picker
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Timetable</h1>
          <p className="text-muted-foreground">Manage your schedule and tasks</p>
        </div>

        {/* Calendar-only buttons — hidden when Tasks tab is active */}
        {activeTab === 'calendar' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Google Calendar Connect/Disconnect */}
            {isGoogleConnected ? (
              <button
                onClick={disconnectGoogle}
                className="px-3 py-2 rounded-xl bg-red-500/10 text-red-600 border border-red-200 hover:bg-red-500/20 transition-all flex items-center gap-2 text-sm"
              >
                <Unlink className="w-4 h-4" />
                Disconnect Google
              </button>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={isGoogleLoading || !isGoogleInitialized}
                className="px-3 py-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-200 hover:bg-blue-500/20 disabled:opacity-50 transition-all flex items-center gap-2 text-sm"
              >
                <Link2 className="w-4 h-4" />
                {isGoogleLoading ? 'Connecting…' : 'Connect Google Calendar'}
              </button>
            )}

            {/* Import .ics */}
            <input
              ref={icsInputRef}
              type="file"
              accept=".ics,.ical"
              className="hidden"
              onChange={handleICSImport}
            />
            <button
              onClick={() => icsInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-card border border-border hover:bg-accent transition-all flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              Import .ics
            </button>

            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-2 rounded-xl bg-card border border-border hover:bg-accent transition-all flex items-center gap-2 text-sm">
                  <Filter className="w-4 h-4" />
                  Filter View
                  {selectedFriendIds.size > 0 && (
                    <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                      {selectedFriendIds.size}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Show Timetables</h4>
                  {/* My timetable toggle */}
                  <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                    <Checkbox
                      checked={showMyClasses}
                      onCheckedChange={(checked) => setShowMyClasses(!!checked)}
                    />
                    <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-sm font-medium">My Classes</span>
                  </label>
                  {/* Friends */}
                  {friends.length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Friends</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {friends.map((friend, idx) => (
                          <label
                            key={friend.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={selectedFriendIds.has(friend.id)}
                              onCheckedChange={() => handleToggleFriend(friend.id)}
                            />
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: FRIEND_COLORS[idx % FRIEND_COLORS.length] }}
                            />
                            <span className="text-sm truncate">{friend.displayName}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {friend.timetable.length} classes
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {friends.length === 0 && (
                    <p className="text-xs text-muted-foreground">Add friends to compare timetables.</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Pull from Google */}
            {isGoogleConnected && (
              <button
                onClick={handleImportFromGoogle}
                className="px-3 py-2 rounded-xl bg-card border border-border hover:bg-accent transition-all flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Pull from Google
              </button>
            )}

            {/* Sync to Google Calendar */}
            {isGoogleConnected && (
              <motion.button
                onClick={handleSyncToGoogleCalendar}
                disabled={syncStatus === 'syncing'}
                animate={{
                  backgroundColor:
                    syncStatus === 'success' ? '#16a34a' :
                    syncStatus === 'error'   ? '#dc2626' :
                                               '#15803d',
                }}
                transition={{ duration: 0.3 }}
                className="px-3 py-2 rounded-xl text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing…
                  </>
                ) : syncStatus === 'success' ? (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Synced!
                  </motion.span>
                ) : syncStatus === 'error' ? (
                  <motion.span
                    key="error"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Sync Failed
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    Sync All
                  </motion.span>
                )}
              </motion.button>
            )}

            <button
              onClick={openAddDialog}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Class
            </button>
          </div>
        )}
      </motion.div>

      {/* Tabs: Your Calendar / Your Tasks */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Your Calendar
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Your Tasks
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setWeekOffset((w) => w - 1)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Previous week"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium">
                  {formatSGTDate(getWeekStartWithOffset(weekOffset))} – {formatSGTDate(getWeekEndWithOffset(weekOffset))}
                </span>
                <span className="text-xs text-muted-foreground">(SGT)</span>
              </div>
              <button
                onClick={() => setWeekOffset((w) => w + 1)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Next week"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-1 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Timetable Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-6 overflow-x-auto"
          >
            <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-3 min-w-[900px]">
              {/* Header Row */}
              <div></div>
              {days.map((day) => (
                <div key={day} className="text-center pb-3">
                  <div className="font-semibold">{day}</div>
                </div>
              ))}

              {/* Time Slots */}
              {timeSlots.map((time, timeIndex) => (
                <div key={time} className="contents">
                  <div className="flex items-start justify-end pr-3 text-sm text-muted-foreground pt-2">
                    {timeLabels[timeIndex]}
                  </div>
                  {days.map((_, dayIndex) => {
                    // User's class in this slot
                    const classInSlot = showMyClasses
                      ? classes.find(
                          (c) => c.dayOfWeek === dayIndex && timeToRow(c.startTime) === timeIndex
                        )
                      : undefined;

                    // Friend classes in this slot
                    const friendClassesInSlot: { cls: TimetableClass; color: string; friendName: string }[] = [];
                    friends.forEach((friend, fIdx) => {
                      if (!selectedFriendIds.has(friend.id)) return;
                      const fc = friend.timetable.find(
                        (c) => c.dayOfWeek === dayIndex && timeToRow(c.startTime) === timeIndex
                      );
                      if (fc) {
                        friendClassesInSlot.push({
                          cls: fc,
                          color: FRIEND_COLORS[fIdx % FRIEND_COLORS.length],
                          friendName: friend.displayName,
                        });
                      }
                    });

                    // Check if this is a common free slot (user + all selected friends are free)
                    const isCommonFree =
                      selectedFriendIds.size > 0 &&
                      showMyClasses &&
                      !classInSlot &&
                      friendClassesInSlot.length === 0 &&
                      !classes.some(
                        (c) => c.dayOfWeek === dayIndex && timeToRow(c.startTime) === timeIndex
                      );

                    return (
                      <div key={`${dayIndex}-${timeIndex}`} className="relative">
                        {classInSlot ? (
                          <ClassCard
                            classItem={classInSlot}
                            onClick={() => openEditDialog(classInSlot)}
                          />
                        ) : friendClassesInSlot.length > 0 ? (
                          <div className="space-y-1">
                            {friendClassesInSlot.map(({ cls, color, friendName }) => (
                              <motion.div
                                key={cls.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-2 rounded-xl shadow-sm h-full border-2"
                                style={{ borderColor: color, backgroundColor: `${color}15` }}
                              >
                                <h4 className="font-medium text-xs leading-tight" style={{ color }}>
                                  {cls.title}
                                </h4>
                                <div className="text-[10px] opacity-70 mt-0.5">{friendName}</div>
                                {cls.location && (
                                  <div className="flex items-center gap-1 text-[10px] opacity-70 mt-0.5">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {cls.location}
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div
                            className={`border border-border/30 rounded-lg transition-colors min-h-[52px] ${
                              isCommonFree
                                ? 'bg-green-500/10 border-green-300/50'
                                : 'hover:bg-accent/30'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {classes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No classes yet</p>
                <p className="text-sm">Click "Add Class" to add your first class to the timetable.</p>
              </div>
            )}
          </motion.div>

          {/* Module Color Legend */}
          {classes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-2xl border border-border p-6 mt-4"
            >
              <h3 className="font-semibold mb-4">Module Colors</h3>
              <div className="flex flex-wrap gap-3">
                {Array.from(new Set(classes.map((c) => c.title))).map((title) => {
                  const cls = classes.find((c) => c.title === title);
                  return (
                    <div key={title} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: cls?.color }}></div>
                      <span className="text-sm">{title}</span>
                    </div>
                  );
                })}
              </div>

              {/* Friend overlay legend */}
              {selectedFriendIds.size > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Friend Overlays</h4>
                  <div className="flex flex-wrap gap-3">
                    {friends
                      .filter((f) => selectedFriendIds.has(f.id))
                      .map((friend, idx) => {
                        const originalIdx = friends.indexOf(friend);
                        return (
                          <div key={friend.id} className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded border-2"
                              style={{ borderColor: FRIEND_COLORS[originalIdx % FRIEND_COLORS.length], backgroundColor: `${FRIEND_COLORS[originalIdx % FRIEND_COLORS.length]}20` }}
                            />
                            <span className="text-sm">{friend.displayName}</span>
                          </div>
                        );
                      })}
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500/20 border border-green-300" />
                      <span className="text-sm text-muted-foreground">Common free slots</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Google Calendar status */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isGoogleConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-muted-foreground">
                    Google Calendar: {isGoogleConnected ? 'Connected — changes auto-sync' : 'Not connected'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <div className="space-y-6">
            {/* Tasks Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Your Tasks</h3>
                <p className="text-sm text-muted-foreground">
                  {activeTasks.length} active
                  {completedTasks.length > 0 && `, ${completedTasks.length} completed`}
                </p>
              </div>
              <button
                onClick={() => {
                  setTaskTitle('');
                  setTaskDueDate('');
                  setTaskDueTime('');
                  setTaskPriority('Medium');
                  setTaskFormError('');
                  setTaskDialogOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>

            {/* Active Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Circle className="w-4 h-4 text-primary" />
                Active ({activeTasks.length})
              </h4>
              {activeTasks.length > 0 ? (
                <div className="space-y-2">
                  <AnimatePresence>
                    {activeTasks
                      .sort((a, b) => {
                        const order = { High: 0, Medium: 1, Low: 2 };
                        const pd = order[a.priority] - order[b.priority];
                        if (pd !== 0) return pd;
                        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                        if (a.dueDate) return -1;
                        if (b.dueDate) return 1;
                        return 0;
                      })
                      .map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-border">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No active tasks</p>
                  <p className="text-xs mt-1">Click "Add Task" to get started</p>
                </div>
              )}
            </motion.div>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Completed ({completedTasks.length})
                </h4>
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Class Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Class" : "Add Class"}</DialogTitle>
            <DialogDescription>
              {editingClass
                ? "Update the class details below."
                : "Fill in the details to add a new class to your timetable."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="class-title">Title</Label>
              <Input
                id="class-title"
                placeholder="e.g. Data Structures"
                value={formData.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                aria-invalid={!!formErrors.title}
              />
              {formErrors.title && (
                <p className="text-sm text-destructive">{formErrors.title}</p>
              )}
            </div>

            {/* Module Code */}
            <div className="space-y-2">
              <Label htmlFor="class-module">Module Code</Label>
              <Input
                id="class-module"
                placeholder="e.g. CS2040"
                value={formData.moduleCode}
                onChange={(e) => handleFormChange("moduleCode", e.target.value)}
                aria-invalid={!!formErrors.moduleCode}
              />
              {formErrors.moduleCode && (
                <p className="text-sm text-destructive">{formErrors.moduleCode}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="class-location">Location</Label>
              <Input
                id="class-location"
                placeholder="e.g. LT19"
                value={formData.location}
                onChange={(e) => handleFormChange("location", e.target.value)}
                aria-invalid={!!formErrors.location}
              />
              {formErrors.location && (
                <p className="text-sm text-destructive">{formErrors.location}</p>
              )}
            </div>

            {/* Day of Week */}
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select
                value={String(formData.dayOfWeek)}
                onValueChange={(val) => handleFormChange("dayOfWeek", Number(val))}
              >
                <SelectTrigger aria-invalid={!!formErrors.dayOfWeek}>
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Monday</SelectItem>
                  <SelectItem value="1">Tuesday</SelectItem>
                  <SelectItem value="2">Wednesday</SelectItem>
                  <SelectItem value="3">Thursday</SelectItem>
                  <SelectItem value="4">Friday</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.dayOfWeek && (
                <p className="text-sm text-destructive">{formErrors.dayOfWeek}</p>
              )}
            </div>

            {/* Time Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class-start">Start Time</Label>
                <Input
                  id="class-start"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleFormChange("startTime", e.target.value)}
                  aria-invalid={!!formErrors.startTime}
                />
                {formErrors.startTime && (
                  <p className="text-sm text-destructive">{formErrors.startTime}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="class-end">End Time</Label>
                <Input
                  id="class-end"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleFormChange("endTime", e.target.value)}
                  aria-invalid={!!formErrors.endTime}
                />
                {formErrors.endTime && (
                  <p className="text-sm text-destructive">{formErrors.endTime}</p>
                )}
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {CLASS_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleFormChange("color", color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            {editingClass && (
              <button
                type="button"
                onClick={handleDeleteClass}
                className="px-4 py-2 rounded-xl text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-sm bg-card border border-border hover:bg-accent transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitClass}
                className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:shadow-lg transition-all"
              >
                {editingClass ? "Save Changes" : "Add Class"}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Fill in the details below. A deadline reminder email will be sent 1 day before the due date.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTask} className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="task-title-input">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task-title-input"
                placeholder="What do you need to do?"
                value={taskTitle}
                onChange={(e) => {
                  setTaskTitle(e.target.value);
                  if (taskFormError) setTaskFormError('');
                }}
                autoFocus
                aria-invalid={!!taskFormError}
              />
              {taskFormError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {taskFormError}
                </p>
              )}
            </div>

            {/* Due Date + Time */}
            <div className="space-y-2">
              <Label htmlFor="task-due-date-input">
                Due Date
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  id="task-due-date-input"
                  type="date"
                  value={taskDueDate}
                  min={todayStr}
                  onChange={(e) => { setTaskDueDate(e.target.value); if (!e.target.value) setTaskDueTime(''); }}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                />
              </div>
            </div>

            {/* Due Time — only shown when a date is chosen */}
            {taskDueDate && (
              <div className="space-y-2">
                <Label htmlFor="task-due-time-input">
                  Due Time
                  <span className="text-muted-foreground font-normal ml-1">(optional — SGT)</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="task-due-time-input"
                    type="time"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {taskDueTime
                    ? `⏰ In-app reminder 30 min before ${taskDueTime} SGT. Email sent 1 day before.`
                    : `⏰ No time set — in-app reminder at 3:00 PM SGT. Email sent 1 day before.`}
                </p>
              </div>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['High', 'Medium', 'Low'] as Task['priority'][]).map((p) => {
                  const styles = {
                    High: { active: 'bg-red-100 border-red-400 text-red-700', dot: 'bg-red-400' },
                    Medium: { active: 'bg-amber-100 border-amber-400 text-amber-700', dot: 'bg-amber-400' },
                    Low: { active: 'bg-green-100 border-green-400 text-green-700', dot: 'bg-green-400' },
                  };
                  const isSelected = taskPriority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTaskPriority(p)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? styles[p].active
                          : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${styles[p].dot}`} />
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setTaskDialogOpen(false)}
                className="px-4 py-2 rounded-xl text-sm bg-card border border-border hover:bg-accent transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:shadow-lg transition-all"
              >
                Create Task
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
