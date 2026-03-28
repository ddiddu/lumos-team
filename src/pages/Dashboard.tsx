import { useLocation, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import WorkStyleCard from "@/components/WorkStyleCard";
import ProjectCard from "@/components/ProjectCard";
import DashboardWalkthrough from "@/components/DashboardWalkthrough";
import type { AnalysisResult } from "@/types/analysis";

const Dashboard = () => {
  const location = useLocation();
  const result = (location.state as { result?: AnalysisResult })?.result;

  if (!result) return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardWalkthrough />

      {/* Sidebar */}
      <aside data-tour="work-style" className="w-[260px] shrink-0 border-r p-8 overflow-y-auto">
        <WorkStyleCard workStyle={result.work_style} />
      </aside>

      {/* Main — scrollable */}
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
            <Button variant="secondary" size="sm" className="opacity-40 cursor-not-allowed" disabled>
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
    </div>
  );
};

export default Dashboard;
