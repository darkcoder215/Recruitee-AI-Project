import { useState, useEffect } from "react";
import { getCandidateStats, listJobs } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { Users, Brain, TrendingUp, Briefcase } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statsData, jobsData] = await Promise.allSettled([
        getCandidateStats(),
        listJobs(),
      ]);
      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (jobsData.status === "fulfilled") setJobs(jobsData.value);
      if (statsData.status === "rejected" && jobsData.status === "rejected") {
        setError("Could not connect to backend. Is the server running?");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!error && !stats && (
        <div className="info-box">
          Welcome! Head to <strong>Settings</strong> to configure your API keys, then import candidates from <strong>Jobs</strong>.
        </div>
      )}

      {stats && (
        <>
          <div className="grid-4 mb-md">
            <div className="card">
              <div className="flex items-center gap-sm mb-md">
                <Users size={20} style={{ color: "var(--primary)" }} />
                <span className="text-sm text-muted">Total Candidates</span>
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{stats.total_candidates}</div>
            </div>
            <div className="card">
              <div className="flex items-center gap-sm mb-md">
                <Brain size={20} style={{ color: "var(--info)" }} />
                <span className="text-sm text-muted">AI Scored</span>
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{stats.scored_candidates}</div>
            </div>
            <div className="card">
              <div className="flex items-center gap-sm mb-md">
                <TrendingUp size={20} style={{ color: "var(--success)" }} />
                <span className="text-sm text-muted">Average Score</span>
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{stats.average_score || "—"}</div>
            </div>
            <div className="card">
              <div className="flex items-center gap-sm mb-md">
                <Briefcase size={20} style={{ color: "var(--warning)" }} />
                <span className="text-sm text-muted">Active Jobs</span>
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{jobs.length}</div>
            </div>
          </div>

          {/* Recommendation Breakdown */}
          <div className="card">
            <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>AI Recommendations Breakdown</h3>
            {stats.scored_candidates === 0 ? (
              <p className="text-sm text-muted">No scored candidates yet. Import and score candidates to see the breakdown.</p>
            ) : (
              <div className="grid-3" style={{ maxWidth: 600 }}>
                {Object.entries(stats.recommendations || {}).map(([key, count]) => (
                  <div key={key} className="flex items-center gap-sm">
                    <span className={`badge ${
                      key === "strong_yes" ? "badge-green" :
                      key === "yes" ? "badge-blue" :
                      key === "maybe" ? "badge-yellow" :
                      key === "no" ? "badge-red" :
                      "badge-red"
                    }`}>
                      {key.replace("_", " ")}
                    </span>
                    <span className="font-mono">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
