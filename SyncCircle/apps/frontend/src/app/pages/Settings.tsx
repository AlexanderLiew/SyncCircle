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
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { getSettings, saveSettings, getUser, saveUser } from "../lib/storage";
import type { UserSettings } from "../types";

const settingsSections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy & Security", icon: Lock },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
];

export function Settings() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [settings, setSettings] = useState<UserSettings>(getSettings);
  const { currentTheme, applyTheme, getAvailableThemes } = useTheme();

  // Load profile display name from synccircle_user on mount
  useEffect(() => {
    const user = getUser();
    if (user) {
      setSettings((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          displayName: user.displayName || prev.profile.displayName,
          avatar: user.avatar || prev.profile.avatar,
          course: user.course || prev.profile.course,
        },
      }));
    }
  }, []);

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

  const renderProfile = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={authUser?.email || ""}
            disabled
            className="w-full px-4 py-2 rounded-xl bg-input-background border border-border opacity-60 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Display Name</label>
          <input
            type="text"
            value={settings.profile.displayName}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                profile: { ...prev.profile, displayName: e.target.value },
              }))
            }
            placeholder="Enter your display name"
            className="w-full px-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Course / Program
          </label>
          <input
            type="text"
            value={settings.profile.course}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                profile: { ...prev.profile, course: e.target.value },
              }))
            }
            placeholder="e.g. Computer Science"
            className="w-full px-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <button
        onClick={() => {
          // Save to settings storage
          saveSettings(settings);
          // Also update the synccircle_user localStorage entry
          const user = getUser();
          if (user) {
            saveUser({
              ...user,
              displayName: settings.profile.displayName,
              avatar: settings.profile.avatar,
              course: settings.profile.course,
            });
          }
          toast.success("Profile saved!");
        }}
        className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
      >
        Save Changes
      </button>
    </div>
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
