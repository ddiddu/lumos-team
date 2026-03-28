import { useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import MemberProfileView from "@/components/MemberProfileView";
import AppWalkthrough from "@/components/AppWalkthrough";
import ManagerDashboard from "@/components/ManagerDashboard";
import type { AnalysisResult } from "@/types/analysis";

type Mode = "me" | "manager";

const ModeToggle = ({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) => (
  <div data-tour="mode-toggle" className="inline-flex rounded-lg border p-0.5">
    <button
      onClick={() => setMode("me")}
      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
        mode === "me" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      Me
    </button>
    <button
      onClick={() => setMode("manager")}
      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
        mode === "manager" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      Manager
    </button>
  </div>
);

const Dashboard = () => {
  const location = useLocation();
  const state = location.state as { result?: AnalysisResult; userName?: string; chatData?: string; initialMode?: string; managerResults?: Record<string, AnalysisResult>; canonicalProjects?: any[] } | undefined;
  const result = state?.result;
  const userName = state?.userName ?? "Unknown";
  const chatData = state?.chatData ?? "";
  const managerResults = state?.managerResults;
  const [mode, setMode] = useState<Mode>(state?.initialMode === "manager" ? "manager" : "me");

  if (!result) return <Navigate to="/" replace />;

  const computeMyStatus = (): "active" | "blocked" | "quiet" => {
    if (!result.projects.length) return "active";
    let worst: "active" | "blocked" | "quiet" = "active";
    for (const p of result.projects) {
      if (p.status === "blocked") return "blocked";
      if (p.status === "quiet" && worst === "active") worst = "quiet";
    }
    return worst;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AppWalkthrough />

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-10 pt-6 pb-0">
          <div />
          <ModeToggle mode={mode} setMode={setMode} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {mode === "me" ? (
            <div className="p-10">
              <MemberProfileView
                name={userName}
                status={computeMyStatus()}
                result={result}
              />
            </div>
          ) : (
            <ManagerDashboard
              result={result}
              userName={userName}
              weekLabels={result.weekLabels}
              chatData={chatData}
              managerResults={managerResults}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
