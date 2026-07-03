import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, Square, Target, Clock, Sparkles } from "lucide-react";
import { ProfileCharacter, getEvolutionFromMinutes } from "./ProfileCharacter";

// ─── Storage ─────────────────────────────────────────────────────────────────

const POMODORO_STORAGE_KEY = 'synccircle_pomodoro_stats';
const STUDY_LOG_KEY = 'synccircle_study_log';

function getUserId(): string {
  try {
    const raw = localStorage.getItem('synccircle_user');
    if (raw) return JSON.parse(raw).id || 'default';
  } catch {}
  return 'default';
}

function userKey(base: string): string {
  const uid = getUserId();
  return uid === 'default' ? base : `${base}_${uid}`;
}

interface PomodoroStats {
  totalSessions: number;
  totalMinutes: number;
  todaySessions: number;
  lastSessionDate: string;
}

interface DailyStudyEntry {
  date: string;
  minutes: number;
}

function loadStats(): PomodoroStats {
  try {
    const raw = localStorage.getItem(userKey(POMODORO_STORAGE_KEY));
    return raw ? JSON.parse(raw) : { totalSessions: 0, totalMinutes: 0, todaySessions: 0, lastSessionDate: '' };
  } catch { return { totalSessions: 0, totalMinutes: 0, todaySessions: 0, lastSessionDate: '' }; }
}

function saveStats(stats: PomodoroStats): void {
  localStorage.setItem(userKey(POMODORO_STORAGE_KEY), JSON.stringify(stats));
}

function addStudyMinutes(minutes: number): void {
  const log: DailyStudyEntry[] = (() => {
    try {
      const raw = localStorage.getItem(userKey(STUDY_LOG_KEY));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();
  const today = new Date().toISOString().slice(0, 10);
  const existing = log.find((e: DailyStudyEntry) => e.date === today);
  if (existing) {
    existing.minutes += minutes;
  } else {
    log.push({ date: today, minutes });
  }
  // Keep last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const filtered = log.filter((e: DailyStudyEntry) => e.date >= cutoff.toISOString().slice(0, 10));
  localStorage.setItem(userKey(STUDY_LOG_KEY), JSON.stringify(filtered));
}

// ─── Component ───────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [15, 25, 30, 45, 60];

export function FocusTimerWidget() {
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [stats, setStats] = useState<PomodoroStats>(loadStats);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const reachedGoal = elapsedMinutes >= targetMinutes;

  const handleStart = () => {
    setIsRunning(true);
    setSessionComplete(false);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleEndSession = () => {
    // If haven't reached goal, show confirmation
    if (!reachedGoal && elapsedSeconds > 0) {
      setShowEndConfirm(true);
      return;
    }
    finishSession();
  };

  const finishSession = () => {
    setIsRunning(false);
    setShowEndConfirm(false);
    const minutesStudied = Math.max(1, Math.round(elapsedSeconds / 60));

    // Update stats
    const today = new Date().toISOString().slice(0, 10);
    const updated: PomodoroStats = {
      totalSessions: stats.totalSessions + 1,
      totalMinutes: stats.totalMinutes + minutesStudied,
      todaySessions: stats.lastSessionDate === today ? stats.todaySessions + 1 : 1,
      lastSessionDate: today,
    };
    setStats(updated);
    saveStats(updated);
    addStudyMinutes(minutesStudied);

    setSessionComplete(true);
    setElapsedSeconds(0);

    // Clear complete message after 3s
    setTimeout(() => setSessionComplete(false), 3000);
  };

  const confirmEndEarly = () => {
    finishSession();
  };

  const cancelEndEarly = () => {
    setShowEndConfirm(false);
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = targetMinutes > 0 ? Math.min(100, (elapsedSeconds / (targetMinutes * 60)) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card rounded-2xl p-6 border border-border col-span-2"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Focus Timer</h2>
          <p className="text-sm text-muted-foreground">Free-roam study session</p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {stats.totalSessions} sessions
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {stats.totalMinutes} min total
          </span>
        </div>
      </div>

      {/* Layout: Big buddy on left | Timer + controls on right */}
      <div className="flex items-stretch gap-6">
        {/* Study Buddy — main focus, large */}
        <div className="flex-shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-accent/50 to-accent/20 border border-border p-4">
          <ProfileCharacter
            state={isRunning ? "studying" : sessionComplete ? "celebration" : "idle"}
            level={getEvolutionFromMinutes(stats.totalMinutes).level}
            size="md"
          />
        </div>

        {/* Timer section — compact on right */}
        <div className="flex-1 flex flex-col justify-center gap-3">
          {/* Timer display */}
          <div className="text-center">
            <motion.p
              className={`text-5xl font-bold font-mono ${reachedGoal ? 'text-green-500' : ''}`}
              animate={reachedGoal && isRunning ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {formatTime(elapsedSeconds)}
            </motion.p>
            <p className="text-xs text-muted-foreground mt-1">
              {reachedGoal
                ? `🎉 Goal reached! Keep going or end session.`
                : isRunning
                ? `${targetMinutes - elapsedMinutes} min to goal`
                : elapsedSeconds > 0
                ? 'Paused'
                : `Target: ${targetMinutes} min`}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-accent rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: reachedGoal ? '#22c55e' : 'hsl(var(--primary))' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Goal selector + Controls row */}
          <div className="flex items-center justify-between gap-4">
            {/* Goal pills */}
            <div className="flex gap-1">
              {DURATION_OPTIONS.map((min) => (
                <button
                  key={min}
                  onClick={() => !isRunning && elapsedSeconds === 0 && setTargetMinutes(min)}
                  disabled={isRunning || elapsedSeconds > 0}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    targetMinutes === min
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent hover:bg-accent/80 text-muted-foreground disabled:opacity-50'
                  }`}
                >
                  {min}m
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {elapsedSeconds > 0 ? 'Resume' : 'Start'}
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}
              {(isRunning || elapsedSeconds > 0) && (
                <button
                  onClick={handleEndSession}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  End
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* End early confirmation */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-200 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-amber-700">
                You're {targetMinutes - elapsedMinutes} min away from your goal! 💪
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Keep going — you're doing great!</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={cancelEndEarly}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground"
              >
                Keep Going
              </button>
              <button
                onClick={confirmEndEarly}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-muted-foreground"
              >
                End Anyway
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session complete message */}
      <AnimatePresence>
        {sessionComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-200 text-center"
          >
            <p className="text-sm font-medium text-green-700">
              🎉 Session complete! Great focus work.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
