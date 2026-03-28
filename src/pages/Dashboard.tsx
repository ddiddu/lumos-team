import { useLocation, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import WorkStyleCard from "@/components/WorkStyleCard";
import ProjectCard from "@/components/ProjectCard";
import type { AnalysisResult } from "@/types/analysis";

const Dashboard = () => {
  const location = useLocation();
  const result = (location.state as { result?: AnalysisResult })?.result;

  if (!result) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 border-r p-6">
        <WorkStyleCard workStyle={result.work_style} />
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
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
        <div className="space-y-4">
          {result.projects.map((project, i) => (
            <ProjectCard key={i} project={project} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
