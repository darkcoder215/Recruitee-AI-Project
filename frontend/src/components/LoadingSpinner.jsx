export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="empty-state">
      <div className="spinner" style={{ margin: "0 auto 1rem" }} />
      <p>{text}</p>
    </div>
  );
}
