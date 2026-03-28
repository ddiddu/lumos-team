import { useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import WorkStyleCard from "@/components/WorkStyleCard";
import ProjectCard from "@/components/ProjectCard";
import DashboardWalkthrough from "@/components/DashboardWalkthrough";
import ManagerDashboard from "@/components/ManagerDashboard";
import type { AnalysisResult } from "@/types/analysis";

type Mode = "me" | "manager";

const ModeToggle = ({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) => (
  <div className="inline-flex rounded-lg border p-0.5">
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

  return (
    <div className="flex h-screen overflow-hidden">
      {mode === "me" && <DashboardWalkthrough />}

      {/* Sidebar — only in Me mode */}
      {mode === "me" && (
        <aside data-tour="work-style" className="w-[260px] shrink-0 border-r p-8 overflow-y-auto">
          <WorkStyleCard workStyle={result.work_style} />
        </aside>
      )}

      {/* Main */}
      {mode === "me" ? (
        <main className="flex-1 overflow-y-auto p-10">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Projects</h2>
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
          <div className="space-y-6">
            {result.projects.map((project, i) => (
              <ProjectCard key={i} project={project} weekLabels={result.weekLabels} />
            ))}
          </div>
        </main>
      ) : (
        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-10 pt-6 pb-0">
            <div />
            <ModeToggle mode={mode} setMode={setMode} />
          </div>
          <div className="flex-1 overflow-y-auto">
            <ManagerDashboard result={result} userName={userName} weekLabels={result.weekLabels} chatData={chatData} managerResults={managerResults} />
          </div>
        </main>
      )}
    </div>
  );
};

export default Dashboard;
