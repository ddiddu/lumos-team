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
      "message_counts": {
        "W1": 12, "W2": 8, "W3": 15, "W4": 20,
        "W4_daily": {"Mon": 5, "Tue": 3, "Wed": 4, "Thu": 5, "Fri": 3}
      },
      "next_up": ["task 1", "task 2", "task 3"]
    }
  ]
}

Extract at least 2 projects if possible. Make reasonable estimates for message counts based on the chat volume. If the chat doesn't span 4 weeks, extrapolate reasonably. Return ONLY valid JSON, no markdown fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatData } = await req.json();
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
          { role: "user", content: `Analyze this chat log:\n\n${chatData}` },
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

    // Parse the JSON from the response (strip markdown fences if present)
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
