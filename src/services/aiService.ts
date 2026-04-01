import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ScheduleAnalysis {
  summary: string;
  recommendations: string[];
  studyPlan: string;
  timeManagement: string;
  risks: string[];
}

// Helper function to extract JSON from various response formats
function extractJSON(text: string): string {
  const trimmed = text.trim();

  // Try markdown code blocks
  const codeBlockMatch = trimmed.match(/```[\w]*\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const extracted = codeBlockMatch[1].trim();
    if (extracted) return extracted;
  }

  // Try to find JSON object (starts with { and ends with })
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0].trim();
  }

  // Try to find JSON array (starts with [ and ends with ])
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0].trim();
  }

  // Look for first brace or bracket
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");

  if (firstBrace !== -1) {
    return trimmed.substring(firstBrace);
  }
  if (firstBracket !== -1) {
    return trimmed.substring(firstBracket);
  }

  // Return original
  return trimmed;
}

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries - 1;
      const status = error.status;

      // If it's a 503 (service unavailable) or 429 (rate limit), retry
      if ((status === 503 || status === 429) && !isLastAttempt) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(
          `⏳ Service overloaded. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // For other errors or last attempt, throw
      throw error;
    }
  }

  throw new Error("Max retries exceeded");
}

class AIService {
  private client: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  /**
   * Initialize the AI service with an API key
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Check if the AI service is properly initialized
   */
  isInitialized(): boolean {
    return !!this.client && !!this.apiKey;
  }

  /**
   * Analyze a markdown schedule and return AI-generated insights
   */
  async analyzeSchedule(mdContent: string): Promise<ScheduleAnalysis> {
    if (!this.client) {
      throw new Error("AI service not initialized. Please provide an API key.");
    }

    const prompt = `You are a study planner. Analyze this schedule and provide analysis. Return ONLY valid JSON:

${mdContent}

{
  "summary": "Brief overview of the schedule",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "studyPlan": "Detailed optimized study plan",
  "timeManagement": "Time management tips",
  "risks": ["potential risk 1"]
}`;

    try {
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const result = await retryWithBackoff(async () => {
        console.log("📤 Sending request to Gemini API...");
        return await model.generateContent(prompt);
      });

      const responseText = result.response.text();
      console.log("Raw API response:", responseText);

      // Extract JSON from the response
      const jsonText = extractJSON(responseText);
      console.log("Extracted JSON:", jsonText);

      // Parse the JSON response
      const analysis = JSON.parse(jsonText) as ScheduleAnalysis;
      console.log("✓ Schedule analysis successful");
      return analysis;
    } catch (error) {
      console.error("Error analyzing schedule with Gemini:", error);

      // Return fallback response if parsing fails
      if (error instanceof SyntaxError) {
        console.log("⚠ Using fallback analysis response");
        return {
          summary:
            "Unable to parse detailed analysis. Please check your schedule format.",
          recommendations: [
            "Review your schedule for clarity",
            "Ensure all sessions have clear time slots",
            "Add break time between intensive study sessions",
          ],
          studyPlan: "Please re-import your schedule and try again.",
          timeManagement:
            "Consider using time blocks of 50-90 minutes with 10-15 minute breaks.",
          risks: ["Analysis parsing error - please try again"],
        };
      }

      throw error;
    }
  }

  /**
   * Generate study tips based on the markdown content
   */
  async generateStudyTips(mdContent: string): Promise<string[]> {
    if (!this.client) {
      throw new Error("AI service not initialized. Please provide an API key.");
    }

    const model = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Generate 5 study tips based on this schedule. Return ONLY a JSON array:

${mdContent}

["tip 1", "tip 2", "tip 3", "tip 4", "tip 5"]`;

    try {
      const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt);
      });

      const responseText = result.response.text();
      console.log("Study tips raw response:", responseText);

      const jsonText = extractJSON(responseText);
      const tips = JSON.parse(jsonText) as string[];
      console.log("✓ Study tips generated successfully");
      return tips;
    } catch (error) {
      console.error("Error generating study tips:", error);
      return [
        "Study in 50-minute focused sessions",
        "Take 10-15 minute breaks between sessions",
        "Review notes within 24 hours of learning",
        "Use active recall and spaced repetition",
        "Stay organized with a clear schedule",
      ];
    }
  }

  /**
   * Estimate workload based on schedule
   */
  async estimateWorkload(mdContent: string): Promise<{
    totalHours: number;
    difficulty: "light" | "moderate" | "heavy";
    recommendation: string;
  }> {
    if (!this.client) {
      throw new Error("AI service not initialized. Please provide an API key.");
    }

    const model = this.client.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Estimate workload for this schedule. Return ONLY valid JSON:

${mdContent}

{
  "totalHours": 0,
  "difficulty": "moderate",
  "recommendation": "Brief recommendation"
}`;

    try {
      const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt);
      });

      const responseText = result.response.text();

      // Extract JSON from the response
      const jsonText = extractJSON(responseText);

      const workload = JSON.parse(jsonText);
      console.log("✓ Workload estimation complete");
      return workload;
    } catch (error) {
      console.error("Error estimating workload:", error);
      return {
        totalHours: 0,
        difficulty: "moderate",
        recommendation: "Unable to estimate. Please check schedule format.",
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
