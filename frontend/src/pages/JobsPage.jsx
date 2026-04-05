import { useState, useEffect } from "react";
import { listJobs, syncJobs, importCandidates } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { RefreshCw, Download, MapPin, Building } from "lucide-react";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const data = await listJobs();
      setJobs(data);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await syncJobs();
      setMessage({
        type: "success",
        text: `Synced ${result.imported} job(s) from Recruitee.${result.errors?.length ? ` ${result.errors.length} error(s).` : ""}`,
      });
      await loadJobs();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSyncing(false);
    }
  }

  async function handleImport(recruiteeId, title) {
    setImporting((prev) => ({ ...prev, [recruiteeId]: true }));
    setMessage(null);
    try {
      const result = await importCandidates(recruiteeId);
      setMessage({
        type: "success",
        text: `Imported ${result.candidates_imported} candidate(s) from "${title}".${result.errors?.length ? ` Warnings: ${result.errors.join(", ")}` : ""}`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setImporting((prev) => ({ ...prev, [recruiteeId]: false }));
    }
  }

  if (loading) return <LoadingSpinner text="Loading jobs..." />;

  return (
    <div>
      <div className="page-header">
        <h2>Jobs</h2>
        <button className="btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <><span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} /> Syncing...</>
          ) : (
            <><RefreshCw size={16} style={{ marginRight: 4 }} /> Sync from Recruitee</>
          )}
        </button>
      </div>

      {message && (
        <div className={message.type === "error" ? "error-box" : "success-box"}>
          {message.text}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="empty-state">
          <Briefcase size={48} style={{ margin: "0 auto 1rem", display: "block", opacity: 0.3 }} />
          <p>No jobs imported yet.</p>
          <p className="text-sm text-muted mt-sm">
            Click "Sync from Recruitee" to pull your job offers.
          </p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Department</th>
                <th>Location</th>
                <th>Status</th>
                <th>Pipeline Stages</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 500 }}>{job.title}</td>
                  <td>
                    {job.department ? (
                      <span className="flex items-center gap-sm text-sm">
                        <Building size={13} /> {job.department}
                      </span>
                    ) : (
                      <span className="text-dim">—</span>
                    )}
                  </td>
                  <td>
                    {job.location ? (
                      <span className="flex items-center gap-sm text-sm">
                        <MapPin size={13} /> {job.location}
                      </span>
                    ) : (
                      <span className="text-dim">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${job.status === "open" || job.status === "published" ? "badge-green" : "badge-gray"}`}>
                      {job.status || "unknown"}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {job.pipeline_stages?.length
                      ? job.pipeline_stages.map((s) => s.name).join(" → ")
                      : "—"}
                  </td>
                  <td>
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleImport(job.recruitee_id, job.title)}
                      disabled={importing[job.recruitee_id]}
                    >
                      {importing[job.recruitee_id] ? (
                        <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} /> Importing...</>
                      ) : (
                        <><Download size={13} style={{ marginRight: 4 }} /> Import Candidates</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Briefcase(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={props.style}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
}
