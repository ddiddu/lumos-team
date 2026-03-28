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
    const { memberName, projectCards, perspective } = await req.json();
    if (!memberName || !projectCards || !Array.isArray(projectCards)) {
      return new Response(JSON.stringify({ error: "memberName and projectCards array are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const useThirdPerson = perspective === "third";
    const personRef = useThirdPerson ? `"${memberName}"` : "the user (\"you\")";
    const perspectiveNote = useThirdPerson
      ? `Write ALL text in third person using "${memberName}"'s name.`
      : `Write all text in second person ("you", "your").`;

    // Calculate overall status: worst among all project cards
    let overallStatus = "active";
    for (const card of projectCards) {
      if (card.status === "blocked") { overallStatus = "blocked"; break; }
      if (card.status === "quiet" && overallStatus === "active") overallStatus = "quiet";
    }

    const systemPrompt = `You are an expert work style analyzer. Given project cards for ${personRef}, generate a concise work style profile.

${perspectiveNote}

Return ONLY valid JSON with this structure:
{
  "work_style": {
    "role": "short role title, max 5 words",
    "style": "max 1 short sentence about work style",
    "likes": "comma-separated keywords, max 8 words total",
    "dislikes": "comma-separated keywords, max 8 words total",
    "speech_habits": "comma-separated short phrases, max 8 words total"
  }
}

Infer the work style from the project activities, interactions, and communication patterns visible in the project cards.
Be extremely concise. Return ONLY valid JSON, no markdown fences.`;

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
          { role: "user", content: `Generate a work style profile for ${personRef} based on these project cards:\n\n${JSON.stringify(projectCards, null, 2)}` },
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
    const workStyleResult = JSON.parse(jsonStr);

    // Assemble the final aggregated result
    const result = {
      work_style: workStyleResult.work_style,
      projects: projectCards,
      overallStatus,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aggregate-member error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
