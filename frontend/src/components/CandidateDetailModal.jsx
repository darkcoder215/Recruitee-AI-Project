import { useState, useEffect } from "react";
import { getCandidate, scoreCandidate, moveCandidateStage } from "../lib/api";
import ScoreBadge from "./ScoreBadge";
import LoadingSpinner from "./LoadingSpinner";
import { X, Brain, ChevronLeft, CheckCircle, AlertCircle } from "lucide-react";

export default function CandidateDetailModal({ candidateId, onClose, onUpdate }) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const [newStage, setNewStage] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => { loadCandidate(); }, [candidateId]);

  async function loadCandidate() {
    setLoading(true);
    try { setCandidate(await getCandidate(candidateId)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleScore() {
    setScoring(true); setError(null); setMessage(null);
    try {
      setCandidate(await scoreCandidate(candidateId));
      setMessage("تم تقييم المرشح بنجاح.");
      onUpdate?.();
    } catch (err) { setError(err.message); }
    finally { setScoring(false); }
  }

  async function handleMoveStage() {
    if (!newStage.trim()) return;
    setMovingStage(true); setError(null); setMessage(null);
    try {
      setCandidate(await moveCandidateStage(candidateId, newStage.trim()));
      setNewStage("");
      setMessage(`تم النقل إلى مرحلة "${newStage.trim()}".`);
      onUpdate?.();
    } catch (err) { setError(err.message); }
    finally { setMovingStage(false); }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card" style={{ width: "100%", maxWidth: 700, maxHeight: "90vh", overflow: "auto", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, left: 12, background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", padding: 4 }}>
          <X size={20} />
        </button>

        {loading ? (
          <LoadingSpinner text="جارٍ تحميل بيانات المرشح..." />
        ) : error && !candidate ? (
          <div className="error-box">{error}</div>
        ) : candidate ? (
          <div>
            <div className="mb-md">
              <h3 style={{ fontSize: "1.2rem", fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 4 }}>{candidate.name}</h3>
              <div className="text-sm text-muted">
                {candidate.email && <span>{candidate.email}</span>}
                {candidate.email && candidate.phone && <span> &middot; </span>}
                {candidate.phone && <span>{candidate.phone}</span>}
              </div>
              {candidate.job_title && (
                <div className="text-sm mt-sm">تقدّم لوظيفة: <strong>{candidate.job_title}</strong></div>
              )}
              {candidate.current_stage && <span className="badge badge-blue mt-sm">{candidate.current_stage}</span>}
            </div>

            {error && <div className="error-box">{error}</div>}
            {message && <div className="success-box">{message}</div>}

            <div className="card mb-md" style={{ background: "var(--color-off-white)", boxShadow: "none" }}>
              <div className="flex items-center justify-between mb-md">
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>تقييم الذكاء الاصطناعي</h4>
                <button className="btn-accent btn-sm" onClick={handleScore} disabled={scoring}>
                  {scoring ? <><span className="spinner" style={{ width: 12, height: 12, marginLeft: 4 }} /> جارٍ التقييم...</> : <><Brain size={13} style={{ marginLeft: 4 }} /> {candidate.ai_score !== null ? "إعادة التقييم" : "تقييم"}</>}
                </button>
              </div>

              {candidate.ai_score !== null && candidate.ai_score !== undefined ? (
                <>
                  <ScoreBadge score={candidate.ai_score} recommendation={candidate.ai_recommendation} />
                  {candidate.ai_summary && <p className="text-sm mt-md" style={{ lineHeight: 1.7 }}>{candidate.ai_summary}</p>}
                  {candidate.ai_strengths?.length > 0 && (
                    <div className="mt-md">
                      <span className="text-sm" style={{ fontWeight: 700, color: "var(--success)" }}>نقاط القوة:</span>
                      <ul style={{ margin: "4px 1.2rem 0 0", fontSize: "0.85rem" }}>
                        {candidate.ai_strengths.map((s, i) => (
                          <li key={i} className="flex items-center gap-sm" style={{ marginBottom: 2 }}>
                            <CheckCircle size={12} style={{ color: "var(--success)", flexShrink: 0 }} /> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {candidate.ai_weaknesses?.length > 0 && (
                    <div className="mt-md">
                      <span className="text-sm" style={{ fontWeight: 700, color: "var(--warning)" }}>نقاط الضعف:</span>
                      <ul style={{ margin: "4px 1.2rem 0 0", fontSize: "0.85rem" }}>
                        {candidate.ai_weaknesses.map((w, i) => (
                          <li key={i} className="flex items-center gap-sm" style={{ marginBottom: 2 }}>
                            <AlertCircle size={12} style={{ color: "var(--warning)", flexShrink: 0 }} /> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {candidate.ai_model_used && (
                    <div className="text-sm text-dim mt-md">النموذج: {candidate.ai_model_used} &middot; تاريخ التقييم: {new Date(candidate.ai_scored_at).toLocaleString("ar")}</div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">لم يتم التقييم بعد. اضغط "تقييم" لتقييم هذا المرشح بالذكاء الاصطناعي.</p>
              )}
              {candidate.scoring_error && <div className="error-box mt-sm" style={{ fontSize: "0.8rem" }}>{candidate.scoring_error}</div>}
            </div>

            <div className="card mb-md" style={{ background: "var(--color-off-white)", boxShadow: "none" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.75rem" }}>نقل في مسار التوظيف</h4>
              <div className="flex gap-sm">
                <input placeholder="أدخل اسم المرحلة الجديدة..." value={newStage} onChange={(e) => setNewStage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleMoveStage()} />
                <button className="btn-accent btn-sm" onClick={handleMoveStage} disabled={movingStage || !newStage.trim()}>
                  {movingStage ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <><ChevronLeft size={14} /> نقل</>}
                </button>
              </div>
            </div>

            {candidate.tags?.length > 0 && (
              <div className="mb-md">
                <span className="text-sm text-muted" style={{ fontWeight: 700 }}>الوسوم: </span>
                {candidate.tags.map((tag, i) => <span key={i} className="badge badge-gray" style={{ marginLeft: 4 }}>{tag}</span>)}
              </div>
            )}
            {candidate.source && <div className="text-sm text-muted">المصدر: {candidate.source}</div>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
