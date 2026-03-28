"use client";
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
type Message = {
  role: "user" | "assistant";
  content: string;
};
type Mode = "gentle" | "normal" | "hard";
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}
export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello there! I'm so glad you're here. How are you feeling today? I'd love to hear what's on your mind.",
    },
  ]);
  const [mode, setMode] = useState<Mode>("gentle");
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);
    const updatedMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);
    try {
      const response = await fetch("/api/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          mode,
          history: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!response.ok) throw new Error("Failed to get response");
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setError("I'm having trouble connecting right now. Please try again in a moment.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const modes: { value: Mode; label: string }[] = [
    { value: "gentle", label: "Gentle" },
    { value: "normal", label: "Normal" },
    { value: "hard", label: "Direct" },
  ];

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-3.5rem)] md:min-h-screen bg-background">
      <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <h1 className="text-xl md:text-2xl font-serif text-foreground tracking-tight">
          Chat with Companion
        </h1>
        <div className="flex bg-muted rounded-full p-1">
          {modes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`px-3 md:px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                mode === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={mode === value}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] md:max-w-[80%] px-4 py-3 rounded-2xl ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card text-card-foreground shadow-sm border border-border rounded-bl-md"
              }`}>
                <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card text-card-foreground shadow-sm border border-border px-4 py-3 rounded-2xl rounded-bl-md">
                <TypingIndicator />
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-xl text-sm">{error}</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <footer className="border-t border-border bg-card/80 backdrop-blur-sm px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50 text-base"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="lg"
            className="rounded-xl px-5"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3 hidden md:block">
          Press Enter to send
        </p>
      </footer>
    </div>
  );
}