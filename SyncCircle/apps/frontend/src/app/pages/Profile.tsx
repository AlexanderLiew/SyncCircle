import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
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
  Edit,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Users,
  StickyNote,
  Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { ProfileCharacter, type CharacterState } from "../components/ProfileCharacter";
import { getUser, getSettings, getTasks, getFriends, getNotes } from "../lib/storage";

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
      <ellipse cx="60" cy="52" rx="34" ry="20" fill={hair} />
    ),
    bob: (
      <path d="M26 70 Q26 38 60 36 Q94 38 94 70 Q94 82 84 86 Q60 92 36 86 Q26 82 26 70Z" fill={hair} />
    ),
    long: (
      <>
        <ellipse cx="60" cy="50" rx="34" ry="22" fill={hair} />
        <rect x="26" y="66" width="10" height="48" rx="5" fill={hair} />
        <rect x="84" y="66" width="10" height="48" rx="5" fill={hair} />
      </>
    ),
    ponytail: (
      <>
        <ellipse cx="60" cy="50" rx="34" ry="22" fill={hair} />
        <ellipse cx="95" cy="58" rx="7" ry="22" fill={hair} />
        <circle cx="88" cy="58" r="5" fill={hair} />
      </>
    ),
    bun: (
      <>
        <ellipse cx="60" cy="54" rx="34" ry="20" fill={hair} />
        <circle cx="60" cy="32" r="15" fill={hair} />
      </>
    ),
    curly: (
      <>
        <ellipse cx="60" cy="50" rx="34" ry="22" fill={hair} />
        {[0, 1, 2, 3, 4].map(i => (
          <circle key={i} cx={28 + i * 16} cy={44} r="10" fill={hair} />
        ))}
        <circle cx="24" cy="60" r="8" fill={hair} />
        <circle cx="96" cy="60" r="8" fill={hair} />
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
      {/* Body */}
      <ellipse cx="60" cy="145" rx="32" ry="36" fill={outfit} />
      {/* Outfit details */}
      <ellipse cx="60" cy="115" rx="20" ry="14" fill={outfit} opacity="0.85" />
      <rect x="44" y="112" width="32" height="8" rx="4" fill="white" opacity="0.3" />

      {/* Neck */}
      <rect x="52" y="106" width="16" height="12" rx="4" fill={skin} />

      {/* Head */}
      <circle cx="60" cy="72" r="36" fill={skin} />

      {/* Hair base */}
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

// ——— Static data ———
const weeklyData = [
  { day: "Mon", hours: 4.5 }, { day: "Tue", hours: 6.2 }, { day: "Wed", hours: 5.8 },
  { day: "Thu", hours: 7.1 }, { day: "Fri", hours: 6.5 }, { day: "Sat", hours: 8.2 }, { day: "Sun", hours: 5.9 },
];
const modulePerformance = [
  { subject: "ML", score: 92 }, { subject: "DS", score: 88 },
  { subject: "Calc", score: 85 }, { subject: "DB", score: 90 }, { subject: "Physics", score: 82 },
];
const radarData = [
  { category: "Focus", value: 85 }, { category: "Consistency", value: 92 },
  { category: "Collaboration", value: 88 }, { category: "Notes Quality", value: 90 }, { category: "Attendance", value: 95 },
];
const achievements = [
  { id: 1, title: "Study Streak Master", description: "Maintain 10+ day streak", icon: Flame, color: "#f4b8d0", unlocked: true },
  { id: 2, title: "Top Contributor", description: "Share 50+ notes", icon: BookOpen, color: "#d4f4e8", unlocked: true },
  { id: 3, title: "Team Player", description: "Join 20+ study sessions", icon: Trophy, color: "#b8a4d4", unlocked: true },
  { id: 4, title: "Early Bird", description: "Study before 8 AM 5 times", icon: Target, color: "#d4e8f4", unlocked: true },
  { id: 5, title: "Night Owl", description: "Study past midnight 10 times", icon: Star, color: "#fef4d4", unlocked: false },
  { id: 6, title: "Century Club", description: "100+ total study hours", icon: Award, color: "#ffd4c8", unlocked: false },
];
const favoriteModules = [
  { name: "Machine Learning", color: "#f4b8d0", progress: 75, grade: "A-" },
  { name: "Data Structures", color: "#b8a4d4", progress: 82, grade: "A" },
  { name: "Calculus II", color: "#d4e8f4", progress: 68, grade: "B+" },
];
const recentActivity = [
  { id: 1, type: "note", action: "Shared notes", detail: "Neural Networks - Week 5", time: "2 hours ago", color: "#f4b8d0" },
  { id: 2, type: "session", action: "Attended study session", detail: "Algorithms Review", time: "1 day ago", color: "#b8a4d4" },
  { id: 3, type: "achievement", action: "Unlocked achievement", detail: "Team Player", time: "2 days ago", color: "#d4f4e8" },
  { id: 4, type: "friend", action: "New study buddy", detail: "Connected with Liam Johnson", time: "3 days ago", color: "#d4e8f4" },
];

export function Profile() {
  const [charConfig, setCharConfig] = useState<CharConfig>({
    skinIdx: 0,
    hairColorIdx: 0,
    hairStyle: "bob",
    outfitIdx: 0,
    accessory: "none",
  });
  const [characterState, setCharacterState] = useState<CharacterState>("idle");

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

  const toggleStudyMode = () => {
    setCharacterState((prev) => (prev === "studying" ? "idle" : "studying"));
  };

  const triggerCelebration = () => {
    setCharacterState("celebration");
  };

  const set = (field: keyof CharConfig) => (v: any) => setCharConfig(prev => ({ ...prev, [field]: v }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#b8a4d4] to-[#f4b8d0] rounded-3xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-6">
            {/* Character avatar preview */}
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 overflow-hidden">
              {avatar ? (
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <svg viewBox="0 0 120 180" width="70" height="70" className="mt-6">
                  <ellipse cx="60" cy="145" rx="32" ry="36" fill={OUTFIT_COLORS[charConfig.outfitIdx]} />
                  <rect x="52" y="106" width="16" height="12" rx="4" fill={SKIN_TONES[charConfig.skinIdx]} />
                  <circle cx="60" cy="72" r="36" fill={SKIN_TONES[charConfig.skinIdx]} />
                  <ellipse cx="60" cy="54" rx="34" ry="20" fill={HAIR_COLORS[charConfig.hairColorIdx]} />
                  <circle cx="48" cy="74" r="5" fill="#2C1810" />
                  <circle cx="72" cy="74" r="5" fill="#2C1810" />
                  <circle cx="50" cy="72" r="2" fill="white" />
                  <circle cx="74" cy="72" r="2" fill="white" />
                  <circle cx="40" cy="82" r="6" fill="#f4b8d0" opacity="0.5" />
                  <circle cx="80" cy="82" r="6" fill="#f4b8d0" opacity="0.5" />
                  <path d="M52 88 Q60 96 68 88" fill="none" stroke="#c07090" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
              <p className="text-lg opacity-90 mb-3">{course}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <Flame className="w-5 h-5" />
                  <span className="font-semibold">12 Day Streak</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm">
                  <Trophy className="w-5 h-5" />
                  <span className="font-semibold">{completedTasks} Tasks Done</span>
                </div>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm transition-all">
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </motion.div>

      {/* Profile Character & Stats Section */}
      <div className="grid grid-cols-[auto_1fr] gap-6">
        {/* Animated Profile Character */}
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
              <p className="text-xs text-muted-foreground">Your animated companion</p>
            </div>
          </div>

          <div className="w-52 h-52 rounded-2xl bg-gradient-to-br from-[#f0e6f6] to-[#d4e8f4] flex items-center justify-center border-2 border-border">
            <ProfileCharacter
              state={characterState}
              onCelebrationComplete={handleCelebrationComplete}
            />
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={toggleStudyMode}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                characterState === "studying"
                  ? "bg-[#b8a4d4] text-white shadow-md"
                  : "bg-accent hover:bg-accent/80"
              }`}
            >
              {characterState === "studying" ? "📖 Studying..." : "📚 Study Mode"}
            </button>
            <button
              onClick={triggerCelebration}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-accent hover:bg-accent/80 transition-all"
            >
              🎉 Celebrate
            </button>
          </div>
        </motion.div>

        {/* Quick Stats from localStorage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 grid-rows-2 gap-4"
        >
          <div
            className="bg-card rounded-2xl p-5 border border-border"
            style={{ background: "linear-gradient(135deg, #b8a4d415 0%, transparent 100%)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "#b8a4d430" }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: "#b8a4d4" }} />
            </div>
            <p className="text-2xl font-bold mb-1">{completedTasks}/{totalTasks}</p>
            <p className="text-sm text-muted-foreground">Tasks Completed</p>
          </div>
          <div
            className="bg-card rounded-2xl p-5 border border-border"
            style={{ background: "linear-gradient(135deg, #f4b8d015 0%, transparent 100%)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "#f4b8d030" }}>
              <Users className="w-5 h-5" style={{ color: "#f4b8d0" }} />
            </div>
            <p className="text-2xl font-bold mb-1">{friendsCount}</p>
            <p className="text-sm text-muted-foreground">Study Friends</p>
          </div>
          <div
            className="bg-card rounded-2xl p-5 border border-border"
            style={{ background: "linear-gradient(135deg, #d4f4e815 0%, transparent 100%)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "#d4f4e830" }}>
              <StickyNote className="w-5 h-5" style={{ color: "#4ade80" }} />
            </div>
            <p className="text-2xl font-bold mb-1">{notesCount}</p>
            <p className="text-sm text-muted-foreground">Notes Created</p>
          </div>
          <div
            className="bg-card rounded-2xl p-5 border border-border"
            style={{ background: "linear-gradient(135deg, #d4e8f415 0%, transparent 100%)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: "#d4e8f430" }}>
              <Target className="w-5 h-5" style={{ color: "#60a5fa" }} />
            </div>
            <p className="text-2xl font-bold mb-1">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</p>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
          </div>
        </motion.div>
      </div>

      {/* ——— Character Customizer ——— */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#f4b8d0]/20 flex items-center justify-center">
            <User className="w-5 h-5 text-[#f4b8d0]" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Study Character</h2>
            <p className="text-sm text-muted-foreground">Customise your avatar ✨</p>
          </div>
        </div>

        <div className="flex gap-8 items-center flex-wrap">
          {/* Character preview */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <div className="w-44 h-52 rounded-2xl bg-gradient-to-br from-[#f0e6f6] to-[#d4e8f4] flex items-center justify-center border-2 border-border">
              <StudyCharacter cfg={charConfig} />
            </div>
            <p className="text-xs text-muted-foreground">Your study buddy 💜</p>
          </div>

          {/* Controls */}
          <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-6 min-w-[280px]">
            {/* Skin tone */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Skin Tone</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => set("skinIdx")((charConfig.skinIdx - 1 + SKIN_TONES.length) % SKIN_TONES.length)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-24 flex items-center justify-center">
                  <div className="flex gap-1">
                    {SKIN_TONES.map((c, i) => (
                      <div
                        key={c}
                        onClick={() => set("skinIdx")(i)}
                        className={`w-5 h-5 rounded-full cursor-pointer transition-all ${i === charConfig.skinIdx ? "ring-2 ring-primary ring-offset-1 scale-110" : "opacity-60 hover:opacity-100"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => set("skinIdx")((charConfig.skinIdx + 1) % SKIN_TONES.length)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hair color */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Hair Color</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => set("hairColorIdx")((charConfig.hairColorIdx - 1 + HAIR_COLORS.length) % HAIR_COLORS.length)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-24 flex items-center justify-center">
                  <div className="flex gap-1">
                    {HAIR_COLORS.map((c, i) => (
                      <div
                        key={c}
                        onClick={() => set("hairColorIdx")(i)}
                        className={`w-5 h-5 rounded-full cursor-pointer transition-all ${i === charConfig.hairColorIdx ? "ring-2 ring-primary ring-offset-1 scale-110" : "opacity-60 hover:opacity-100"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => set("hairColorIdx")((charConfig.hairColorIdx + 1) % HAIR_COLORS.length)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Hair style */}
            <CycleSelector
              label="Hair Style"
              values={HAIR_STYLES}
              current={charConfig.hairStyle}
              onChange={set("hairStyle")}
              renderPreview={(v) => (
                <span className="text-sm font-medium">{HAIR_STYLE_LABELS[v]}</span>
              )}
            />

            {/* Outfit */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Outfit Color</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => set("outfitIdx")((charConfig.outfitIdx - 1 + OUTFIT_COLORS.length) % OUTFIT_COLORS.length)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="w-24 flex items-center justify-center">
                  <div className="flex gap-1">
                    {OUTFIT_COLORS.map((c, i) => (
                      <div
                        key={c}
                        onClick={() => set("outfitIdx")(i)}
                        className={`w-5 h-5 rounded-full cursor-pointer transition-all ${i === charConfig.outfitIdx ? "ring-2 ring-primary ring-offset-1 scale-110" : "opacity-60 hover:opacity-100"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => set("outfitIdx")((charConfig.outfitIdx + 1) % OUTFIT_COLORS.length)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Accessory */}
            <CycleSelector
              label="Accessory"
              values={ACCESSORIES}
              current={charConfig.accessory}
              onChange={set("accessory")}
              renderPreview={(v) => (
                <span className="text-sm font-medium">{ACCESSORY_LABELS[v]}</span>
              )}
            />

            {/* Save button */}
            <div className="flex flex-col items-center justify-end gap-2">
              <button className="px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all text-sm font-medium">
                Save Character
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Study Hours", value: "87.3", icon: Clock, color: "#b8a4d4" },
          { label: "Notes Shared", value: String(notesCount), icon: BookOpen, color: "#d4f4e8" },
          { label: "Study Sessions", value: "23", icon: Calendar, color: "#d4e8f4" },
          { label: "Study Friends", value: String(friendsCount), icon: User, color: "#f4b8d0" },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card rounded-2xl p-5 border border-border"
            style={{ background: `linear-gradient(135deg, ${stat.color}15 0%, transparent 100%)` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${stat.color}30` }}>
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#b8a4d4]/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#b8a4d4]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Weekly Study Hours</h2>
              <p className="text-sm text-muted-foreground">Last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorHours2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b8a4d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#b8a4d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.3} />
              <XAxis dataKey="day" stroke="#9088a0" />
              <YAxis stroke="#9088a0" />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0", borderRadius: "12px" }} />
              <Area type="monotone" dataKey="hours" stroke="#b8a4d4" strokeWidth={3} fill="url(#colorHours2)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d4e8f4]/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-[#d4e8f4]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Module Performance</h2>
              <p className="text-sm text-muted-foreground">Current grades</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={modulePerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" opacity={0.3} />
              <XAxis dataKey="subject" stroke="#9088a0" />
              <YAxis stroke="#9088a0" />
              <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0", borderRadius: "12px" }} />
              <Bar dataKey="score" fill="#d4e8f4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Achievements & Radar */}
      <div className="grid grid-cols-[1fr_400px] gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-2xl p-6 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#f4b8d0]/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#f4b8d0]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Achievements</h2>
              <p className="text-sm text-muted-foreground">4 of 6 unlocked</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${achievement.unlocked ? "border-transparent hover:shadow-lg" : "border-dashed border-border opacity-50"}`}
                style={achievement.unlocked ? { background: `linear-gradient(135deg, ${achievement.color}20 0%, transparent 100%)` } : {}}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${achievement.unlocked ? "" : "opacity-40"}`}
                  style={{ backgroundColor: `${achievement.color}30` }}
                >
                  <achievement.icon className="w-6 h-6" style={{ color: achievement.color }} />
                </div>
                <h4 className="font-semibold mb-1 text-sm">{achievement.title}</h4>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
              </motion.div>
            ))}
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
