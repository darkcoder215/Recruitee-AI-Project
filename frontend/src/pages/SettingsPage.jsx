import { useState, useEffect } from "react";
import { getSettings, updateSettings, testRecruitee, testOpenRouter } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { Save, TestTube, Eye, EyeOff, MessageSquare, Plus, Trash2, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ recruitee_api_token: "", recruitee_company_id: "", openrouter_api_key: "", ai_model: "", scoring_prompt: "" });
  const [criteria, setCriteria] = useState([]);
  const [filterRules, setFilterRules] = useState({});
  const [extractionFields, setExtractionFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({ recruitee: false, openrouter: false });
  const [message, setMessage] = useState(null);
  const [showTokens, setShowTokens] = useState({ recruitee: false, openrouter: false });
  const [activeTab, setActiveTab] = useState("api");

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data);
      setForm({ recruitee_api_token: "", recruitee_company_id: data.recruitee_company_id || "", openrouter_api_key: "", ai_model: data.ai_model || "openai/gpt-4o-mini", scoring_prompt: data.scoring_prompt || "" });
      setCriteria(data.scoring_criteria?.length ? data.scoring_criteria : [
        { name: "مطابقة المهارات", weight: 30, description: "مدى توافق مهارات المرشح مع متطلبات الوظيفة" },
        { name: "الخبرة العملية", weight: 25, description: "مدى صلة وعمق الخبرة العملية" },
        { name: "المؤهلات التعليمية", weight: 15, description: "توافق الخلفية التعليمية" },
        { name: "الملاءمة الثقافية", weight: 15, description: "التوافق مع ثقافة الفريق والشركة" },
        { name: "مهارات التواصل", weight: 15, description: "جودة التواصل الكتابي في الطلب" },
      ]);
      setFilterRules(data.filter_rules || { auto_reject: { enabled: false, min_score: 20, action: "archive" }, auto_advance: { enabled: false, min_score: 80, target_stage: "مقابلة" }, must_have_keywords: [], nice_to_have_keywords: [], exclude_keywords: [], min_experience_years: null, required_education: null, preferred_sources: [] });
      setExtractionFields(data.extraction_fields?.length ? data.extraction_fields : [
        { key: "name", label: "الاسم الكامل", enabled: true }, { key: "email", label: "البريد الإلكتروني", enabled: true },
        { key: "phone", label: "رقم الهاتف", enabled: true }, { key: "resume_text", label: "نص السيرة الذاتية", enabled: true },
        { key: "cover_letter", label: "خطاب التقديم", enabled: true }, { key: "source", label: "مصدر التقديم", enabled: true },
        { key: "tags", label: "الوسوم", enabled: true }, { key: "custom_fields", label: "حقول مخصصة", enabled: true },
        { key: "photo_url", label: "الصورة", enabled: false },
      ]);
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setLoading(false); }
  }

  async function handleSaveAPI(e) {
    e.preventDefault(); setSaving(true); setMessage(null);
    try {
      const payload = {};
      if (form.recruitee_company_id) payload.recruitee_company_id = form.recruitee_company_id;
      if (form.recruitee_api_token) payload.recruitee_api_token = form.recruitee_api_token;
      if (form.openrouter_api_key) payload.openrouter_api_key = form.openrouter_api_key;
      if (form.ai_model) payload.ai_model = form.ai_model;
      if (form.scoring_prompt) payload.scoring_prompt = form.scoring_prompt;
      if (!Object.keys(payload).length) { setMessage({ type: "error", text: "لا توجد تغييرات." }); setSaving(false); return; }
      const data = await updateSettings(payload); setSettings(data);
      setForm((f) => ({ ...f, recruitee_api_token: "", openrouter_api_key: "" }));
      setMessage({ type: "success", text: "تم حفظ إعدادات API." });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setSaving(false); }
  }

  async function handleSaveCriteria() { setSaving(true); setMessage(null); try { setSettings(await updateSettings({ scoring_criteria: criteria })); setMessage({ type: "success", text: "تم حفظ معايير التقييم." }); } catch (err) { setMessage({ type: "error", text: err.message }); } finally { setSaving(false); } }
  async function handleSaveFilters() { setSaving(true); setMessage(null); try { setSettings(await updateSettings({ filter_rules: filterRules })); setMessage({ type: "success", text: "تم حفظ قواعد الفلترة." }); } catch (err) { setMessage({ type: "error", text: err.message }); } finally { setSaving(false); } }
  async function handleSaveExtraction() { setSaving(true); setMessage(null); try { setSettings(await updateSettings({ extraction_fields: extractionFields })); setMessage({ type: "success", text: "تم حفظ حقول الاستخراج." }); } catch (err) { setMessage({ type: "error", text: err.message }); } finally { setSaving(false); } }

  async function handleTestRecruitee() { setTesting((t) => ({ ...t, recruitee: true })); setMessage(null); try { setMessage({ type: "success", text: (await testRecruitee()).message }); } catch (err) { setMessage({ type: "error", text: `Recruitee: ${err.message}` }); } finally { setTesting((t) => ({ ...t, recruitee: false })); } }
  async function handleTestOpenRouter() { setTesting((t) => ({ ...t, openrouter: true })); setMessage(null); try { setMessage({ type: "success", text: (await testOpenRouter()).message }); } catch (err) { setMessage({ type: "error", text: `OpenRouter: ${err.message}` }); } finally { setTesting((t) => ({ ...t, openrouter: false })); } }

  function updateCriterion(i, field, value) { setCriteria((p) => p.map((c, j) => j === i ? { ...c, [field]: value } : c)); }
  function addCriterion() { setCriteria((p) => [...p, { name: "", weight: 0, description: "" }]); }
  function removeCriterion(i) { setCriteria((p) => p.filter((_, j) => j !== i)); }
  const totalWeight = criteria.reduce((s, c) => s + (parseInt(c.weight) || 0), 0);

  function updateRule(path, value) {
    setFilterRules((prev) => { const next = JSON.parse(JSON.stringify(prev)); const parts = path.split("."); let obj = next; for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]]; obj[parts.at(-1)] = value; return next; });
  }

  if (loading) return <LoadingSpinner text="جارٍ تحميل الإعدادات..." />;

  const tabs = [
    { id: "api", label: "مفاتيح API والنموذج" },
    { id: "scoring", label: "معايير التقييم" },
    { id: "filters", label: "قواعد الفلترة" },
    { id: "extraction", label: "حقول الاستخراج" },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>الإعدادات</h2>
        <Link to="/chat" className="btn-accent btn-sm" style={{ textDecoration: "none" }}><MessageSquare size={14} style={{ marginLeft: 4 }} /> التهيئة بالذكاء الاصطناعي</Link>
      </div>

      {message && <div className={message.type === "error" ? "error-box" : "success-box"}>{message.text}</div>}

      <div className="flex gap-sm mb-md" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
        {tabs.map((tab) => (
          <button key={tab.id} className="btn-secondary btn-sm" onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id ? { background: "rgba(0,193,122,0.1)", color: "var(--accent)", borderColor: "var(--accent)" } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── مفاتيح API ── */}
      {activeTab === "api" && (
        <form onSubmit={handleSaveAPI}>
          <div className="card mb-md">
            <h3 style={{ marginBottom: "1rem", fontSize: "1.05rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>واجهة Recruitee API</h3>
            <p className="text-sm text-muted mb-md">ابحث عن رمز API في Recruitee تحت الإعدادات &gt; التطبيقات &gt; رموز API الشخصية.</p>
            <div className="grid-2">
              <div className="form-group"><label>معرف الشركة</label><input type="text" placeholder="your-company-slug" value={form.recruitee_company_id} onChange={(e) => setForm({ ...form, recruitee_company_id: e.target.value })} /></div>
              <div className="form-group">
                <label>رمز API {settings?.recruitee_api_token_set && <span className="badge badge-green" style={{ marginRight: 4 }}>مُعيّن</span>}</label>
                <div className="flex gap-sm">
                  <input type={showTokens.recruitee ? "text" : "password"} placeholder={settings?.recruitee_api_token_set ? "••••••••  (اتركه فارغاً للإبقاء)" : "أدخل رمز API"} value={form.recruitee_api_token} onChange={(e) => setForm({ ...form, recruitee_api_token: e.target.value })} />
                  <button type="button" className="btn-secondary btn-icon" onClick={() => setShowTokens({ ...showTokens, recruitee: !showTokens.recruitee })}>{showTokens.recruitee ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={handleTestRecruitee} disabled={testing.recruitee}>
              {testing.recruitee ? <><span className="spinner" style={{ width: 14, height: 14, marginLeft: 6 }} /> جارٍ الاختبار...</> : <><TestTube size={14} style={{ marginLeft: 4 }} /> اختبار الاتصال</>}
            </button>
          </div>

          <div className="card mb-md">
            <h3 style={{ marginBottom: "1rem", fontSize: "1.05rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>واجهة OpenRouter AI</h3>
            <p className="text-sm text-muted mb-md">احصل على مفتاح API من openrouter.ai.</p>
            <div className="grid-2">
              <div className="form-group">
                <label>مفتاح API {settings?.openrouter_api_key_set && <span className="badge badge-green" style={{ marginRight: 4 }}>مُعيّن</span>}</label>
                <div className="flex gap-sm">
                  <input type={showTokens.openrouter ? "text" : "password"} placeholder={settings?.openrouter_api_key_set ? "••••••••  (اتركه فارغاً للإبقاء)" : "sk-or-..."} value={form.openrouter_api_key} onChange={(e) => setForm({ ...form, openrouter_api_key: e.target.value })} />
                  <button type="button" className="btn-secondary btn-icon" onClick={() => setShowTokens({ ...showTokens, openrouter: !showTokens.openrouter })}>{showTokens.openrouter ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div className="form-group"><label>نموذج الذكاء الاصطناعي</label>
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
              {testing.openrouter ? <><span className="spinner" style={{ width: 14, height: 14, marginLeft: 6 }} /> جارٍ الاختبار...</> : <><TestTube size={14} style={{ marginLeft: 4 }} /> اختبار الاتصال</>}
            </button>
          </div>

          <div className="card mb-md">
            <h3 style={{ marginBottom: "1rem", fontSize: "1.05rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>نص تقييم الذكاء الاصطناعي</h3>
            <p className="text-sm text-muted mb-md">النص الذي يُرسل للذكاء الاصطناعي عند تقييم المرشحين. يتم إلحاق بيانات المرشح والوظيفة تلقائياً.</p>
            <textarea rows={6} value={form.scoring_prompt} onChange={(e) => setForm({ ...form, scoring_prompt: e.target.value })} placeholder="أدخل نص التقييم المخصص..." />
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginLeft: 6 }} /> جارٍ الحفظ...</> : <><Save size={16} style={{ marginLeft: 4 }} /> حفظ إعدادات API</>}
          </button>
        </form>
      )}

      {/* ── معايير التقييم ── */}
      {activeTab === "scoring" && (
        <div>
          <div className="card mb-md">
            <div className="flex items-center justify-between mb-md">
              <div>
                <h3 style={{ fontSize: "1.05rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>معايير التقييم</h3>
                <p className="text-sm text-muted">حدد الأبعاد المرجحة المستخدمة عند تقييم المرشحين بالذكاء الاصطناعي. يجب أن يكون مجموع الأوزان 100.</p>
              </div>
              <span className={`badge ${totalWeight === 100 ? "badge-green" : "badge-yellow"}`}>المجموع: {totalWeight}%</span>
            </div>
            {criteria.map((c, i) => (
              <div key={i} className="flex items-center gap-sm mb-md" style={{ padding: "0.6rem", background: "var(--color-off-white)", borderRadius: "var(--radius)" }}>
                <GripVertical size={14} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                <input style={{ width: 180 }} placeholder="اسم المعيار" value={c.name} onChange={(e) => updateCriterion(i, "name", e.target.value)} />
                <input type="number" style={{ width: 70 }} min={0} max={100} value={c.weight} onChange={(e) => updateCriterion(i, "weight", parseInt(e.target.value) || 0)} />
                <span className="text-sm text-dim" style={{ flexShrink: 0 }}>%</span>
                <input style={{ flex: 1 }} placeholder="الوصف" value={c.description} onChange={(e) => updateCriterion(i, "description", e.target.value)} />
                <button className="btn-secondary btn-sm btn-icon" onClick={() => removeCriterion(i)} title="حذف"><Trash2 size={13} /></button>
              </div>
            ))}
            <button className="btn-secondary btn-sm" onClick={addCriterion}><Plus size={14} style={{ marginLeft: 4 }} /> إضافة معيار</button>
          </div>
          <button className="btn-primary" onClick={handleSaveCriteria} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginLeft: 6 }} /> جارٍ الحفظ...</> : <><Save size={16} style={{ marginLeft: 4 }} /> حفظ معايير التقييم</>}
          </button>
        </div>
      )}

      {/* ── قواعد الفلترة ── */}
      {activeTab === "filters" && (
        <div>
          <div className="card mb-md">
            <h3 style={{ fontSize: "1.05rem", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "1rem" }}>قواعد الفلترة الآلية</h3>
            <p className="text-sm text-muted mb-md">هذه القواعد تُطبق تلقائياً بعد تقييم كل مرشح.</p>

            <div style={{ padding: "0.85rem", background: "var(--color-off-white)", borderRadius: "var(--radius)", marginBottom: "0.75rem" }}>
              <div className="flex items-center gap-sm mb-md">
                <input type="checkbox" style={{ width: "auto" }} checked={filterRules.auto_reject?.enabled || false} onChange={(e) => updateRule("auto_reject.enabled", e.target.checked)} />
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>رفض تلقائي</span>
                <span className="text-sm text-muted">— أرشفة المرشحين بدرجة أقل من الحد الأدنى</span>
              </div>
              {filterRules.auto_reject?.enabled && (
                <div className="flex items-center gap-sm" style={{ marginRight: "1.5rem" }}>
                  <label className="text-sm">الحد الأدنى للدرجة:</label>
                  <input type="number" style={{ width: 80 }} min={0} max={100} value={filterRules.auto_reject?.min_score || 20} onChange={(e) => updateRule("auto_reject.min_score", parseInt(e.target.value) || 0)} />
                </div>
              )}
            </div>

            <div style={{ padding: "0.85rem", background: "var(--color-off-white)", borderRadius: "var(--radius)", marginBottom: "0.75rem" }}>
              <div className="flex items-center gap-sm mb-md">
                <input type="checkbox" style={{ width: "auto" }} checked={filterRules.auto_advance?.enabled || false} onChange={(e) => updateRule("auto_advance.enabled", e.target.checked)} />
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>ترقية تلقائية</span>
                <span className="text-sm text-muted">— نقل أصحاب الدرجات العالية إلى مرحلة محددة</span>
              </div>
              {filterRules.auto_advance?.enabled && (
                <div className="flex items-center gap-md" style={{ marginRight: "1.5rem", flexWrap: "wrap" }}>
                  <div className="flex items-center gap-sm"><label className="text-sm">الحد الأدنى:</label><input type="number" style={{ width: 80 }} min={0} max={100} value={filterRules.auto_advance?.min_score || 80} onChange={(e) => updateRule("auto_advance.min_score", parseInt(e.target.value) || 0)} /></div>
                  <div className="flex items-center gap-sm"><label className="text-sm">المرحلة المستهدفة:</label><input style={{ width: 160 }} value={filterRules.auto_advance?.target_stage || ""} onChange={(e) => updateRule("auto_advance.target_stage", e.target.value)} placeholder="مثال: مقابلة" /></div>
                </div>
              )}
            </div>

            <div style={{ padding: "0.85rem", background: "var(--color-off-white)", borderRadius: "var(--radius)" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>قواعد الكلمات المفتاحية</h4>
              <div className="grid-2" style={{ gap: "0.75rem" }}>
                <div className="form-group"><label>كلمات مفتاحية مطلوبة (مفصولة بفاصلة)</label><input value={(filterRules.must_have_keywords || []).join("، ")} onChange={(e) => updateRule("must_have_keywords", e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean))} placeholder="مثال: Python, React" /></div>
                <div className="form-group"><label>كلمات مفتاحية مفضلة</label><input value={(filterRules.nice_to_have_keywords || []).join("، ")} onChange={(e) => updateRule("nice_to_have_keywords", e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean))} placeholder="مثال: Docker, AWS" /></div>
                <div className="form-group"><label>كلمات مفتاحية مستبعدة</label><input value={(filterRules.exclude_keywords || []).join("، ")} onChange={(e) => updateRule("exclude_keywords", e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean))} placeholder="مثال: مبتدئ، متدرب" /></div>
                <div className="form-group"><label>مصادر مفضلة</label><input value={(filterRules.preferred_sources || []).join("، ")} onChange={(e) => updateRule("preferred_sources", e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean))} placeholder="مثال: LinkedIn، إحالة" /></div>
              </div>
              <div className="grid-2" style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
                <div className="form-group"><label>الحد الأدنى لسنوات الخبرة</label><input type="number" min={0} value={filterRules.min_experience_years ?? ""} onChange={(e) => updateRule("min_experience_years", e.target.value ? parseInt(e.target.value) : null)} placeholder="اختياري" /></div>
                <div className="form-group"><label>المؤهل التعليمي المطلوب</label><input value={filterRules.required_education || ""} onChange={(e) => updateRule("required_education", e.target.value || null)} placeholder="مثال: بكالوريوس، ماجستير" /></div>
              </div>
            </div>
          </div>
          <button className="btn-primary" onClick={handleSaveFilters} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginLeft: 6 }} /> جارٍ الحفظ...</> : <><Save size={16} style={{ marginLeft: 4 }} /> حفظ قواعد الفلترة</>}
          </button>
        </div>
      )}

      {/* ── حقول الاستخراج ── */}
      {activeTab === "extraction" && (
        <div>
          <div className="card mb-md">
            <h3 style={{ fontSize: "1.05rem", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: "0.5rem" }}>حقول الاستخراج</h3>
            <p className="text-sm text-muted mb-md">تحكم في حقول بيانات المرشح التي تُرسل لنموذج الذكاء الاصطناعي للتقييم. عطّل الحقول التي لا تريد أن يأخذها الذكاء الاصطناعي في الاعتبار.</p>
            {extractionFields.map((f, i) => (
              <div key={i} className="flex items-center gap-sm" style={{ padding: "0.6rem 0.85rem", borderBottom: i < extractionFields.length - 1 ? "1px solid var(--border)" : "none" }}>
                <input type="checkbox" style={{ width: "auto" }} checked={f.enabled} onChange={(e) => setExtractionFields((p) => p.map((ef, j) => j === i ? { ...ef, enabled: e.target.checked } : ef))} />
                <span style={{ fontWeight: 700, minWidth: 140 }}>{f.label || f.key}</span>
                <span className="text-sm text-dim font-mono" style={{ direction: "ltr" }}>{f.key}</span>
                <span className={`badge ${f.enabled ? "badge-green" : "badge-gray"}`} style={{ marginRight: "auto" }}>{f.enabled ? "يُرسل للذكاء الاصطناعي" : "مستبعد"}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={handleSaveExtraction} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, marginLeft: 6 }} /> جارٍ الحفظ...</> : <><Save size={16} style={{ marginLeft: 4 }} /> حفظ حقول الاستخراج</>}
          </button>
        </div>
      )}
    </div>
  );
}
