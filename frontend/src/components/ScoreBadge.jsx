const REC_LABELS = {
  strong_yes: "نعم بشدة",
  yes: "نعم",
  maybe: "ربما",
  no: "لا",
  strong_no: "لا بشدة",
};

export default function ScoreBadge({ score, recommendation }) {
  if (score === null || score === undefined) {
    return <span className="badge badge-gray">غير مُقيّم</span>;
  }

  let colorClass = "badge-gray";
  let barColor = "#494C6B";

  if (score >= 80) {
    colorClass = "badge-green";
    barColor = "#00C17A";
  } else if (score >= 60) {
    colorClass = "badge-blue";
    barColor = "#0072F9";
  } else if (score >= 40) {
    colorClass = "badge-yellow";
    barColor = "#FFBC0A";
  } else {
    colorClass = "badge-red";
    barColor = "#F24935";
  }

  return (
    <div className="flex items-center gap-sm">
      <span className={`badge ${colorClass}`}>{score}</span>
      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{ width: `${score}%`, background: barColor }}
        />
      </div>
      {recommendation && (
        <span className="text-sm text-muted">{REC_LABELS[recommendation] || recommendation}</span>
      )}
    </div>
  );
}
