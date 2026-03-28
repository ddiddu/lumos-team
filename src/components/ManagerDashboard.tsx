import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeft } from "lucide-react";
import type { AnalysisResult, WeekLabelInfo } from "@/types/analysis";
import { parseTeamsChat, extractParticipants } from "@/lib/chatParser";

import MemberProfileView from "@/components/MemberProfileView";

type MemberStatus = "active" | "blocked" | "quiet";

interface MemberCardData {
  name: string;
  role: string;
  status: MemberStatus;
  analysisResult: AnalysisResult | null;
}

const STATUS_PRIORITY: Record<string, number> = {
  blocked: 2,
  quiet: 1,
  active: 0,
};

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
    case "active": return "active" as const;
    case "blocked": return "blocked" as const;
    default: return "quiet" as const;
  }
};

function computeStatusFromChat(
  memberName: string,
  allMessages: ReturnType<typeof parseTeamsChat>,
  _latestTimestamp: Date,
  analysisResult?: AnalysisResult | null
): MemberStatus {
  const now = new Date();
  if (analysisResult && analysisResult.projects.length > 0) {
    let worst: MemberStatus = "active";
    for (const p of analysisResult.projects) {
      const ps = String(p.status) as MemberStatus;
      if (ps === "blocked") return "blocked";
      if (ps === "quiet" && worst === "active") worst = "quiet";
    }
    return worst;
  }

  const memberMsgs = allMessages.filter(
    (m) => m.sender.toLowerCase() === memberName.toLowerCase()
  );
  if (memberMsgs.length === 0) return "quiet";

  const sorted = [...memberMsgs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const lastMsg = sorted[0];
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  if (lastMsg.timestamp < fourWeeksAgo) return "quiet";
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  if (lastMsg.timestamp < threeDaysAgo) return "quiet";

  const recentMsgs = sorted.slice(0, 10);
  const blockedPatterns = /\b(waiting for|waiting on|ooo|out of office|out of pocket|can'?t proceed|unable to proceed|on leave|pto|vacation|unavailable|delay|delayed|apologized for late reply|apologi[sz]e[ds]? for the late reply)\b/i;
  for (const msg of recentMsgs) {
    if (blockedPatterns.test(msg.text)) return "blocked";
  }

  if (lastMsg.text.includes("?")) {
    const allSorted = [...allMessages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const lastMsgIdx = allSorted.findIndex(
      (m) => m.timestamp.getTime() === lastMsg.timestamp.getTime() && m.sender === lastMsg.sender
    );
    if (lastMsgIdx >= 0) {
      const afterMsgs = allSorted.slice(lastMsgIdx + 1);
      const hasReply = afterMsgs.some(
        (m) => m.sender.toLowerCase() !== memberName.toLowerCase()
      );
      if (!hasReply) return "blocked";
    }
  }

  return "active";
}

function getDateRangeLabel(messages: ReturnType<typeof parseTeamsChat>): string {
  if (messages.length === 0) return "This week";
  const sorted = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const latest = sorted[sorted.length - 1].timestamp;
  const latestDay = latest.getDay();
  const mondayOffset = latestDay === 0 ? 6 : latestDay - 1;
  const monday = new Date(latest);
  monday.setDate(latest.getDate() - mondayOffset);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mStart = months[monday.getMonth()];
  const mEnd = months[friday.getMonth()];
  const year = friday.getFullYear();
  return `${mStart} ${monday.getDate()} – ${mEnd} ${friday.getDate()}, ${year}`;
}

interface ManagerDashboardProps {
  result: AnalysisResult;
  userName: string;
  weekLabels?: WeekLabelInfo[];
  chatData: string;
  managerResults?: Record<string, AnalysisResult>;
}

const ManagerDashboard = ({ result, userName, weekLabels, chatData, managerResults }: ManagerDashboardProps) => {
  const [selectedMember, setSelectedMember] = useState<MemberCardData | null>(null);
  const [statusFilter, setStatusFilter] = useState<MemberStatus | null>(null);

  const allMessages = parseTeamsChat(chatData);
  const dateRange = getDateRangeLabel(allMessages);

  const latestTimestamp = allMessages.length > 0
    ? new Date(Math.max(...allMessages.map((m) => m.timestamp.getTime())))
    : new Date();

  const participantNames = extractParticipants(chatData);
  const otherMembers = participantNames.filter(
    (n) => n.toLowerCase() !== userName.toLowerCase()
  );

  // Build member cards from pre-computed results
  const members: MemberCardData[] = otherMembers.map((memberName) => {
    const analysisResult = managerResults?.[memberName] || null;
    const status = computeStatusFromChat(memberName, allMessages, latestTimestamp, analysisResult);
    return {
      name: memberName,
      role: analysisResult?.work_style?.role || "Team member",
      status,
      analysisResult,
    };
  }).sort((a, b) => (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0));

  const statusCounts = {
    blocked: members.filter((m) => m.status === "blocked").length,
    quiet: members.filter((m) => m.status === "quiet").length,
    active: members.filter((m) => m.status === "active").length,
  };

  const displayMembers = statusFilter
    ? members.filter((m) => m.status === statusFilter)
    : members;

  if (selectedMember) {
    const memberResult = selectedMember.analysisResult;
    return (
      <div className="p-10 overflow-y-auto h-full">
      <button
          data-tour="back-to-team"
          onClick={() => setSelectedMember(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to team
        </button>
        {memberResult ? (
          <MemberProfileView
            name={selectedMember.name}
            status={selectedMember.status}
            result={memberResult}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No project activity found for this member.</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-10 overflow-y-auto h-full">
      <div data-tour="team-overview" className="mb-8">
        <h2 className="text-xl font-semibold">Team overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {members.length} members · {dateRange}
        </p>
        <div className="flex items-center gap-2 mt-3" data-tour="filter-pills">
          {(["blocked", "quiet", "active"] as MemberStatus[]).map((status) => {
            const count = statusCounts[status];
            if (count === 0) return null;
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(isSelected ? null : status)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                  isSelected
                    ? "border-foreground bg-foreground/5"
                    : "border-transparent hover:bg-muted"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${getStatusDotClass(status)}`} />
                {count} {status}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayMembers.map((member) => {
          const projects = member.analysisResult?.projects || [];
          return (
            <div
              key={member.name}
              data-tour-manager="member-card"
              className="rounded-lg border p-5 flex flex-col justify-between space-y-4"
            >
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

              <div className="space-y-3">
                {projects.map((p, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <Badge variant={statusBadgeVariant(p.status)} className="text-[10px] shrink-0">
                        {p.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.left_off}</p>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No recent activity</p>
                )}
              </div>

              <button
                data-tour-manager="see-details"
                onClick={() => setSelectedMember(member)}
                className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors pt-1"
              >
                See details
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManagerDashboard;
