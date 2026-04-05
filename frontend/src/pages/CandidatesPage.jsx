import { useState, useEffect, useCallback } from "react";
import {
  listCandidates, scoreCandidate, bulkScoreCandidates, archiveCandidate,
  listJobs, listSavedSearches, createSavedSearch, deleteSavedSearch,
} from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreBadge from "../components/ScoreBadge";
import CandidateDetailModal from "../components/CandidateDetailModal";
import {
  Search, Brain, Archive, ChevronLeft, ChevronRight, Filter,
  Save, Bookmark, X, SlidersHorizontal, ChevronDown, ChevronUp,
  FileText, Mail,
} from "lucide-react";

const EMPTY_FILTERS = {
  search: "", name_contains: "", email_contains: "", resume_contains: "",
  keywords: "", keywords_mode: "any", exclude_keywords: "",
  job_id: "", min_score: "", max_score: "", recommendation: "", recommendations: "",
  stage: "", stages: "", source: "", sources: "", tags: "", tags_mode: "any",
  scored_only: false, has_resume: "", has_cover_letter: "",
  created_after: "", created_before: "", scored_after: "", scored_before: "",
  sort_by: "created_at", sort_order: "desc", is_archived: false,
};

const REC_LABELS = { strong_yes: "نعم بشدة", yes: "نعم", maybe: "ربما", no: "لا", strong_no: "لا بشدة" };

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [scoring, setScoring] = useState({});
  const [bulkScoring, setBulkScoring] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setFilters((f) => ({ ...f, search: searchInput })); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadCandidates = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, page_size: pageSize, include_facets: true };
      Object.entries(filters).forEach(([k, v]) => { if (v !== "" && v !== null && v !== undefined && v !== false) params[k] = v; });
      if (filters.scored_only) params.scored_only = true;
      if (filters.is_archived) params.is_archived = true;
      const data = await listCandidates(params);
      setCandidates(data.candidates); setTotal(data.total);
      if (data.facets) setFacets(data.facets);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [page, pageSize, filters]);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);
  useEffect(() => { listJobs().then(setJobs).catch(() => {}); }, []);
  useEffect(() => { listSavedSearches().then(setSavedSearches).catch(() => {}); }, []);

  function updateFilter(key, value) { setFilters((f) => ({ ...f, [key]: value })); setPage(1); }
  function resetFilters() { setFilters({ ...EMPTY_FILTERS }); setSearchInput(""); setPage(1); }

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v !== "" && v !== false && v !== null && v !== undefined && v !== EMPTY_FILTERS[k]).length;

  async function handleSaveSearch() {
    if (!saveName.trim()) return;
    try {
      const saved = await createSavedSearch({ name: saveName.trim(), filters: { ...filters, search: searchInput } });
      setSavedSearches((p) => [saved, ...p]); setSaveName(""); setShowSaveForm(false);
      setMessage({ type: "success", text: `تم حفظ البحث "${saved.name}".` });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  function loadSavedSearch(saved) {
    const f = saved.filters || {};
    setFilters({ ...EMPTY_FILTERS, ...f }); setSearchInput(f.search || ""); setPage(1);
    setMessage({ type: "success", text: `تم تحميل البحث: "${saved.name}"` });
  }

  async function handleDeleteSaved(id) {
    try { await deleteSavedSearch(id); setSavedSearches((p) => p.filter((s) => s.id !== id)); }
    catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  async function handleScore(id) {
    setScoring((s) => ({ ...s, [id]: true })); setMessage(null);
    try { await scoreCandidate(id); await loadCandidates(); setMessage({ type: "success", text: "تم تقييم المرشح." }); }
    catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setScoring((s) => ({ ...s, [id]: false })); }
  }

  async function handleBulkScore() {
    if (selected.size === 0) return;
    setBulkScoring(true); setMessage(null);
    try {
      const r = await bulkScoreCandidates([...selected]); await loadCandidates(); setSelected(new Set());
      setMessage({ type: r.failed > 0 ? "error" : "success", text: `تم تقييم ${r.scored} مرشح.${r.failed > 0 ? ` فشل ${r.failed}.` : ""}` });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setBulkScoring(false); }
  }

  async function handleArchive(id) {
    try { await archiveCandidate(id); await loadCandidates(); }
    catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  function toggleSelect(id) { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleSelectAll() { selected.size === candidates.length ? setSelected(new Set()) : setSelected(new Set(candidates.map((c) => c.id))); }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="page-header">
        <h2>المرشحون ({total})</h2>
        {selected.size > 0 && (
          <button className="btn-accent" onClick={handleBulkScore} disabled={bulkScoring}>
            {bulkScoring ? <><span className="spinner" style={{ width: 14, height: 14, marginLeft: 6 }} /> جارٍ التقييم...</> : <><Brain size={16} style={{ marginLeft: 4 }} /> تقييم المحدد ({selected.size})</>}
          </button>
        )}
      </div>

      {message && <div className={message.type === "error" ? "error-box" : "success-box"}>{message.text}</div>}

      {/* شريط البحث والفلاتر */}
      <div className="card mb-md">
        <div className="flex items-center gap-md" style={{ flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 280px" }}>
            <Search size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
            <input style={{ paddingRight: "2rem" }} placeholder="البحث في جميع الحقول..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <select style={{ width: "auto", minWidth: 150 }} value={filters.job_id} onChange={(e) => updateFilter("job_id", e.target.value)}>
            <option value="">جميع الوظائف</option>
            {jobs.map((j) => <option key={j.recruitee_id} value={j.recruitee_id}>{j.title}</option>)}
          </select>
          <select style={{ width: "auto", minWidth: 130 }} value={filters.recommendation} onChange={(e) => updateFilter("recommendation", e.target.value)}>
            <option value="">جميع التوصيات</option>
            <option value="strong_yes">نعم بشدة</option>
            <option value="yes">نعم</option>
            <option value="maybe">ربما</option>
            <option value="no">لا</option>
            <option value="strong_no">لا بشدة</option>
          </select>
          <select style={{ width: "auto" }} value={`${filters.sort_by}:${filters.sort_order}`} onChange={(e) => { const [sb, so] = e.target.value.split(":"); setFilters((f) => ({ ...f, sort_by: sb, sort_order: so })); setPage(1); }}>
            <option value="created_at:desc">الأحدث</option>
            <option value="created_at:asc">الأقدم</option>
            <option value="ai_score:desc">أعلى درجة</option>
            <option value="ai_score:asc">أقل درجة</option>
            <option value="name:asc">الاسم أ-ي</option>
          </select>
          <button className={`btn-secondary btn-sm`} onClick={() => setShowAdvanced(!showAdvanced)} style={showAdvanced ? { background: "rgba(0,193,122,0.1)", color: "var(--accent)", borderColor: "var(--accent)" } : {}}>
            <SlidersHorizontal size={14} style={{ marginLeft: 4 }} />
            بحث متقدم{activeFilterCount > 2 ? ` (${activeFilterCount - 2})` : ""}
            {showAdvanced ? <ChevronUp size={14} style={{ marginRight: 4 }} /> : <ChevronDown size={14} style={{ marginRight: 4 }} />}
          </button>
          {activeFilterCount > 0 && <button className="btn-secondary btn-sm" onClick={resetFilters}><X size={14} style={{ marginLeft: 2 }} /> مسح</button>}
        </div>

        {showAdvanced && (
          <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
            <div className="grid-3" style={{ gap: "0.75rem" }}>
              <div className="form-group"><label>الاسم يحتوي على</label><input placeholder="مثال: أحمد" value={filters.name_contains} onChange={(e) => updateFilter("name_contains", e.target.value)} /></div>
              <div className="form-group"><label>البريد يحتوي على</label><input placeholder="مثال: @gmail.com" value={filters.email_contains} onChange={(e) => updateFilter("email_contains", e.target.value)} /></div>
              <div className="form-group"><label>السيرة الذاتية تحتوي على</label><input placeholder="مثال: تعلم الآلة" value={filters.resume_contains} onChange={(e) => updateFilter("resume_contains", e.target.value)} /></div>
              <div className="form-group">
                <label>كلمات مفتاحية مطلوبة (مفصولة بفاصلة)</label>
                <div className="flex gap-sm">
                  <input placeholder="مثال: Python, React, AWS" value={filters.keywords} onChange={(e) => updateFilter("keywords", e.target.value)} />
                  <select style={{ width: 80 }} value={filters.keywords_mode} onChange={(e) => updateFilter("keywords_mode", e.target.value)}>
                    <option value="any">أي</option><option value="all">الكل</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>كلمات مفتاحية مستبعدة</label><input placeholder="مثال: مبتدئ، متدرب" value={filters.exclude_keywords} onChange={(e) => updateFilter("exclude_keywords", e.target.value)} /></div>
              <div className="form-group">
                <label>الوسوم (مفصولة بفاصلة)</label>
                <div className="flex gap-sm">
                  <input placeholder="مثال: خبير، عن بُعد" value={filters.tags} onChange={(e) => updateFilter("tags", e.target.value)} />
                  <select style={{ width: 80 }} value={filters.tags_mode} onChange={(e) => updateFilter("tags_mode", e.target.value)}>
                    <option value="any">أي</option><option value="all">الكل</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>نطاق الدرجة</label>
                <div className="flex gap-sm items-center">
                  <input type="number" min={0} max={100} placeholder="الحد الأدنى" value={filters.min_score} onChange={(e) => updateFilter("min_score", e.target.value)} style={{ width: "50%" }} />
                  <span className="text-dim">—</span>
                  <input type="number" min={0} max={100} placeholder="الحد الأقصى" value={filters.max_score} onChange={(e) => updateFilter("max_score", e.target.value)} style={{ width: "50%" }} />
                </div>
              </div>
              <div className="form-group"><label>مرحلة التوظيف</label><input placeholder="مثال: مقابلة" value={filters.stage} onChange={(e) => updateFilter("stage", e.target.value)} /></div>
              <div className="form-group"><label>المصدر</label><input placeholder="مثال: LinkedIn" value={filters.source} onChange={(e) => updateFilter("source", e.target.value)} /></div>
              <div className="form-group"><label>يمتلك سيرة ذاتية</label><select value={filters.has_resume} onChange={(e) => updateFilter("has_resume", e.target.value)}><option value="">الكل</option><option value="true">نعم</option><option value="false">لا</option></select></div>
              <div className="form-group"><label>يمتلك خطاب تقديم</label><select value={filters.has_cover_letter} onChange={(e) => updateFilter("has_cover_letter", e.target.value)}><option value="">الكل</option><option value="true">نعم</option><option value="false">لا</option></select></div>
              <div className="form-group"><label>المُقيّمون فقط</label><select value={filters.scored_only ? "true" : ""} onChange={(e) => updateFilter("scored_only", e.target.value === "true")}><option value="">الكل</option><option value="true">المُقيّمون فقط</option></select></div>
              <div className="form-group"><label>أُنشئ بعد</label><input type="date" value={filters.created_after} onChange={(e) => updateFilter("created_after", e.target.value)} /></div>
              <div className="form-group"><label>أُنشئ قبل</label><input type="date" value={filters.created_before} onChange={(e) => updateFilter("created_before", e.target.value)} /></div>
              <div className="form-group"><label>إظهار المؤرشفين</label><select value={filters.is_archived ? "true" : ""} onChange={(e) => updateFilter("is_archived", e.target.value === "true")}><option value="">النشطون فقط</option><option value="true">المؤرشفون فقط</option></select></div>
            </div>
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {!showSaveForm ? (
                <button className="btn-secondary btn-sm" onClick={() => setShowSaveForm(true)}><Save size={13} style={{ marginLeft: 4 }} /> حفظ هذا البحث</button>
              ) : (
                <>
                  <input style={{ width: 250 }} placeholder="اسم البحث..." value={saveName} onChange={(e) => setSaveName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSaveSearch()} />
                  <button className="btn-accent btn-sm" onClick={handleSaveSearch} disabled={!saveName.trim()}>حفظ</button>
                  <button className="btn-secondary btn-sm" onClick={() => { setShowSaveForm(false); setSaveName(""); }}>إلغاء</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* عمليات البحث المحفوظة والجوانب */}
      {(savedSearches.length > 0 || facets) && (
        <div className="flex gap-md mb-md" style={{ flexWrap: "wrap" }}>
          {savedSearches.length > 0 && (
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
              <Bookmark size={14} style={{ color: "var(--color-muted)", marginLeft: 2 }} />
              {savedSearches.map((s) => (
                <span key={s.id} className="flex items-center gap-sm" style={{ display: "inline-flex" }}>
                  <button className="btn-secondary btn-sm" onClick={() => loadSavedSearch(s)} style={{ fontSize: "0.78rem" }}>{s.name}</button>
                  <button className="btn-secondary btn-sm btn-icon" onClick={() => handleDeleteSaved(s.id)} style={{ padding: "2px 4px", opacity: 0.5 }}><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
          {facets && (
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
              {facets.scored > 0 && <button className="btn-secondary btn-sm" onClick={() => updateFilter("scored_only", true)} style={{ fontSize: "0.75rem" }}><Brain size={11} style={{ marginLeft: 3 }} /> مُقيّم: {facets.scored}</button>}
              {facets.has_resume > 0 && <button className="btn-secondary btn-sm" onClick={() => updateFilter("has_resume", "true")} style={{ fontSize: "0.75rem" }}><FileText size={11} style={{ marginLeft: 3 }} /> بسيرة ذاتية: {facets.has_resume}</button>}
              {Object.entries(facets.recommendations || {}).map(([rec, count]) => (
                <button key={rec} className="btn-secondary btn-sm" onClick={() => updateFilter("recommendation", rec)} style={{ fontSize: "0.75rem" }}>
                  <span className={`badge ${rec.includes("yes") ? "badge-green" : rec === "maybe" ? "badge-yellow" : "badge-red"}`} style={{ marginLeft: 4 }}>{REC_LABELS[rec] || rec}</span> {count}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {loading ? <LoadingSpinner text="جارٍ البحث..." /> : candidates.length === 0 ? (
        <div className="empty-state">
          <Filter size={48} style={{ margin: "0 auto 1rem", display: "block", opacity: 0.3 }} />
          <p>لا يوجد مرشحون مطابقون لبحثك.</p>
          <p className="text-sm text-muted mt-sm">جرّب تعديل الفلاتر أو استورد مرشحين من صفحة الوظائف.</p>
          {activeFilterCount > 0 && <button className="btn-secondary btn-sm mt-md" onClick={resetFilters}>مسح جميع الفلاتر</button>}
        </div>
      ) : (
        <>
          <div className="table-wrap card" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" checked={selected.size === candidates.length && candidates.length > 0} onChange={toggleSelectAll} style={{ width: "auto" }} /></th>
                  <th>المرشح</th>
                  <th>الوظيفة</th>
                  <th>المرحلة</th>
                  <th>درجة الذكاء الاصطناعي</th>
                  <th>المصدر</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ width: "auto" }} /></td>
                    <td>
                      <button style={{ border: "none", background: "none", padding: 0, color: "var(--text)", fontWeight: 700, cursor: "pointer", textAlign: "right", fontSize: "0.85rem" }} onClick={() => setDetailId(c.id)}>{c.name}</button>
                      {c.email && <div className="text-sm text-muted">{c.email}</div>}
                    </td>
                    <td className="text-sm">{c.job_title || <span className="text-dim">—</span>}</td>
                    <td>{c.current_stage ? <span className="badge badge-blue">{c.current_stage}</span> : <span className="text-dim">—</span>}</td>
                    <td>
                      <ScoreBadge score={c.ai_score} recommendation={c.ai_recommendation} />
                      {c.scoring_error && <div className="text-sm" style={{ color: "var(--danger)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.scoring_error}</div>}
                    </td>
                    <td className="text-sm text-muted">{c.source || "—"}</td>
                    <td>
                      <div className="flex gap-sm">
                        <button className="btn-accent btn-sm btn-icon" onClick={() => handleScore(c.id)} disabled={scoring[c.id]} title="تقييم بالذكاء الاصطناعي">
                          {scoring[c.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Brain size={13} />}
                        </button>
                        <button className="btn-secondary btn-sm btn-icon" onClick={() => handleArchive(c.id)} title="أرشفة"><Archive size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-md">
              <span className="text-sm text-muted">صفحة {page} من {totalPages} ({total} إجمالي)</span>
              <div className="flex gap-sm">
                <button className="btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronRight size={14} /> السابق</button>
                <button className="btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>التالي <ChevronLeft size={14} /></button>
              </div>
            </div>
          )}
        </>
      )}
      {detailId && <CandidateDetailModal candidateId={detailId} onClose={() => setDetailId(null)} onUpdate={loadCandidates} />}
    </div>
  );
}
