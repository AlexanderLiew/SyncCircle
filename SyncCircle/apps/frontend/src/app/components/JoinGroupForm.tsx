import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, X, LogIn, Plus } from "lucide-react";
import { validateGroupJoin } from "../lib/validators";
import { getGroups, joinGroup, getUser } from "../lib/storage";
import type { StudyGroup } from "../types";

interface JoinGroupFormProps {
  onClose: () => void;
  onJoined: () => void;
}

type FormMode = "join" | "create";

export function JoinGroupForm({ onClose, onJoined }: JoinGroupFormProps) {
  const [mode, setMode] = useState<FormMode>("join");
  const [groupName, setGroupName] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function resetForm() {
    setGroupName("");
    setPassword("");
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");
  }

  function handleModeSwitch(newMode: FormMode) {
    resetForm();
    setMode(newMode);
  }

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    // Step 1: Validate form fields
    const validation = validateGroupJoin({ groupName, password });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    // Step 2: Get current user
    const user = getUser();
    if (!user) {
      setFormError("You must be logged in to join a group");
      return;
    }

    // Step 3: Find group by name (case-insensitive)
    const groups = getGroups();
    const matchedGroup = groups.find(
      (g) => g.name.toLowerCase() === groupName.trim().toLowerCase()
    );

    // Step 4: If no group found — generic error
    if (!matchedGroup) {
      setFormError("Invalid credentials");
      return;
    }

    // Step 5: Check if user is already a member
    if (matchedGroup.members.includes(user.id)) {
      setSuccessMessage("You are already a member of this group");
      return;
    }

    // Step 6: Add user to group members and save
    const updatedGroup: StudyGroup = {
      ...matchedGroup,
      members: [...matchedGroup.members, user.id],
    };
    joinGroup(updatedGroup);
    onJoined();
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setFormError("");
    setSuccessMessage("");

    // Step 1: Validate form fields (reuse same validator)
    const validation = validateGroupJoin({ groupName, password });
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    // Step 2: Get current user
    const user = getUser();
    if (!user) {
      setFormError("You must be logged in to create a group");
      return;
    }

    // Step 3: Check if group name already exists (case-insensitive)
    const groups = getGroups();
    const existing = groups.find(
      (g) => g.name.toLowerCase() === groupName.trim().toLowerCase()
    );
    if (existing) {
      setFormError("A group with this name already exists");
      return;
    }

    // Step 4: Create the new group
    const newGroup: StudyGroup = {
      id: crypto.randomUUID(),
      name: groupName.trim(),
      tag: '',
      creatorId: user.id,
      members: [user.id],
      pendingMembers: [],
      createdAt: new Date().toISOString(),
    };
    joinGroup(newGroup);
    onJoined();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card rounded-2xl border border-border w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">
              {mode === "join" ? "Join Group" : "Create Group"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => handleModeSwitch("join")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "join"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4" />
              Join Existing
            </span>
          </button>
          <button
            onClick={() => handleModeSwitch("create")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === "create"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Create New
            </span>
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={mode === "join" ? handleJoinSubmit : handleCreateSubmit}
          className="p-6 space-y-4"
        >
          {/* Group Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="group-name"
              className="text-sm font-medium text-foreground"
            >
              Group Name
            </label>
            <input
              id="group-name"
              type="text"
              value={groupName}
              onChange={(e) => {
                setGroupName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, groupName: "" }));
                setFormError("");
                setSuccessMessage("");
              }}
              placeholder={
                mode === "join"
                  ? "Enter the group name..."
                  : "Choose a group name..."
              }
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
              autoFocus
            />
            <AnimatePresence>
              {fieldErrors.groupName && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-destructive"
                >
                  {fieldErrors.groupName}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="group-password"
              className="text-sm font-medium text-foreground"
            >
              4-Digit Password
            </label>
            <input
              id="group-password"
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={password}
              onChange={(e) => {
                // Only allow numeric input
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPassword(val);
                setFieldErrors((prev) => ({ ...prev, password: "" }));
                setFormError("");
                setSuccessMessage("");
              }}
              placeholder="0000"
              className="w-full px-3 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm tracking-widest"
            />
            <AnimatePresence>
              {fieldErrors.password && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-destructive"
                >
                  {fieldErrors.password}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Generic form error */}
          <AnimatePresence>
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <p className="text-sm text-destructive font-medium">
                  {formError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Already a member message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="p-3 rounded-lg bg-primary/10 border border-primary/20"
              >
                <p className="text-sm text-primary font-medium">
                  {successMessage}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              {mode === "join" ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Join Group
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Group
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl hover:bg-accent transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
