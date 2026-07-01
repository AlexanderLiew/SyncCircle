import { useState } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, Sparkles, ArrowLeft, BookOpen, Users, Brain, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../hooks/useAuth";

type AuthView = "login" | "signup" | "confirm" | "forgot";

export function Auth() {
  const [view, setView] = useState<AuthView>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const { login, register, confirmRegistration } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      localStorage.setItem("synccircle_auth", "true");
      navigate(redirectTo);
    } catch (err: any) {
      const message = err?.message || 'Login failed';
      if (message.includes('Incorrect username or password') || message.includes('User does not exist')) {
        setErrors({ login: "Invalid email or password" });
      } else if (message.includes('User is not confirmed')) {
        setErrors({ login: "Please verify your email first" });
        setView("confirm");
      } else {
        setErrors({ login: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }
    if (password.length < 8) {
      setErrors({ password: "Password must be at least 8 characters" });
      return;
    }

    setIsSubmitting(true);

    try {
      await register(email.trim(), password, name.trim());
      // After successful registration, go to confirmation view
      setView("confirm");
    } catch (err: any) {
      const message = err?.message || 'Registration failed';
      if (message.includes('email')) {
        setErrors({ email: message });
      } else if (message.includes('password') || message.includes('Password')) {
        setErrors({ password: message });
      } else {
        setErrors({ signup: message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      await confirmRegistration(email.trim(), confirmCode.trim());
      // After confirmation, log them in automatically
      await login(email.trim(), password);
      localStorage.setItem("synccircle_auth", "true");
      navigate(redirectTo);
    } catch (err: any) {
      const message = err?.message || 'Confirmation failed';
      setErrors({ confirm: message });
    } finally {
      setIsSubmitting(false);
    }
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
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
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
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b8a4d4] to-[#f4b8d0] text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sign In
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
                {errors.signup && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    {errors.signup}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Emma Wilson"
                    required
                    className={`w-full px-4 py-3 rounded-xl bg-input-background border ${errors.name ? 'border-red-400' : 'border-border'} focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="emma@university.edu"
                    required
                    className={`w-full px-4 py-3 rounded-xl bg-input-background border ${errors.email ? 'border-red-400' : 'border-border'} focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, uppercase, lowercase, number, symbol"
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
                  {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">Must include uppercase, lowercase, number, and special character</p>
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b8a4d4] to-[#f4b8d0] text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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

          {/* — CONFIRM EMAIL — */}
          {view === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-3xl font-bold mb-1">Verify your email</h2>
              <p className="text-muted-foreground mb-8">
                We sent a verification code to <strong>{email}</strong> 📧
              </p>

              <form onSubmit={handleConfirm} className="space-y-5">
                {errors.confirm && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    {errors.confirm}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all text-center text-2xl tracking-widest"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#b8a4d4] to-[#f4b8d0] text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify & Sign In
                </motion.button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Didn&apos;t receive the code? Check your spam folder.
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
