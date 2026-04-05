import { useState, useEffect, useCallback } from "react";
import {
  listCandidates,
  scoreCandidate,
  bulkScoreCandidates,
  archiveCandidate,
  listJobs,
  listSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
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
  search: "",
  name_contains: "",
  email_contains: "",
  resume_contains: "",
  keywords: "",
  keywords_mode: "any",
  exclude_keywords: "",
  job_id: "",
  min_score: "",
  max_score: "",
  recommendation: "",
  recommendations: "",
  stage: "",
  stages: "",
  source: "",
  sources: "",
  tags: "",
  tags_mode: "any",
  scored_only: false,
  has_resume: "",
  has_cover_letter: "",
  created_after: "",
  created_before: "",
  scored_after: "",
  scored_before: "",
  sort_by: "created_at",
  sort_order: "desc",
  is_archived: false,
};

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

  // Advanced filters
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Selection
  const [selected, setSelected] = useState(new Set());
  const [scoring, setScoring] = useState({});
  const [bulkScoring, setBulkScoring] = useState(false);

  // Detail modal
  const [detailId, setDetailId] = useState(null);

  // Debounced text search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: pageSize, include_facets: true };
      // Map filters to query params
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined && v !== false) {
          params[k] = v;
        }
      });
      // Handle booleans properly
      if (filters.scored_only) params.scored_only = true;
      if (filters.is_archived) params.is_archived = true;

      const data = await listCandidates(params);
      setCandidates(data.candidates);
      setTotal(data.total);
      if (data.facets) setFacets(data.facets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => { loadCandidates(); }, [loadCandidates]);
  useEffect(() => { listJobs().then(setJobs).catch(() => {}); }, []);
  useEffect(() => { listSavedSearches().then(setSavedSearches).catch(() => {}); }, []);

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ ...EMPTY_FILTERS });
    setSearchInput("");
    setPage(1);
  }

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => v !== "" && v !== false && v !== null && v !== undefined && v !== EMPTY_FILTERS[k]
  ).length;

  // Saved search actions
  async function handleSaveSearch() {
    if (!saveName.trim()) return;
    try {
      const saved = await createSavedSearch({
        name: saveName.trim(),
        filters: { ...filters, search: searchInput },
      });
      setSavedSearches((prev) => [saved, ...prev]);
      setSaveName("");
      setShowSaveForm(false);
      setMessage({ type: "success", text: `Search "${saved.name}" saved.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  function loadSavedSearch(saved) {
    const f = saved.filters || {};
    setFilters({ ...EMPTY_FILTERS, ...f });
    if (f.search) setSearchInput(f.search);
    else setSearchInput("");
    setPage(1);
    setMessage({ type: "success", text: `Loaded search: "${saved.name}"` });
  }

  async function handleDeleteSaved(id, name) {
    try {
      await deleteSavedSearch(id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  // Score / Archive / Select
  async function handleScore(id) {
    setScoring((s) => ({ ...s, [id]: true }));
    setMessage(null);
    try {
      await scoreCandidate(id);
      await loadCandidates();
      setMessage({ type: "success", text: "Candidate scored." });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setScoring((s) => ({ ...s, [id]: false })); }
  }

  async function handleBulkScore() {
    if (selected.size === 0) return;
    setBulkScoring(true);
    setMessage(null);
    try {
      const result = await bulkScoreCandidates([...selected]);
      await loadCandidates();
      setSelected(new Set());
      setMessage({ type: result.failed > 0 ? "error" : "success", text: `Scored ${result.scored}. ${result.failed > 0 ? `${result.failed} failed.` : ""}` });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setBulkScoring(false); }
  }

  async function handleArchive(id) {
    try { await archiveCandidate(id); await loadCandidates(); }
    catch (err) { setMessage({ type: "error", text: err.message }); }
  }

  function toggleSelect(id) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll() {
    selected.size === candidates.length ? setSelected(new Set()) : setSelected(new Set(candidates.map((c) => c.id)));
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="page-header">
        <h2>Candidates ({total})</h2>
        <div className="flex gap-sm">
          {selected.size > 0 && (
            <button className="btn-primary" onClick={handleBulkScore} disabled={bulkScoring}>
              {bulkScoring ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Scoring...</> : <><Brain size={16} style={{ marginRight: 4 }} /> Score Selected ({selected.size})</>}
            </button>
          )}
        </div>
      </div>

      {message && <div className={message.type === "error" ? "error-box" : "success-box"}>{message.text}</div>}

      {/* Search Bar + Quick Filters */}
      <div className="card mb-md">
        <div className="flex items-center gap-md" style={{ flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 280px" }}>
            <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              style={{ paddingLeft: "2rem" }}
              placeholder="Search across all fields..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select style={{ width: "auto", minWidth: 150 }} value={filters.job_id} onChange={(e) => updateFilter("job_id", e.target.value)}>
            <option value="">All Jobs</option>
            {jobs.map((j) => <option key={j.recruitee_id} value={j.recruitee_id}>{j.title}</option>)}
          </select>
          <select style={{ width: "auto", minWidth: 130 }} value={filters.recommendation} onChange={(e) => updateFilter("recommendation", e.target.value)}>
            <option value="">All Recs</option>
            <option value="strong_yes">Strong Yes</option>
            <option value="yes">Yes</option>
            <option value="maybe">Maybe</option>
            <option value="no">No</option>
            <option value="strong_no">Strong No</option>
          </select>
          <select style={{ width: "auto" }} value={`${filters.sort_by}:${filters.sort_order}`} onChange={(e) => {
            const [sb, so] = e.target.value.split(":");
            setFilters((f) => ({ ...f, sort_by: sb, sort_order: so }));
            setPage(1);
          }}>
            <option value="created_at:desc">Newest</option>
            <option value="created_at:asc">Oldest</option>
            <option value="ai_score:desc">Highest Score</option>
            <option value="ai_score:asc">Lowest Score</option>
            <option value="name:asc">Name A-Z</option>
          </select>
          <button className={`btn-secondary btn-sm ${showAdvanced ? "active" : ""}`} onClick={() => setShowAdvanced(!showAdvanced)} style={showAdvanced ? { background: "rgba(99,102,241,0.15)", color: "var(--primary)" } : {}}>
            <SlidersHorizontal size={14} style={{ marginRight: 4 }} />
            Advanced{activeFilterCount > 2 ? ` (${activeFilterCount - 2})` : ""}
            {showAdvanced ? <ChevronUp size={14} style={{ marginLeft: 4 }} /> : <ChevronDown size={14} style={{ marginLeft: 4 }} />}
          </button>
          {activeFilterCount > 0 && (
            <button className="btn-secondary btn-sm" onClick={resetFilters}><X size={14} style={{ marginRight: 2 }} /> Clear</button>
          )}
        </div>

        {/* Advanced Search Panel */}
        {showAdvanced && (
          <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
            <div className="grid-3" style={{ gap: "0.75rem" }}>
              {/* Field-specific search */}
              <div className="form-group">
                <label>Name contains</label>
                <input placeholder="e.g. John" value={filters.name_contains} onChange={(e) => updateFilter("name_contains", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email contains</label>
                <input placeholder="e.g. @gmail.com" value={filters.email_contains} onChange={(e) => updateFilter("email_contains", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Resume/CV contains</label>
                <input placeholder="e.g. machine learning" value={filters.resume_contains} onChange={(e) => updateFilter("resume_contains", e.target.value)} />
              </div>

              {/* Keyword search */}
              <div className="form-group">
                <label>Include keywords (comma-separated)</label>
                <div className="flex gap-sm">
                  <input placeholder="e.g. Python, React, AWS" value={filters.keywords} onChange={(e) => updateFilter("keywords", e.target.value)} />
                  <select style={{ width: 80 }} value={filters.keywords_mode} onChange={(e) => updateFilter("keywords_mode", e.target.value)}>
                    <option value="any">ANY</option>
                    <option value="all">ALL</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Exclude keywords (comma-separated)</label>
                <input placeholder="e.g. junior, intern" value={filters.exclude_keywords} onChange={(e) => updateFilter("exclude_keywords", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <div className="flex gap-sm">
                  <input placeholder="e.g. senior, remote" value={filters.tags} onChange={(e) => updateFilter("tags", e.target.value)} />
                  <select style={{ width: 80 }} value={filters.tags_mode} onChange={(e) => updateFilter("tags_mode", e.target.value)}>
                    <option value="any">ANY</option>
                    <option value="all">ALL</option>
                  </select>
                </div>
              </div>

              {/* Score range */}
              <div className="form-group">
                <label>Score range</label>
                <div className="flex gap-sm items-center">
                  <input type="number" min={0} max={100} placeholder="Min" value={filters.min_score} onChange={(e) => updateFilter("min_score", e.target.value)} style={{ width: "50%" }} />
                  <span className="text-dim">—</span>
                  <input type="number" min={0} max={100} placeholder="Max" value={filters.max_score} onChange={(e) => updateFilter("max_score", e.target.value)} style={{ width: "50%" }} />
                </div>
              </div>
              <div className="form-group">
                <label>Pipeline stage</label>
                <input placeholder="e.g. Interview" value={filters.stage} onChange={(e) => updateFilter("stage", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Source</label>
                <input placeholder="e.g. LinkedIn" value={filters.source} onChange={(e) => updateFilter("source", e.target.value)} />
              </div>

              {/* Content flags */}
              <div className="form-group">
                <label>Has resume/CV</label>
                <select value={filters.has_resume} onChange={(e) => updateFilter("has_resume", e.target.value)}>
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Has cover letter</label>
                <select value={filters.has_cover_letter} onChange={(e) => updateFilter("has_cover_letter", e.target.value)}>
                  <option value="">Any</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="form-group">
                <label>Only scored candidates</label>
                <select value={filters.scored_only ? "true" : ""} onChange={(e) => updateFilter("scored_only", e.target.value === "true")}>
                  <option value="">All</option>
                  <option value="true">Scored only</option>
                </select>
              </div>

              {/* Date filters */}
              <div className="form-group">
                <label>Created after</label>
                <input type="date" value={filters.created_after} onChange={(e) => updateFilter("created_after", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Created before</label>
                <input type="date" value={filters.created_before} onChange={(e) => updateFilter("created_before", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Show archived</label>
                <select value={filters.is_archived ? "true" : ""} onChange={(e) => updateFilter("is_archived", e.target.value === "true")}>
                  <option value="">Active only</option>
                  <option value="true">Archived only</option>
                </select>
              </div>
            </div>

            {/* Save search */}
            <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {!showSaveForm ? (
                <button className="btn-secondary btn-sm" onClick={() => setShowSaveForm(true)}>
                  <Save size={13} style={{ marginRight: 4 }} /> Save this search
                </button>
              ) : (
                <>
                  <input
                    style={{ width: 250 }}
                    placeholder="Search name..."
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveSearch()}
                  />
                  <button className="btn-primary btn-sm" onClick={handleSaveSearch} disabled={!saveName.trim()}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => { setShowSaveForm(false); setSaveName(""); }}>Cancel</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Saved Searches + Facets Row */}
      {(savedSearches.length > 0 || facets) && (
        <div className="flex gap-md mb-md" style={{ flexWrap: "wrap" }}>
          {/* Saved searches */}
          {savedSearches.length > 0 && (
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
              <Bookmark size={14} style={{ color: "var(--text-dim)", marginRight: 2 }} />
              {savedSearches.map((s) => (
                <span key={s.id} className="flex items-center gap-sm" style={{ display: "inline-flex" }}>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => loadSavedSearch(s)}
                    style={{ fontSize: "0.78rem" }}
                  >
                    {s.name}
                  </button>
                  <button
                    className="btn-secondary btn-sm btn-icon"
                    onClick={() => handleDeleteSaved(s.id, s.name)}
                    style={{ padding: "2px 4px", opacity: 0.5 }}
                    title="Delete"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Facet chips */}
          {facets && (
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
              {facets.scored > 0 && (
                <button className="btn-secondary btn-sm" onClick={() => updateFilter("scored_only", true)} style={{ fontSize: "0.75rem" }}>
                  <Brain size={11} style={{ marginRight: 3 }} /> Scored: {facets.scored}
                </button>
              )}
              {facets.has_resume > 0 && (
                <button className="btn-secondary btn-sm" onClick={() => updateFilter("has_resume", "true")} style={{ fontSize: "0.75rem" }}>
                  <FileText size={11} style={{ marginRight: 3 }} /> With resume: {facets.has_resume}
                </button>
              )}
              {facets.has_cover_letter > 0 && (
                <button className="btn-secondary btn-sm" onClick={() => updateFilter("has_cover_letter", "true")} style={{ fontSize: "0.75rem" }}>
                  <Mail size={11} style={{ marginRight: 3 }} /> With cover letter: {facets.has_cover_letter}
                </button>
              )}
              {Object.entries(facets.recommendations || {}).map(([rec, count]) => (
                <button key={rec} className="btn-secondary btn-sm" onClick={() => updateFilter("recommendation", rec)} style={{ fontSize: "0.75rem" }}>
                  <span className={`badge ${rec.includes("yes") ? "badge-green" : rec === "maybe" ? "badge-yellow" : "badge-red"}`} style={{ marginRight: 4 }}>
                    {rec.replace("_", " ")}
                  </span>
                  {count}
                </button>
              ))}
              {Object.entries(facets.stages || {}).slice(0, 6).map(([stage, count]) => (
                <button key={stage} className="btn-secondary btn-sm" onClick={() => updateFilter("stage", stage)} style={{ fontSize: "0.75rem" }}>
                  {stage}: {count}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <LoadingSpinner text="Searching..." />
      ) : candidates.length === 0 ? (
        <div className="empty-state">
          <Filter size={48} style={{ margin: "0 auto 1rem", display: "block", opacity: 0.3 }} />
          <p>No candidates match your search.</p>
          <p className="text-sm text-muted mt-sm">Try adjusting your filters or import candidates from the Jobs page.</p>
          {activeFilterCount > 0 && (
            <button className="btn-secondary btn-sm mt-md" onClick={resetFilters}>Clear all filters</button>
          )}
        </div>
      ) : (
        <>
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={selected.size === candidates.length && candidates.length > 0} onChange={toggleSelectAll} style={{ width: "auto" }} />
                  </th>
                  <th>Candidate</th>
                  <th>Job</th>
                  <th>Stage</th>
                  <th>AI Score</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} style={{ width: "auto" }} /></td>
                    <td>
                      <button style={{ border: "none", background: "none", padding: 0, color: "var(--text)", fontWeight: 500, cursor: "pointer", textAlign: "left", fontSize: "0.85rem" }} onClick={() => setDetailId(c.id)}>
                        {c.name}
                      </button>
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
                        <button className="btn-primary btn-sm" onClick={() => handleScore(c.id)} disabled={scoring[c.id]} title="Score with AI">
                          {scoring[c.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Brain size={13} />}
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => handleArchive(c.id)} title="Archive"><Archive size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-md">
              <span className="text-sm text-muted">Page {page} of {totalPages} ({total} total)</span>
              <div className="flex gap-sm">
                <button className="btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={14} /> Prev</button>
                <button className="btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next <ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {detailId && <CandidateDetailModal candidateId={detailId} onClose={() => setDetailId(null)} onUpdate={loadCandidates} />}
    </div>
  );
}
