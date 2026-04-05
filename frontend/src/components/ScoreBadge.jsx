export default function ScoreBadge({ score, recommendation }) {
  if (score === null || score === undefined) {
    return <span className="badge badge-gray">Not scored</span>;
  }

  let colorClass = "badge-gray";
  let barColor = "#64748b";

  if (score >= 80) {
    colorClass = "badge-green";
    barColor = "#22c55e";
  } else if (score >= 60) {
    colorClass = "badge-blue";
    barColor = "#3b82f6";
  } else if (score >= 40) {
    colorClass = "badge-yellow";
    barColor = "#f59e0b";
  } else {
    colorClass = "badge-red";
    barColor = "#ef4444";
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
        <span className="text-sm text-muted">{recommendation.replace("_", " ")}</span>
      )}
    </div>
  );
}
