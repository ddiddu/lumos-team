import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeft } from "lucide-react";
import type { AnalysisResult, WeekLabelInfo } from "@/types/analysis";
import { parseTeamsChat, extractParticipants } from "@/lib/chatParser";
import { supabase } from "@/integrations/supabase/client";
import ManagerWalkthrough from "@/components/ManagerWalkthrough";

type MemberStatus = "active" | "blocked" | "quiet";

interface MemberProject {
  name: string;
  status: MemberStatus;
  left_off: string;
}

interface MemberCardData {
  name: string;
  role: string;
  status: MemberStatus;
  projects: MemberProject[];
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

function getWorstStatus(projects: MemberProject[]): MemberStatus {
  if (projects.length === 0) return "quiet";
  let worst: MemberStatus = "active";
  for (const p of projects) {
    if ((STATUS_PRIORITY[p.status] ?? 0) > (STATUS_PRIORITY[worst] ?? 0)) {
      worst = p.status;
    }
  }
  return worst;
}

/**
 * Compute member status from chat messages (fallback/override)
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

  const recentMsgs = sorted.slice(0, 5);
  const blockedPatterns = /\b(waiting|blocked|stuck|unavailable|ooo|out of office|on leave|pto|vacation)\b/i;
  for (const msg of recentMsgs) {
    if (blockedPatterns.test(msg.text)) return "blocked";
  }

  return "active";
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

  const currentWeek = weekLabels?.[weekLabels.length - 1]?.label ?? "This week";

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

      try {
        const { data, error } = await supabase.functions.invoke("analyze-team", {
          body: { chatData, userName, memberNames: participantNames },
        });

        if (cancelled) return;
        if (error) throw error;

        const aiMembers = data?.members || [];

        // Parse chat for status computation
        const allMessages = parseTeamsChat(chatData);
        const latestTimestamp = allMessages.length > 0
          ? new Date(Math.max(...allMessages.map((m) => m.timestamp.getTime())))
          : new Date();

        const cards: MemberCardData[] = aiMembers.map((m: any) => {
          const projects: MemberProject[] = (m.projects || []).map((p: any) => ({
            name: p.name || "Unknown",
            status: (["active", "blocked", "quiet"].includes(p.status) ? p.status : "active") as MemberStatus,
            left_off: p.left_off || "",
          }));

          // Override overall status with chat-based computation (more accurate)
          const chatStatus = computeStatusFromChat(m.name, allMessages, latestTimestamp);

          return {
            name: m.name,
            role: m.role || "Team member",
            status: chatStatus,
            projects,
          };
        });

        // Sort: blocked first, then quiet, then active
        cards.sort((a, b) => (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0));

        setMembers(cards);
      } catch (e) {
        console.error("Team analysis failed:", e);
        // Fallback: build basic cards from participant list
        const allMessages = parseTeamsChat(chatData);
        const latestTimestamp = allMessages.length > 0
          ? new Date(Math.max(...allMessages.map((m) => m.timestamp.getTime())))
          : new Date();

        const fallbackCards: MemberCardData[] = otherMembers.map((name) => ({
          name,
          role: "Team member",
          status: computeStatusFromChat(name, allMessages, latestTimestamp),
          projects: [],
        }));
        fallbackCards.sort((a, b) => (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0));
        setMembers(fallbackCards);
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

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        <p className="text-muted-foreground">Analyzing team members...</p>
      </div>
    );
  }

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
        <div className="mb-6 flex items-center gap-3">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-base font-semibold ${getAvatarClass(selectedMember.status)}`}>
            {getInitials(selectedMember.name)}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{selectedMember.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedMember.role}</p>
          </div>
          <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(selectedMember.status)}`} />
        </div>
        <div className="space-y-4">
          {selectedMember.projects.map((p, i) => (
            <div key={i} className="rounded-lg border p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <Badge variant={statusBadgeVariant(p.status)}>{p.status}</Badge>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Where they left off</p>
                <p className="text-sm">{p.left_off}</p>
              </div>
            </div>
          ))}
          {selectedMember.projects.length === 0 && (
            <p className="text-sm text-muted-foreground">No project activity found for this member.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 overflow-y-auto h-full">
      <ManagerWalkthrough />

      {/* Header */}
      <div data-tour-manager="header" className="mb-8 flex items-center justify-between">
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
                    data-tour-manager="status-badge"
                    className={`h-2 w-2 rounded-full shrink-0 ${getStatusDotClass(member.status)}`}
                  />
                </div>
                <p className="text-xs text-muted-foreground truncate">{member.role}</p>
              </div>
            </div>

            {/* Project rows */}
            <div className="space-y-3">
              {member.projects.map((p, i) => (
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
              {member.projects.length === 0 && (
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
        ))}
      </div>
    </div>
  );
};

export default ManagerDashboard;
