import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Search,
  UserPlus,
  X,
  Trash2,
} from "lucide-react";
import type { Friend } from "../types";
import { getFriends, saveFriend, removeFriend, getUser } from "../lib/storage";

export function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFriendName, setNewFriendName] = useState("");
  const [newFriendEmail, setNewFriendEmail] = useState("");

  // Load friends from localStorage on mount
  useEffect(() => {
    setFriends(getFriends());
  }, []);

  // Filter friends by search query (case-insensitive substring match on displayName)
  const filteredFriends = friends.filter((friend) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return friend.displayName.toLowerCase().includes(query);
  });

  // Add a new friend
  const handleAddFriend = () => {
    if (!newFriendName.trim()) return;

    const user = getUser();
    const newFriend: Friend = {
      id: crypto.randomUUID(),
      userId: user?.id ?? "current-user",
      friendId: crypto.randomUUID(),
      displayName: newFriendName.trim(),
      status: "offline",
      timetable: [],
    };

    saveFriend(newFriend);
    setFriends(getFriends());
    setNewFriendName("");
    setNewFriendEmail("");
    setShowAddForm(false);
  };

  // Remove a friend
  const handleRemoveFriend = (id: string) => {
    removeFriend(id);
    setFriends(getFriends());
  };

  // Get status badge color
  const getStatusColor = (status: Friend["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-400";
      case "studying":
        return "bg-yellow-400";
      case "offline":
      default:
        return "bg-gray-400";
    }
  };

  // Get initials from display name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
          <h1 className="text-3xl font-bold mb-2">Study Friends</h1>
          <p className="text-muted-foreground">
            Connect and collaborate with your study buddies
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all w-64"
            />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Friend
          </button>
        </div>
      </motion.div>

      {/* Add Friend Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card rounded-2xl border border-border p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add a New Friend
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">
                  Display Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter friend's name"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">
                  Email (optional)
                </label>
                <input
                  type="email"
                  placeholder="Enter friend's email"
                  value={newFriendEmail}
                  onChange={(e) => setNewFriendEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
                />
              </div>
              <button
                onClick={handleAddFriend}
                disabled={!newFriendName.trim()}
                className="px-6 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend Requests Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-[#b8a4d4]/10 to-[#f4b8d0]/10 rounded-2xl border border-[#b8a4d4]/30 p-6"
      >
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" />
          Friend Requests
        </h2>
        <p className="text-sm text-muted-foreground">No pending requests</p>
      </motion.div>

      {/* Friends List */}
      {filteredFriends.length === 0 && friends.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-12 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No friends yet</h3>
          <p className="text-muted-foreground mb-6">
            Add your first friend to start studying together!
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add your first friend
          </button>
        </motion.div>
      ) : filteredFriends.length === 0 ? (
        /* No search results */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-12 text-center"
        >
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No results</h3>
          <p className="text-muted-foreground">
            No friends match "{searchQuery}"
          </p>
        </motion.div>
      ) : (
        /* Friends Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFriends.map((friend, index) => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:shadow-primary/5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-sm text-primary">
                      {getInitials(friend.displayName)}
                    </div>
                    {/* Status indicator */}
                    <div
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card ${getStatusColor(friend.status)}`}
                    />
                  </div>
                  {/* Name and status */}
                  <div>
                    <h3 className="font-semibold">{friend.displayName}</h3>
                    <p className="text-xs text-muted-foreground capitalize">
                      {friend.status}
                    </p>
                  </div>
                </div>
                {/* Remove button */}
                <button
                  onClick={() => handleRemoveFriend(friend.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Remove friend"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
