import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert work chat analyzer. Given a pasted chat log from Teams or Slack, analyze it and return a JSON object with exactly this structure:

{
  "work_style": {
    "role": "the person's apparent role",
    "style": "their communication/work style",
    "likes": "things they seem to enjoy or prefer",
    "dislikes": "things they seem to avoid or dislike",
    "speech_habits": "notable speech patterns or phrases"
  },
  "projects": [
    {
      "name": "project name",
      "status": "on track" or "blocked" or "in progress",
      "weekly_summary": {
        "W1": "one line summary of week 1 activity",
        "W2": "one line summary of week 2 activity",
        "W3": "one line summary of week 3 activity",
        "W4": "one line summary of week 4 activity"
      },
      "message_counts": <WILL BE PROVIDED - USE EXACTLY AS GIVEN>,
      "next_up": ["task 1", "task 2", "task 3"]
    }
  ]
}

IMPORTANT: The "message_counts" field will be provided to you as pre-calculated data from real timestamp parsing. You MUST use the provided message counts exactly as given for each project. Distribute the total counts across projects proportionally based on how many messages relate to each project.

Focus your analysis on:
1. Identifying the user's work style from their messages (the user whose name is provided)
2. Extracting distinct projects being discussed
3. Writing accurate weekly summaries
4. Suggesting actionable next steps

Extract at least 2 projects if possible. Return ONLY valid JSON, no markdown fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatData, userName, messageCounts } = await req.json();
    if (!chatData || typeof chatData !== "string" || chatData.trim().length === 0) {
      return new Response(JSON.stringify({ error: "chatData is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const countsInfo = messageCounts
      ? `\n\nPre-calculated message counts for user "${userName}":\nWeekly: W1=${messageCounts.weekly?.W1 || 0}, W2=${messageCounts.weekly?.W2 || 0}, W3=${messageCounts.weekly?.W3 || 0}, W4=${messageCounts.weekly?.W4 || 0}\nW4 daily: Mon=${messageCounts.daily?.Mon || 0}, Tue=${messageCounts.daily?.Tue || 0}, Wed=${messageCounts.daily?.Wed || 0}, Thu=${messageCounts.daily?.Thu || 0}, Fri=${messageCounts.daily?.Fri || 0}\n\nDistribute these counts proportionally across the projects you identify.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `User name: ${userName || "Unknown"}\n\nAnalyze this chat log:\n\n${chatData}${countsInfo}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in AI response");

    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
