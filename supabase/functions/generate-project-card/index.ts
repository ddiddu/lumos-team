import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberName, projectName, chunks, weekLabels, perspective, allMembers } = await req.json();
    if (!memberName || !projectName || !chunks) {
      return new Response(JSON.stringify({ error: "memberName, projectName, and chunks are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const useThirdPerson = perspective === "third";
    const personRef = useThirdPerson ? `"${memberName}"` : "the user (\"you\")";
    const perspectiveNote = useThirdPerson
      ? `Write ALL text in third person using "${memberName}"'s name. "${memberName} worked on..." NOT "You worked on..."`
      : `Write all text in second person ("you", "your").`;

    let weekLabelInfo = "";
    if (weekLabels && Array.isArray(weekLabels)) {
      weekLabelInfo = `\nWeek labels: ${weekLabels.map((w: any) => `${w.key}=${w.label}`).join(", ")}. Map message timestamps to these weeks for weekly_summary and message_counts.`;
    }

    let membersNote = "";
    if (allMembers && Array.isArray(allMembers)) {
      const others = allMembers.filter((n: string) => n.toLowerCase() !== memberName.toLowerCase());
      if (others.length > 0) {
        membersNote = `\nThe other project members are: ${others.join(", ")}. Include them in the "members" array with their inferred roles and how ${personRef} interacts with them.`;
      }
    }

    const chunkText = Array.isArray(chunks) ? chunks.join("\n\n---\n\n") : chunks;

    const systemPrompt = `You are an expert work chat analyzer. Given message chunks from a specific project, generate a project card for ${personRef}.

${perspectiveNote}

Return ONLY valid JSON with this structure:
{
  "name": "${projectName}",
  "overview": "one sentence describing what this project is about",
  "left_off": "one sentence about the most recent activity by ${personRef}",
  "status": "active" or "blocked" or "quiet",
  "weekly_summary": {
    "W1": "one line summary or 'No activity'",
    "W2": "one line summary or 'No activity'",
    "W3": "one line summary or 'No activity'",
    "W4": "one line summary or 'No activity'"
  },
  "message_counts": {
    "W1": 0, "W2": 0, "W3": 0, "W4": 0,
    "W4_daily": {"Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0}
  },
  "members": [
    {
      "name": "Person Name",
      "role": "inferred role (2-4 words)",
      "interaction": "1-2 sentences describing interaction with ${personRef}"
    }
  ],
  "next_up": ["actionable task 1", "actionable task 2", "actionable task 3"]
}

RULES:
- Count ONLY messages from ${personRef} for message_counts
- "status": "active" if recent messages, "blocked" if waiting/stuck/OOO signals, "quiet" if no recent messages
- "left_off": what ${personRef} most recently did or discussed
- If no activity in a week, use "No activity" for summary and 0 for count
${weekLabelInfo}${membersNote}

Return ONLY valid JSON, no markdown fences.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a project card for ${personRef} on project "${projectName}".\n\nRelevant chat messages:\n\n${chunkText}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    console.error("generate-project-card error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
