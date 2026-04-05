import { NavLink, Outlet } from "react-router-dom";
import { Users, Briefcase, Settings, LayoutDashboard, Columns3, MessageSquare } from "lucide-react";

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Recruitee AI</h1>
          <p>Candidate Screening Platform</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/candidates">
            <Users size={18} /> Candidates
          </NavLink>
          <NavLink to="/pipeline">
            <Columns3 size={18} /> Pipeline
          </NavLink>
          <NavLink to="/jobs">
            <Briefcase size={18} /> Jobs
          </NavLink>
          <NavLink to="/chat">
            <MessageSquare size={18} /> AI Assistant
          </NavLink>
          <NavLink to="/settings">
            <Settings size={18} /> Settings
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
