const API_BASE = import.meta.env.VITE_API_URL || "/api";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      throw new ApiError(
        "Cannot connect to the backend server. Please ensure it is running on port 8000.",
        0
      );
    }
    throw new ApiError(`Network error: ${err.message}`, 0);
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(detail, response.status);
  }

  return response.json();
}

// ── Settings ──

export const getSettings = () => request("/settings");

export const updateSettings = (data) =>
  request("/settings", { method: "PUT", body: JSON.stringify(data) });

export const testRecruitee = () =>
  request("/settings/test-recruitee", { method: "POST" });

export const testOpenRouter = () =>
  request("/settings/test-openrouter", { method: "POST" });

// ── Jobs ──

export const listJobs = () => request("/jobs");

export const syncJobs = () => request("/jobs/sync");

export const getJob = (id) => request(`/jobs/${id}`);

// ── Candidates ──

export const listCandidates = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== "") qs.append(k, v);
  });
  return request(`/candidates?${qs.toString()}`);
};

export const getCandidate = (id) => request(`/candidates/${id}`);

export const importCandidates = (jobRecruiteeId) =>
  request("/candidates/import", {
    method: "POST",
    body: JSON.stringify({ job_recruitee_id: jobRecruiteeId }),
  });

export const scoreCandidate = (id) =>
  request(`/candidates/${id}/score`, { method: "POST" });

export const bulkScoreCandidates = (candidateIds) =>
  request("/candidates/bulk-score", {
    method: "POST",
    body: JSON.stringify({ candidate_ids: candidateIds }),
  });

export const moveCandidateStage = (id, stage) =>
  request(`/candidates/${id}/stage`, {
    method: "PUT",
    body: JSON.stringify({ stage }),
  });

export const archiveCandidate = (id) =>
  request(`/candidates/${id}/archive`, { method: "PUT" });

export const unarchiveCandidate = (id) =>
  request(`/candidates/${id}/unarchive`, { method: "PUT" });

export const getCandidateStats = () => request("/candidates/stats/overview");

export const healthCheck = () => request("/health");

// ── Chat ──

export const getChatHistory = () => request("/chat/history");

export const sendChatMessage = (message) =>
  request("/chat/send", {
    method: "POST",
    body: JSON.stringify({ message }),
  });

export const applyChatChanges = (messageId) =>
  request("/chat/apply", {
    method: "POST",
    body: JSON.stringify({ message_id: messageId }),
  });

export const clearChatHistory = () =>
  request("/chat/history", { method: "DELETE" });

// ── Saved Searches ──

export const listSavedSearches = () => request("/saved-searches");

export const createSavedSearch = (data) =>
  request("/saved-searches", { method: "POST", body: JSON.stringify(data) });

export const updateSavedSearch = (id, data) =>
  request(`/saved-searches/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteSavedSearch = (id) =>
  request(`/saved-searches/${id}`, { method: "DELETE" });
