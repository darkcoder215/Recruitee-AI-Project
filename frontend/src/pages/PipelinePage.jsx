import { useState, useEffect } from "react";
import { listCandidates, listJobs, moveCandidateStage } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreBadge from "../components/ScoreBadge";
import CandidateDetailModal from "../components/CandidateDetailModal";
import { Columns3 } from "lucide-react";

const DEFAULT_STAGES = ["تقديم", "فرز أولي", "مقابلة", "عرض", "توظيف", "مرفوض"];

export default function PipelinePage() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [moving, setMoving] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [dragItem, setDragItem] = useState(null);

  useEffect(() => { loadJobs(); loadCandidates(); }, []);
  useEffect(() => { loadCandidates(); }, [selectedJob]);

  useEffect(() => {
    if (selectedJob) {
      const job = jobs.find((j) => String(j.recruitee_id) === String(selectedJob));
      if (job?.pipeline_stages?.length > 0) { setStages(job.pipeline_stages.map((s) => s.name)); return; }
    }
    const cs = [...new Set(candidates.map((c) => c.current_stage).filter(Boolean))];
    setStages(cs.length > 0 ? [...new Set([...DEFAULT_STAGES, ...cs])] : DEFAULT_STAGES);
  }, [selectedJob, jobs, candidates]);

  async function loadJobs() { try { setJobs(await listJobs()); } catch {} }

  async function loadCandidates() {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (selectedJob) params.job_id = selectedJob;
      setCandidates((await listCandidates(params)).candidates);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function getCandidatesForStage(stage) {
    return candidates.filter((c) => !c.current_stage ? stage === stages[0] : c.current_stage === stage);
  }

  async function handleDrop(candidateId, targetStage) {
    setMoving(candidateId);
    try { await moveCandidateStage(candidateId, targetStage); await loadCandidates(); }
    catch (err) { setError(err.message); }
    finally { setMoving(null); setDragItem(null); }
  }

  function handleDragStart(e, id) { setDragItem(id); e.dataTransfer.effectAllowed = "move"; }
  function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
  function handleDropOnStage(e, stage) { e.preventDefault(); if (dragItem) handleDrop(dragItem, stage); }

  if (loading && candidates.length === 0) return <LoadingSpinner text="جارٍ تحميل مسار التوظيف..." />;

  return (
    <div>
      <div className="page-header">
        <h2>مسار التوظيف</h2>
        <select style={{ width: "auto", minWidth: 200 }} value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)}>
          <option value="">جميع الوظائف</option>
          {jobs.map((j) => <option key={j.recruitee_id} value={j.recruitee_id}>{j.title}</option>)}
        </select>
      </div>

      {error && <div className="error-box">{error}</div>}

      {candidates.length === 0 ? (
        <div className="empty-state">
          <Columns3 size={48} style={{ margin: "0 auto 1rem", display: "block", opacity: 0.3 }} />
          <p>لا يوجد مرشحون في المسار بعد.</p>
          <p className="text-sm text-muted mt-sm">استورد المرشحين من صفحة الوظائف أولاً.</p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "1rem", minHeight: "calc(100vh - 180px)" }}>
          {stages.map((stage) => {
            const sc = getCandidatesForStage(stage);
            return (
              <div key={stage} onDragOver={handleDragOver} onDrop={(e) => handleDropOnStage(e, stage)}
                style={{ minWidth: 260, maxWidth: 300, flex: "1 0 260px", background: "var(--bg-card)", borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{stage}</span>
                  <span className="badge badge-gray">{sc.length}</span>
                </div>
                <div style={{ padding: "0.5rem", flex: 1, overflowY: "auto" }}>
                  {sc.map((c) => (
                    <div key={c.id} draggable onDragStart={(e) => handleDragStart(e, c.id)} onClick={() => setDetailId(c.id)}
                      style={{ padding: "0.65rem 0.85rem", background: moving === c.id ? "var(--bg-card-hover)" : "var(--color-off-white)", borderRadius: "var(--radius)", marginBottom: "0.4rem", cursor: "grab", opacity: moving === c.id ? 0.6 : 1, transition: "all 0.15s" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 2 }}>{c.name}</div>
                      {c.job_title && <div className="text-sm text-dim" style={{ marginBottom: 4 }}>{c.job_title}</div>}
                      <ScoreBadge score={c.ai_score} recommendation={c.ai_recommendation} />
                    </div>
                  ))}
                  {sc.length === 0 && <div className="text-sm text-dim" style={{ textAlign: "center", padding: "1rem 0.5rem" }}>لا يوجد مرشحون</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailId && <CandidateDetailModal candidateId={detailId} onClose={() => setDetailId(null)} onUpdate={loadCandidates} />}
    </div>
  );
}
