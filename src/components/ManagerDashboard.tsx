import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeft } from "lucide-react";
import type { AnalysisResult, WeekLabelInfo } from "@/types/analysis";
import { parseTeamsChat, extractParticipants, countMessages, getWeekLabels } from "@/lib/chatParser";
import { supabase } from "@/integrations/supabase/client";
import ManagerWalkthrough from "@/components/ManagerWalkthrough";
import ProjectCard from "@/components/ProjectCard";

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

/**
 * Compute member status from chat data with enhanced blocked detection.
 */
function computeStatusFromChat(
  memberName: string,
  allMessages: ReturnType<typeof parseTeamsChat>,
  latestTimestamp: Date
): MemberStatus {
  const memberMsgs = allMessages.filter(
    (m) => m.sender.toLowerCase() === memberName.toLowerCase()
  );

  if (memberMsgs.length === 0) return "quiet";

  const sorted = [...memberMsgs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const lastMsg = sorted[0];
  const threeDaysAgo = new Date(latestTimestamp.getTime() - 3 * 24 * 60 * 60 * 1000);

  if (lastMsg.timestamp < threeDaysAgo) return "quiet";

  // Check blocked signals in recent messages
  const recentMsgs = sorted.slice(0, 10);
  const blockedPatterns = /\b(waiting for|waiting on|ooo|out of office|out of pocket|can'?t proceed|unable to proceed|on leave|pto|vacation|unavailable)\b/i;
  for (const msg of recentMsgs) {
    if (blockedPatterns.test(msg.text)) return "blocked";
  }

  // Check for unanswered question: last message contains "?" and no reply from others after it
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

/**
 * Filter chat data to only include messages from a specific person.
 * Preserves the Teams chat format so the analyze-chat function can parse it.
 */
function filterChatForMember(rawChat: string, memberName: string): string {
  const messages = parseTeamsChat(rawChat);
  const memberMsgs = messages.filter(
    (m) => m.sender.toLowerCase() === memberName.toLowerCase()
  );

  // Reconstruct chat format for the edge function
  return memberMsgs
    .map((m) => {
      const month = m.timestamp.getMonth() + 1;
      const day = m.timestamp.getDate();
      const hours = m.timestamp.getHours();
      const minutes = m.timestamp.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      const ts = `${month}/${day} ${h12}:${String(minutes).padStart(2, "0")} ${ampm}`;
      return `${m.sender}\n${ts}\n${m.text}`;
    })
    .join("\n\n");
}

function getDateRangeLabel(messages: ReturnType<typeof parseTeamsChat>): string {
  if (messages.length === 0) return "This week";
  const sorted = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const latest = sorted[sorted.length - 1].timestamp;

  // Find the Monday of the latest week
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

  if (mStart === mEnd) {
    return `${mStart} ${monday.getDate()} – ${mEnd} ${friday.getDate()}, ${year}`;
  }
  return `${mStart} ${monday.getDate()} – ${mEnd} ${friday.getDate()}, ${year}`;
}

interface ManagerDashboardProps {
  result: AnalysisResult;
  userName: string;
  weekLabels?: WeekLabelInfo[];
  chatData: string;
}

const ManagerDashboard = ({ result, userName, weekLabels, chatData }: ManagerDashboardProps) => {
  const [members, setMembers] = useState<MemberCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<MemberCardData | null>(null);
  const [statusFilter, setStatusFilter] = useState<MemberStatus | null>(null);

  const allMessages = parseTeamsChat(chatData);
  const dateRange = getDateRangeLabel(allMessages);

  useEffect(() => {
    let cancelled = false;

    async function analyzeTeam() {
      setLoading(true);

      const participantNames = extractParticipants(chatData);
      const otherMembers = participantNames.filter(
        (n) => n.toLowerCase() !== userName.toLowerCase()
      );

      if (otherMembers.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const latestTimestamp = allMessages.length > 0
        ? new Date(Math.max(...allMessages.map((m) => m.timestamp.getTime())))
        : new Date();

      // Analyze each member by calling the SAME analyze-chat function
      const cards: MemberCardData[] = [];

      const analyzePromises = otherMembers.map(async (memberName) => {
        try {
          const filteredChat = filterChatForMember(chatData, memberName);
          if (!filteredChat.trim()) {
            return {
              name: memberName,
              role: "Team member",
              status: "quiet" as MemberStatus,
              analysisResult: null,
            };
          }

          const memberMessages = allMessages.filter(
            (m) => m.sender.toLowerCase() === memberName.toLowerCase()
          );
          const counts = countMessages(memberMessages.map(m => ({...m})), memberName);
          const wLabels = getWeekLabels(memberMessages);

          // Get other participants relative to this member
          const otherParticipants = participantNames.filter(
            (n) => n.toLowerCase() !== memberName.toLowerCase()
          );

          const { data, error } = await supabase.functions.invoke("analyze-chat", {
            body: {
              chatData: filteredChat,
              userName: memberName,
              messageCounts: counts,
              weekLabels: wLabels,
              participantNames: otherParticipants,
            },
          });

          if (error) throw error;

          const analysisResult = data as AnalysisResult;
          analysisResult.weekLabels = wLabels.map((w) => ({ key: w.key, label: w.label }));

          const status = computeStatusFromChat(memberName, allMessages, latestTimestamp);

          return {
            name: memberName,
            role: analysisResult.work_style?.role || "Team member",
            status,
            analysisResult,
          };
        } catch (e) {
          console.error(`Analysis failed for ${memberName}:`, e);
          const status = computeStatusFromChat(memberName, allMessages, latestTimestamp);
          return {
            name: memberName,
            role: "Team member",
            status,
            analysisResult: null,
          };
        }
      });

      try {
        const results = await Promise.all(analyzePromises);
        if (cancelled) return;
        const sortedCards = results.sort(
          (a, b) => (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0)
        );
        setMembers(sortedCards);
      } catch (e) {
        console.error("Team analysis failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    analyzeTeam();
    return () => { cancelled = true; };
  }, [chatData, userName]);

  const statusCounts = {
    active: members.filter((m) => m.status === "active").length,
    blocked: members.filter((m) => m.status === "blocked").length,
    quiet: members.filter((m) => m.status === "quiet").length,
  };

  const displayMembers = statusFilter
    ? [...members].sort((a, b) => {
        const aMatch = a.status === statusFilter ? 0 : 1;
        const bMatch = b.status === statusFilter ? 0 : 1;
        return aMatch - bMatch;
      })
    : members;

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        <p className="text-muted-foreground">Analyzing team members...</p>
      </div>
    );
  }

  if (selectedMember) {
    const memberResult = selectedMember.analysisResult;
    return (
      <div className="p-10 overflow-y-auto h-full">
        <button
          onClick={() => setSelectedMember(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to team
        </button>
        <div className="mb-6 flex items-center gap-3">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-base font-semibold ${getAvatarClass(selectedMember.status)}`}>
            {getInitials(selectedMember.name)}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{selectedMember.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedMember.role}</p>
          </div>
          <Badge variant={statusBadgeVariant(selectedMember.status)}>{selectedMember.status}</Badge>
        </div>
        {memberResult ? (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Projects</h3>
            {memberResult.projects.map((project, i) => (
              <ProjectCard key={i} project={project} weekLabels={memberResult.weekLabels} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No project activity found for this member.</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-10 overflow-y-auto h-full">
      <ManagerWalkthrough />

      {/* Header */}
      <div data-tour-manager="header" className="mb-8">
        <h2 className="text-xl font-semibold">Team overview</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {members.length} members · {dateRange}
        </p>
        {/* Status pills */}
        <div className="flex items-center gap-2 mt-3" data-tour-manager="status-badge">
          {(["quiet", "blocked", "active"] as MemberStatus[]).map((status) => {
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

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayMembers.map((member) => {
          const projects = member.analysisResult?.projects || [];
          return (
            <div
              key={member.name}
              data-tour-manager="member-card"
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
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${getStatusDotClass(member.status)}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                </div>
              </div>

              {/* Project rows */}
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

              {/* See details */}
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
