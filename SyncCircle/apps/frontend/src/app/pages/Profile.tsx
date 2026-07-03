import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Flame,
  Award,
  TrendingUp,
  BookOpen,
  Clock,
  Calendar,
  Target,
  Star,
  Trophy,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Users,
  StickyNote,
  Sparkles,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  Edit,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
  AreaChart, Area,
} from "recharts";
import { ProfileCharacter, type CharacterState, getEvolutionLevel, getEvolutionFromMinutes, EVOLUTION_LEVELS, type EvolutionLevel, CHARACTER_COLORS, getCharColor, setCharColor } from "../components/ProfileCharacter";
import { getUser, getSettings, getTasks, getFriends, getNotes, getClasses } from "../lib/storage";

// ——— Character customizer data ———
const SKIN_TONES = ["#FDDBB4", "#F1C27D", "#E0AC69", "#C68642", "#8D5524"];
const HAIR_COLORS = ["#2C1810", "#6B3A2A", "#B5651D", "#D4A843", "#F4E0C8", "#C9A0DC"];
const OUTFIT_COLORS = ["#b8a4d4", "#f4b8d0", "#d4e8f4", "#d4f4e8", "#fef4d4", "#ffd4c8"];

type HairStyle = "short" | "bob" | "long" | "ponytail" | "bun" | "curly";
const HAIR_STYLES: HairStyle[] = ["short", "bob", "long", "ponytail", "bun", "curly"];
const HAIR_STYLE_LABELS: Record<HairStyle, string> = {
  short: "Short", bob: "Bob", long: "Long", ponytail: "Ponytail", bun: "Bun", curly: "Curly",
};

type Accessory = "none" | "glasses" | "bow" | "headphones" | "hat";
const ACCESSORIES: Accessory[] = ["none", "glasses", "bow", "headphones", "hat"];
const ACCESSORY_LABELS: Record<Accessory, string> = {
  none: "None", glasses: "Glasses", bow: "Bow", headphones: "Headphones", hat: "Hat",
};

type CharConfig = {
  skinIdx: number;
  hairColorIdx: number;
  hairStyle: HairStyle;
  outfitIdx: number;
  accessory: Accessory;
};

function StudyCharacter({ cfg }: { cfg: CharConfig }) {
  const skin = SKIN_TONES[cfg.skinIdx];
  const hair = HAIR_COLORS[cfg.hairColorIdx];
  const outfit = OUTFIT_COLORS[cfg.outfitIdx];

  const HairShapes: Record<HairStyle, JSX.Element> = {
    short: (
      <ellipse cx="60" cy="38" rx="30" ry="16" fill={hair} />
    ),
    bob: (
      <>
        <ellipse cx="60" cy="38" rx="32" ry="18" fill={hair} />
        <rect x="30" y="44" width="12" height="28" rx="6" fill={hair} />
        <rect x="78" y="44" width="12" height="28" rx="6" fill={hair} />
      </>
    ),
    long: (
      <>
        <ellipse cx="60" cy="38" rx="32" ry="18" fill={hair} />
        <rect x="28" y="44" width="11" height="56" rx="5" fill={hair} />
        <rect x="81" y="44" width="11" height="56" rx="5" fill={hair} />
      </>
    ),
    ponytail: (
      <>
        <ellipse cx="60" cy="38" rx="30" ry="16" fill={hair} />
        <circle cx="88" cy="36" r="10" fill={hair} />
        <rect x="82" y="36" width="6" height="24" rx="3" fill={hair} />
      </>
    ),
    bun: (
      <>
        <ellipse cx="60" cy="38" rx="30" ry="16" fill={hair} />
        <circle cx="60" cy="20" r="12" fill={hair} />
      </>
    ),
    curly: (
      <>
        <ellipse cx="60" cy="38" rx="32" ry="18" fill={hair} />
        {[0, 1, 2, 3].map(i => (
          <circle key={i} cx={34 + i * 18} cy={32} r="8" fill={hair} />
        ))}
        <circle cx="30" cy="52" r="7" fill={hair} />
        <circle cx="90" cy="52" r="7" fill={hair} />
      </>
    ),
  };

  const AccessoryShapes: Record<Accessory, JSX.Element | null> = {
    none: null,
    glasses: (
      <>
        <circle cx="48" cy="74" r="9" fill="none" stroke="#5a4a6a" strokeWidth="2.5" />
        <circle cx="72" cy="74" r="9" fill="none" stroke="#5a4a6a" strokeWidth="2.5" />
        <line x1="57" y1="74" x2="63" y2="74" stroke="#5a4a6a" strokeWidth="2" />
        <line x1="30" y1="72" x2="39" y2="73" stroke="#5a4a6a" strokeWidth="2" />
        <line x1="81" y1="73" x2="90" y2="72" stroke="#5a4a6a" strokeWidth="2" />
      </>
    ),
    bow: (
      <>
        <path d="M42 42 L54 50 L42 58 Z" fill="#f4b8d0" />
        <path d="M78 42 L66 50 L78 58 Z" fill="#f4b8d0" />
        <circle cx="60" cy="50" r="6" fill="#f4b8d0" />
      </>
    ),
    headphones: (
      <>
        <path d="M24 70 Q24 40 60 40 Q96 40 96 70" fill="none" stroke="#5a4a6a" strokeWidth="4" />
        <rect x="18" y="68" width="12" height="16" rx="6" fill="#5a4a6a" />
        <rect x="90" y="68" width="12" height="16" rx="6" fill="#5a4a6a" />
      </>
    ),
    hat: (
      <>
        <ellipse cx="60" cy="46" rx="38" ry="6" fill={hair} />
        <rect x="34" y="18" width="52" height="30" rx="8" fill={hair} />
        <rect x="38" y="36" width="44" height="4" rx="2" fill={outfit} opacity="0.6" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 120 180" width="140" height="180" className="drop-shadow-lg">
      {/* Body / Shirt */}
      <path d="M38 112 Q38 104 60 102 Q82 104 82 112 L86 170 Q86 176 60 176 Q34 176 34 170 Z" fill={outfit} />
      {/* Shirt collar */}
      <path d="M50 104 L60 112 L70 104" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
      {/* Shirt center line */}
      <line x1="60" y1="112" x2="60" y2="170" stroke="white" strokeWidth="1" opacity="0.2" />
      {/* Shirt buttons */}
      <circle cx="60" cy="124" r="2" fill="white" opacity="0.4" />
      <circle cx="60" cy="138" r="2" fill="white" opacity="0.4" />
      <circle cx="60" cy="152" r="2" fill="white" opacity="0.4" />

      {/* Arms (sleeves) */}
      <path d="M38 114 Q28 124 24 142 Q22 148 28 150" fill="none" stroke={outfit} strokeWidth="12" strokeLinecap="round" />
      <path d="M82 114 Q92 124 96 142 Q98 148 92 150" fill="none" stroke={outfit} strokeWidth="12" strokeLinecap="round" />
      {/* Hands */}
      <circle cx="28" cy="150" r="7" fill={skin} />
      <circle cx="92" cy="150" r="7" fill={skin} />

      {/* Neck */}
      <rect x="53" y="94" width="14" height="12" rx="5" fill={skin} />

      {/* Head */}
      <ellipse cx="60" cy="60" rx="30" ry="36" fill={skin} />

      {/* Hair (positioned on TOP of head, not covering face) */}
      {HairShapes[cfg.hairStyle]}

      {/* Face — eyes */}
      <circle cx="48" cy="74" r="5" fill="#2C1810" />
      <circle cx="72" cy="74" r="5" fill="#2C1810" />
      <circle cx="50" cy="72" r="2" fill="white" />
      <circle cx="74" cy="72" r="2" fill="white" />

      {/* Cheeks */}
      <circle cx="40" cy="82" r="6" fill="#f4b8d0" opacity="0.5" />
      <circle cx="80" cy="82" r="6" fill="#f4b8d0" opacity="0.5" />

      {/* Mouth */}
      <path d="M52 88 Q60 96 68 88" fill="none" stroke="#c07090" strokeWidth="2.5" strokeLinecap="round" />

      {/* Accessory */}
      {AccessoryShapes[cfg.accessory]}

      {/* Arms */}
      <ellipse cx="28" cy="140" rx="8" ry="18" fill={outfit} opacity="0.9" />
      <ellipse cx="92" cy="140" rx="8" ry="18" fill={outfit} opacity="0.9" />

      {/* Book in hands */}
      <rect x="30" y="152" width="56" height="10" rx="3" fill="#b8a4d4" opacity="0.8" />
      <rect x="55" y="152" width="2" height="10" fill="#9080b8" opacity="0.6" />
    </svg>
  );
}

function CycleSelector<T extends string>({
  label,
  values,
  current,
  onChange,
  renderPreview,
}: {
  label: string;
  values: T[];
  current: T;
  onChange: (v: T) => void;
  renderPreview?: (v: T) => JSX.Element;
}) {
  const idx = values.indexOf(current);
  const prev = () => onChange(values[(idx - 1 + values.length) % values.length]);
  const next = () => onChange(values[(idx + 1) % values.length]);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button onClick={prev} className="p-1 rounded-lg hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-24 flex items-center justify-center">
          {renderPreview ? renderPreview(current) : (
            <span className="text-sm font-medium">{current}</span>
          )}
        </div>
        <button onClick={next} className="p-1 rounded-lg hover:bg-accent transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ——— Static weekly data removed — now uses live studyLog via getWeeklyData() ———

// --- Module Grade Types ---
interface ModuleGrade {
  module: string;
  currentGrade: number;
  targetGrade: number;
}

interface AIInsight {
  module: string;
  gap: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  studyPlan: {
    hoursPerWeek: number;
    bestDays: string[];
    strategy: string;
  };
}

const GRADES_STORAGE_KEY = 'synccircle_module_grades';
const TARGET_GRADE = 85; // default target

function loadGrades(): ModuleGrade[] {
  try {
    const raw = localStorage.getItem(userKey(GRADES_STORAGE_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveGrades(grades: ModuleGrade[]): void {
  localStorage.setItem(userKey(GRADES_STORAGE_KEY), JSON.stringify(grades));
}

function generateAIInsights(grades: ModuleGrade[], studyLogData: DailyStudyEntry[]): AIInsight[] {
  // Analyze weekly study patterns to recommend optimal study schedule
  const liveWeeklyData = getWeeklyData(studyLogData);
  const totalWeeklyHours = liveWeeklyData.reduce((sum, d) => sum + d.thisWeek, 0);
  const avgDailyHours = totalWeeklyHours / 7;

  // Find low-effort days (good candidates for extra study)
  const sortedDays = [...liveWeeklyData].sort((a, b) => a.thisWeek - b.thisWeek);
  const lowDays = sortedDays.slice(0, 3).map(d => d.day);
  const highDays = sortedDays.slice(-2).map(d => d.day);

  // Calculate available capacity (assume max 10h/day is realistic)
  const availableExtra = liveWeeklyData.reduce((sum: number, d) => sum + Math.max(0, 10 - d.thisWeek), 0);

  return grades
    .filter(g => g.currentGrade < g.targetGrade)
    .sort((a, b) => (b.targetGrade - b.currentGrade) - (a.targetGrade - a.currentGrade))
    .map((g, idx) => {
      const gap = g.targetGrade - g.currentGrade;
      let suggestion: string;
      let priority: 'high' | 'medium' | 'low';
      let hoursPerWeek: number;
      let bestDays: string[];
      let strategy: string;

      if (gap >= 20) {
        priority = 'high';
        hoursPerWeek = Math.min(8, Math.ceil(gap / 3));
        bestDays = [...lowDays.slice(0, 2), highDays[0]];
        suggestion = `Critical gap of ${gap}%. You're averaging ${avgDailyHours.toFixed(1)}h/day — redistribute to prioritise this module.`;
        strategy = `Dedicate ${hoursPerWeek}h/week: focus sessions on ${bestDays.join(', ')}. Use active recall and spaced repetition. Attend consultations weekly.`;
      } else if (gap >= 10) {
        priority = 'medium';
        hoursPerWeek = Math.min(5, Math.ceil(gap / 4));
        bestDays = lowDays.slice(0, 2);
        suggestion = `Moderate gap of ${gap}%. Your lightest days (${lowDays.join(', ')}) have capacity for focused study blocks.`;
        strategy = `Add ${hoursPerWeek}h/week on ${bestDays.join(' & ')}. Practice problems + peer study group. Review weak topics from past papers.`;
      } else {
        priority = 'low';
        hoursPerWeek = Math.min(3, Math.ceil(gap / 5));
        bestDays = [lowDays[0]];
        suggestion = `Small gap of ${gap}%. Minimal extra effort needed — just ${hoursPerWeek}h/week of targeted revision.`;
        strategy = `${hoursPerWeek}h/week on ${bestDays[0]}. Focus on exam technique and past paper practice. You're almost there.`;
      }

      return { module: g.module, gap, suggestion, priority, studyPlan: { hoursPerWeek, bestDays, strategy } };
    });
}

function parseCSV(text: string): ModuleGrade[] {
  const lines = text.trim().split('\n');
  const grades: ModuleGrade[] = [];
  // Skip header if present
  const start = lines[0]?.toLowerCase().includes('module') ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const module = parts[0];
      const currentGrade = parseFloat(parts[1]);
      const targetGrade = parts.length >= 3 ? parseFloat(parts[2]) : TARGET_GRADE;
      if (module && !isNaN(currentGrade)) {
        grades.push({ module, currentGrade, targetGrade: isNaN(targetGrade) ? TARGET_GRADE : targetGrade });
      }
    }
  }
  return grades;
}

function parseJSON(text: string): ModuleGrade[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data.grades || data.modules || [];
  return arr
    .map((item: any) => ({
      module: item.module || item.subject || item.name || '',
      currentGrade: parseFloat(item.currentGrade ?? item.grade ?? item.score ?? 0),
      targetGrade: parseFloat(item.targetGrade ?? item.target ?? TARGET_GRADE),
    }))
    .filter((g: ModuleGrade) => g.module && !isNaN(g.currentGrade));
}
// radarData will be computed live from real metrics in the component
const POMODORO_STORAGE_KEY = 'synccircle_pomodoro_stats';
const STUDY_LOG_KEY = 'synccircle_study_log';

function getUserId(): string {
  try {
    const raw = localStorage.getItem('synccircle_user');
    if (raw) {
      const user = JSON.parse(raw);
      return user.id || 'default';
    }
  } catch {}
  // Fallback: check if dev bypass has a userId
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
  date: string; // YYYY-MM-DD
  minutes: number;
}

function loadPomodoroStats(): PomodoroStats {
  try {
    const raw = localStorage.getItem(userKey(POMODORO_STORAGE_KEY));
    return raw ? JSON.parse(raw) : { totalSessions: 0, totalMinutes: 0, todaySessions: 0, lastSessionDate: '' };
  } catch { return { totalSessions: 0, totalMinutes: 0, todaySessions: 0, lastSessionDate: '' }; }
}

function savePomodoroStats(stats: PomodoroStats): void {
  localStorage.setItem(userKey(POMODORO_STORAGE_KEY), JSON.stringify(stats));
}

function loadStudyLog(): DailyStudyEntry[] {
  try {
    const raw = localStorage.getItem(userKey(STUDY_LOG_KEY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveStudyLog(log: DailyStudyEntry[]): void {
  localStorage.setItem(userKey(STUDY_LOG_KEY), JSON.stringify(log));
}

function addStudyMinutes(minutes: number): DailyStudyEntry[] {
  const log = loadStudyLog();
  const today = new Date().toISOString().slice(0, 10);
  const existing = log.find(e => e.date === today);
  if (existing) {
    existing.minutes += minutes;
  } else {
    log.push({ date: today, minutes });
  }
  // Keep last 30 days max
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const filtered = log.filter(e => e.date >= cutoff.toISOString().slice(0, 10));
  saveStudyLog(filtered);
  return filtered;
}

function getWeeklyData(log: DailyStudyEntry[]): { day: string; thisWeek: number; lastWeek: number }[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0

  return days.map((day, i) => {
    // This week
    const thisWeekDate = new Date(today);
    thisWeekDate.setDate(today.getDate() - dayOfWeek + i);
    const thisWeekStr = thisWeekDate.toISOString().slice(0, 10);
    const thisWeekEntry = log.find(e => e.date === thisWeekStr);

    // Last week
    const lastWeekDate = new Date(thisWeekDate);
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeekStr = lastWeekDate.toISOString().slice(0, 10);
    const lastWeekEntry = log.find(e => e.date === lastWeekStr);

    return {
      day,
      thisWeek: thisWeekEntry ? +(thisWeekEntry.minutes / 60).toFixed(1) : 0,
      lastWeek: lastWeekEntry ? +(lastWeekEntry.minutes / 60).toFixed(1) : 0,
    };
  });
}

// --- Student Profile ---
const STUDENT_PROFILE_KEY = 'synccircle_student_profile';

type AcademicLevel = 'secondary' | 'jc' | 'polytechnic' | 'undergraduate' | 'postgraduate';
type LearningArchetype = 'methodical' | 'intensive' | 'balanced' | 'distributed' | 'adaptive';

interface StudentProfile {
  academicLevel: AcademicLevel;
  archetype: LearningArchetype;
  sleepStart: string; // "HH:mm" e.g. "23:00"
  sleepEnd: string;   // "HH:mm" e.g. "07:00"
}

const ACADEMIC_LEVELS: Record<AcademicLevel, string> = {
  secondary: 'Secondary School',
  jc: 'Junior College / IB',
  polytechnic: 'Polytechnic / Diploma',
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
};

const LEARNING_ARCHETYPES: Record<LearningArchetype, { label: string; description: string }> = {
  methodical: { label: 'Methodical Learner', description: 'Prefers structured, step-by-step study with clear schedules' },
  intensive: { label: 'Intensive Learner', description: 'Thrives in deep, focused study marathons with fewer but longer sessions' },
  balanced: { label: 'Balanced Learner', description: 'Maintains steady pace with equal time for study and rest' },
  distributed: { label: 'Distributed Learner', description: 'Learns best with frequent short sessions spread across the day' },
  adaptive: { label: 'Adaptive Learner', description: 'Flexes between styles based on energy levels and deadlines' },
};

function loadStudentProfile(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(userKey(STUDENT_PROFILE_KEY));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveStudentProfile(profile: StudentProfile): void {
  localStorage.setItem(userKey(STUDENT_PROFILE_KEY), JSON.stringify(profile));
}

const achievements = [
  { id: 1, title: "Study Streak Master", description: "Maintain 10+ day streak", icon: Flame, color: "#f4b8d0", goal: 10, type: 'streak' as const },
  { id: 2, title: "First Focus", description: "Complete 1 pomodoro session", icon: Target, color: "#d4e8f4", goal: 1, type: 'pomodoro' as const },
  { id: 3, title: "Deep Work", description: "Complete 10 pomodoro sessions", icon: Clock, color: "#b8a4d4", goal: 10, type: 'pomodoro' as const },
  { id: 4, title: "Focus Machine", description: "Complete 50 pomodoro sessions", icon: Trophy, color: "#d4f4e8", goal: 50, type: 'pomodoro' as const },
  { id: 5, title: "Century Club", description: "100+ total focus minutes", icon: Award, color: "#ffd4c8", goal: 100, type: 'minutes' as const },
  { id: 6, title: "Marathon Mind", description: "500+ total focus minutes", icon: Star, color: "#fef4d4", goal: 500, type: 'minutes' as const },
];
// favoriteModules and recentActivity are now computed live in the component

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
}

export function Profile() {
  const navigate = useNavigate();
  const [selectedColor, setSelectedColor] = useState(getCharColor());
  const [characterState, setCharacterState] = useState<CharacterState>("idle");

  // Persist character color (no longer need full charConfig save)
  useEffect(() => {
    // Color is saved via setCharColor() in the onClick handler directly
  }, []);

  // Pomodoro timer state — re-read from localStorage on mount (handles navigation from Dashboard)
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats>(loadPomodoroStats);
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25); // customizable: 15/25/30/45/60
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'break'>('focus');
  const pomodoroRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [studyLog, setStudyLog] = useState<DailyStudyEntry[]>(loadStudyLog);

  // Re-sync stats from localStorage when page is focused (e.g. after using Dashboard timer)
  useEffect(() => {
    const handleFocus = () => {
      setPomodoroStats(loadPomodoroStats());
      setStudyLog(loadStudyLog());
    };
    window.addEventListener('focus', handleFocus);
    // Also re-read on mount
    handleFocus();
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Student profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(loadStudentProfile);
  const [profileForm, setProfileForm] = useState<StudentProfile>(
    studentProfile || { academicLevel: 'undergraduate', archetype: 'balanced', sleepStart: '23:00', sleepEnd: '07:00' }
  );

  // Module grades state
  const [moduleGrades, setModuleGrades] = useState<ModuleGrade[]>(loadGrades);
  const [gradesExpanded, setGradesExpanded] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user profile info from localStorage
  const user = useMemo(() => getUser(), []);
  const settings = useMemo(() => getSettings(), []);
  const tasks = useMemo(() => getTasks(), []);
  const friends = useMemo(() => getFriends(), []);
  const notes = useMemo(() => getNotes(), []);

  const displayName = user?.displayName || settings.profile.displayName || "Student";
  const course = user?.course || settings.profile.course || "Your Course";
  const avatar = user?.avatar || settings.profile.avatar || "";

  // Profile stats from localStorage
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const friendsCount = friends.length;
  const notesCount = notes.length;

  // Calculate task completion streak (consecutive days with at least 1 task completed)
  const streak = useMemo(() => {
    const completedDates = new Set(
      tasks
        .filter(t => t.completed && t.completedAt)
        .map(t => t.completedAt!.slice(0, 10)) // "YYYY-MM-DD"
    );
    if (completedDates.size === 0) return 0;

    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (completedDates.has(dateStr)) {
        count++;
      } else if (i > 0) {
        // Allow today to not have a completion yet (streak counts from yesterday back)
        break;
      }
    }
    return count;
  }, [tasks]);

  const evolution = useMemo(() => getEvolutionFromMinutes(pomodoroStats.totalMinutes), [pomodoroStats.totalMinutes]);

  // Compute radar data from real metrics
  const radarData = useMemo(() => {
    const focusScore = Math.min(100, Math.round((pomodoroStats.totalMinutes / 10) * 10) / 10); // 1000 min = 100
    const consistencyScore = Math.min(100, streak * 10); // 10-day streak = 100
    const collaborationScore = Math.min(100, friendsCount * 20); // 5 friends = 100
    const notesScore = Math.min(100, notesCount * 15); // ~7 notes = 100
    const tasksScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return [
      { category: "Focus", value: Math.max(5, focusScore) },
      { category: "Consistency", value: Math.max(5, consistencyScore) },
      { category: "Collaboration", value: Math.max(5, collaborationScore) },
      { category: "Notes", value: Math.max(5, notesScore) },
      { category: "Task Completion", value: Math.max(5, tasksScore) },
    ];
  }, [pomodoroStats.totalMinutes, streak, friendsCount, notesCount, completedTasks, totalTasks]);

  // Compute favorite modules from timetable classes
  const classes = useMemo(() => getClasses(), []);
  const favoriteModules = useMemo(() => {
    const moduleColors = ['#f4b8d0', '#b8a4d4', '#d4e8f4', '#d4f4e8', '#fef4d4'];
    return classes.slice(0, 5).map((cls, i) => ({
      name: cls.title,
      color: cls.color || moduleColors[i % moduleColors.length],
      progress: Math.round(50 + Math.random() * 40), // derive from study time later
      grade: '-',
    }));
  }, [classes]);

  // Compute recent activity from real data (tasks completed, notes created)
  const recentActivity = useMemo(() => {
    const activities: { id: number; type: string; action: string; detail: string; time: string; color: string }[] = [];
    let id = 1;

    // Recent task completions
    tasks
      .filter(t => t.completed && t.completedAt)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
      .slice(0, 3)
      .forEach(t => {
        const ago = getTimeAgo(t.completedAt!);
        activities.push({ id: id++, type: 'task', action: 'Completed task', detail: t.title, time: ago, color: '#d4f4e8' });
      });

    // Recent notes
    const sortedNotes = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 2);
    sortedNotes.forEach(n => {
      const ago = getTimeAgo(n.updatedAt);
      activities.push({ id: id++, type: 'note', action: 'Updated note', detail: n.title, time: ago, color: '#f4b8d0' });
    });

    // Pomodoro session
    if (pomodoroStats.totalSessions > 0) {
      activities.push({ id: id++, type: 'session', action: 'Focus session', detail: `${pomodoroStats.totalSessions} total sessions completed`, time: pomodoroStats.lastSessionDate ? getTimeAgo(pomodoroStats.lastSessionDate + 'T12:00:00') : 'Recently', color: '#b8a4d4' });
    }

    return activities.length > 0 ? activities.slice(0, 4) : [
      { id: 1, type: 'info', action: 'Get started', detail: 'Complete a focus session or task to see activity here', time: 'Now', color: '#d4e8f4' },
    ];
  }, [tasks, notes, pomodoroStats]);

  // Check if any task was completed in the last hour to trigger celebration
  useEffect(() => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentlyCompleted = tasks.some(
      (t) => t.completed && t.completedAt && new Date(t.completedAt).getTime() > oneHourAgo
    );
    if (recentlyCompleted) {
      setCharacterState("celebration");
    }
  }, [tasks]);

  const handleCelebrationComplete = () => {
    setCharacterState("idle");
  };

  // Pomodoro timer effect
  useEffect(() => {
    if (pomodoroActive && pomodoroSeconds > 0) {
      pomodoroRef.current = setInterval(() => {
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            // Timer complete
            clearInterval(pomodoroRef.current!);
            setPomodoroActive(false);

            if (pomodoroMode === 'focus') {
              // Focus session complete — update stats
              const today = new Date().toISOString().slice(0, 10);
              const updated: PomodoroStats = {
                totalSessions: pomodoroStats.totalSessions + 1,
                totalMinutes: pomodoroStats.totalMinutes + focusDuration,
                todaySessions: pomodoroStats.lastSessionDate === today
                  ? pomodoroStats.todaySessions + 1
                  : 1,
                lastSessionDate: today,
              };
              setPomodoroStats(updated);
              savePomodoroStats(updated);
              // Log study minutes
              const updatedLog = addStudyMinutes(focusDuration);
              setStudyLog(updatedLog);
              setCharacterState("celebration");
              // Switch to break
              setPomodoroMode('break');
              return 5 * 60; // 5 min break
            } else {
              // Break complete — back to focus
              setPomodoroMode('focus');
              return focusDuration * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (pomodoroRef.current) clearInterval(pomodoroRef.current);
    };
  }, [pomodoroActive, pomodoroMode]);

  const startPomodoro = () => {
    setPomodoroActive(true);
    setCharacterState("studying");
  };

  const pausePomodoro = () => {
    setPomodoroActive(false);
    setCharacterState("idle");
  };

  const resetPomodoro = () => {
    setPomodoroActive(false);
    setPomodoroMode('focus');
    setPomodoroSeconds(focusDuration * 60);
    setCharacterState("idle");
  };

  // Check which achievements are unlocked based on stats
  const isAchievementUnlocked = (achievement: typeof achievements[0]) => {
    switch (achievement.type) {
      case 'streak': return streak >= achievement.goal;
      case 'pomodoro': return pomodoroStats.totalSessions >= achievement.goal;
      case 'minutes': return pomodoroStats.totalMinutes >= achievement.goal;
      default: return false;
    }
  };

  const getAchievementProgress = (achievement: typeof achievements[0]) => {
    switch (achievement.type) {
      case 'streak': return Math.min(1, streak / achievement.goal);
      case 'pomodoro': return Math.min(1, pomodoroStats.totalSessions / achievement.goal);
      case 'minutes': return Math.min(1, pomodoroStats.totalMinutes / achievement.goal);
      default: return 0;
    }
  };

  // --- Grade upload handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        let grades: ModuleGrade[];
        if (file.name.endsWith('.json')) {
          grades = parseJSON(text);
        } else {
          grades = parseCSV(text);
        }
        if (grades.length > 0) {
          setModuleGrades(grades);
          saveGrades(grades);
          setAiInsights([]);
          setGradesExpanded(true);
        }
      } catch (err) {
        console.error('Failed to parse grades file:', err);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-uploaded
    e.target.value = '';
  };

  const handleAnalyzeGrades = () => {
    setIsAnalyzing(true);
    // Simulate AI processing delay
    setTimeout(() => {
      const insights = generateAIInsights(moduleGrades, studyLog);
      setAiInsights(insights);
      setIsAnalyzing(false);
    }, 1500);
  };

  const handleSaveProfile = () => {
    setStudentProfile(profileForm);
    saveStudentProfile(profileForm);
    setShowProfileModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary rounded-3xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-6">
            {/* Character avatar preview */}
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 overflow-hidden">
              <ProfileCharacter state="idle" level={evolution.level} size="sm" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
              <p className="text-lg opacity-90 mb-3">{course}</p>
              {studentProfile && (
                <p className="text-sm opacity-75 mb-3">
                  {ACADEMIC_LEVELS[studentProfile.academicLevel]} · {LEARNING_ARCHETYPES[studentProfile.archetype].label}
                </p>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <Flame className="w-5 h-5" />
                  <span className="font-semibold">{streak} Day Streak</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <Trophy className="w-5 h-5" />
                  <span className="font-semibold">{completedTasks} Tasks Done</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-all"
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-all"
            >
              <Edit className="w-4 h-4" />
              {studentProfile ? 'Edit Profile' : 'Set Up Profile'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Student Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border p-8 w-full max-w-lg space-y-6 shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div>
                <h2 className="text-2xl font-bold">Student Profile</h2>
                <p className="text-sm text-muted-foreground mt-1">Help SyncCircle personalise your study experience</p>
              </div>

              {/* Academic Level */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Academic Level</label>
                <select
                  value={profileForm.academicLevel}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, academicLevel: e.target.value as AcademicLevel }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  {(Object.entries(ACADEMIC_LEVELS) as [AcademicLevel, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Learning Archetype */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">Learning Style</label>
                <div className="space-y-2">
                  {(Object.entries(LEARNING_ARCHETYPES) as [LearningArchetype, { label: string; description: string }][]).map(([key, { label, description }]) => (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        profileForm.archetype === key
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="archetype"
                        value={key}
                        checked={profileForm.archetype === key}
                        onChange={() => setProfileForm(prev => ({ ...prev, archetype: key }))}
                        className="mt-1 accent-primary"
                      />
                      <div>
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sleep Schedule */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">Sleep Schedule</label>
                <p className="text-xs text-muted-foreground">SyncCircle will avoid scheduling study reminders during these hours</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Bedtime</label>
                    <input
                      type="time"
                      value={profileForm.sleepStart}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, sleepStart: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Wake up</label>
                    <input
                      type="time"
                      value={profileForm.sleepEnd}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, sleepEnd: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:shadow-lg transition-all"
                >
                  Save Profile
                </button>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-accent hover:bg-accent/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Character & Stats Section */}
      <div className="grid grid-cols-[360px_1fr] gap-6">
        {/* Animated Profile Character + Pomodoro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#b8a4d4]/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#b8a4d4]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Study Buddy</h2>
              <p className="text-xs text-muted-foreground">{evolution.title}</p>
            </div>
          </div>

          <div className="w-52 h-52 rounded-2xl bg-gradient-to-br from-[#f0e6f6] to-[#d4e8f4] flex items-center justify-center border-2 border-border">
            <ProfileCharacter
              state={characterState}
              level={evolution.level}
              onCelebrationComplete={handleCelebrationComplete}
            />
          </div>

          {/* Evolution progress */}
          <div className="w-full space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">📚 {pomodoroStats.totalMinutes} min studied</span>
              {evolution.nextLevelAt && (
                <span className="text-muted-foreground">
                  Next: {EVOLUTION_LEVELS[(evolution.level + 1) as EvolutionLevel].title} ({evolution.nextLevelAt - pomodoroStats.totalMinutes} min)
                </span>
              )}
              {!evolution.nextLevelAt && (
                <span className="text-amber-500 font-medium">Max level! 👑</span>
              )}
            </div>
            <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: evolution.level === 4 ? '#ffd700' : evolution.level === 3 ? '#b388ff' : evolution.level === 2 ? '#60a5fa' : '#e0e0e0',
                }}
                initial={{ width: 0 }}
                animate={{
                  width: evolution.nextLevelAt
                    ? `${(pomodoroStats.totalMinutes / evolution.nextLevelAt) * 100}%`
                    : '100%',
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {([1, 2, 3, 4] as EvolutionLevel[]).map(lvl => (
                <span key={lvl} className={evolution.level >= lvl ? 'font-semibold text-foreground' : ''}>
                  {EVOLUTION_LEVELS[lvl].title}
                </span>
              ))}
            </div>
          </div>

          {/* Character Color Customizer */}
          <div className="w-full space-y-3 mt-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Customize Your Buddy</h3>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Pick a color</span>
              <div className="flex flex-wrap gap-2">
                {CHARACTER_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => { setCharColor(color); setSelectedColor(color); }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color ? 'border-primary scale-110 shadow-md' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Character color ${color}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Your buddy grows as you study: Baby → Kid → Teen → Scholar
            </p>
          </div>
        </motion.div>

        {/* Study Hours Tracker - right side of grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-card rounded-2xl border border-border p-6 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#b8a4d4]/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#b8a4d4]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Study Hours</h2>
                <p className="text-sm text-muted-foreground">This week vs last week</p>
              </div>
            </div>
          </div>

          <div className="flex gap-6 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {(() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const entry = studyLog.find(e => e.date === today);
                  return entry ? (entry.minutes / 60).toFixed(1) : '0';
                })()}h
              </p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#b8a4d4]">
                {(() => {
                  const weekData = getWeeklyData(studyLog);
                  return weekData.reduce((s, d) => s + d.thisWeek, 0).toFixed(1);
                })()}h
              </p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {(() => {
                  const weekData = getWeeklyData(studyLog);
                  return weekData.reduce((s, d) => s + d.lastWeek, 0).toFixed(1);
                })()}h
              </p>
              <p className="text-xs text-muted-foreground">Last Week</p>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getWeeklyData(studyLog)}>
                <defs>
                  <linearGradient id="colorThisWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b8a4d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#b8a4d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLastWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.2} />
                <XAxis dataKey="day" stroke="#9088a0" />
                <YAxis stroke="#9088a0" unit="h" />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "12px" }}
                  formatter={(value: number, name: string) => [`${value}h`, name === 'thisWeek' ? 'This Week' : 'Last Week']}
                />
                <Legend formatter={(value) => value === 'thisWeek' ? 'This Week' : 'Last Week'} />
                <Area type="monotone" dataKey="lastWeek" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorLastWeek)" />
                <Area type="monotone" dataKey="thisWeek" stroke="#b8a4d4" strokeWidth={3} fill="url(#colorThisWeek)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {studyLog.length === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Complete pomodoro sessions to start tracking your study hours here.
            </p>
          )}
        </motion.div>
      </div>

      {/* Module Performance — Full Width */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#d4e8f4]/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-[#d4e8f4]" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Module Performance</h2>
                <p className="text-sm text-muted-foreground">
                  {moduleGrades.length > 0 ? `${moduleGrades.length} modules loaded` : 'Upload your grades'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-accent hover:bg-accent/80 transition-all"
              >
                <Upload className="w-4 h-4" />
                Upload Grades
              </button>
              {moduleGrades.length > 0 && (
                <button
                  onClick={() => setGradesExpanded(!gradesExpanded)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium bg-accent hover:bg-accent/80 transition-all"
                >
                  {gradesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {gradesExpanded ? 'Collapse' : 'Expand'}
                </button>
              )}
            </div>
          </div>

          {moduleGrades.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={moduleGrades.map(g => ({ subject: g.module.length > 12 ? g.module.slice(0, 12) + '…' : g.module, current: g.currentGrade, target: g.targetGrade }))} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.3} />
                <XAxis dataKey="subject" stroke="#9088a0" angle={-35} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11 }} />
                <YAxis stroke="#9088a0" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0", borderRadius: "12px" }} />
                <Legend />
                <Bar dataKey="current" name="Current" fill="#d4e8f4" radius={[8, 8, 0, 0]} />
                <Bar dataKey="target" name="Target" fill="#b8a4d4" radius={[8, 8, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Upload className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Upload a .csv or .json file with your grades</p>
              <p className="text-xs mt-1 opacity-70">CSV: module,currentGrade,targetGrade</p>
              <p className="text-xs opacity-70">JSON: [{"{"} module, currentGrade, targetGrade {"}"}]</p>
            </div>
          )}

          {/* Expanded detail view */}
          <AnimatePresence>
            {gradesExpanded && moduleGrades.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-6 border-t border-border pt-6 space-y-4">
                  {/* Grade table */}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-accent/50">
                          <th className="text-left px-4 py-3 font-medium">Module</th>
                          <th className="text-center px-4 py-3 font-medium">Current</th>
                          <th className="text-center px-4 py-3 font-medium">Target</th>
                          <th className="text-center px-4 py-3 font-medium">Gap</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleGrades.map((g, i) => {
                          const gap = g.targetGrade - g.currentGrade;
                          const onTrack = gap <= 0;
                          return (
                            <tr key={i} className="border-t border-border">
                              <td className="px-4 py-3 font-medium">{g.module}</td>
                              <td className="text-center px-4 py-3">{g.currentGrade}%</td>
                              <td className="text-center px-4 py-3">{g.targetGrade}%</td>
                              <td className="text-center px-4 py-3">
                                <span className={onTrack ? 'text-green-600' : 'text-amber-600'}>
                                  {onTrack ? '✓ On track' : `−${gap}%`}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="w-full bg-accent rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full transition-all"
                                    style={{
                                      width: `${Math.min(100, (g.currentGrade / g.targetGrade) * 100)}%`,
                                      backgroundColor: onTrack ? '#4ade80' : gap > 15 ? '#f87171' : '#fbbf24',
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* AI Analysis button */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleAnalyzeGrades}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {isAnalyzing ? 'Analyzing...' : 'AI Improvement Plan'}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      AI will suggest what to focus on based on your grade gaps
                    </p>
                  </div>

                  {/* AI Insights with Study Plan */}
                  {aiInsights.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          AI Study Plan & Recommendations
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Based on your weekly study pattern ({getWeeklyData(studyLog).reduce((s: number, d) => s + d.thisWeek, 0).toFixed(1)}h total)
                        </p>
                      </div>

                      {/* Weekly hours summary */}
                      <div className="p-4 rounded-xl bg-accent/30 border border-border">
                        <p className="text-sm font-medium mb-2">📊 Your Weekly Study Pattern</p>
                        <div className="flex gap-2">
                          {getWeeklyData(studyLog).map(d => (
                            <div key={d.day} className="flex-1 text-center">
                              <div className="relative h-16 flex items-end justify-center mb-1">
                                <div
                                  className="w-full rounded-t-md bg-primary/30"
                                  style={{ height: `${(d.thisWeek / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{d.day}</span>
                              <p className="text-xs font-medium">{d.thisWeek}h</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Per-module study plans */}
                      {aiInsights.map((insight, i) => (
                        <motion.div
                          key={insight.module}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`p-4 rounded-xl border-l-4 ${
                            insight.priority === 'high'
                              ? 'border-l-red-400 bg-red-500/10'
                              : insight.priority === 'medium'
                              ? 'border-l-amber-400 bg-amber-500/10'
                              : 'border-l-green-400 bg-green-500/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{insight.module}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              insight.priority === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                : insight.priority === 'medium'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            }`}>
                              {insight.priority} priority
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80 mb-3">{insight.suggestion}</p>

                          {/* Study Plan Card */}
                          <div className="p-3 rounded-lg bg-card border border-border space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📅 Recommended Study Plan</p>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Hours/week</p>
                                <p className="font-semibold">{insight.studyPlan.hoursPerWeek}h</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Best days</p>
                                <p className="font-semibold">{insight.studyPlan.bestDays.join(', ')}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Gap to close</p>
                                <p className="font-semibold">{insight.gap}%</p>
                              </div>
                            </div>
                            <p className="text-sm text-foreground/70">{insight.studyPlan.strategy}</p>
                          </div>
                        </motion.div>
                      ))}

                      {/* Total recommended hours summary */}
                      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">📝 Total Recommended Extra Study</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Add {aiInsights.reduce((s, i) => s + i.studyPlan.hoursPerWeek, 0)}h/week across {aiInsights.length} modules to reach your targets
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              {aiInsights.reduce((s, i) => s + i.studyPlan.hoursPerWeek, 0)}h
                            </p>
                            <p className="text-xs text-muted-foreground">per week</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      {/* Achievements & Radar */}
      <div className="grid grid-cols-[1fr_400px] gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#f4b8d0]/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#f4b8d0]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Achievements</h2>
              <p className="text-sm text-muted-foreground">{achievements.filter(a => isAchievementUnlocked(a)).length} of {achievements.length} unlocked</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {achievements.map((achievement, index) => {
              const unlocked = isAchievementUnlocked(achievement);
              const progress = getAchievementProgress(achievement);
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${unlocked ? "border-transparent hover:shadow-lg" : "border-dashed border-border opacity-50"}`}
                  style={unlocked ? { background: `linear-gradient(135deg, ${achievement.color}20 0%, transparent 100%)` } : {}}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${unlocked ? "" : "opacity-40"}`}
                    style={{ backgroundColor: `${achievement.color}30` }}
                  >
                    <achievement.icon className="w-6 h-6" style={{ color: achievement.color }} />
                  </div>
                  <h4 className="font-semibold mb-1 text-sm">{achievement.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progress * 100}%`,
                        backgroundColor: unlocked ? achievement.color : '#9ca3af',
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#d4f4e8]/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-[#d4f4e8]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Study Profile</h2>
              <p className="text-sm text-muted-foreground">Your strengths</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e0e0e0" />
              <PolarAngleAxis dataKey="category" stroke="#9088a0" />
              <Radar name="Score" dataKey="value" stroke="#b8a4d4" fill="#b8a4d4" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Favorite Modules & Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#b8a4d4]/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-[#b8a4d4]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Favourite Modules</h2>
              <p className="text-sm text-muted-foreground">Your top courses</p>
            </div>
          </div>
          <div className="space-y-4">
            {favoriteModules.map((module, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{module.name}</h4>
                  <span className="px-3 py-1 rounded-lg text-sm" style={{ backgroundColor: `${module.color}20`, color: module.color }}>
                    {module.grade}
                  </span>
                </div>
                <div className="relative h-3 bg-accent rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${module.progress}%` }}
                    transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ backgroundColor: module.color }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{module.progress}% complete</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d4e8f4]/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#d4e8f4]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">What you&apos;ve been up to</p>
            </div>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${activity.color}30` }}>
                  {activity.type === "note" && <BookOpen className="w-5 h-5" style={{ color: activity.color }} />}
                  {activity.type === "session" && <Calendar className="w-5 h-5" style={{ color: activity.color }} />}
                  {activity.type === "achievement" && <Trophy className="w-5 h-5" style={{ color: activity.color }} />}
                  {activity.type === "friend" && <User className="w-5 h-5" style={{ color: activity.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activity.action}</p>
                  <p className="text-sm text-muted-foreground truncate">{activity.detail}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
