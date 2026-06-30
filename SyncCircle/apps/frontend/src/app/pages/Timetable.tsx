import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  Filter,
  Plus,
  MapPin,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Trash2,
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
import { getClasses, saveClass, deleteClass } from "../lib/storage";
import { getTasks, saveTask, deleteTask } from "../lib/storage";
import { validateClassForm } from "../lib/validators";
import { useWorkato } from "../hooks/useWorkato";
import type { TimetableClass, Task } from "../types";

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

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-4 rounded-xl border border-border bg-card transition-all hover:shadow-sm ${
        task.completed ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => onToggle(task)}
        className="flex-shrink-0 transition-colors"
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {task.dueDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString()}
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
        className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded"
      >
        Delete
      </button>
    </motion.div>
  );
}

export function Timetable() {
  const [classes, setClasses] = useState<TimetableClass[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TimetableClass | null>(null);
  const [formData, setFormData] = useState<ClassFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { syncClass } = useWorkato();

  // Load data from localStorage on mount
  useEffect(() => {
    setClasses(getClasses());
    setTasks(getTasks());
  }, []);

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
    setClasses(getClasses());
    syncClass(editingClass ? 'update' : 'create', cls);
    setDialogOpen(false);
    setEditingClass(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
  };

  const handleDeleteClass = () => {
    if (editingClass) {
      deleteClass(editingClass.id);
      setClasses(getClasses());
      syncClass('delete', editingClass);
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

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-card border border-border hover:bg-accent transition-all flex items-center gap-2">
            <Users className="w-4 h-4" />
            Friend Availability
          </button>
          <button className="px-4 py-2 rounded-xl bg-card border border-border hover:bg-accent transition-all flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={openAddDialog}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </button>
        </div>
      </motion.div>

      {/* Tabs: Your Calendar / Your Tasks */}
      <Tabs defaultValue="calendar" className="w-full">
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
              <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium">This Week</span>
              </div>
              <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
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
                    const classInSlot = classes.find(
                      (c) => c.dayOfWeek === dayIndex && timeToRow(c.startTime) === timeIndex
                    );
                    return (
                      <div key={`${dayIndex}-${timeIndex}`} className="relative">
                        {classInSlot ? (
                          <ClassCard
                            classItem={classInSlot}
                            onClick={() => openEditDialog(classInSlot)}
                          />
                        ) : (
                          <div className="border border-border/30 rounded-lg transition-colors min-h-[52px] hover:bg-accent/30" />
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
            </motion.div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <div className="space-y-6">
            {/* Active Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Circle className="w-5 h-5 text-primary" />
                Active Tasks
                {activeTasks.length > 0 && (
                  <span className="text-sm text-muted-foreground font-normal">
                    ({activeTasks.length})
                  </span>
                )}
              </h3>
              {activeTasks.length > 0 ? (
                <div className="space-y-2">
                  {activeTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-card rounded-2xl border border-border">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active tasks. You're all caught up!</p>
                </div>
              )}
            </motion.div>

            {/* Completed Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Completed Tasks
                {completedTasks.length > 0 && (
                  <span className="text-sm text-muted-foreground font-normal">
                    ({completedTasks.length})
                  </span>
                )}
              </h3>
              {completedTasks.length > 0 ? (
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
              ) : (
                <div className="text-center py-6 text-muted-foreground bg-card rounded-2xl border border-border">
                  <p className="text-sm">No completed tasks yet.</p>
                </div>
              )}
            </motion.div>
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
    </div>
  );
}
