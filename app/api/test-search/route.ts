import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  const res = await client.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 512,
    tools: [{ type: "web_search_20250305" as any, name: "web_search" }],
    messages: [{ role: "user", content: "What is the current price of NM-B 12/2 wire at supplyhouse.com?" }],
  });

  return Response.json({ 
    content: res.content,
    stop_reason: res.stop_reason 
  });
}