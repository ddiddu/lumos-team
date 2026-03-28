import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronRight } from "lucide-react";
import type { Project, WeekLabelInfo } from "@/types/analysis";

const statusVariant = (status: Project["status"]) => {
  switch (status) {
    case "active": return "active" as const;
    case "blocked": return "blocked" as const;
    case "quiet": return "quiet" as const;
  }
};

const weeks: ("W1" | "W2" | "W3" | "W4")[] = ["W1", "W2", "W3", "W4"];

interface ProjectCardProps {
  project: Project;
  weekLabels?: WeekLabelInfo[];
  forceExpanded?: boolean;
}

const ProjectCard = ({ project, weekLabels, forceExpanded }: ProjectCardProps) => {
  const [expanded, setExpanded] = useState(forceExpanded ?? false);
  const [drillDown, setDrillDown] = useState(false);

  const labelMap: Record<string, string> = {};
  if (weekLabels) {
    weekLabels.forEach((w) => { labelMap[w.key] = w.label; });
  }

  const weeklyData = weeks.map((w) => ({
    name: labelMap[w] || w,
    count: project.message_counts[w],
    key: w,
  }));

  const dailyData = Object.entries(project.message_counts.W4_daily).map(
    ([day, count]) => ({ name: day, count, key: day })
  );

  const chartData = drillDown ? dailyData : weeklyData;

  const handleBarClick = (data: any) => {
    if (!drillDown && data?.key === "W4") {
      setDrillDown(true);
    }
  };

  const reversedWeeks = [...weeks].reverse();

  return (
    <div data-tour="project-card" className="rounded-lg border p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{project.name}</h3>
        <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
      </div>

      {/* Overview */}
      {project.overview && (
        <p className="text-sm text-muted-foreground">{project.overview}</p>
      )}

      {/* Where I left off */}
      {project.left_off && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Where I left off</p>
          <p className="text-sm">{project.left_off}</p>
        </div>
      )}

      {/* Todo list */}
      <div data-tour="next-up" className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Todo
        </p>
        <ul className="space-y-1">
          {project.next_up.map((task, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground">•</span>
              {task}
            </li>
          ))}
        </ul>
      </div>

      {/* Expanded sections */}
      {expanded && (
        <>
          {/* Weekly breakdown */}
          <div data-tour="weekly-breakdown" className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Weekly breakdown
            </p>
            <div className="space-y-1.5">
              {reversedWeeks.map((w) => (
                <div key={w} className="flex gap-3 text-sm">
                  <span className="font-medium text-muted-foreground w-16 shrink-0">
                    {labelMap[w] || w}
                  </span>
                  <span>{project.weekly_summary[w]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Message activity chart */}
          <div data-tour="message-activity" className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Message activity
              </p>
              {drillDown && (
                <button
                  onClick={() => setDrillDown(false)}
                  className="text-xs text-muted-foreground underline"
                >
                  Back to weeks
                </button>
              )}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  cursor={!drillDown ? "pointer" : "default"}
                  onClick={(_, index) => handleBarClick(chartData[index])}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        !drillDown && entry.key === "W4"
                          ? "hsl(var(--chart-1))"
                          : "hsl(var(--foreground) / 0.15)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {!drillDown && (
              <p className="text-[10px] text-muted-foreground text-center">
                Click the most recent week to see daily breakdown
              </p>
            )}
          </div>
          {/* Collapse button at bottom of expanded view */}
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            Collapse ↑
          </button>
        </>
      )}

      {/* See details button (collapsed state) */}
      {!expanded && (
        <button
          data-tour="see-details"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          See details
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default ProjectCard;
