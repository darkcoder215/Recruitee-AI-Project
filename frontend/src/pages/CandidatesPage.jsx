import { useState, useEffect, useCallback } from "react";
import {
  listCandidates,
  scoreCandidate,
  bulkScoreCandidates,
  archiveCandidate,
  listJobs,
} from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreBadge from "../components/ScoreBadge";
import CandidateDetailModal from "../components/CandidateDetailModal";
import { Search, Brain, Archive, ChevronLeft, ChevronRight, Filter } from "lucide-react";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [jobs, setJobs] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [recFilter, setRecFilter] = useState("");
  const [minScore, setMinScore] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Selection
  const [selected, setSelected] = useState(new Set());
  const [scoring, setScoring] = useState({});
  const [bulkScoring, setBulkScoring] = useState(false);

  // Detail modal
  const [detailId, setDetailId] = useState(null);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (search) params.search = search;
      if (jobFilter) params.job_id = jobFilter;
      if (recFilter) params.recommendation = recFilter;
      if (minScore) params.min_score = minScore;

      const data = await listCandidates(params);
      setCandidates(data.candidates);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, jobFilter, recFilter, minScore, sortBy, sortOrder]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    listJobs().then(setJobs).catch(() => {});
  }, []);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  async function handleScore(id) {
    setScoring((s) => ({ ...s, [id]: true }));
    setMessage(null);
    try {
      await scoreCandidate(id);
      await loadCandidates();
      setMessage({ type: "success", text: "Candidate scored successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setScoring((s) => ({ ...s, [id]: false }));
    }
  }

  async function handleBulkScore() {
    if (selected.size === 0) return;
    setBulkScoring(true);
    setMessage(null);
    try {
      const result = await bulkScoreCandidates([...selected]);
      await loadCandidates();
      setSelected(new Set());
      setMessage({
        type: result.failed > 0 ? "error" : "success",
        text: `Scored ${result.scored} candidate(s).${result.failed > 0 ? ` ${result.failed} failed.` : ""}`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBulkScoring(false);
    }
  }

  async function handleArchive(id) {
    try {
      await archiveCandidate(id);
      await loadCandidates();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((c) => c.id)));
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="page-header">
        <h2>Candidates ({total})</h2>
        {selected.size > 0 && (
          <button
            className="btn-primary"
            onClick={handleBulkScore}
            disabled={bulkScoring}
          >
            {bulkScoring ? (
              <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Scoring {selected.size}...</>
            ) : (
              <><Brain size={16} style={{ marginRight: 4 }} /> Score Selected ({selected.size})</>
            )}
          </button>
        )}
      </div>

      {message && (
        <div className={message.type === "error" ? "error-box" : "success-box"}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-md">
        <div className="flex items-center gap-md" style={{ flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 250px" }}>
            <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              style={{ paddingLeft: "2rem" }}
              placeholder="Search by name, email, job title..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select style={{ width: "auto", minWidth: 160 }} value={jobFilter} onChange={(e) => { setJobFilter(e.target.value); setPage(1); }}>
            <option value="">All Jobs</option>
            {jobs.map((j) => (
              <option key={j.recruitee_id} value={j.recruitee_id}>{j.title}</option>
            ))}
          </select>
          <select style={{ width: "auto", minWidth: 140 }} value={recFilter} onChange={(e) => { setRecFilter(e.target.value); setPage(1); }}>
            <option value="">All Recommendations</option>
            <option value="strong_yes">Strong Yes</option>
            <option value="yes">Yes</option>
            <option value="maybe">Maybe</option>
            <option value="no">No</option>
            <option value="strong_no">Strong No</option>
          </select>
          <input
            type="number"
            style={{ width: 120 }}
            placeholder="Min score"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => { setMinScore(e.target.value); setPage(1); }}
          />
          <select style={{ width: "auto" }} value={`${sortBy}:${sortOrder}`} onChange={(e) => {
            const [sb, so] = e.target.value.split(":");
            setSortBy(sb);
            setSortOrder(so);
            setPage(1);
          }}>
            <option value="created_at:desc">Newest First</option>
            <option value="created_at:asc">Oldest First</option>
            <option value="ai_score:desc">Highest Score</option>
            <option value="ai_score:asc">Lowest Score</option>
            <option value="name:asc">Name A-Z</option>
            <option value="name:desc">Name Z-A</option>
          </select>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <LoadingSpinner text="Loading candidates..." />
      ) : candidates.length === 0 ? (
        <div className="empty-state">
          <Filter size={48} style={{ margin: "0 auto 1rem", display: "block", opacity: 0.3 }} />
          <p>No candidates found.</p>
          <p className="text-sm text-muted mt-sm">Import candidates from the Jobs page or adjust your filters.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === candidates.length && candidates.length > 0}
                      onChange={toggleSelectAll}
                      style={{ width: "auto" }}
                    />
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
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        style={{ width: "auto" }}
                      />
                    </td>
                    <td>
                      <button
                        className="btn-secondary btn-sm"
                        style={{ border: "none", background: "none", padding: 0, color: "var(--text)", fontWeight: 500, cursor: "pointer", textAlign: "left" }}
                        onClick={() => setDetailId(c.id)}
                      >
                        {c.name}
                      </button>
                      {c.email && <div className="text-sm text-muted">{c.email}</div>}
                    </td>
                    <td className="text-sm">{c.job_title || <span className="text-dim">—</span>}</td>
                    <td>
                      {c.current_stage ? (
                        <span className="badge badge-blue">{c.current_stage}</span>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </td>
                    <td>
                      <ScoreBadge score={c.ai_score} recommendation={c.ai_recommendation} />
                      {c.scoring_error && (
                        <div className="text-sm" style={{ color: "var(--danger)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.scoring_error}
                        </div>
                      )}
                    </td>
                    <td className="text-sm text-muted">{c.source || "—"}</td>
                    <td>
                      <div className="flex gap-sm">
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleScore(c.id)}
                          disabled={scoring[c.id]}
                          title="Score with AI"
                        >
                          {scoring[c.id] ? (
                            <span className="spinner" style={{ width: 12, height: 12 }} />
                          ) : (
                            <Brain size={13} />
                          )}
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleArchive(c.id)}
                          title="Archive"
                        >
                          <Archive size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-md">
              <span className="text-sm text-muted">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-sm">
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {detailId && (
        <CandidateDetailModal
          candidateId={detailId}
          onClose={() => setDetailId(null)}
          onUpdate={loadCandidates}
        />
      )}
    </div>
  );
}
