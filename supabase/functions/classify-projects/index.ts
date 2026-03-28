import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert work chat analyzer. Given a full chat log, identify ALL distinct projects or workstreams discussed.

CLASSIFICATION RULES:
1. Messages that are temporally close together (within minutes of each other) are likely part of the same conversation thread and the same project context.
2. Use BOTH message content AND temporal proximity to determine project membership. A burst of messages between the same people about related topics = one project.
3. Merge different names that refer to the same project into ONE canonical name. For example: "2024 inference", "2024 email data", "predictions.csv project" should all become one project like "2024 Email Inference & Classification".
4. Short back-and-forth exchanges within a few minutes are almost always about the same project — do NOT split them.

For each project, list ALL participants involved (by exact name as they appear in the chat) — anyone who sent messages about that project.

Return ONLY valid JSON with this structure:
{
  "projects": [
    {
      "canonical_name": "Clear, descriptive project name",
      "aliases": ["other names used in chat for this project"],
      "members": ["Person A", "Person B"]
    }
  ]
}

Return ONLY valid JSON, no markdown fences.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatData, participantNames } = await req.json();
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

    let participantInfo = "";
    if (participantNames && Array.isArray(participantNames) && participantNames.length > 0) {
      participantInfo = `\n\nThe participants are EXACTLY: ${participantNames.join(", ")}. Use these EXACT names in the "members" arrays.`;
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
          { role: "user", content: `Analyze this chat log and classify all projects. Pay attention to message timestamps — messages close in time are likely about the same project:\n\n${chatData}${participantInfo}` },
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
    console.error("classify-projects error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
