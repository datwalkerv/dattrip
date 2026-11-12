import { ApiError, GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { ProviderError } from "@/lib/errors";

let client: GoogleGenAI | undefined;

export const aiConfigured = () => !!env().GEMINI_API_KEY;

/** One Gemini call. With `schema` the reply is JSON text matching it (still validate it with Zod afterwards). */
export async function generate(opts: { system: string; prompt: string; schema?: unknown; maxTokens?: number }): Promise<string> {
  const { GEMINI_API_KEY: apiKey, GEMINI_MODEL: model } = env();
  if (!apiKey) throw new ProviderError("gemini", "not_configured");
  client ??= new GoogleGenAI({ apiKey });
  try {
    const res = await client.models.generateContent({
      model,
      contents: opts.prompt,
      config: {
        systemInstruction: opts.system,
        temperature: 0.2,
        maxOutputTokens: opts.maxTokens ?? 600,
        abortSignal: AbortSignal.timeout(20_000),
        ...(opts.schema ? { responseMimeType: "application/json", responseJsonSchema: opts.schema } : {}),
      },
    });
    const text = res.text?.trim();
    if (!text) throw new ProviderError("gemini", "upstream", "gemini: empty reply");
    return text;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    const status = e instanceof ApiError ? e.status : 0;
    if (status === 429) throw new ProviderError("gemini", "rate_limited");
    if (status === 401 || status === 403) throw new ProviderError("gemini", "not_configured", "gemini: key rejected");
    throw new ProviderError("gemini", "upstream", `gemini: ${e instanceof Error ? e.message.slice(0, 200) : "request failed"}`);
  }
}
