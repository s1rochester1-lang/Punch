import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import EmployeeView from "./pages/EmployeeView";
import ManagerView from "./pages/ManagerView";

function Shell() {
  const { profile, loading } = useAuth();
  const [tab, setTab] = useState<"clock" | "team">("clock");

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center text-muted">Loading…</div>;
  }

  if (!profile) return <Login />;

  if (profile.role !== "manager") {
    return <EmployeeView />;
  }

  return (
    <div>
      {tab === "clock" ? <EmployeeView /> : <ManagerView />}
      <nav className="fixed bottom-0 inset-x-0 bg-panel border-t border-panelRaised flex">
        <button
          onClick={() => setTab("clock")}
          className={`flex-1 py-4 text-xs uppercase tracking-wide font-body ${
            tab === "clock" ? "text-brassBright" : "text-muted"
          }`}
        >
          My Clock
        </button>
        <button
          onClick={() => setTab("team")}
          className={`flex-1 py-4 text-xs uppercase tracking-wide font-body ${
            tab === "team" ? "text-brassBright" : "text-muted"
          }`}
        >
          Team
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
