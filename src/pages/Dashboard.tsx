import { useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import WorkStyleCard from "@/components/WorkStyleCard";
import ProjectCard from "@/components/ProjectCard";
import DashboardWalkthrough from "@/components/DashboardWalkthrough";
import ManagerDashboard from "@/components/ManagerDashboard";
import type { AnalysisResult } from "@/types/analysis";

type Mode = "me" | "manager";

const Dashboard = () => {
  const location = useLocation();
  const state = location.state as { result?: AnalysisResult; userName?: string; chatData?: string } | undefined;
  const result = state?.result;
  const userName = state?.userName ?? "Unknown";
  const chatData = state?.chatData ?? "";
  const [mode, setMode] = useState<Mode>("me");

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
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="opacity-40 cursor-not-allowed" disabled>
                Slack
              </Button>
              <Button variant="secondary" size="sm" className="opacity-40 cursor-not-allowed" disabled>
                Teams
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMode("manager")}
              >
                Manager mode
              </Button>
            </div>
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
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMode("me")}
              >
                Me mode
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ManagerDashboard result={result} userName={userName} weekLabels={result.weekLabels} />
          </div>
        </main>
      )}
    </div>
  );
};

export default Dashboard;
