import { useState, useEffect, useRef } from "react";
import { getChatHistory, sendChatMessage, applyChatChanges, clearChatHistory, getSettings } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { Send, Check, Trash2, Bot, User, ChevronDown, ChevronUp, Settings } from "lucide-react";

const CHANGE_LABELS = {
  scoring_prompt: "نص التقييم",
  scoring_criteria: "معايير التقييم",
  filter_rules: "قواعد الفلترة",
  extraction_fields: "حقول الاستخراج",
};

const SUGGESTION_CHIPS = [
  "قيّم بناءً على المهارات التقنية والخبرة فقط",
  "ارفض تلقائياً المرشحين بدرجة أقل من 30",
  "أضف 'القيادة' و'التواصل' كمعايير تقييم",
  "ارقِ تلقائياً المرشحين فوق 85 إلى مرحلة المقابلة",
  "أريد التركيز على مطوري Python و React",
  "استبعد المرشحين بدون خطاب تقديم من التقييم",
  "اجعل وزن الملاءمة الثقافية أعلى من التعليم",
  "أرني إعداد التقييم الحالي",
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

  useEffect(() => { loadInitial(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadInitial() {
    try {
      const [h, s] = await Promise.allSettled([getChatHistory(), getSettings()]);
      if (h.status === "fulfilled") setMessages(h.value.messages);
      if (s.status === "fulfilled") setSettings(s.value);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput(""); setSending(true); setError(null);
    const temp = { id: Date.now(), role: "user", content: msg, created_at: new Date().toISOString() };
    setMessages((p) => [...p, temp]);
    try {
      const res = await sendChatMessage(msg);
      setMessages((p) => { const f = p.filter((m) => m.id !== temp.id); return [...f, { ...temp }, res]; });
    } catch (err) { setError(err.message); setMessages((p) => p.filter((m) => m.id !== temp.id)); }
    finally { setSending(false); inputRef.current?.focus(); }
  }

  async function handleApply(messageId) {
    setApplying((p) => ({ ...p, [messageId]: true })); setError(null);
    try {
      await applyChatChanges(messageId);
      setMessages((p) => p.map((m) => m.id === messageId ? { ...m, changes_applied: true } : m));
      try { setSettings(await getSettings()); } catch {}
    } catch (err) { setError(err.message); }
    finally { setApplying((p) => ({ ...p, [messageId]: false })); }
  }

  async function handleClear() {
    if (!confirm("هل تريد مسح سجل المحادثة بالكامل؟")) return;
    try { await clearChatHistory(); setMessages([]); } catch (err) { setError(err.message); }
  }

  function handleKeyDown(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }

  if (loading) return <LoadingSpinner text="جارٍ تحميل المحادثة..." />;
  const hasApiKey = settings?.openrouter_api_key_set;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 3rem)" }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <h2>مساعد التهيئة الذكي</h2>
          <p className="text-sm text-muted">صِف كيف تريد فلترة المرشحين وتقييمهم — سيقوم الذكاء الاصطناعي بتهيئة الإعدادات تلقائياً.</p>
        </div>
        {messages.length > 0 && (
          <button className="btn-secondary btn-sm" onClick={handleClear}><Trash2 size={14} style={{ marginLeft: 4 }} /> مسح المحادثة</button>
        )}
      </div>

      {error && <div className="error-box" style={{ flexShrink: 0 }}>{error}</div>}
      {!hasApiKey && (
        <div className="info-box" style={{ flexShrink: 0 }}>
          <Settings size={14} style={{ marginLeft: 6 }} /> قم بتهيئة مفتاح OpenRouter API في <strong>الإعدادات</strong> لبدء استخدام المساعد.
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <Bot size={48} style={{ color: "var(--accent)", marginBottom: "0.75rem" }} />
              <h3 style={{ fontSize: "1.15rem", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "0.5rem" }}>كيف أساعدك في تهيئة نظام الفرز؟</h3>
              <p className="text-sm text-muted" style={{ maxWidth: 500 }}>أخبرني كيف تريد تقييم المرشحين. يمكنني تعديل معايير التقييم وقواعد الفلترة وحقول الاستخراج ونص التقييم.</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", maxWidth: 700 }}>
              {SUGGESTION_CHIPS.map((chip, i) => (
                <button key={i} className="btn-secondary btn-sm" style={{ fontSize: "0.78rem" }} onClick={() => handleSend(chip)} disabled={sending || !hasApiKey}>{chip}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: msg.role === "user" ? "var(--color-black)" : "var(--color-off-white)", marginTop: 2 }}>
              {msg.role === "user" ? <User size={16} color="white" /> : <Bot size={16} color="var(--accent)" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-sm" style={{ fontWeight: 700, marginBottom: 2, color: msg.role === "user" ? "var(--text)" : "var(--accent)" }}>
                {msg.role === "user" ? "أنت" : "المساعد الذكي"}
              </div>
              <div className="card" style={{ background: msg.role === "user" ? "var(--bg-card)" : "var(--color-off-white)", whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.7, boxShadow: msg.role === "user" ? "var(--shadow-sm)" : "none" }}>
                {msg.content}

                {msg.proposed_changes?.length > 0 && (
                  <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                    <button className="btn-secondary btn-sm" onClick={() => setExpandedChanges((p) => ({ ...p, [msg.id]: !p[msg.id] }))} style={{ marginBottom: "0.5rem" }}>
                      {expandedChanges[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span style={{ marginRight: 4 }}>{msg.proposed_changes.length} تعديل مقترح</span>
                    </button>

                    {expandedChanges[msg.id] && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {msg.proposed_changes.map((change, i) => (
                          <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem" }}>
                            <div className="flex items-center gap-sm" style={{ marginBottom: "0.4rem" }}>
                              <span className="badge badge-blue">{CHANGE_LABELS[change.section] || change.section}</span>
                              <span className="text-sm">{change.description}</span>
                            </div>
                            {change.section === "scoring_criteria" && Array.isArray(change.new_value) && (
                              <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "0.5rem" }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>المعايير الجديدة:</div>
                                {change.new_value.map((c, j) => <div key={j} style={{ marginRight: "0.75rem" }}>{c.name} — {c.weight}% — {c.description}</div>)}
                              </div>
                            )}
                            {change.section === "filter_rules" && typeof change.new_value === "object" && (
                              <pre style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.5rem", whiteSpace: "pre-wrap", direction: "ltr", textAlign: "left" }}>{JSON.stringify(change.new_value, null, 2)}</pre>
                            )}
                            {change.section === "scoring_prompt" && typeof change.new_value === "string" && (
                              <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "0.5rem", maxHeight: 200, overflow: "auto" }}>{change.new_value}</div>
                            )}
                            {change.section === "extraction_fields" && Array.isArray(change.new_value) && (
                              <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "0.5rem" }}>
                                {change.new_value.map((f, j) => <span key={j} className={`badge ${f.enabled ? "badge-green" : "badge-gray"}`} style={{ marginLeft: 4, marginBottom: 2 }}>{f.label || f.key}: {f.enabled ? "مفعّل" : "معطّل"}</span>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.changes_applied ? (
                      <div className="flex items-center gap-sm mt-sm" style={{ color: "var(--success)", fontSize: "0.85rem" }}><Check size={16} /> تم تطبيق التعديلات</div>
                    ) : (
                      <button className="btn-accent btn-sm mt-sm" onClick={() => handleApply(msg.id)} disabled={applying[msg.id]}>
                        {applying[msg.id] ? <><span className="spinner" style={{ width: 12, height: 12, marginLeft: 4 }} /> جارٍ التطبيق...</> : <><Check size={14} style={{ marginLeft: 4 }} /> تطبيق التعديلات</>}
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
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-off-white)" }}>
              <Bot size={16} color="var(--accent)" />
            </div>
            <div className="card" style={{ background: "var(--color-off-white)", boxShadow: "none" }}>
              <div className="flex items-center gap-sm"><span className="spinner" /> <span className="text-sm text-muted">جارٍ التفكير...</span></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "0.75rem 0 0" }}>
        <div className="flex gap-sm">
          <textarea ref={inputRef} rows={2} placeholder={hasApiKey ? "صِف ما تريد تغييره..." : "قم بتهيئة مفتاح OpenRouter API في الإعدادات أولاً"} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={sending || !hasApiKey} style={{ flex: 1, resize: "none", minHeight: "2.5rem" }} />
          <button className="btn-accent" onClick={() => handleSend()} disabled={sending || !input.trim() || !hasApiKey} style={{ alignSelf: "flex-end", height: 42 }}>
            {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
