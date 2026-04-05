import { useState, useEffect, useRef } from "react";
import {
  getChatHistory,
  sendChatMessage,
  applyChatChanges,
  clearChatHistory,
  getSettings,
} from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Send,
  Check,
  Trash2,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Settings,
} from "lucide-react";

const CHANGE_LABELS = {
  scoring_prompt: "Scoring Prompt",
  scoring_criteria: "Scoring Criteria",
  filter_rules: "Filter Rules",
  extraction_fields: "Extraction Fields",
};

const SUGGESTION_CHIPS = [
  "Only score based on technical skills and experience",
  "Auto-reject candidates scoring below 30",
  "Add 'leadership' and 'communication' as scoring criteria",
  "Set up filter to auto-advance candidates above 85 to Interview stage",
  "I want to focus on Python and React developers",
  "Exclude candidates without cover letters from scoring",
  "Weight culture fit higher than education",
  "Show me the current scoring setup",
];

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedChanges, setExpandedChanges] = useState({});
  const [settings, setSettings] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function loadInitial() {
    try {
      const [historyData, settingsData] = await Promise.allSettled([
        getChatHistory(),
        getSettings(),
      ]);
      if (historyData.status === "fulfilled") setMessages(historyData.value.messages);
      if (settingsData.status === "fulfilled") setSettings(settingsData.value);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || sending) return;

    setInput("");
    setSending(true);
    setError(null);

    // Optimistically add user message
    const tempUserMsg = { id: Date.now(), role: "user", content: msg, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await sendChatMessage(msg);
      // Replace optimistic message and add assistant response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, { ...tempUserMsg, id: tempUserMsg.id }, response];
      });
    } catch (err) {
      setError(err.message);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleApply(messageId) {
    setApplying((prev) => ({ ...prev, [messageId]: true }));
    setError(null);
    try {
      const result = await applyChatChanges(messageId);
      // Update the message to show changes were applied
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, changes_applied: true } : m
        )
      );
      // Reload settings
      try {
        const s = await getSettings();
        setSettings(s);
      } catch { /* non-critical */ }
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying((prev) => ({ ...prev, [messageId]: false }));
    }
  }

  async function handleClear() {
    if (!confirm("Clear all chat history?")) return;
    try {
      await clearChatHistory();
      setMessages([]);
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleExpanded(msgId) {
    setExpandedChanges((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) return <LoadingSpinner text="Loading chat..." />;

  const hasApiKey = settings?.openrouter_api_key_set;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 3rem)" }}>
      {/* Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <h2>AI Configuration Assistant</h2>
          <p className="text-sm text-muted">
            Describe how you want to filter, score, and extract candidate data — the AI will configure it for you.
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn-secondary btn-sm" onClick={handleClear}>
            <Trash2 size={14} style={{ marginRight: 4 }} /> Clear Chat
          </button>
        )}
      </div>

      {error && <div className="error-box" style={{ flexShrink: 0 }}>{error}</div>}

      {!hasApiKey && (
        <div className="info-box" style={{ flexShrink: 0 }}>
          <Settings size={14} style={{ marginRight: 6 }} />
          Set up your OpenRouter API key in <strong>Settings</strong> to start using the AI assistant.
        </div>
      )}

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.5rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <Bot size={48} style={{ color: "var(--primary)", marginBottom: "0.75rem" }} />
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>How can I help you configure your screening?</h3>
              <p className="text-sm text-muted" style={{ maxWidth: 500 }}>
                Tell me how you want to evaluate candidates. I can adjust scoring criteria, filter rules,
                extraction fields, and the AI scoring prompt. Just describe what you need.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", maxWidth: 700 }}>
              {SUGGESTION_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  className="btn-secondary btn-sm"
                  style={{ fontSize: "0.78rem" }}
                  onClick={() => handleSend(chip)}
                  disabled={sending || !hasApiKey}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            {/* Avatar */}
            <div
              style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: msg.role === "user" ? "var(--primary)" : "var(--bg-card-hover)",
                marginTop: 2,
              }}
            >
              {msg.role === "user" ? <User size={16} color="white" /> : <Bot size={16} color="var(--primary)" />}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-sm" style={{ fontWeight: 600, marginBottom: 2, color: msg.role === "user" ? "var(--text)" : "var(--primary)" }}>
                {msg.role === "user" ? "You" : "AI Assistant"}
              </div>
              <div
                className="card"
                style={{
                  background: msg.role === "user" ? "var(--bg-card)" : "var(--bg)",
                  whiteSpace: "pre-wrap",
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                }}
              >
                {msg.content}

                {/* Proposed changes */}
                {msg.proposed_changes && msg.proposed_changes.length > 0 && (
                  <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => toggleExpanded(msg.id)}
                      style={{ marginBottom: "0.5rem" }}
                    >
                      {expandedChanges[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span style={{ marginLeft: 4 }}>
                        {msg.proposed_changes.length} proposed change{msg.proposed_changes.length > 1 ? "s" : ""}
                      </span>
                    </button>

                    {expandedChanges[msg.id] && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {msg.proposed_changes.map((change, i) => (
                          <div
                            key={i}
                            style={{
                              background: "var(--bg-card)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius)",
                              padding: "0.75rem",
                            }}
                          >
                            <div className="flex items-center gap-sm" style={{ marginBottom: "0.4rem" }}>
                              <span className="badge badge-blue">{CHANGE_LABELS[change.section] || change.section}</span>
                              <span className="text-sm">{change.description}</span>
                            </div>

                            {/* Show current vs new for scoring_criteria */}
                            {change.section === "scoring_criteria" && Array.isArray(change.new_value) && (
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>New criteria:</div>
                                {change.new_value.map((c, j) => (
                                  <div key={j} style={{ marginLeft: "0.75rem" }}>
                                    {c.name} — {c.weight}% — {c.description}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Show filter rules */}
                            {change.section === "filter_rules" && typeof change.new_value === "object" && (
                              <pre style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem", whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)" }}>
                                {JSON.stringify(change.new_value, null, 2)}
                              </pre>
                            )}

                            {/* Show prompt changes */}
                            {change.section === "scoring_prompt" && typeof change.new_value === "string" && (
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem", maxHeight: 200, overflow: "auto" }}>
                                {change.new_value}
                              </div>
                            )}

                            {/* Show extraction field changes */}
                            {change.section === "extraction_fields" && Array.isArray(change.new_value) && (
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                                {change.new_value.map((f, j) => (
                                  <span key={j} className={`badge ${f.enabled ? "badge-green" : "badge-gray"}`} style={{ marginRight: 4, marginBottom: 2 }}>
                                    {f.label || f.key}: {f.enabled ? "ON" : "OFF"}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Apply button */}
                    {msg.changes_applied ? (
                      <div className="flex items-center gap-sm mt-sm" style={{ color: "var(--success)", fontSize: "0.85rem" }}>
                        <Check size={16} /> Changes applied
                      </div>
                    ) : (
                      <button
                        className="btn-success btn-sm mt-sm"
                        onClick={() => handleApply(msg.id)}
                        disabled={applying[msg.id]}
                      >
                        {applying[msg.id] ? (
                          <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} /> Applying...</>
                        ) : (
                          <><Check size={14} style={{ marginRight: 4 }} /> Apply Changes</>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-card-hover)" }}>
              <Bot size={16} color="var(--primary)" />
            </div>
            <div className="card" style={{ background: "var(--bg)" }}>
              <div className="flex items-center gap-sm">
                <span className="spinner" /> <span className="text-sm text-muted">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "0.75rem 0 0" }}>
        <div className="flex gap-sm">
          <textarea
            ref={inputRef}
            rows={2}
            placeholder={hasApiKey ? "Describe what you want to change..." : "Configure your OpenRouter API key in Settings first"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending || !hasApiKey}
            style={{ flex: 1, resize: "none", minHeight: "2.5rem" }}
          />
          <button
            className="btn-primary"
            onClick={() => handleSend()}
            disabled={sending || !input.trim() || !hasApiKey}
            style={{ alignSelf: "flex-end", height: 42 }}
          >
            {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
