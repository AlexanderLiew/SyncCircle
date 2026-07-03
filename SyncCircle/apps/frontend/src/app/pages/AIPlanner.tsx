import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  Trash2,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { useKiroAPI, buildUserContext } from "../hooks/useKiroAPI";
import { STORAGE_KEYS, type ChatMessage } from "../types";
import { parseActions, executeAction, type ChatAction } from "../lib/chat-actions";

// --- Helpers ---

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

function saveChatHistory(messages: ChatMessage[]): void {
  localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messages));
}

// --- Component ---

export function AIPlanner() {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<Map<string, ChatAction[]>>(new Map());
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { chatMessage, isLoading } = useKiroAPI();

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Persist chat messages
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // --- Chat handlers ---
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      setErrorMsg(null);
      setLastFailedMessage(null);

      const userMsg: ChatMessage = {
        id: generateId(),
        groupId: "ai-planner",
        senderId: "user",
        senderName: "You",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");

      const context = buildUserContext();
      const result = await chatMessage(text.trim(), updatedMessages, context);

      if (result.data?.response) {
        const { text: responseText, actions } = parseActions(result.data.response);

        const aiMsg: ChatMessage = {
          id: generateId(),
          groupId: "ai-planner",
          senderId: "ai",
          senderName: "AI Assistant",
          content: responseText,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        // If actions were detected, store them keyed by message ID
        if (actions.length > 0) {
          setPendingActions((prev) => {
            const next = new Map(prev);
            next.set(aiMsg.id, actions);
            return next;
          });
        }
      } else {
        setErrorMsg(result.error || "Something went wrong. Please try again.");
        setLastFailedMessage(text.trim());
      }
    },
    [messages, isLoading, chatMessage]
  );

  const handleSend = () => {
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      sendMessage(lastFailedMessage);
    }
  };

  const handleConfirmAction = async (messageId: string, action: ChatAction) => {
    setExecutingAction(`${messageId}-${action.type}`);

    try {
      const resultText = await executeAction(action);

      // Add result as a new AI message
      const resultMsg: ChatMessage = {
        id: generateId(),
        groupId: "ai-planner",
        senderId: "ai",
        senderName: "AI Assistant",
        content: resultText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, resultMsg]);

      // Remove the pending action for this message
      setPendingActions((prev) => {
        const next = new Map(prev);
        next.delete(messageId);
        return next;
      });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : "Action failed";
      const errorResultMsg: ChatMessage = {
        id: generateId(),
        groupId: "ai-planner",
        senderId: "ai",
        senderName: "AI Assistant",
        content: `❌ Action failed: ${errMessage}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorResultMsg]);
    } finally {
      setExecutingAction(null);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMsg(null);
    setLastFailedMessage(null);
    setPendingActions(new Map());
    saveChatHistory([]);
  };

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col max-w-3xl mx-auto h-full pb-8">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between p-4 sm:p-6 bg-card rounded-2xl border border-border bg-gradient-to-r from-[#b8a4d4]/10 to-[#f4b8d0]/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#b8a4d4] to-[#f4b8d0] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Study Planner</h1>
            <p className="text-xs text-muted-foreground">
              Your smart scheduling assistant
            </p>
          </div>
        </div>
      </div>

      {/* ─── Chat Interface ─── */}
      <div className="flex flex-col flex-1 bg-card rounded-2xl border border-border overflow-hidden min-h-0">
        {/* Chat Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium">Chat with AI Assistant</h2>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Clear chat history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* Messages Thread */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {/* Empty state */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#b8a4d4]/20 to-[#f4b8d0]/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Ask the AI about scheduling, study plans, or anything else.
              </p>
            </div>
          )}

          {/* Chat messages */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${
                  msg.senderId === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.senderId === "user" ? (
                  <div className="max-w-[80%]">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                ) : (
                  <div className="max-w-[85%]">
                    <div className="bg-accent/50 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="font-medium text-xs text-muted-foreground">
                          AI Assistant
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Action Confirmation Buttons */}
                      {pendingActions.has(msg.id) && (
                        <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                          {pendingActions.get(msg.id)!.map((action, idx) => (
                            <div
                              key={`${msg.id}-action-${idx}`}
                              className="flex items-start gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20"
                            >
                              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {action.description}
                                </p>
                                <button
                                  onClick={() => handleConfirmAction(msg.id, action)}
                                  disabled={executingAction === `${msg.id}-${action.type}`}
                                  className="mt-2 px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {executingAction === `${msg.id}-${action.type}`
                                    ? "Executing..."
                                    : "Confirm"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading / Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-accent/50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium text-xs text-muted-foreground">
                    AI Assistant
                  </span>
                </div>
                <div className="flex items-center gap-1.5" aria-label="AI is typing">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Error message with retry */}
          {errorMsg && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                  <span className="font-medium text-xs text-destructive">
                    Error
                  </span>
                </div>
                <p className="text-sm text-destructive/90 mb-2">{errorMsg}</p>
                {lastFailedMessage && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-border bg-accent/20">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about scheduling, study plans, or breaks..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Type your message"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
