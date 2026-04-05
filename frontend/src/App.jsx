import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import CandidatesPage from "./pages/CandidatesPage";
import PipelinePage from "./pages/PipelinePage";
import JobsPage from "./pages/JobsPage";
import SettingsPage from "./pages/SettingsPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
