import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseTeamsChat, extractParticipants, getWeekLabels } from "@/lib/chatParser";
import { MessageSquare, Hash, FileText } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

type Source = "teams" | "slack" | "txt" | null;
type Phase = "input" | "loading" | "pick-user";

interface ClassifiedProject {
  canonical_name: string;
  aliases: string[];
  members: string[];
  chunks: string[];
}

const LOADING_STEPS = [
  { key: "messages", label: "Reading messages..." },
  { key: "projects", label: "Identifying projects..." },
  { key: "cards", label: "Analyzing project details..." },
  { key: "team", label: "Building member profiles..." },
  { key: "dashboard", label: "Building your dashboard..." },
];

const DataInput = () => {
  const [chatData, setChatData] = useState("");
  const [source, setSource] = useState<Source>(null);
  const [phase, setPhase] = useState<Phase>("input");
  const [activeStep, setActiveStep] = useState(0);
  const [participants, setParticipants] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const incomingMode = (location.state as { mode?: string })?.mode;

  const extractAndShowParticipants = () => {
    if (!chatData.trim()) {
      toast.error("Please paste some chat data first.");
      return;
    }

    setPhase("loading");
    setActiveStep(0);

    setTimeout(() => {
      const names = extractParticipants(chatData);
      if (names.length === 0) {
        toast.error("No participants found. Check your chat format.");
        setPhase("input");
        return;
      }
      setParticipants(names);
      setPhase("pick-user");
    }, 800);
  };

  /**
   * Generate project cards for a single member across all their projects.
   * Returns an array of project card objects.
   */
  async function generateCardsForMember(
    memberName: string,
    projects: ClassifiedProject[],
    weekLabels: any[],
    perspective: "second" | "third"
  ) {
    // Filter projects where this member is involved
    const memberProjects = projects.filter((p) =>
      p.members.some((m) => m.toLowerCase() === memberName.toLowerCase())
    );

    if (memberProjects.length === 0) return [];

    // Generate cards in parallel (one per project)
    const cardPromises = memberProjects.map(async (project) => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-project-card", {
          body: {
            memberName,
            projectName: project.canonical_name,
            chunks: project.chunks,
            weekLabels,
            perspective,
            allMembers: project.members,
          },
        });
        if (error) {
          console.error(`Card generation failed for ${memberName}/${project.canonical_name}:`, error);
          return null;
        }
        return data;
      } catch (e) {
        console.error(`Card generation error for ${memberName}/${project.canonical_name}:`, e);
        return null;
      }
    });

    const results = await Promise.all(cardPromises);
    return results.filter(Boolean);
  }

  /**
   * Aggregate a member's project cards into a full AnalysisResult.
   */
  async function aggregateMember(
    memberName: string,
    projectCards: any[],
    weekLabels: any[],
    perspective: "second" | "third"
  ): Promise<AnalysisResult> {
    if (projectCards.length === 0) {
      return {
        work_style: { role: "Team member", style: "", likes: "", dislikes: "", speech_habits: "" },
        projects: [],
        weekLabels: weekLabels.map((w) => ({ key: w.key, label: w.label })),
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke("aggregate-member", {
        body: { memberName, projectCards, perspective },
      });

      if (error) throw error;

      const result: AnalysisResult = {
        work_style: data.work_style,
        projects: data.projects,
        weekLabels: weekLabels.map((w) => ({ key: w.key, label: w.label })),
      };
      return result;
    } catch (e) {
      console.error(`Aggregation failed for ${memberName}:`, e);
      // Fallback: return cards without work style
      return {
        work_style: { role: "Team member", style: "", likes: "", dislikes: "", speech_habits: "" },
        projects: projectCards,
        weekLabels: weekLabels.map((w) => ({ key: w.key, label: w.label })),
      };
    }
  }

  const analyzeWithUser = async (userName: string) => {
    setPhase("loading");
    setActiveStep(0); // Reading messages...
    const isManager = incomingMode === "manager";

    try {
      const parsed = parseTeamsChat(chatData);
      const weekLabels = getWeekLabels(parsed);

      // ── STEP 1: Classify all projects ──
      setActiveStep(1); // Identifying projects...

      let canonicalProjects: ClassifiedProject[] = [];
      const { data: classifyData, error: classifyError } = await supabase.functions.invoke("classify-projects", {
        body: { chatData, participantNames: participants },
      });
      if (classifyError) {
        console.error("Project classification failed:", classifyError);
        throw new Error("Failed to classify projects");
      }
      canonicalProjects = classifyData?.projects || [];

      // ── STEP 2+3: Generate project cards ──
      setActiveStep(2); // Analyzing project details...

      // For "Me" mode, generate cards for the selected user
      const meCards = await generateCardsForMember(userName, canonicalProjects, weekLabels, "second");

      // For Manager mode, also generate cards for all other members in parallel
      let managerCardsByMember: Record<string, any[]> = {};
      if (isManager) {
        const otherMembers = participants.filter(
          (n) => n.toLowerCase() !== userName.toLowerCase()
        );
        const memberCardPromises = otherMembers.map(async (memberName) => {
          const cards = await generateCardsForMember(memberName, canonicalProjects, weekLabels, "third");
          return { memberName, cards };
        });
        const memberCardResults = await Promise.all(memberCardPromises);
        for (const { memberName, cards } of memberCardResults) {
          managerCardsByMember[memberName] = cards;
        }
      }

      // ── STEP 4: Aggregate member profiles ──
      setActiveStep(3); // Building member profiles...

      const meResult = await aggregateMember(userName, meCards, weekLabels, "second");

      let managerResults: Record<string, AnalysisResult> | undefined;
      if (isManager) {
        const aggregatePromises = Object.entries(managerCardsByMember).map(
          async ([memberName, cards]) => {
            const result = await aggregateMember(memberName, cards, weekLabels, "third");
            return { memberName, result };
          }
        );
        const aggregated = await Promise.all(aggregatePromises);
        managerResults = {};
        for (const { memberName, result } of aggregated) {
          managerResults[memberName] = result;
        }
      }

      // ── STEP 5: Apply 7-day quiet rule & navigate ──
      setActiveStep(4); // Building your dashboard...

      // Post-process: if a member has no messages in the last 7 days
      // on a specific project, override that project's status to "quiet"
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const applyQuietRule = (result: AnalysisResult, memberName: string) => {
        const memberMsgs = parsed.filter(
          (m) => m.sender.toLowerCase() === memberName.toLowerCase()
        );
        const recentMsgs = memberMsgs.filter((m) => m.timestamp >= sevenDaysAgo);
        for (const project of result.projects) {
          // Check if member has any recent messages at all
          // If no messages in last 7 days, all projects are quiet
          if (recentMsgs.length === 0) {
            project.status = "quiet";
          } else {
            // Check W4 (current week) message count — if 0, project is quiet
            if (project.message_counts && project.message_counts.W4 === 0) {
              project.status = "quiet";
            }
          }
        }
      };

      applyQuietRule(meResult, userName);
      if (managerResults) {
        for (const [memberName, result] of Object.entries(managerResults)) {
          applyQuietRule(result, memberName);
        }
      }

      await new Promise((r) => setTimeout(r, 500));

      navigate("/dashboard", {
        state: {
          result: meResult,
          userName,
          chatData,
          initialMode: isManager ? "manager" : "me",
          managerResults,
          canonicalProjects,
        },
      });
    } catch (e) {
      console.error(e);
      toast.error("Analysis failed. Please try again.");
      setPhase("input");
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        <div className="space-y-3 text-center">
          {LOADING_STEPS.map((step, i) => (
            <p
              key={step.key}
              className={`text-sm transition-all duration-300 ${
                i === activeStep
                  ? "text-foreground font-medium"
                  : i < activeStep
                  ? "text-muted-foreground/60 line-through"
                  : "text-muted-foreground/30"
              }`}
            >
              {step.label}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (phase === "pick-user") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Who are you?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Select your name from the chat participants.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {participants.map((name) => (
              <button
                key={name}
                onClick={() => analyzeWithUser(name)}
                className="rounded-lg border-2 border-border bg-card px-5 py-3 text-sm font-medium transition-all duration-200 hover:border-primary hover:shadow-md hover:bg-primary/5"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sources = [
    { id: "teams" as const, label: "Teams", icon: MessageSquare, disabled: true, price: "$199 / team" },
    { id: "slack" as const, label: "Slack", icon: Hash, disabled: true, price: "$199 / team" },
    { id: "txt" as const, label: "Paste Text", icon: FileText, disabled: false, price: null },
  ];

  const expanded = source === "txt";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Choose data source</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Select where your chat data is coming from.
          </p>
        </div>

        <div className="flex justify-center gap-4">
          {sources.map((s) => {
            const isActive = source === s.id;
            return (
              <button
                key={s.id}
                disabled={s.disabled}
                onClick={() => setSource(s.id)}
                className={`
                  group flex flex-col items-center justify-center gap-2 rounded-xl border-2 
                  transition-all duration-300 ease-out
                  ${expanded ? "h-20 w-20" : "h-28 w-28"}
                  ${s.disabled ? "opacity-40 cursor-not-allowed border-border bg-card" : ""}
                  ${isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/50 hover:shadow-sm"}
                `}
              >
                <s.icon
                  className={`transition-all duration-300 ${expanded ? "h-5 w-5" : "h-7 w-7"} ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  }`}
                />
                <span className={`font-medium transition-all duration-300 ${expanded ? "text-xs" : "text-sm"}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`overflow-hidden transition-all duration-400 ease-out ${
            expanded
              ? "max-h-[600px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-4"
          }`}
        >
          <div className="space-y-4 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/data/sample-chat.txt");
                  const text = await res.text();
                  setChatData(text);
                } catch {
                  toast.error("Failed to load sample data.");
                }
              }}
            >
              <FileText className="h-4 w-4" />
              Try with sample data
            </Button>

            <div className="px-px">
              <Textarea
                placeholder="Paste your Teams or Slack chat here..."
                className="min-h-[260px] resize-none font-mono text-sm"
                value={chatData}
                onChange={(e) => setChatData(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={extractAndShowParticipants} disabled={!chatData.trim()}>
                Analyze
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataInput;
