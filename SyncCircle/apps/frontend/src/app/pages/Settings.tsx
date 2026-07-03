import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Lock,
  Palette,
  Accessibility,
  Sparkles,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../hooks/useTheme";
import { getSettings, saveSettings, getUser, saveUser } from "../lib/storage";
import { useAuth } from "../hooks/useAuth";
import type { UserSettings } from "../types";

const settingsSections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy & Security", icon: Lock },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
  { id: "profile", label: "Account", icon: User },
  { id: "ai", label: "AI Preferences", icon: Sparkles },
];

export function Settings() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [settings, setSettings] = useState<UserSettings>(getSettings);
  const { currentTheme, applyTheme, getAvailableThemes } = useTheme();
  const { user } = useAuth();

  // Sync theme from context into local settings state on mount
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, theme: currentTheme },
    }));
  }, [currentTheme]);

  // Apply reduced motion globally
  useEffect(() => {
    if (settings.accessibility.reducedMotion) {
      document.body.classList.add("reduce-motion");
    } else {
      document.body.classList.remove("reduce-motion");
    }
  }, [settings.accessibility.reducedMotion]);

  // Apply high contrast globally
  useEffect(() => {
    if (settings.accessibility.highContrast) {
      document.body.classList.add("high-contrast");
    } else {
      document.body.classList.remove("high-contrast");
    }
  }, [settings.accessibility.highContrast]);

  const updateSettings = (updater: (prev: UserSettings) => UserSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      saveSettings(next);
      return next;
    });
  };

  const themes = getAvailableThemes();

  const renderToggle = (
    checked: boolean,
    onChange: () => void,
    label: string
  ) => (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-switch-background"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );



  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Theme</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <button
              key={theme.name}
              onClick={() => {
                applyTheme(theme.name);
                updateSettings((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, theme: theme.name },
                }));
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                settings.appearance.theme === theme.name
                  ? "border-primary shadow-lg"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div
                className="w-full h-8 rounded-lg mb-3"
                style={{
                  backgroundColor: theme.variables["--primary"],
                }}
              />
              <p className="font-medium text-sm">{theme.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-accent/30">
        <div>
          <p className="font-medium">Push Notifications</p>
          <p className="text-sm text-muted-foreground">
            Receive push notifications on your device
          </p>
        </div>
        {renderToggle(
          settings.notifications.push,
          () =>
            updateSettings((prev) => ({
              ...prev,
              notifications: {
                ...prev.notifications,
                push: !prev.notifications.push,
              },
            })),
          "Push Notifications"
        )}
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl bg-accent/30">
        <div>
          <p className="font-medium">Email Notifications</p>
          <p className="text-sm text-muted-foreground">
            Receive email notifications for updates
          </p>
        </div>
        {renderToggle(
          settings.notifications.email,
          () =>
            updateSettings((prev) => ({
              ...prev,
              notifications: {
                ...prev.notifications,
                email: !prev.notifications.email,
              },
            })),
          "Email Notifications"
        )}
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-accent/30">
        <div>
          <p className="font-medium">Data Sharing</p>
          <p className="text-sm text-muted-foreground">
            Share usage data for personalized AI recommendations
          </p>
        </div>
        {renderToggle(
          settings.privacy.dataSharing,
          () =>
            updateSettings((prev) => ({
              ...prev,
              privacy: {
                ...prev.privacy,
                dataSharing: !prev.privacy.dataSharing,
              },
            })),
          "Data Sharing"
        )}
      </div>
    </div>
  );

  const renderAccessibility = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl bg-accent/30">
        <div>
          <p className="font-medium">High Contrast</p>
          <p className="text-sm text-muted-foreground">
            Increase contrast for better readability
          </p>
        </div>
        {renderToggle(
          settings.accessibility.highContrast,
          () =>
            updateSettings((prev) => ({
              ...prev,
              accessibility: {
                ...prev.accessibility,
                highContrast: !prev.accessibility.highContrast,
              },
            })),
          "High Contrast"
        )}
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl bg-accent/30">
        <div>
          <p className="font-medium">Reduced Motion</p>
          <p className="text-sm text-muted-foreground">
            Disable animations and transitions
          </p>
        </div>
        {renderToggle(
          settings.accessibility.reducedMotion,
          () =>
            updateSettings((prev) => ({
              ...prev,
              accessibility: {
                ...prev.accessibility,
                reducedMotion: !prev.accessibility.reducedMotion,
              },
            })),
          "Reduced Motion"
        )}
      </div>
    </div>
  );

  const renderProfile = () => {
    const authUser = user;
    const localUser = getUser();
    const accountEmail = authUser?.email || localUser?.email || '';
    const accountName = authUser?.displayName || localUser?.displayName || '';

    return (
      <div className="space-y-6">
        {/* Account Email (read-only) */}
        <div>
          <label className="block text-sm font-medium mb-2">Account Email</label>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/30 border border-border">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{accountEmail || 'Not available'}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            This is the email you registered with. Task notifications are sent here.
          </p>
        </div>

        {/* Display Name (editable) */}
        <div>
          <label className="block text-sm font-medium mb-2">Display Name</label>
          <input
            type="text"
            defaultValue={accountName}
            onBlur={(e) => {
              const newName = e.target.value.trim();
              if (newName && newName !== accountName) {
                // Update localStorage user
                const current = getUser();
                if (current) {
                  saveUser({ ...current, displayName: newName });
                }
                // Update settings profile
                updateSettings((prev) => ({
                  ...prev,
                  profile: { ...prev.profile, displayName: newName },
                }));
              }
            }}
            placeholder="Enter your display name"
            className="w-full px-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This name is shown in notifications and to your friends.
          </p>
        </div>

        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium mb-2">Avatar</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xl font-bold">
              {settings.profile.avatar ||
                (accountName || settings.profile.displayName)
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) ||
                "?"}
            </div>
            <input
              type="text"
              value={settings.profile.avatar}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  profile: { ...prev.profile, avatar: e.target.value },
                }))
              }
              placeholder="Initials or emoji (e.g. 🎓)"
              className="flex-1 px-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* Course */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Course / Program
          </label>
          <input
            type="text"
            value={settings.profile.course}
            onChange={(e) =>
              updateSettings((prev) => ({
                ...prev,
                profile: { ...prev.profile, course: e.target.value },
              }))
            }
            placeholder="e.g. Computer Science"
            className="w-full px-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>
    );
  };

  const renderAIPreferences = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Response Style</h3>
        <div className="flex gap-4">
          {(["concise", "balanced", "detailed"] as const).map((style) => (
            <label
              key={style}
              className={`flex-1 flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                settings.aiPreferences.responseStyle === style
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="responseStyle"
                value={style}
                checked={settings.aiPreferences.responseStyle === style}
                onChange={() =>
                  updateSettings((prev) => ({
                    ...prev,
                    aiPreferences: {
                      ...prev.aiPreferences,
                      responseStyle: style,
                    },
                  }))
                }
                className="sr-only"
              />
              <span className="font-medium capitalize">{style}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {style === "concise"
                  ? "Short & direct"
                  : style === "detailed"
                  ? "In-depth explanations"
                  : "Mix of both"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Planning Aggressiveness</h3>
        <div className="flex gap-4">
          {(["relaxed", "moderate", "intensive"] as const).map((level) => (
            <label
              key={level}
              className={`flex-1 flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                settings.aiPreferences.planningAggressiveness === level
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input
                type="radio"
                name="planningAggressiveness"
                value={level}
                checked={
                  settings.aiPreferences.planningAggressiveness === level
                }
                onChange={() =>
                  updateSettings((prev) => ({
                    ...prev,
                    aiPreferences: {
                      ...prev.aiPreferences,
                      planningAggressiveness: level,
                    },
                  }))
                }
                className="sr-only"
              />
              <span className="font-medium capitalize">{level}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {level === "relaxed"
                  ? "Fewer reminders"
                  : level === "intensive"
                  ? "Proactive planning"
                  : "Balanced nudges"}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return renderProfile();
      case "appearance":
        return renderAppearance();
      case "notifications":
        return renderNotifications();
      case "privacy":
        return renderPrivacy();
      case "accessibility":
        return renderAccessibility();
      case "ai":
        return renderAIPreferences();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back button and breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 rounded-xl hover:bg-accent transition-colors"
          aria-label="Back to Profile"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <nav className="text-sm text-muted-foreground">
          <span className="hover:text-foreground cursor-pointer" onClick={() => navigate('/profile')}>Profile</span>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">Settings</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card rounded-2xl border border-border p-4"
        >
          <div className="flex items-center gap-3 mb-6 p-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Settings</h2>
              <p className="text-xs text-muted-foreground">
                Customize your experience
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : "hover:bg-accent"
                }`}
              >
                <section.icon className="w-5 h-5" />
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-8"
        >
          <h2 className="text-2xl font-bold mb-6">
            {settingsSections.find((s) => s.id === activeSection)?.label}
          </h2>
          {renderSection()}
        </motion.div>
      </div>
    </div>
  );
}
