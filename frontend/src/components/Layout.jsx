import { NavLink, Outlet } from "react-router-dom";
import { Users, Briefcase, Settings, LayoutDashboard, Columns3, MessageSquare } from "lucide-react";

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/thamanyah.png" alt="ثمانية" />
          <div>
            <h1>فرز المرشحين</h1>
            <p>منصة الذكاء الاصطناعي</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>
            <LayoutDashboard size={18} /> لوحة التحكم
          </NavLink>
          <NavLink to="/candidates">
            <Users size={18} /> المرشحون
          </NavLink>
          <NavLink to="/pipeline">
            <Columns3 size={18} /> مسار التوظيف
          </NavLink>
          <NavLink to="/jobs">
            <Briefcase size={18} /> الوظائف
          </NavLink>
          <NavLink to="/chat">
            <MessageSquare size={18} /> مساعد الذكاء الاصطناعي
          </NavLink>
          <NavLink to="/settings">
            <Settings size={18} /> الإعدادات
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
