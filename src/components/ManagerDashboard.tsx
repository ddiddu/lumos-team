import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeft } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import type { AnalysisResult, Project, WeekLabelInfo } from "@/types/analysis";
import { parseTeamsChat } from "@/lib/chatParser";

type MemberStatus = "active" | "blocked" | "quiet";

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
  "blocked": 2,
  "quiet": 1,
  "active": 0,
};

function getWorstStatus(statuses: string[]): MemberStatus {
  if (statuses.length === 0) return "quiet";
  let worst: MemberStatus = "active";
  for (const s of statuses) {
    const mapped = s === "on track" || s === "in progress" ? "active" : s;
    if ((STATUS_PRIORITY[mapped] ?? 0) > (STATUS_PRIORITY[worst] ?? 0)) {
      worst = mapped as MemberStatus;
    }
  }
  return worst;
}

function getStatusDotClass(status: MemberStatus) {
  switch (status) {
    case "active": return "bg-[hsl(var(--status-active))]";
    case "blocked": return "bg-[hsl(var(--status-blocked))]";
    case "quiet": return "bg-[hsl(var(--status-quiet))]";
  }
}

function getAvatarClass(status: MemberStatus) {
  switch (status) {
    case "active": return "bg-[hsl(var(--status-active)/0.15)] text-[hsl(var(--status-active))]";
    case "blocked": return "bg-[hsl(var(--status-blocked)/0.15)] text-[hsl(var(--status-blocked))]";
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
    case "active":
    case "on track":
    case "in progress":
      return "active" as const;
    case "blocked": return "blocked" as const;
    default: return "quiet" as const;
  }
};

/**
 * Determine member status from parsed chat data:
 * - quiet: no messages in last 3 days
 * - blocked: recent messages mention waiting/unavailable
 * - active: otherwise
 */
function computeMemberStatus(
  memberName: string,
  chatData: string,
  latestTimestamp: Date
): MemberStatus {
  const messages = parseTeamsChat(chatData);
  const memberMsgs = messages.filter(
    (m) => m.sender.toLowerCase() === memberName.toLowerCase()
  );

  if (memberMsgs.length === 0) return "quiet";

  const sorted = [...memberMsgs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const lastMsg = sorted[0];
  const threeDaysAgo = new Date(latestTimestamp.getTime() - 3 * 24 * 60 * 60 * 1000);

  if (lastMsg.timestamp < threeDaysAgo) return "quiet";

  // Check recent messages for blocked signals
  const recentMsgs = sorted.slice(0, 5);
  const blockedPatterns = /\b(waiting|blocked|stuck|unavailable|ooo|out of office|on leave|pto|vacation)\b/i;
  for (const msg of recentMsgs) {
    if (blockedPatterns.test(msg.text)) return "blocked";
  }

  return "active";
}

function buildMemberCards(result: AnalysisResult, userName: string, chatData: string): MemberCard[] {
  const memberMap = new Map<string, MemberCard>();

  // Find latest timestamp from all messages for relative date comparison
  const allMessages = parseTeamsChat(chatData);
  const latestTimestamp = allMessages.length > 0
    ? new Date(Math.max(...allMessages.map((m) => m.timestamp.getTime())))
    : new Date();

  for (const project of result.projects) {
    if (!project.members) continue;
    for (const member of project.members) {
      const key = member.name.toLowerCase();
      if (key === userName.toLowerCase()) continue;

      if (!memberMap.has(key)) {
        memberMap.set(key, {
          name: member.name,
          role: member.role,
          status: "active",
          projects: [],
        });
      }
      const card = memberMap.get(key)!;
      card.projects.push({
        project,
        leftOff: project.left_off,
      });
    }
  }

  // Compute status from actual chat activity
  for (const card of memberMap.values()) {
    card.status = computeMemberStatus(card.name, chatData, latestTimestamp);
  }

  return [...memberMap.values()].sort((a, b) =>
    (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0)
  );
}

interface ManagerDashboardProps {
  result: AnalysisResult;
  userName: string;
  weekLabels?: WeekLabelInfo[];
  chatData: string;
}

const ManagerDashboard = ({ result, userName, weekLabels, chatData }: ManagerDashboardProps) => {
  const [selectedMember, setSelectedMember] = useState<MemberCard | null>(null);
  const members = buildMemberCards(result, userName, chatData);

  const currentWeek = weekLabels?.[weekLabels.length - 1]?.label ?? "This week";

  const statusCounts = {
    active: members.filter((m) => m.status === "active").length,
    blocked: members.filter((m) => m.status === "blocked").length,
    quiet: members.filter((m) => m.status === "quiet").length,
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
          {statusCounts.active > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${getStatusDotClass("active")}`} />
              {statusCounts.active} active
            </span>
          )}
          {statusCounts.blocked > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${getStatusDotClass("blocked")}`} />
              {statusCounts.blocked} blocked
            </span>
          )}
          {statusCounts.quiet > 0 && (
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${getStatusDotClass("quiet")}`} />
              {statusCounts.quiet} quiet
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
