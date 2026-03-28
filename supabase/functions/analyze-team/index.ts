import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert work chat analyzer. Given a chat log and a list of team members, analyze EACH member's involvement individually.

For EACH member, determine:
- What projects/topics THEY specifically discuss
- What THEIR most recent activity was (their last messages)
- Their inferred role based on what THEY say and do

Return a JSON object with this structure:

{
  "members": [
    {
      "name": "Person Name",
      "role": "inferred role (2-4 words)",
      "projects": [
        {
          "name": "project or topic name",
          "status": "active" or "blocked" or "quiet",
          "left_off": "one sentence about what THIS PERSON last did or said about this project"
        }
      ]
    }
  ]
}

IMPORTANT RULES:
- Analyze each member INDEPENDENTLY based on THEIR messages
- "left_off" must reflect what THAT SPECIFIC PERSON last said/did, not what the group discussed
- A member can be involved in multiple projects/topics
- Status per project:
  - "active": the member has recent messages about this topic
  - "blocked": the member mentioned waiting, being stuck, unavailable, OOO
  - "quiet": the member hasn't discussed this topic recently
- Do NOT copy the same description for multiple members
- Use the EXACT names provided

Return ONLY valid JSON, no markdown fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatData, userName, memberNames } = await req.json();
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

    const membersToAnalyze = (memberNames || []).filter(
      (n: string) => n.toLowerCase() !== (userName || "").toLowerCase()
    );

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
          {
            role: "user",
            content: `The current user is "${userName}". Analyze the following team members INDIVIDUALLY: ${membersToAnalyze.join(", ")}\n\nChat log:\n\n${chatData}`,
          },
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
    console.error("analyze-team error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
