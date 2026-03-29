import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronRight, ChevronUp } from "lucide-react";
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
  if (weekLabels) { weekLabels.forEach((w) => { labelMap[w.key] = w.label; }); }

  const weeklyData = weeks.map((w) => ({ name: labelMap[w] || w, count: project.message_counts[w], key: w }));
  const dailyData = Object.entries(project.message_counts.W4_daily).map(([day, count]) => ({ name: day, count, key: day }));
  const chartData = drillDown ? dailyData : weeklyData;

  const handleBarClick = (data: any) => { if (!drillDown && data?.key === "W4") setDrillDown(true); };
  const reversedWeeks = [...weeks].reverse();

  return (
    <div data-tour="project-card" className="group rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4 transition-shadow duration-200 hover:shadow-md hover:border-foreground/15">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground leading-snug">{project.name}</h3>
          {project.overview && <p className="text-[13px] text-muted-foreground leading-relaxed">{project.overview}</p>}
        </div>
        <Badge variant={statusVariant(project.status)} className="text-[10px] shrink-0 mt-0.5">{project.status}</Badge>
      </div>

      {project.left_off && (
        <div data-tour="left-off" className="rounded-lg bg-muted/60 px-3.5 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Where I left off</p>
          <p className="text-[13px] text-foreground leading-relaxed">{project.left_off}</p>
        </div>
      )}

      <div data-tour="next-up" className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Todo</p>
        <ul className="space-y-1">
          {project.next_up.map((task, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-foreground leading-relaxed">
              <span className="text-muted-foreground/60 mt-px select-none">–</span>
              {task}
            </li>
          ))}
        </ul>
      </div>

      {expanded && (
        <>
          <div data-tour="weekly-breakdown" className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Weekly breakdown</p>
            <div className="space-y-2">
              {reversedWeeks.map((w) => (
                <div key={w} className="flex gap-3 text-sm">
                  <span className="font-medium text-muted-foreground w-20 shrink-0 text-xs">{labelMap[w] || w}</span>
                  <span className="text-foreground">{project.weekly_summary[w]}</span>
                </div>
              ))}
            </div>
          </div>

          <div data-tour="message-activity" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Message activity</p>
              {drillDown && (
                <button onClick={() => setDrillDown(false)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  Back to weeks
                </button>
              )}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, width: 80 }} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", background: "hsl(var(--card))" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor={!drillDown ? "pointer" : "default"} onClick={(_, index) => handleBarClick(chartData[index])}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={!drillDown && entry.key === "W4" ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.12)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {!drillDown && <p className="text-[10px] text-muted-foreground text-center">Click the most recent week to see daily breakdown</p>}
          </div>

          {project.members && project.members.length > 0 && (
            <div data-tour="members" className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Collaborators</p>
              <div className="flex flex-wrap gap-2">
                {project.members.map((member, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 max-w-full">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0 mt-0.5">
                      {member.name.split(/[\s.]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-medium text-foreground">{member.name}</span>
                      <span className="text-[11px] text-muted-foreground break-words">{member.interaction}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mx-auto pt-1"
          >
            Collapse
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      {!expanded && (
        <button
          data-tour="see-details"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors"
        >
          See details
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default ProjectCard;
