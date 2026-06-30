import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  MessageSquare,
  Send,
  Users,
} from "lucide-react";
import { getGroups, getMessages, saveMessage, getUser } from "../lib/storage";
import type { StudyGroup, ChatMessage } from "../types";

export function GroupChat() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = getUser();

  // Load groups the user belongs to
  useEffect(() => {
    const allGroups = getGroups();
    const userId = currentUser?.id ?? "";
    const userGroups = allGroups.filter((g) => g.members.includes(userId));
    setGroups(userGroups);
    if (userGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(userGroups[0]);
    }
  }, []);

  // Load messages for selected group
  useEffect(() => {
    if (!selectedGroup) return;
    const allMessages = getMessages();
    const groupMessages = allMessages
      .filter((m) => m.groupId === selectedGroup.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setMessages(groupMessages);
  }, [selectedGroup]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || !selectedGroup || !currentUser) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      groupId: selectedGroup.id,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    saveMessage(newMessage);
    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Empty state: no groups
  if (groups.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#b8a4d4]/20 to-[#f4b8d0]/20 flex items-center justify-center mb-6">
          <MessageSquare className="w-10 h-10 text-[#b8a4d4]" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Group Chats Yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Join a study group to start chatting. You can join groups from the Notes page under Shared Notes.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-0 max-w-6xl mx-auto h-[calc(100vh-120px)] bg-card rounded-2xl border border-border overflow-hidden">
      {/* Groups Sidebar */}
      <div className="bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#b8a4d4] to-[#f4b8d0] flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            Study Groups
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {groups.length} group{groups.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left ${
                selectedGroup?.id === group.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#b8a4d4] to-[#d4e8f4] flex items-center justify-center text-white text-sm font-medium">
                {group.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{group.name}</p>
                <p className="text-xs text-muted-foreground">
                  {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col bg-background">
        {/* Chat Header */}
        {selectedGroup && (
          <div className="h-14 border-b border-border px-4 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-[#b8a4d4]" />
            <div>
              <h3 className="font-semibold">{selectedGroup.name}</h3>
              <p className="text-xs text-muted-foreground">
                {selectedGroup.members.length} member{selectedGroup.members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isCurrentUser = msg.senderId === currentUser?.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex gap-3 hover:bg-accent/20 -mx-4 px-4 py-2 rounded-lg transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#b8a4d4] to-[#d4f4e8] flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {msg.senderName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-semibold text-sm">
                      {isCurrentUser ? "You" : msg.senderName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-input-background border border-border rounded-xl overflow-hidden">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedGroup
                    ? `Message ${selectedGroup.name}...`
                    : "Select a group to start chatting"
                }
                rows={1}
                disabled={!selectedGroup}
                className="w-full px-4 py-3 bg-transparent border-none outline-none resize-none disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || !selectedGroup}
              className="p-3 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
