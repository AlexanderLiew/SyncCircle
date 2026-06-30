import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Trash2, Calendar, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { getTasks, saveTask, deleteTask } from '../lib/storage';
import { validateTaskForm } from '../lib/validators';
import type { Task } from '../types';

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
};

function sortActiveTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Sort by priority first (High > Medium > Low)
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date (earliest first, tasks without due dates go last)
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

function sortCompletedTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Most recently completed first
    if (a.completedAt && b.completedAt) return b.completedAt.localeCompare(a.completedAt);
    if (a.completedAt) return -1;
    if (b.completedAt) return 1;
    return 0;
  });
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [formError, setFormError] = useState('');

  // Load tasks from localStorage on mount
  useEffect(() => {
    setTasks(getTasks());
  }, []);

  const activeTasks = sortActiveTasks(tasks.filter((t) => !t.completed));
  const completedTasks = sortCompletedTasks(tasks.filter((t) => t.completed));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const validation = validateTaskForm({ title });
    if (!validation.valid) {
      setFormError(validation.errors.title || 'Invalid input');
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      dueDate: dueDate || undefined,
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    saveTask(newTask);
    setTasks(getTasks());

    // Reset form
    setTitle('');
    setDueDate('');
    setPriority('Medium');
    setShowForm(false);
  };

  const handleMarkComplete = (task: Task) => {
    const updatedTask: Task = {
      ...task,
      completed: true,
      completedAt: new Date().toISOString(),
    };
    saveTask(updatedTask);
    setTasks(getTasks());
  };

  const handleDelete = (id: string) => {
    deleteTask(id);
    setTasks(getTasks());
  };

  return (
    <div className="space-y-6">
      {/* Header + Add Task button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {activeTasks.length} active{completedTasks.length > 0 && `, ${completedTasks.length} completed`}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Add Task Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-card rounded-2xl border border-border p-6 space-y-4"
            >
              <div>
                <label htmlFor="task-title" className="block text-sm font-medium mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you need to do?"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                {formError && (
                  <p className="text-sm text-red-500 mt-1">{formError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="task-due-date" className="block text-sm font-medium mb-1.5">
                    Due Date <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    id="task-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="task-priority" className="block text-sm font-medium mb-1.5">
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task['priority'])}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError('');
                  }}
                  className="px-5 py-2.5 rounded-xl hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Tasks */}
      <div className="space-y-3">
        {activeTasks.length === 0 && !showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-2xl border border-border p-8 text-center"
          >
            <p className="text-muted-foreground">No active tasks. Click "Add Task" to get started.</p>
          </motion.div>
        )}

        <AnimatePresence>
          {activeTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-xl border border-border p-4 flex items-center gap-4 group hover:shadow-md transition-all"
            >
              {/* Complete button */}
              <button
                onClick={() => handleMarkComplete(task)}
                className="w-6 h-6 rounded-full border-2 border-muted-foreground/40 hover:border-primary hover:bg-primary/10 transition-all flex items-center justify-center flex-shrink-0"
                aria-label={`Mark "${task.title}" as complete`}
              >
                <Check className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
              </button>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  {task.dueDate && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <span
                    className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}
                  >
                    <Flag className="w-3 h-3" />
                    {task.priority}
                  </span>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(task.id)}
                className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                aria-label={`Delete "${task.title}"`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Completed Tasks Section */}
      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Completed ({completedTasks.length})
          </button>

          <AnimatePresence>
            {showCompleted &&
              completedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card/50 rounded-xl border border-border/50 p-4 flex items-center gap-4 group"
                >
                  {/* Completed indicator */}
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </div>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate line-through text-muted-foreground">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {task.completedAt && (
                        <span className="text-xs text-muted-foreground">
                          Completed {new Date(task.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    aria-label={`Delete "${task.title}"`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
