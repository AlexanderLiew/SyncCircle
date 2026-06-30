import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  Trash2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useKiroAPI, buildUserContext } from "../hooks/useKiroAPI";
import { STORAGE_KEYS, type ChatMessage } from "../types";

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

// --- Suggested prompts ---

const suggestedQuestions = [
  "When can all 4 of us meet this week?",
  "Best time to study for ML exam?",
  "Schedule a 2-hour study session",
  "Plan my study breaks for today",
];

// --- Component ---

export function AIPlanner() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { chatMessage, isLoading } = useKiroAPI();

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      setErrorMsg(null);
      setLastFailedMessage(null);

      // Create user message
      const userMsg: ChatMessage = {
        id: generateId(),
        groupId: "ai-planner",
        senderId: "user",
        senderName: "You",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      // Optimistically add to thread
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");

      // Call API
      const context = buildUserContext();
      const result = await chatMessage(text.trim(), updatedMessages, context);

      if (result.data?.response) {
        const aiMsg: ChatMessage = {
          id: generateId(),
          groupId: "ai-planner",
          senderId: "ai",
          senderName: "AI Assistant",
          content: result.data.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
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

  const handleClearChat = () => {
    setMessages([]);
    setErrorMsg(null);
    setLastFailedMessage(null);
    saveChatHistory([]);
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
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
    <div className="flex flex-col max-w-3xl mx-auto h-[calc(100vh-120px)]">
      {/* Chat Container */}
      <div className="flex flex-col flex-1 bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border bg-gradient-to-r from-[#b8a4d4]/10 to-[#f4b8d0]/10">
          <div className="flex items-center justify-between">
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
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Clear chat history"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Thread */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {/* Empty state */}
          {messages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center py-12"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#b8a4d4]/20 to-[#f4b8d0]/20 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-2">
                How can I help you today?
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Ask me about scheduling, study plans, meeting times, or study
                break suggestions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(question)}
                    className="p-3 text-sm text-left rounded-xl bg-accent/50 hover:bg-accent transition-all border border-border/50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </motion.div>
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
        <div className="p-3 sm:p-4 border-t border-border bg-accent/20">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about scheduling, study plans, or breaks..."
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
