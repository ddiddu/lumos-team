import { useState } from "react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import MemberProfileView from "@/components/MemberProfileView";
import AppWalkthrough from "@/components/AppWalkthrough";
import ManagerDashboard from "@/components/ManagerDashboard";
import type { AnalysisResult } from "@/types/analysis";

type Mode = "me" | "manager";

const ModeToggle = ({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) => (
  <div data-tour="mode-toggle" className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
    <button
      onClick={() => setMode("me")}
      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
        mode === "me" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      Me
    </button>
    <button
      onClick={() => setMode("manager")}
      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
        mode === "manager" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
  const navigate = useNavigate();
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
    <div className="flex h-screen overflow-hidden bg-background">
      <AppWalkthrough />

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-border">
          <button
            onClick={() => navigate("/")}
            className="text-lg font-bold tracking-tight text-foreground hover:opacity-70 transition-opacity"
          >
            Lumos
          </button>
          <ModeToggle mode={mode} setMode={setMode} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {mode === "me" ? (
            <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8">
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

      {/* Floating tour button */}
      <button
        onClick={() => {
          sessionStorage.removeItem("app_walkthrough_done");
          window.dispatchEvent(new CustomEvent("restart-walkthrough"));
        }}
        className="fixed bottom-6 right-6 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
        title="Restart tour"
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
};

export default Dashboard;
