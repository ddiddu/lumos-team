import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseTeamsChat, countMessages } from "@/lib/chatParser";
import type { AnalysisResult } from "@/types/analysis";

const DataInput = () => {
  const [userName, setUserName] = useState("");
  const [chatData, setChatData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
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
      // Parse chat and count messages
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Paste your chat</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy a conversation from Teams or Slack and paste it below.
          </p>
        </div>

        <Input
          placeholder="Your name (e.g. Jisu Kim)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        <Textarea
          placeholder="Paste your Teams or Slack chat here..."
          className="min-h-[300px] resize-none font-mono text-sm"
          value={chatData}
          onChange={(e) => setChatData(e.target.value)}
        />

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="opacity-40 cursor-not-allowed"
            disabled
          >
            Connect Teams
          </Button>
          <Button
            variant="secondary"
            className="opacity-40 cursor-not-allowed"
            disabled
          >
            Connect Slack
          </Button>
          <Button onClick={analyze} disabled={!chatData.trim() || !userName.trim()}>
            Analyze
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataInput;
