import { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, Sparkles, ArrowLeft, BookOpen, Users, Brain } from "lucide-react";
import { useNavigate } from "react-router";
import { validateEmail, validatePassword } from "../lib/validators";
import { getUser, saveUser } from "../lib/storage";
import { STORAGE_KEYS, type User } from "../types";

type AuthView = "login" | "signup" | "forgot";

export function Auth() {
  const [view, setView] = useState<AuthView>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const storedUser = getUser();
    const storedPassword = localStorage.getItem("synccircle_password");

    if (
      storedUser &&
      storedPassword &&
      storedUser.email === email.trim() &&
      storedPassword === password
    ) {
      localStorage.setItem(STORAGE_KEYS.AUTH, "true");
      navigate("/");
    } else {
      setErrors({ login: "Invalid credentials" });
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);

    const fieldErrors: Record<string, string> = {
      ...emailResult.errors,
      ...passwordResult.errors,
    };

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const user: User = {
      id: crypto.randomUUID(),
      email: email.trim(),
      displayName: name.trim(),
      createdAt: new Date().toISOString(),
    };

    saveUser(user);
    localStorage.setItem("synccircle_password", password);
    localStorage.setItem(STORAGE_KEYS.AUTH, "true");
    navigate("/");
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
  };

  const features = [
    { icon: BookOpen, label: "Shared Notes", desc: "Collaborate on notes with your study group in real time" },
    { icon: Users, label: "Friend Network", desc: "See who's online, compare schedules, study together" },
    { icon: Brain, label: "AI Planner", desc: "Smart suggestions for when and what to study next" },
  ];

  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      {/* Left panel — branding & features */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #b8a4d4 0%, #d4b8e8 40%, #f4b8d0 80%, #ffd4c8 100%)" }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-1/3 right-10 w-40 h-40 rounded-full bg-white/8 blur-xl" />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SyncCircle</h1>
            <p className="text-white/70 text-sm">Sync your study circle</p>
          </div>
        </motion.div>

        {/* Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative z-10"
        >
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Your cozy study<br />space awaits ✨
          </h2>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm">
            Share notes, sync timetables, and study smarter with your university friends.
          </p>

          <div className="mt-10 space-y-4">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{f.label}</p>
                  <p className="text-sm text-white/70">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom flourish */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 text-white/50 text-sm"
        >
          Trusted by 10,000+ university students
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#b8a4d4] to-[#f4b8d0] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#b8a4d4] to-[#f4b8d0] bg-clip-text text-transparent">
              SyncCircle
            </h1>
          </div>

          {/* — LOGIN — */}
          {view === "login" && (
            <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-3xl font-bold mb-1">Welcome back!</h2>
              <p className="text-muted-foreground mb-8">Sign in to continue studying 📚</p>

              <form onSubmit={handleLogin} className="space-y-5">
                {errors.login && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                    {errors.login}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="emma@university.edu"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b8a4d4] to-[#f4b8d0] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Sign In
                </motion.button>

                <div className="relative flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  className="w-full py-3 rounded-xl bg-card border border-border font-medium hover:bg-accent transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </motion.button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don&apos;t have an account?{" "}
                <button onClick={() => { setErrors({}); setView("signup"); }} className="text-primary font-medium hover:underline">
                  Sign up free
                </button>
              </p>
            </motion.div>
          )}

          {/* — SIGN UP — */}
          {view === "signup" && (
            <motion.div key="signup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-3xl font-bold mb-1">Join SyncCircle</h2>
              <p className="text-muted-foreground mb-8">Create your account and start collaborating ✨</p>

              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Emma Wilson"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">University Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="emma@university.edu"
                    required
                    className={`w-full px-4 py-3 rounded-xl bg-input-background border ${errors.email ? 'border-red-400' : 'border-border'} focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                      className={`w-full px-4 py-3 pr-12 rounded-xl bg-input-background border ${errors.password ? 'border-red-400' : 'border-border'} focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <input type="checkbox" required id="terms" className="mt-1 accent-[#b8a4d4]" />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the{" "}
                    <span className="text-primary cursor-pointer hover:underline">Terms of Service</span> and{" "}
                    <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
                  </label>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b8a4d4] to-[#f4b8d0] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Create Account
                </motion.button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <button onClick={() => { setErrors({}); setView("login"); }} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </p>
            </motion.div>
          )}

          {/* — FORGOT PASSWORD — */}
          {view === "forgot" && (
            <motion.div key="forgot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <button
                onClick={() => { setView("login"); setForgotSent(false); }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>

              {!forgotSent ? (
                <>
                  <h2 className="text-3xl font-bold mb-1">Reset password</h2>
                  <p className="text-muted-foreground mb-8">
                    Enter your email and we&apos;ll send you a reset link 💌
                  </p>

                  <form onSubmit={handleForgot} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="emma@university.edu"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                      />
                    </div>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b8a4d4] to-[#f4b8d0] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      Send Reset Link
                    </motion.button>
                  </form>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#d4f4e8] to-[#d4e8f4] flex items-center justify-center mx-auto mb-4 text-4xl">
                    💌
                  </div>
                  <h3 className="text-xl font-bold mb-2">Check your inbox!</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    We&apos;ve sent a password reset link to <strong>{email}</strong>
                  </p>
                  <button
                    onClick={() => { setView("login"); setForgotSent(false); }}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all"
                  >
                    Back to Sign In
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
