import { useState, useEffect } from "react";
import { listJobs, syncJobs, importCandidates } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { RefreshCw, Download, MapPin, Building, Briefcase } from "lucide-react";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    try { setJobs(await listJobs()); }
    catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setLoading(false); }
  }

  async function handleSync() {
    setSyncing(true); setMessage(null);
    try {
      const result = await syncJobs();
      setMessage({ type: "success", text: `تم مزامنة ${result.imported} وظيفة من Recruitee.${result.errors?.length ? ` ${result.errors.length} خطأ.` : ""}` });
      await loadJobs();
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setSyncing(false); }
  }

  async function handleImport(recruiteeId, title) {
    setImporting((prev) => ({ ...prev, [recruiteeId]: true })); setMessage(null);
    try {
      const result = await importCandidates(recruiteeId);
      setMessage({ type: "success", text: `تم استيراد ${result.candidates_imported} مرشح من "${title}".${result.errors?.length ? ` تنبيهات: ${result.errors.join("، ")}` : ""}` });
    } catch (err) { setMessage({ type: "error", text: err.message }); }
    finally { setImporting((prev) => ({ ...prev, [recruiteeId]: false })); }
  }

  if (loading) return <LoadingSpinner text="جارٍ تحميل الوظائف..." />;

  return (
    <div>
      <div className="page-header">
        <h2>الوظائف</h2>
        <button className="btn-accent" onClick={handleSync} disabled={syncing}>
          {syncing ? <><span className="spinner" style={{ width: 14, height: 14, marginLeft: 6 }} /> جارٍ المزامنة...</> : <><RefreshCw size={16} style={{ marginLeft: 4 }} /> مزامنة من Recruitee</>}
        </button>
      </div>

      {message && <div className={message.type === "error" ? "error-box" : "success-box"}>{message.text}</div>}

      {jobs.length === 0 ? (
        <div className="empty-state">
          <Briefcase size={48} style={{ margin: "0 auto 1rem", display: "block", opacity: 0.3 }} />
          <p>لا توجد وظائف مستوردة بعد.</p>
          <p className="text-sm text-muted mt-sm">اضغط "مزامنة من Recruitee" لسحب عروض الوظائف.</p>
        </div>
      ) : (
        <div className="table-wrap card" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th>المسمى الوظيفي</th>
                <th>القسم</th>
                <th>الموقع</th>
                <th>الحالة</th>
                <th>مراحل التوظيف</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td style={{ fontWeight: 700 }}>{job.title}</td>
                  <td>
                    {job.department ? <span className="flex items-center gap-sm text-sm"><Building size={13} /> {job.department}</span> : <span className="text-dim">—</span>}
                  </td>
                  <td>
                    {job.location ? <span className="flex items-center gap-sm text-sm"><MapPin size={13} /> {job.location}</span> : <span className="text-dim">—</span>}
                  </td>
                  <td>
                    <span className={`badge ${job.status === "open" || job.status === "published" ? "badge-green" : "badge-gray"}`}>
                      {job.status === "open" ? "مفتوح" : job.status === "published" ? "منشور" : job.status === "closed" ? "مغلق" : job.status || "غير معروف"}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {job.pipeline_stages?.length ? job.pipeline_stages.map((s) => s.name).join(" ← ") : "—"}
                  </td>
                  <td>
                    <button className="btn-primary btn-sm" onClick={() => handleImport(job.recruitee_id, job.title)} disabled={importing[job.recruitee_id]}>
                      {importing[job.recruitee_id] ? <><span className="spinner" style={{ width: 12, height: 12, marginLeft: 4 }} /> جارٍ الاستيراد...</> : <><Download size={13} style={{ marginLeft: 4 }} /> استيراد المرشحين</>}
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
