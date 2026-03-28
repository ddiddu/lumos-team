import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert work chat analyzer. Given a pasted chat log from Teams or Slack, analyze it and return a JSON object with exactly this structure:

{
  "work_style": {
    "role": "short role title, max 5 words",
    "style": "max 1 short sentence",
    "likes": "comma-separated keywords, max 8 words total",
    "dislikes": "comma-separated keywords, max 8 words total",
    "speech_habits": "comma-separated short phrases, max 8 words total"
  },
  "projects": [
    {
      "name": "high-level project name (not too specific)",
      "overview": "one sentence describing what this project is about",
      "left_off": "one sentence about the most recent activity",
      "status": "active" or "blocked" or "quiet",
      "weekly_summary": {
        "W1": "one line summary",
        "W2": "one line summary",
        "W3": "one line summary",
        "W4": "one line summary"
      },
      "message_counts": {
        "W1": 0, "W2": 0, "W3": 0, "W4": 0,
        "W4_daily": {"Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0}
      },
      "members": [
        {
          "name": "Person Name",
          "role": "inferred role (2-4 words)",
          "interaction": "1-2 sentences describing how the analyzed person interacts with this person"
        }
      ],
      "next_up": ["actionable task 1", "actionable task 2", "actionable task 3"]
    }
  ]
}

IMPORTANT: The "members" array should list the participants involved in THIS specific project based on who sent messages about it. If canonical project data with member lists is provided, use those members. Infer each person's role from context.

IMPORTANT: The "message_counts" field will be provided as pre-calculated data. Use those exact values. Do NOT make up counts.

CRITICAL: Identify ALL distinct projects or work streams the person is involved in. Each project should be a separate entry in the "projects" array. A project is a distinct topic, initiative, or workstream. If there is truly only one, return one. But if the chat covers multiple topics, return multiple projects.

CRITICAL: All work_style fields MUST be extremely concise — max 1 short sentence or a few comma-separated keywords. No paragraphs.

CRITICAL: "overview" is 1 sentence. "left_off" is 1 sentence about the most recent thing the person did or discussed.

Return ONLY valid JSON, no markdown fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatData, userName, messageCounts, weekLabels, participantNames, perspective, canonicalProjects } = await req.json();
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

    // Perspective: "second" (default, Me mode) or "third" (Manager mode)
    const useThirdPerson = perspective === "third";
    let perspectiveInfo = "";
    if (useThirdPerson) {
      perspectiveInfo = `\n\nCRITICAL: Write ALL text in third person using "${userName}"'s name. Examples:
- "${userName} worked on..." NOT "You worked on..."
- "${userName}'s main focus was..." NOT "Your main focus was..."
- "${userName} is waiting for..." NOT "You are waiting for..."
- "Ask ${userName} about..." NOT "Ask about..."
This applies to ALL fields: overview, left_off, weekly_summary, next_up, interaction, style, etc.`;
    } else {
      perspectiveInfo = `\n\nWrite all text in second person ("you", "your").`;
    }

    let canonicalProjectInfo = "";
    if (canonicalProjects && Array.isArray(canonicalProjects) && canonicalProjects.length > 0) {
      canonicalProjectInfo = `\n\nIMPORTANT: Use ONLY these canonical project names (do NOT invent new names):\n${canonicalProjects.map((p: any) => `- "${p.canonical_name}" (also known as: ${p.aliases?.join(", ") || "no aliases"})`).join("\n")}\nOnly include projects that "${userName}" is actually involved in based on the chat data.`;
    }

    let countsInfo = "";
    if (messageCounts) {
      countsInfo = `\n\nPre-calculated message counts for "${userName}":\nWeekly: W1=${messageCounts.weekly?.W1 || 0}, W2=${messageCounts.weekly?.W2 || 0}, W3=${messageCounts.weekly?.W3 || 0}, W4=${messageCounts.weekly?.W4 || 0}\nW4 daily: Mon=${messageCounts.daily?.Mon || 0}, Tue=${messageCounts.daily?.Tue || 0}, Wed=${messageCounts.daily?.Wed || 0}, Thu=${messageCounts.daily?.Thu || 0}, Fri=${messageCounts.daily?.Fri || 0}\n\nUse these counts EXACTLY as given.`;
    }

    let weekLabelInfo = "";
    if (weekLabels && Array.isArray(weekLabels)) {
      weekLabelInfo = `\n\nWeek labels: ${weekLabels.map((w: any) => `${w.key}=${w.label}`).join(", ")}. Use these as context for your weekly summaries.`;
    }

    let participantInfo = "";
    if (participantNames && Array.isArray(participantNames) && participantNames.length > 0) {
      participantInfo = `\n\nIMPORTANT: The other participants (besides "${userName}") are EXACTLY: ${participantNames.join(", ")}. Use these EXACT names for the "members" array. Do NOT invent or modify names.`;
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
          { role: "user", content: `Person being analyzed: ${userName || "Unknown"}\n\nAnalyze this chat log:\n\n${chatData}${countsInfo}${weekLabelInfo}${participantInfo}${perspectiveInfo}${canonicalProjectInfo}` },
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

    // Force overwrite message_counts with pre-calculated values
    if (messageCounts && result.projects?.length > 0) {
      result.projects[0].message_counts = {
        W1: messageCounts.weekly?.W1 || 0,
        W2: messageCounts.weekly?.W2 || 0,
        W3: messageCounts.weekly?.W3 || 0,
        W4: messageCounts.weekly?.W4 || 0,
        W4_daily: {
          Mon: messageCounts.daily?.Mon || 0,
          Tue: messageCounts.daily?.Tue || 0,
          Wed: messageCounts.daily?.Wed || 0,
          Thu: messageCounts.daily?.Thu || 0,
          Fri: messageCounts.daily?.Fri || 0,
        },
      };
    }

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
