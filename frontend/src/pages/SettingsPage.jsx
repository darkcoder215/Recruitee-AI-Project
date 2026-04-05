import { useState, useEffect } from "react";
import { getSettings, updateSettings, testRecruitee, testOpenRouter } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { Save, TestTube, Eye, EyeOff, MessageSquare, Plus, Trash2, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    recruitee_api_token: "",
    recruitee_company_id: "",
    openrouter_api_key: "",
    ai_model: "",
    scoring_prompt: "",
  });
  const [criteria, setCriteria] = useState([]);
  const [filterRules, setFilterRules] = useState({});
  const [extractionFields, setExtractionFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({ recruitee: false, openrouter: false });
  const [message, setMessage] = useState(null);
  const [showTokens, setShowTokens] = useState({ recruitee: false, openrouter: false });
  const [activeTab, setActiveTab] = useState("api"); // api, scoring, filters, extraction

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
      setForm({
        recruitee_api_token: "",
        recruitee_company_id: data.recruitee_company_id || "",
        openrouter_api_key: "",
        ai_model: data.ai_model || "openai/gpt-4o-mini",
        scoring_prompt: data.scoring_prompt || "",
      });
      setCriteria(data.scoring_criteria?.length ? data.scoring_criteria : [
        { name: "Skills Match", weight: 30, description: "How well the candidate's skills match the job requirements" },
        { name: "Experience Relevance", weight: 25, description: "Relevance and depth of work experience" },
        { name: "Education Fit", weight: 15, description: "Educational background alignment" },
        { name: "Culture Fit", weight: 15, description: "Alignment with team and company culture indicators" },
        { name: "Communication", weight: 15, description: "Quality of written communication in application" },
      ]);
      setFilterRules(data.filter_rules || {
        auto_reject: { enabled: false, min_score: 20, action: "archive" },
        auto_advance: { enabled: false, min_score: 80, target_stage: "Interview" },
        must_have_keywords: [],
        nice_to_have_keywords: [],
        exclude_keywords: [],
        min_experience_years: null,
        required_education: null,
        preferred_sources: [],
      });
      setExtractionFields(data.extraction_fields?.length ? data.extraction_fields : [
        { key: "name", label: "Full Name", enabled: true },
        { key: "email", label: "Email", enabled: true },
        { key: "phone", label: "Phone", enabled: true },
        { key: "resume_text", label: "Resume / CV Text", enabled: true },
        { key: "cover_letter", label: "Cover Letter", enabled: true },
        { key: "source", label: "Application Source", enabled: true },
        { key: "tags", label: "Tags", enabled: true },
        { key: "custom_fields", label: "Custom Fields", enabled: true },
        { key: "photo_url", label: "Photo", enabled: false },
      ]);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAPI(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {};
      if (form.recruitee_company_id) payload.recruitee_company_id = form.recruitee_company_id;
      if (form.recruitee_api_token) payload.recruitee_api_token = form.recruitee_api_token;
      if (form.openrouter_api_key) payload.openrouter_api_key = form.openrouter_api_key;
      if (form.ai_model) payload.ai_model = form.ai_model;
      if (form.scoring_prompt) payload.scoring_prompt = form.scoring_prompt;
      if (Object.keys(payload).length === 0) { setMessage({ type: "error", text: "No changes." }); setSaving(false); return; }
      const data = await updateSettings(payload);
      setSettings(data);
      setForm((f) => ({ ...f, recruitee_api_token: "", openrouter_api_key: "" }));
      setMessage({ type: "success", text: "API settings saved." });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setSaving(false); }
  }

  async function handleSaveCriteria() {
    setSaving(true);
    setMessage(null);
    try {
      const data = await updateSettings({ scoring_criteria: criteria });
      setSettings(data);
      setMessage({ type: "success", text: "Scoring criteria saved." });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setSaving(false); }
  }

  async function handleSaveFilters() {
    setSaving(true);
    setMessage(null);
    try {
      const data = await updateSettings({ filter_rules: filterRules });
      setSettings(data);
      setMessage({ type: "success", text: "Filter rules saved." });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setSaving(false); }
  }

  async function handleSaveExtraction() {
    setSaving(true);
    setMessage(null);
    try {
      const data = await updateSettings({ extraction_fields: extractionFields });
      setSettings(data);
      setMessage({ type: "success", text: "Extraction fields saved." });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setSaving(false); }
  }

  async function handleTestRecruitee() {
    setTesting((t) => ({ ...t, recruitee: true })); setMessage(null);
    try { const d = await testRecruitee(); setMessage({ type: "success", text: d.message }); }
    catch (err) { setMessage({ type: "error", text: `Recruitee: ${err.message}` }); }
    finally { setTesting((t) => ({ ...t, recruitee: false })); }
  }

  async function handleTestOpenRouter() {
    setTesting((t) => ({ ...t, openrouter: true })); setMessage(null);
    try { const d = await testOpenRouter(); setMessage({ type: "success", text: d.message }); }
    catch (err) { setMessage({ type: "error", text: `OpenRouter: ${err.message}` }); }
    finally { setTesting((t) => ({ ...t, openrouter: false })); }
  }

  // Criteria helpers
  function updateCriterion(index, field, value) {
    setCriteria((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  }
  function addCriterion() {
    setCriteria((prev) => [...prev, { name: "", weight: 0, description: "" }]);
  }
  function removeCriterion(index) {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
  }
  const totalWeight = criteria.reduce((sum, c) => sum + (parseInt(c.weight) || 0), 0);

  // Filter rules helpers
  function updateRule(path, value) {
    setFilterRules((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return next;
    });
  }

  if (loading) return <LoadingSpinner text="Loading settings..." />;

  const tabs = [
    { id: "api", label: "API Keys & Model" },
    { id: "scoring", label: "Scoring Criteria" },
    { id: "filters", label: "Filter Rules" },
    { id: "extraction", label: "Extraction Fields" },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
        <Link to="/chat" className="btn-primary btn-sm" style={{ textDecoration: "none" }}>
          <MessageSquare size={14} style={{ marginRight: 4 }} /> Configure with AI
        </Link>
      </div>

      {message && <div className={message.type === "error" ? "error-box" : "success-box"}>{message.text}</div>}

      {/* Tabs */}
      <div className="flex gap-sm mb-md" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className="btn-secondary btn-sm"
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id ? { background: "rgba(99,102,241,0.15)", color: "var(--primary)", borderColor: "var(--primary)" } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── API Keys & Model Tab ── */}
      {activeTab === "api" && (
        <form onSubmit={handleSaveAPI}>
          <div className="card mb-md">
            <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>Recruitee API</h3>
            <p className="text-sm text-muted mb-md">Find your API token in Recruitee under Settings &gt; Apps &gt; Personal API tokens.</p>
            <div className="grid-2">
              <div className="form-group">
                <label>Company ID</label>
                <input type="text" placeholder="your-company-slug" value={form.recruitee_company_id} onChange={(e) => setForm({ ...form, recruitee_company_id: e.target.value })} />
              </div>
              <div className="form-group">
                <label>API Token {settings?.recruitee_api_token_set && <span className="badge badge-green" style={{ marginLeft: 4 }}>Set</span>}</label>
                <div className="flex gap-sm">
                  <input type={showTokens.recruitee ? "text" : "password"} placeholder={settings?.recruitee_api_token_set ? "••••••••  (leave blank to keep)" : "Enter API token"} value={form.recruitee_api_token} onChange={(e) => setForm({ ...form, recruitee_api_token: e.target.value })} />
                  <button type="button" className="btn-secondary btn-icon" onClick={() => setShowTokens({ ...showTokens, recruitee: !showTokens.recruitee })}>{showTokens.recruitee ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={handleTestRecruitee} disabled={testing.recruitee}>
              {testing.recruitee ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Testing...</> : <><TestTube size={14} style={{ marginRight: 4 }} /> Test</>}
            </button>
          </div>

          <div className="card mb-md">
            <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>OpenRouter AI</h3>
            <p className="text-sm text-muted mb-md">Get your API key from openrouter.ai.</p>
            <div className="grid-2">
              <div className="form-group">
                <label>API Key {settings?.openrouter_api_key_set && <span className="badge badge-green" style={{ marginLeft: 4 }}>Set</span>}</label>
                <div className="flex gap-sm">
                  <input type={showTokens.openrouter ? "text" : "password"} placeholder={settings?.openrouter_api_key_set ? "••••••••  (leave blank to keep)" : "sk-or-..."} value={form.openrouter_api_key} onChange={(e) => setForm({ ...form, openrouter_api_key: e.target.value })} />
                  <button type="button" className="btn-secondary btn-icon" onClick={() => setShowTokens({ ...showTokens, openrouter: !showTokens.openrouter })}>{showTokens.openrouter ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div className="form-group">
                <label>AI Model</label>
                <select value={form.ai_model} onChange={(e) => setForm({ ...form, ai_model: e.target.value })}>
                  <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                  <option value="openai/gpt-4o">GPT-4o</option>
                  <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
                  <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
                  <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                  <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B</option>
                </select>
              </div>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={handleTestOpenRouter} disabled={testing.openrouter}>
              {testing.openrouter ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Testing...</> : <><TestTube size={14} style={{ marginRight: 4 }} /> Test</>}
            </button>
          </div>

          <div className="card mb-md">
            <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>AI Scoring Prompt</h3>
            <p className="text-sm text-muted mb-md">The system prompt sent to the AI when scoring. Candidate + job data is appended automatically.</p>
            <textarea rows={6} value={form.scoring_prompt} onChange={(e) => setForm({ ...form, scoring_prompt: e.target.value })} placeholder="Enter your custom scoring prompt..." />
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Saving...</> : <><Save size={16} style={{ marginRight: 4 }} /> Save API Settings</>}
          </button>
        </form>
      )}

      {/* ── Scoring Criteria Tab ── */}
      {activeTab === "scoring" && (
        <div>
          <div className="card mb-md">
            <div className="flex items-center justify-between mb-md">
              <div>
                <h3 style={{ fontSize: "1rem" }}>Scoring Criteria</h3>
                <p className="text-sm text-muted">Define the weighted dimensions used when AI scores candidates. Weights should sum to 100.</p>
              </div>
              <span className={`badge ${totalWeight === 100 ? "badge-green" : "badge-yellow"}`}>
                Total: {totalWeight}%
              </span>
            </div>

            {criteria.map((c, i) => (
              <div key={i} className="flex items-center gap-sm mb-md" style={{ padding: "0.5rem", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                <GripVertical size={14} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                <input style={{ width: 180 }} placeholder="Criterion name" value={c.name} onChange={(e) => updateCriterion(i, "name", e.target.value)} />
                <input type="number" style={{ width: 70 }} min={0} max={100} value={c.weight} onChange={(e) => updateCriterion(i, "weight", parseInt(e.target.value) || 0)} />
                <span className="text-sm text-dim" style={{ flexShrink: 0 }}>%</span>
                <input style={{ flex: 1 }} placeholder="Description" value={c.description} onChange={(e) => updateCriterion(i, "description", e.target.value)} />
                <button className="btn-secondary btn-sm btn-icon" onClick={() => removeCriterion(i)} title="Remove"><Trash2 size={13} /></button>
              </div>
            ))}

            <button className="btn-secondary btn-sm" onClick={addCriterion}><Plus size={14} style={{ marginRight: 4 }} /> Add Criterion</button>
          </div>
          <button className="btn-primary" onClick={handleSaveCriteria} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Saving...</> : <><Save size={16} style={{ marginRight: 4 }} /> Save Scoring Criteria</>}
          </button>
        </div>
      )}

      {/* ── Filter Rules Tab ── */}
      {activeTab === "filters" && (
        <div>
          <div className="card mb-md">
            <h3 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Automated Filter Rules</h3>
            <p className="text-sm text-muted mb-md">These rules run automatically after each candidate is scored.</p>

            {/* Auto-reject */}
            <div style={{ padding: "0.75rem", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", marginBottom: "0.75rem" }}>
              <div className="flex items-center gap-sm mb-md">
                <input type="checkbox" style={{ width: "auto" }} checked={filterRules.auto_reject?.enabled || false} onChange={(e) => updateRule("auto_reject.enabled", e.target.checked)} />
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Auto-Reject</span>
                <span className="text-sm text-muted">— Archive candidates scoring below a threshold</span>
              </div>
              {filterRules.auto_reject?.enabled && (
                <div className="flex items-center gap-sm" style={{ marginLeft: "1.5rem" }}>
                  <label className="text-sm">Minimum score:</label>
                  <input type="number" style={{ width: 80 }} min={0} max={100} value={filterRules.auto_reject?.min_score || 20} onChange={(e) => updateRule("auto_reject.min_score", parseInt(e.target.value) || 0)} />
                </div>
              )}
            </div>

            {/* Auto-advance */}
            <div style={{ padding: "0.75rem", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", marginBottom: "0.75rem" }}>
              <div className="flex items-center gap-sm mb-md">
                <input type="checkbox" style={{ width: "auto" }} checked={filterRules.auto_advance?.enabled || false} onChange={(e) => updateRule("auto_advance.enabled", e.target.checked)} />
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Auto-Advance</span>
                <span className="text-sm text-muted">— Move high scorers to a pipeline stage</span>
              </div>
              {filterRules.auto_advance?.enabled && (
                <div className="flex items-center gap-md" style={{ marginLeft: "1.5rem", flexWrap: "wrap" }}>
                  <div className="flex items-center gap-sm">
                    <label className="text-sm">Min score:</label>
                    <input type="number" style={{ width: 80 }} min={0} max={100} value={filterRules.auto_advance?.min_score || 80} onChange={(e) => updateRule("auto_advance.min_score", parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="flex items-center gap-sm">
                    <label className="text-sm">Target stage:</label>
                    <input style={{ width: 160 }} value={filterRules.auto_advance?.target_stage || ""} onChange={(e) => updateRule("auto_advance.target_stage", e.target.value)} placeholder="e.g. Interview" />
                  </div>
                </div>
              )}
            </div>

            {/* Keywords */}
            <div style={{ padding: "0.75rem", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)", marginBottom: "0.75rem" }}>
              <h4 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Keyword Rules</h4>
              <div className="grid-2" style={{ gap: "0.75rem" }}>
                <div className="form-group">
                  <label>Must-have keywords (comma-separated)</label>
                  <input value={(filterRules.must_have_keywords || []).join(", ")} onChange={(e) => updateRule("must_have_keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="e.g. Python, React" />
                </div>
                <div className="form-group">
                  <label>Nice-to-have keywords</label>
                  <input value={(filterRules.nice_to_have_keywords || []).join(", ")} onChange={(e) => updateRule("nice_to_have_keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="e.g. Docker, AWS" />
                </div>
                <div className="form-group">
                  <label>Exclude keywords</label>
                  <input value={(filterRules.exclude_keywords || []).join(", ")} onChange={(e) => updateRule("exclude_keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="e.g. junior, intern" />
                </div>
                <div className="form-group">
                  <label>Preferred sources</label>
                  <input value={(filterRules.preferred_sources || []).join(", ")} onChange={(e) => updateRule("preferred_sources", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="e.g. LinkedIn, referral" />
                </div>
              </div>
              <div className="grid-2" style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
                <div className="form-group">
                  <label>Min. experience years</label>
                  <input type="number" min={0} value={filterRules.min_experience_years ?? ""} onChange={(e) => updateRule("min_experience_years", e.target.value ? parseInt(e.target.value) : null)} placeholder="Optional" />
                </div>
                <div className="form-group">
                  <label>Required education</label>
                  <input value={filterRules.required_education || ""} onChange={(e) => updateRule("required_education", e.target.value || null)} placeholder="e.g. Bachelor's, Master's" />
                </div>
              </div>
            </div>
          </div>
          <button className="btn-primary" onClick={handleSaveFilters} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Saving...</> : <><Save size={16} style={{ marginRight: 4 }} /> Save Filter Rules</>}
          </button>
        </div>
      )}

      {/* ── Extraction Fields Tab ── */}
      {activeTab === "extraction" && (
        <div>
          <div className="card mb-md">
            <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Extraction Fields</h3>
            <p className="text-sm text-muted mb-md">Control which candidate fields are sent to the AI model for scoring. Disable fields you don't want the AI to consider.</p>

            {extractionFields.map((f, i) => (
              <div key={i} className="flex items-center gap-sm" style={{ padding: "0.5rem 0.75rem", borderBottom: i < extractionFields.length - 1 ? "1px solid var(--border)" : "none" }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={f.enabled}
                  onChange={(e) => {
                    setExtractionFields((prev) => prev.map((ef, j) => j === i ? { ...ef, enabled: e.target.checked } : ef));
                  }}
                />
                <span style={{ fontWeight: 500, minWidth: 140 }}>{f.label || f.key}</span>
                <span className="text-sm text-dim font-mono">{f.key}</span>
                <span className={`badge ${f.enabled ? "badge-green" : "badge-gray"}`} style={{ marginLeft: "auto" }}>
                  {f.enabled ? "Sent to AI" : "Excluded"}
                </span>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={handleSaveExtraction} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Saving...</> : <><Save size={16} style={{ marginRight: 4 }} /> Save Extraction Fields</>}
          </button>
        </div>
      )}
    </div>
  );
}
