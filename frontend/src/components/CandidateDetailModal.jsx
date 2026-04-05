import { useState, useEffect } from "react";
import { getCandidate, scoreCandidate, moveCandidateStage } from "../lib/api";
import ScoreBadge from "./ScoreBadge";
import LoadingSpinner from "./LoadingSpinner";
import { X, Brain, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";

export default function CandidateDetailModal({ candidateId, onClose, onUpdate }) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [movingStage, setMovingStage] = useState(false);
  const [newStage, setNewStage] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadCandidate();
  }, [candidateId]);

  async function loadCandidate() {
    setLoading(true);
    try {
      const data = await getCandidate(candidateId);
      setCandidate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleScore() {
    setScoring(true);
    setError(null);
    setMessage(null);
    try {
      const data = await scoreCandidate(candidateId);
      setCandidate(data);
      setMessage("Candidate scored successfully.");
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setScoring(false);
    }
  }

  async function handleMoveStage() {
    if (!newStage.trim()) return;
    setMovingStage(true);
    setError(null);
    setMessage(null);
    try {
      const data = await moveCandidateStage(candidateId, newStage.trim());
      setCandidate(data);
      setNewStage("");
      setMessage(`Moved to "${newStage.trim()}" stage.`);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setMovingStage(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: "100%", maxWidth: 700, maxHeight: "90vh",
          overflow: "auto", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12,
            background: "none", border: "none", color: "var(--text-muted)",
            cursor: "pointer", padding: 4,
          }}
        >
          <X size={20} />
        </button>

        {loading ? (
          <LoadingSpinner text="Loading candidate..." />
        ) : error && !candidate ? (
          <div className="error-box">{error}</div>
        ) : candidate ? (
          <div>
            {/* Header */}
            <div className="mb-md">
              <h3 style={{ fontSize: "1.2rem", marginBottom: 4 }}>{candidate.name}</h3>
              <div className="text-sm text-muted">
                {candidate.email && <span>{candidate.email}</span>}
                {candidate.email && candidate.phone && <span> &middot; </span>}
                {candidate.phone && <span>{candidate.phone}</span>}
              </div>
              {candidate.job_title && (
                <div className="text-sm mt-sm">
                  Applied for: <strong>{candidate.job_title}</strong>
                </div>
              )}
              {candidate.current_stage && (
                <span className="badge badge-blue mt-sm">{candidate.current_stage}</span>
              )}
            </div>

            {error && <div className="error-box">{error}</div>}
            {message && <div className="success-box">{message}</div>}

            {/* AI Score Section */}
            <div className="card mb-md" style={{ background: "var(--bg)" }}>
              <div className="flex items-center justify-between mb-md">
                <h4 style={{ fontSize: "0.9rem" }}>AI Evaluation</h4>
                <button
                  className="btn-primary btn-sm"
                  onClick={handleScore}
                  disabled={scoring}
                >
                  {scoring ? (
                    <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} /> Scoring...</>
                  ) : (
                    <><Brain size={13} style={{ marginRight: 4 }} /> {candidate.ai_score !== null ? "Re-score" : "Score"}</>
                  )}
                </button>
              </div>

              {candidate.ai_score !== null && candidate.ai_score !== undefined ? (
                <>
                  <ScoreBadge score={candidate.ai_score} recommendation={candidate.ai_recommendation} />
                  {candidate.ai_summary && (
                    <p className="text-sm mt-md" style={{ lineHeight: 1.6 }}>{candidate.ai_summary}</p>
                  )}
                  {candidate.ai_strengths?.length > 0 && (
                    <div className="mt-md">
                      <span className="text-sm" style={{ fontWeight: 600, color: "var(--success)" }}>Strengths:</span>
                      <ul style={{ margin: "4px 0 0 1.2rem", fontSize: "0.85rem" }}>
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
                      <span className="text-sm" style={{ fontWeight: 600, color: "var(--warning)" }}>Weaknesses:</span>
                      <ul style={{ margin: "4px 0 0 1.2rem", fontSize: "0.85rem" }}>
                        {candidate.ai_weaknesses.map((w, i) => (
                          <li key={i} className="flex items-center gap-sm" style={{ marginBottom: 2 }}>
                            <AlertCircle size={12} style={{ color: "var(--warning)", flexShrink: 0 }} /> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {candidate.ai_model_used && (
                    <div className="text-sm text-dim mt-md">
                      Model: {candidate.ai_model_used} &middot; Scored: {new Date(candidate.ai_scored_at).toLocaleString()}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">Not scored yet. Click "Score" to evaluate this candidate with AI.</p>
              )}

              {candidate.scoring_error && (
                <div className="error-box mt-sm" style={{ fontSize: "0.8rem" }}>{candidate.scoring_error}</div>
              )}
            </div>

            {/* Move Stage */}
            <div className="card mb-md" style={{ background: "var(--bg)" }}>
              <h4 style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}>Move Pipeline Stage</h4>
              <div className="flex gap-sm">
                <input
                  placeholder="Enter new stage name..."
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMoveStage()}
                />
                <button
                  className="btn-primary btn-sm"
                  onClick={handleMoveStage}
                  disabled={movingStage || !newStage.trim()}
                >
                  {movingStage ? (
                    <span className="spinner" style={{ width: 12, height: 12 }} />
                  ) : (
                    <><ChevronRight size={14} /> Move</>
                  )}
                </button>
              </div>
            </div>

            {/* Tags */}
            {candidate.tags?.length > 0 && (
              <div className="mb-md">
                <span className="text-sm text-muted" style={{ fontWeight: 600 }}>Tags: </span>
                {candidate.tags.map((tag, i) => (
                  <span key={i} className="badge badge-gray" style={{ marginRight: 4 }}>{tag}</span>
                ))}
              </div>
            )}

            {candidate.source && (
              <div className="text-sm text-muted">Source: {candidate.source}</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
