/** Direct Anthropic ping to verify the key works. (Skips Next.js-only imports.) */
import Anthropic from "@anthropic-ai/sdk";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY in .env.local");
    process.exit(1);
  }

  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  console.log(`Pinging ${model}…`);
  const r = await anthropic.messages.create({
    model,
    max_tokens: 100,
    messages: [{ role: "user", content: "Reply with exactly: OK" }],
  });

  const text = r.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  console.log("Reply:", text);
  console.log(
    `Tokens: ${r.usage.input_tokens} in / ${r.usage.output_tokens} out`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
