import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseTeamsChat, extractParticipants, getWeekLabels } from "@/lib/chatParser";
import { MessageSquare, Hash, FileText, ArrowLeft, Loader2, Lightbulb, Search, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: "easeOut" as const },
  }),
};

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

  async function generateCardsForMember(
    memberName: string,
    projects: ClassifiedProject[],
    weekLabels: any[],
    perspective: "second" | "third"
  ) {
    const memberProjects = projects.filter((p) =>
      p.members.some((m) => m.toLowerCase() === memberName.toLowerCase())
    );
    if (memberProjects.length === 0) return [];
    const cardPromises = memberProjects.map(async (project) => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-project-card", {
          body: { memberName, projectName: project.canonical_name, chunks: project.chunks, weekLabels, perspective, allMembers: project.members },
        });
        if (error) { console.error(`Card generation failed for ${memberName}/${project.canonical_name}:`, error); return null; }
        return data;
      } catch (e) { console.error(`Card generation error for ${memberName}/${project.canonical_name}:`, e); return null; }
    });
    const results = await Promise.all(cardPromises);
    return results.filter(Boolean);
  }

  async function aggregateMember(
    memberName: string, projectCards: any[], weekLabels: any[], perspective: "second" | "third"
  ): Promise<AnalysisResult> {
    if (projectCards.length === 0) {
      return { work_style: { role: "Team member", style: "", likes: "", dislikes: "", speech_habits: "" }, projects: [], weekLabels: weekLabels.map((w) => ({ key: w.key, label: w.label })) };
    }
    try {
      const { data, error } = await supabase.functions.invoke("aggregate-member", { body: { memberName, projectCards, perspective } });
      if (error) throw error;
      return { work_style: data.work_style, projects: data.projects, weekLabels: weekLabels.map((w) => ({ key: w.key, label: w.label })) };
    } catch (e) {
      console.error(`Aggregation failed for ${memberName}:`, e);
      return { work_style: { role: "Team member", style: "", likes: "", dislikes: "", speech_habits: "" }, projects: projectCards, weekLabels: weekLabels.map((w) => ({ key: w.key, label: w.label })) };
    }
  }

  const analyzeWithUser = async (userName: string) => {
    setPhase("loading");
    setActiveStep(0);
    const isManager = incomingMode === "manager";
    try {
      const parsed = parseTeamsChat(chatData);
      const weekLabels = getWeekLabels(parsed);
      setActiveStep(1);
      let canonicalProjects: ClassifiedProject[] = [];
      const { data: classifyData, error: classifyError } = await supabase.functions.invoke("classify-projects", { body: { chatData, participantNames: participants } });
      if (classifyError) throw new Error("Failed to classify projects");
      canonicalProjects = classifyData?.projects || [];
      setActiveStep(2);
      const meCards = await generateCardsForMember(userName, canonicalProjects, weekLabels, "second");
      let managerCardsByMember: Record<string, any[]> = {};
      if (isManager) {
        const otherMembers = participants.filter((n) => n.toLowerCase() !== userName.toLowerCase());
        const memberCardResults = await Promise.all(otherMembers.map(async (memberName) => ({ memberName, cards: await generateCardsForMember(memberName, canonicalProjects, weekLabels, "third") })));
        for (const { memberName, cards } of memberCardResults) managerCardsByMember[memberName] = cards;
      }
      setActiveStep(3);
      const meResult = await aggregateMember(userName, meCards, weekLabels, "second");
      let managerResults: Record<string, AnalysisResult> | undefined;
      if (isManager) {
        const aggregated = await Promise.all(Object.entries(managerCardsByMember).map(async ([memberName, cards]) => ({ memberName, result: await aggregateMember(memberName, cards, weekLabels, "third") })));
        managerResults = {};
        for (const { memberName, result } of aggregated) managerResults[memberName] = result;
      }
      setActiveStep(4);
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const applyQuietRule = (result: AnalysisResult, memberName: string) => {
        const memberMsgs = parsed.filter((m) => m.sender.toLowerCase() === memberName.toLowerCase());
        const recentMsgs = memberMsgs.filter((m) => m.timestamp >= sevenDaysAgo);
        for (const project of result.projects) {
          if (recentMsgs.length === 0) { project.status = "quiet"; }
          else if (project.message_counts && project.message_counts.W4 === 0) { project.status = "quiet"; }
        }
      };
      applyQuietRule(meResult, userName);
      if (managerResults) { for (const [memberName, result] of Object.entries(managerResults)) applyQuietRule(result, memberName); }
      await new Promise((r) => setTimeout(r, 500));
      navigate("/dashboard", { state: { result: meResult, userName, chatData, initialMode: isManager ? "manager" : "me", managerResults, canonicalProjects } });
    } catch (e) { console.error(e); toast.error("Analysis failed. Please try again."); setPhase("input"); }
  };

  // ── Loading Phase ──
  const DID_YOU_KNOW = [
    { icon: Lightbulb, title: "Did you know?", body: "60% of work time goes to 'work about work' — chasing status, coordinating, and figuring out what everyone's doing.", source: "Asana, 10,000 knowledge workers" },
    { icon: MessageSquare, title: "From a real manager:", body: "A lot of my messages get lost in Teams. I never know if my team actually saw them.", source: "Audit Team Manager" },
    { icon: Search, title: "Did you know?", body: "The average employee receives 153 Teams messages per day.", source: "Microsoft WorkLab" },
    { icon: Zap, title: "Did you know?", body: "Teams that reduce status chasing ship faster and burn out less.", source: undefined },
    { icon: Sparkles, title: undefined, body: "This tool was made by Jisu Kim. Reach out to her if you have any feedback or questions.", source: undefined },
  ];

  const [funFactIndex, setFunFactIndex] = useState(0);
  const [funFactVisible, setFunFactVisible] = useState(true);

  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => {
      setFunFactVisible(false);
      setTimeout(() => {
        setFunFactIndex((prev) => (prev + 1) % DID_YOU_KNOW.length);
        setFunFactVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === "loading") {
    const card = DID_YOU_KNOW[funFactIndex];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="space-y-3 text-center">
          {LOADING_STEPS.map((step, i) => (
            <p
              key={step.key}
              className={`text-sm transition-all duration-300 ${
                i === activeStep
                  ? "text-foreground font-medium"
                  : i < activeStep
                  ? "text-muted-foreground/50 line-through"
                  : "text-muted-foreground/25"
              }`}
            >
              {step.label}
            </p>
          ))}
        </div>

        {/* Did you know card */}
        <div
          className={`mt-4 max-w-sm w-full rounded-xl border border-border bg-card p-5 text-center transition-all duration-400 ${
            funFactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted mx-auto mb-3">
            <card.icon className="h-4 w-4 text-foreground" />
          </div>
          {card.title && <p className="text-xs font-semibold text-foreground mb-2">{card.title}</p>}
          <p className="text-sm text-muted-foreground leading-relaxed">{card.body}</p>
          {card.source && <p className="text-[11px] text-muted-foreground/60 mt-2">— {card.source}</p>}
        </div>
      </div>
    );
  }

  // ── Pick User Phase ──
  if (phase === "pick-user") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <nav className="w-full px-6 sm:px-10 py-5 flex items-center max-w-6xl mx-auto">
          <button onClick={() => setPhase("input")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </nav>
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
          <motion.div className="w-full max-w-lg space-y-10 text-center" initial="hidden" animate="visible" custom={0} variants={fadeUp}>
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Who are you?</h1>
              <p className="text-muted-foreground">Select your name from the chat participants.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {participants.map((name, i) => (
                <motion.button
                  key={name}
                  onClick={() => analyzeWithUser(name)}
                  className="rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-medium transition-all duration-300 hover:border-primary hover:shadow-md hover:bg-primary/5"
                  initial="hidden"
                  animate="visible"
                  custom={i * 0.5 + 1}
                  variants={fadeUp}
                >
                  {name}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Input Phase ──
  const sources = [
    { id: "teams" as const, label: "Teams", icon: MessageSquare, disabled: true, price: "$199 / team" },
    { id: "slack" as const, label: "Slack", icon: Hash, disabled: true, price: "$199 / team" },
    { id: "txt" as const, label: "Paste Text", icon: FileText, disabled: false, price: null },
  ];
  const expanded = source === "txt";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="w-full px-6 sm:px-10 py-5 flex items-center max-w-6xl mx-auto">
        <button onClick={() => navigate("/start")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
        <div className="w-full max-w-2xl space-y-10">
          <motion.div className="text-center space-y-3" initial="hidden" animate="visible" custom={0} variants={fadeUp}>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Choose data source</h1>
            <p className="text-muted-foreground">Select where your chat data is coming from.</p>
          </motion.div>

          <motion.div className="flex justify-center gap-4" initial="hidden" animate="visible" custom={1} variants={fadeUp}>
            {sources.map((s) => {
              const isActive = source === s.id;
              return (
                <button
                  key={s.id}
                  disabled={s.disabled}
                  onClick={() => setSource(s.id)}
                  className={`
                    group flex flex-col items-center justify-center gap-2.5 rounded-xl border
                    transition-all duration-300 ease-out
                    ${expanded ? "h-20 w-20" : "h-28 w-28"}
                    ${s.disabled ? "opacity-40 cursor-not-allowed border-border bg-card" : ""}
                    ${isActive ? "border-primary bg-primary/5 shadow-sm" : !s.disabled ? "border-border bg-card hover:border-primary/50 hover:shadow-sm" : ""}
                  `}
                >
                  <s.icon className={`transition-all duration-300 ${expanded ? "h-5 w-5" : "h-6 w-6"} ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                  <span className={`font-medium transition-all duration-300 ${expanded ? "text-xs" : "text-sm"}`}>{s.label}</span>
                  {s.price && <span className={`text-muted-foreground transition-all duration-300 ${expanded ? "text-[9px]" : "text-[11px]"}`}>{s.price}</span>}
                </button>
              );
            })}
          </motion.div>

          <div className={`overflow-hidden transition-all duration-400 ease-out ${expanded ? "max-h-[600px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-4"}`}>
            <div className="space-y-4 pt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="rounded-lg"
                onClick={async () => {
                  try { const res = await fetch("/data/sample-chat.txt"); setChatData(await res.text()); }
                  catch { toast.error("Failed to load sample data."); }
                }}
              >
                <FileText className="h-4 w-4" />
                Try with sample data
              </Button>

              <Textarea
                placeholder="Paste your Teams or Slack chat here..."
                className="min-h-[240px] resize-none font-mono text-sm rounded-xl border-border"
                value={chatData}
                onChange={(e) => setChatData(e.target.value)}
              />

              <div className="flex justify-end">
                <Button onClick={extractAndShowParticipants} disabled={!chatData.trim()} className="rounded-lg px-6">
                  Analyze
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataInput;
