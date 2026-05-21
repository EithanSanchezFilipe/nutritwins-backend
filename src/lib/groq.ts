import Groq from "groq-sdk";

export interface GroqCompletionOptions {
  model: string;
  temperature?: number;
  responseFormat?: { type: "json_object" | "text" };
}

export class GroqService {
  private groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not set in environment variables");
    }
    this.groq = new Groq({ apiKey });
  }

  async complete(
    prompt: string,
    options: GroqCompletionOptions,
  ): Promise<string> {
    const completion = await this.groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: options.model,
      temperature: options.temperature ?? 0.1,
      ...(options.responseFormat
        ? { response_format: options.responseFormat }
        : {}),
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Groq");
    return text;
  }

  async completeWithImage(
    prompt: string,
    imageBuffer: Buffer,
    mimeType: string,
    options: GroqCompletionOptions,
    extraText?: string,
  ): Promise<string> {
    const base64Image = imageBuffer.toString("base64");

    const messageContent: any[] = [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64Image}` },
      },
      ...(extraText ? [{ type: "text", text: extraText }] : []),
    ];

    const completion = await this.groq.chat.completions.create({
      messages: [{ role: "user", content: messageContent }],
      model: options.model,
      temperature: options.temperature ?? 0.1,
      ...(options.responseFormat
        ? { response_format: options.responseFormat }
        : {}),
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from Groq");
    return text;
  }
}

export const groqService = new GroqService();
