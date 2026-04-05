import { useState, useEffect } from "react";
import { getSettings, updateSettings, testRecruitee, testOpenRouter } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { Save, TestTube, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    recruitee_api_token: "",
    recruitee_company_id: "",
    openrouter_api_key: "",
    ai_model: "",
    scoring_prompt: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({ recruitee: false, openrouter: false });
  const [message, setMessage] = useState(null);
  const [showTokens, setShowTokens] = useState({ recruitee: false, openrouter: false });

  useEffect(() => {
    loadSettings();
  }, []);

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
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
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

      if (Object.keys(payload).length === 0) {
        setMessage({ type: "error", text: "No changes to save." });
        setSaving(false);
        return;
      }

      const data = await updateSettings(payload);
      setSettings(data);
      setForm((f) => ({ ...f, recruitee_api_token: "", openrouter_api_key: "" }));
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestRecruitee() {
    setTesting((t) => ({ ...t, recruitee: true }));
    setMessage(null);
    try {
      const data = await testRecruitee();
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: `Recruitee test failed: ${err.message}` });
    } finally {
      setTesting((t) => ({ ...t, recruitee: false }));
    }
  }

  async function handleTestOpenRouter() {
    setTesting((t) => ({ ...t, openrouter: true }));
    setMessage(null);
    try {
      const data = await testOpenRouter();
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: `OpenRouter test failed: ${err.message}` });
    } finally {
      setTesting((t) => ({ ...t, openrouter: false }));
    }
  }

  if (loading) return <LoadingSpinner text="Loading settings..." />;

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      {message && (
        <div className={message.type === "error" ? "error-box" : "success-box"}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Recruitee Section */}
        <div className="card mb-md">
          <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>Recruitee API Configuration</h3>
          <p className="text-sm text-muted mb-md">
            Connect to your Recruitee account to import candidates. Find your API token in Recruitee
            under Settings &gt; Apps &gt; Personal API tokens.
          </p>

          <div className="grid-2">
            <div className="form-group">
              <label>Company ID</label>
              <input
                type="text"
                placeholder="your-company-slug"
                value={form.recruitee_company_id}
                onChange={(e) => setForm({ ...form, recruitee_company_id: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>
                API Token {settings?.recruitee_api_token_set && <span className="badge badge-green" style={{ marginLeft: 4 }}>Set</span>}
              </label>
              <div className="flex gap-sm">
                <input
                  type={showTokens.recruitee ? "text" : "password"}
                  placeholder={settings?.recruitee_api_token_set ? "••••••••  (leave blank to keep)" : "Enter API token"}
                  value={form.recruitee_api_token}
                  onChange={(e) => setForm({ ...form, recruitee_api_token: e.target.value })}
                />
                <button
                  type="button"
                  className="btn-secondary btn-icon"
                  onClick={() => setShowTokens({ ...showTokens, recruitee: !showTokens.recruitee })}
                  title="Toggle visibility"
                >
                  {showTokens.recruitee ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handleTestRecruitee}
            disabled={testing.recruitee}
          >
            {testing.recruitee ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Testing...</> : <><TestTube size={14} style={{ marginRight: 4 }} /> Test Connection</>}
          </button>
        </div>

        {/* OpenRouter Section */}
        <div className="card mb-md">
          <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>OpenRouter AI Configuration</h3>
          <p className="text-sm text-muted mb-md">
            Configure the AI model used for scoring candidates. Get your API key from openrouter.ai.
          </p>

          <div className="grid-2">
            <div className="form-group">
              <label>
                API Key {settings?.openrouter_api_key_set && <span className="badge badge-green" style={{ marginLeft: 4 }}>Set</span>}
              </label>
              <div className="flex gap-sm">
                <input
                  type={showTokens.openrouter ? "text" : "password"}
                  placeholder={settings?.openrouter_api_key_set ? "••••••••  (leave blank to keep)" : "sk-or-..."}
                  value={form.openrouter_api_key}
                  onChange={(e) => setForm({ ...form, openrouter_api_key: e.target.value })}
                />
                <button
                  type="button"
                  className="btn-secondary btn-icon"
                  onClick={() => setShowTokens({ ...showTokens, openrouter: !showTokens.openrouter })}
                  title="Toggle visibility"
                >
                  {showTokens.openrouter ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>AI Model</label>
              <select
                value={form.ai_model}
                onChange={(e) => setForm({ ...form, ai_model: e.target.value })}
              >
                <option value="openai/gpt-4o-mini">GPT-4o Mini (fast, affordable)</option>
                <option value="openai/gpt-4o">GPT-4o (balanced)</option>
                <option value="anthropic/claude-sonnet-4">Claude Sonnet 4 (high quality)</option>
                <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku (fast)</option>
                <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</option>
                <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={handleTestOpenRouter}
            disabled={testing.openrouter}
          >
            {testing.openrouter ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Testing...</> : <><TestTube size={14} style={{ marginRight: 4 }} /> Test Connection</>}
          </button>
        </div>

        {/* Scoring Prompt */}
        <div className="card mb-md">
          <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>AI Scoring Prompt</h3>
          <p className="text-sm text-muted mb-md">
            Customize the system prompt used when AI scores candidates. The candidate and job details
            are automatically appended.
          </p>
          <div className="form-group">
            <textarea
              rows={6}
              value={form.scoring_prompt}
              onChange={(e) => setForm({ ...form, scoring_prompt: e.target.value })}
              placeholder="Enter your custom scoring prompt..."
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Saving...</> : <><Save size={16} style={{ marginRight: 4 }} /> Save Settings</>}
        </button>
      </form>
    </div>
  );
}
