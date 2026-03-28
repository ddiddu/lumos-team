import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeft } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import type { AnalysisResult, Project, WeekLabelInfo } from "@/types/analysis";

type MemberStatus = "on track" | "blocked" | "quiet" | "in progress";

interface MemberCard {
  name: string;
  role: string;
  status: MemberStatus;
  projects: {
    project: Project;
    leftOff: string;
  }[];
}

const STATUS_PRIORITY: Record<string, number> = {
  "blocked": 3,
  "quiet": 2,
  "in progress": 1,
  "on track": 0,
};

function getWorstStatus(statuses: string[]): MemberStatus {
  if (statuses.length === 0) return "quiet";
  let worst: MemberStatus = "on track";
  for (const s of statuses) {
    if ((STATUS_PRIORITY[s] ?? 0) > (STATUS_PRIORITY[worst] ?? 0)) {
      worst = s as MemberStatus;
    }
  }
  return worst;
}

function getStatusDotClass(status: MemberStatus) {
  switch (status) {
    case "on track": return "bg-[hsl(var(--status-on-track))]";
    case "blocked": return "bg-[hsl(var(--status-blocked))]";
    case "in progress": return "bg-[hsl(var(--status-in-progress))]";
    case "quiet": return "bg-[hsl(var(--status-quiet))]";
  }
}

function getAvatarClass(status: MemberStatus) {
  switch (status) {
    case "on track": return "bg-[hsl(var(--status-on-track)/0.15)] text-[hsl(var(--status-on-track))]";
    case "blocked": return "bg-[hsl(var(--status-blocked)/0.15)] text-[hsl(var(--status-blocked))]";
    case "in progress": return "bg-[hsl(var(--status-in-progress)/0.15)] text-[hsl(var(--status-in-progress))]";
    case "quiet": return "bg-[hsl(var(--status-quiet)/0.15)] text-[hsl(var(--status-quiet))]";
  }
}

function getInitials(name: string) {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "on track": return "onTrack" as const;
    case "blocked": return "blocked" as const;
    case "in progress": return "inProgress" as const;
    default: return "quiet" as const;
  }
};

function buildMemberCards(result: AnalysisResult, userName: string): MemberCard[] {
  const memberMap = new Map<string, MemberCard>();

  for (const project of result.projects) {
    if (!project.members) continue;
    for (const member of project.members) {
      const key = member.name.toLowerCase();
      if (key === userName.toLowerCase()) continue;

      if (!memberMap.has(key)) {
        memberMap.set(key, {
          name: member.name,
          role: member.role,
          status: "on track",
          projects: [],
        });
      }
      const card = memberMap.get(key)!;
      card.projects.push({
        project,
        leftOff: member.interaction,
      });
    }
  }

  // Calculate overall status per member
  for (const card of memberMap.values()) {
    const statuses = card.projects.map((p) => p.project.status);
    card.status = getWorstStatus(statuses);
  }

  return [...memberMap.values()].sort((a, b) =>
    (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0)
  );
}

interface ManagerDashboardProps {
  result: AnalysisResult;
  userName: string;
  weekLabels?: WeekLabelInfo[];
}

const ManagerDashboard = ({ result, userName, weekLabels }: ManagerDashboardProps) => {
  const [selectedMember, setSelectedMember] = useState<MemberCard | null>(null);
  const members = buildMemberCards(result, userName);

  const currentWeek = weekLabels?.[weekLabels.length - 1]?.label ?? "This week";

  const statusCounts = {
    "on track": members.filter((m) => m.status === "on track").length,
    "blocked": members.filter((m) => m.status === "blocked").length,
    "quiet": members.filter((m) => m.status === "quiet").length,
  };

  if (selectedMember) {
    return (
      <div className="p-10 overflow-y-auto h-full">
        <button
          onClick={() => setSelectedMember(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to team
        </button>
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{selectedMember.name}</h2>
          <p className="text-sm text-muted-foreground">{selectedMember.role}</p>
        </div>
        <div className="space-y-6">
          {selectedMember.projects.map((p, i) => (
            <ProjectCard key={i} project={p.project} weekLabels={weekLabels} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team overview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} members · {currentWeek}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          {statusCounts["on track"] > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${getStatusDotClass("on track")}`} />
              {statusCounts["on track"]} on track
            </span>
          )}
          {statusCounts["blocked"] > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${getStatusDotClass("blocked")}`} />
              {statusCounts["blocked"]} blocked
            </span>
          )}
          {statusCounts["quiet"] > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${getStatusDotClass("quiet")}`} />
              {statusCounts["quiet"]} quiet
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <div
            key={member.name}
            className="rounded-lg border p-5 flex flex-col justify-between space-y-4"
          >
            {/* Top row */}
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${getAvatarClass(member.status)}`}
              >
                {getInitials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  <span className={`h-2 w-2 rounded-full shrink-0 ${getStatusDotClass(member.status)}`} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{member.role}</p>
              </div>
            </div>

            {/* Project rows */}
            <div className="space-y-3">
              {member.projects.map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{p.project.name}</p>
                    <Badge variant={statusBadgeVariant(p.project.status)} className="text-[10px] shrink-0">
                      {p.project.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.leftOff}</p>
                </div>
              ))}
            </div>

            {/* See details */}
            <button
              onClick={() => setSelectedMember(member)}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors pt-1"
            >
              See details
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagerDashboard;
