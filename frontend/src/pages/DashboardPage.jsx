import { useState, useEffect } from "react";
import { getCandidateStats, listJobs } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { Users, Brain, TrendingUp, Briefcase } from "lucide-react";

const REC_LABELS = {
  strong_yes: "نعم بشدة",
  yes: "نعم",
  maybe: "ربما",
  no: "لا",
  strong_no: "لا بشدة",
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [statsData, jobsData] = await Promise.allSettled([getCandidateStats(), listJobs()]);
      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (jobsData.status === "fulfilled") setJobs(jobsData.value);
      if (statsData.status === "rejected" && jobsData.status === "rejected") {
        setError("تعذر الاتصال بالخادم. تأكد من تشغيل الخادم الخلفي.");
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header">
        <h2>لوحة التحكم</h2>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!error && !stats && (
        <div className="info-box">
          مرحباً! توجه إلى <strong>الإعدادات</strong> لتهيئة مفاتيح API، ثم استورد المرشحين من صفحة <strong>الوظائف</strong>.
        </div>
      )}

      {stats && (
        <>
          <div className="grid-4 mb-md">
            <div className="card">
              <div className="flex items-center gap-sm mb-md">
                <Users size={20} style={{ color: "var(--accent)" }} />
                <span className="text-sm text-muted">إجمالي المرشحين</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900 }}>{stats.total_candidates}</div>
            </div>
            <div className="card">
              <div className="flex items-center gap-sm mb-md">
                <Brain size={20} style={{ color: "var(--info)" }} />
                <span className="text-sm text-muted">تم تقييمهم بالذكاء الاصطناعي</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900 }}>{stats.scored_candidates}</div>
            </div>
            <div className="card">
              <div className="flex items-center gap-sm mb-md">
                <TrendingUp size={20} style={{ color: "var(--success)" }} />
                <span className="text-sm text-muted">متوسط الدرجات</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900 }}>{stats.average_score || "—"}</div>
            </div>
            <div className="card">
              <div className="flex items-center gap-sm mb-md">
                <Briefcase size={20} style={{ color: "var(--warning)" }} />
                <span className="text-sm text-muted">الوظائف النشطة</span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 900 }}>{jobs.length}</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>توزيع توصيات الذكاء الاصطناعي</h3>
            {stats.scored_candidates === 0 ? (
              <p className="text-sm text-muted">لا يوجد مرشحون مُقيّمون بعد. استورد المرشحين وقيّمهم لعرض التوزيع.</p>
            ) : (
              <div className="grid-3" style={{ maxWidth: 600 }}>
                {Object.entries(stats.recommendations || {}).map(([key, count]) => (
                  <div key={key} className="flex items-center gap-sm">
                    <span className={`badge ${
                      key === "strong_yes" ? "badge-green" :
                      key === "yes" ? "badge-blue" :
                      key === "maybe" ? "badge-yellow" :
                      "badge-red"
                    }`}>
                      {REC_LABELS[key] || key}
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
