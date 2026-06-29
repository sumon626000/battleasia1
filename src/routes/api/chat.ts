import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages } = (await request.json()) as { messages?: UIMessage[] };
          if (!Array.isArray(messages) || messages.length === 0) {
            return new Response("Messages required", { status: 400 });
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response("AI not configured", { status: 500 });
          }

          // Use admin client to read chatbot config (system_prompt is now restricted)
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const [{ data: settings }, { data: kb }] = await Promise.all([
            supabaseAdmin.from("chatbot_settings").select("*").eq("id", 1).maybeSingle(),
            supabaseAdmin
              .from("chatbot_knowledge")
              .select("question, answer")
              .eq("enabled", true)
              .order("sort_order"),
          ]);

          if (settings && settings.enabled === false) {
            return new Response("Chatbot disabled", { status: 503 });
          }

          const systemPrompt = settings?.system_prompt ?? "You are a helpful assistant.";
          const model = settings?.model ?? "google/gemini-3-flash-preview";

          const kbBlock =
            kb && kb.length > 0
              ? `\n\nKnowledge base (use these to answer when relevant):\n${kb
                  .map((k, i) => `${i + 1}. Q: ${k.question}\n   A: ${k.answer}`)
                  .join("\n")}`
              : "";

          const gateway = createLovableAiGatewayProvider(apiKey);
          const result = streamText({
            model: gateway(model),
            system: systemPrompt + kbBlock,
            messages: await convertToModelMessages(messages),
          });

          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (e: any) {
          console.error("chat route error", e);
          return new Response(e?.message ?? "Internal error", { status: 500 });
        }
      },
    },
  },
});
