import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseTeamsChat, countMessages } from "@/lib/chatParser";
import { MessageSquare, Hash, FileText } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

type Source = "teams" | "slack" | "txt" | null;

const DataInput = () => {
  const [userName, setUserName] = useState("");
  const [chatData, setChatData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [source, setSource] = useState<Source>(null);
  const navigate = useNavigate();

  const loadingMessages = [
    "Identifying projects...",
    "Analyzing work style...",
    "Generating insights...",
  ];

  const analyze = async () => {
    if (!userName.trim()) {
      toast.error("Please enter your name first.");
      return;
    }
    if (!chatData.trim()) {
      toast.error("Please paste some chat data first.");
      return;
    }

    setIsLoading(true);
    let msgIndex = 0;
    setLoadingText(loadingMessages[0]);

    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[msgIndex]);
    }, 2000);

    try {
      const parsed = parseTeamsChat(chatData);
      const counts = countMessages(parsed, userName);

      const { data, error } = await supabase.functions.invoke("analyze-chat", {
        body: { chatData, userName, messageCounts: counts },
      });

      clearInterval(interval);
      if (error) throw error;

      const result = data as AnalysisResult;
      navigate("/dashboard", { state: { result } });
    } catch (e) {
      clearInterval(interval);
      console.error(e);
      toast.error("Analysis failed. Please try again.");
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        <p className="text-muted-foreground">{loadingText}</p>
      </div>
    );
  }

  const sources = [
    { id: "teams" as const, label: "Teams", icon: MessageSquare, disabled: true },
    { id: "slack" as const, label: "Slack", icon: Hash, disabled: true },
    { id: "txt" as const, label: "Paste Text", icon: FileText, disabled: false },
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

        {/* Source cards */}
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

        {/* Input area — slides in */}
        <div
          className={`overflow-hidden transition-all duration-400 ease-out ${
            expanded
              ? "max-h-[600px] opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-4"
          }`}
        >
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Your name (e.g. Jisu Kim)"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />

            <Textarea
              placeholder="Paste your Teams or Slack chat here..."
              className="min-h-[260px] resize-none font-mono text-sm"
              value={chatData}
              onChange={(e) => setChatData(e.target.value)}
            />

            <div className="flex justify-end">
              <Button onClick={analyze} disabled={!chatData.trim() || !userName.trim()}>
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
