
import { GoogleGenAI } from "@google/genai";
import { AI_PROVIDERS } from "../constants";

// Helper to determine if we should use Google SDK or fetch
const getProviderConfig = (providerId: string) => {
  return AI_PROVIDERS.find(p => p.id === providerId);
};

/**
 * Replaces placeholders in a template string with values from a variables object.
 * Matches patterns like {Key}.
 */
export const replaceTemplateVariables = (template: string, variables: Record<string, string>): string => {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    // If the variable exists, return it. Otherwise, keep the placeholder for debugging or ignore.
    return variables[key] !== undefined ? variables[key] : `{${key}}`;
  });
};

export const generateNovelText = async (
  prompt: string, 
  modelId: string = 'gemini-2.5-flash',
  providerId: string = 'Google',
  apiKey?: string,
  customBaseUrl?: string,
  systemInstruction?: string
): Promise<string> => {
  try {
    const providerConfig = getProviderConfig(providerId);
    
    // --- Strategy 1: Google GenAI SDK ---
    if (providerConfig?.isGoogle) {
        const key = apiKey || process.env.API_KEY;
        if (!key) throw new Error("Google API Key is missing.");
        
        const ai = new GoogleGenAI({ apiKey: key });
        // Fallback logic for legacy model names
        let actualModel = modelId;
        if (!actualModel.includes('gemini') && !actualModel.includes('veo') && !actualModel.includes('imagen')) {
            actualModel = 'gemini-2.5-flash';
        }

        const response = await ai.models.generateContent({
            model: actualModel,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction, 
                temperature: 0.7,
            }
        });
        return response.text || "No content generated.";
    }

    // --- Strategy 2: OpenAI Compatible REST API (DeepSeek, Moonshot, etc.) ---
    else {
        const key = apiKey;
        if (!key) throw new Error(`${providerId} API Key is missing. Please enter it in AI Settings.`);
        
        const baseUrl = customBaseUrl || providerConfig?.baseUrl;
        if (!baseUrl) throw new Error(`Base URL for ${providerId} is not configured.`);

        const messages = [];
        
        if (systemInstruction) {
            messages.push({ role: "system", content: systemInstruction });
            messages.push({ role: "user", content: prompt });
        } else {
            messages.push({ role: "user", content: `You are a professional novel writer.\n\n${prompt}` });
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages,
                temperature: 0.7,
                stream: false
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "No content generated.";
    }

  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error(`${providerId} Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generates Level 2 Outlines (Volume Summaries) based on the main outline.
 * Returns an array of strings, where each string is the summary for a volume.
 */
export const generateVolumeSplit = async (
    novelTitle: string,
    novelType: string,
    mainOutline: string,
    volumeCount: number,
    customPrompt?: string,
    context?: any
): Promise<(string | { title: string, summary: string })[]> => {
    return generateBatchSplit(
        novelTitle,
        novelType,
        "全书",
        mainOutline,
        "分册 (Volume)",
        volumeCount,
        customPrompt,
        context
    );
};

/**
 * Generic function to split a parent summary into N child summaries.
 * Returns either an array of summary strings, OR an array of objects { title, summary } if the prompt requested titles.
 */
export const generateBatchSplit = async (
    novelTitle: string,
    novelType: string,
    parentTitle: string,
    parentSummary: string,
    targetUnitName: string, // e.g., "Chapter", "Part"
    count: number,
    customPrompt?: string,
    context?: any,
    fixedSuffix?: string // Optional suffix that is always appended (not editable by user in simple mode)
): Promise<(string | { title: string, summary: string })[]> => {
    
    let finalPrompt = '';

    // Define context variables
    // Merge standard variables with whatever extra context was passed (global variables)
    const variables = {
        NovelTitle: novelTitle,
        NovelType: novelType,
        ParentTitle: parentTitle,
        ParentSummary: parentSummary,
        TargetUnit: targetUnitName,
        Count: count.toString(),
        ...(context || {}) // Inject Global Variables here
    };

    // Check if customPrompt uses placeholders (Advanced Mode)
    // We look for at least one known variable or just general {Key} pattern
    const hasPlaceholders = customPrompt && /\{(\w+)\}/.test(customPrompt);

    if (hasPlaceholders && customPrompt) {
        finalPrompt = replaceTemplateVariables(customPrompt, variables);
    } else {
        // Legacy Mode: Append context automatically
        const basePrompt = customPrompt || `你是一个专业的小说架构师。请根据上级大纲（${parentTitle}），将其拆解为 ${count} 个独立的${targetUnitName}大纲。
    
    要求：
    1. 必须生成严格的 JSON 数组格式，包含 ${count} 个字符串元素。
    2. 每个字符串对应一个${targetUnitName}的核心剧情摘要。
    3. 摘要内容要承上启下，逻辑连贯，字数适中（100-300字）。
    4. 不要返回任何 Markdown 标记或多余的解释文字，只返回 JSON。`;

        finalPrompt = `${basePrompt}

    --- 小说信息 ---
    书名：${novelTitle}
    类型：${novelType}
    上级内容（${parentTitle}）：
    ${parentSummary}`;
    }

    // Append Fixed Suffix if provided (also supports variables)
    if (fixedSuffix) {
        const processedSuffix = replaceTemplateVariables(fixedSuffix, variables);
        finalPrompt += `\n\n${processedSuffix}`;
    }

    try {
        const result = await generateNovelText(
            finalPrompt, 
            context?.modelId, 
            context?.providerId, 
            context?.apiKey, 
            context?.apiBaseUrl, 
            "You are a strict JSON generator."
        );

        // Attempt to clean and parse JSON
        let cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
        // Try to find the array bracket if there's extra text
        const firstBracket = cleanJson.indexOf('[');
        const lastBracket = cleanJson.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1) {
            cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
        }

        const parsed = JSON.parse(cleanJson);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
            // Handle both array of strings AND array of objects
            return parsed.map(p => {
                if (typeof p === 'string') return p;
                if (typeof p === 'object' && p !== null) return p; // Return the whole object (e.g. { title, summary })
                return JSON.stringify(p);
            });
        }
        
        throw new Error("Parsed result is not an array");

    } catch (e) {
        console.error("Failed to generate/parse batch split:", e);
        throw new Error("生成拆分大纲失败，AI 未返回有效的 JSON 格式。请重试。");
    }
};

export const buildPromptForStep = (
  step: 'IDEA' | 'OUTLINE' | 'STRUCTURE_EXPANSION' | 'CONTENT' | 'INTRODUCTION' | 'COVER_PROMPT',
  context: any
): string => {
  const { title, type, idea, outline, parentSummary, siblingContext } = context;
  
  switch (step) {
    case 'IDEA':
      return `Create a creative novel idea/premise for a "${type}" novel titled "${title}". Return only the core idea text.`;
    case 'OUTLINE':
      return `Based on the idea: "${idea}", write a detailed novel outline for a "${type}" novel named "${title}".`;
    case 'INTRODUCTION':
        return `请根据书名《${title}》、类型“${type}”以及大纲：“${outline || idea}”，写一段吸引人的小说简介（Brief Introduction）。
        要求：
        1. 语言通俗易懂，具有强烈的吸引力（黄金三章法则）。
        2. 突出核心冲突和主角特色。
        3. 字数控制在 200-500 字之间。
        4. 适合用作网络小说平台的书籍简介。`;
    case 'COVER_PROMPT':
        return `Based on the novel title "${title}", genre "${type}", and the following description: "${idea || outline}", create a detailed, high-quality AI art generation prompt (for Midjourney v6 or Stable Diffusion). 
        
        Requirements:
        1. Describe the main subject, environment, lighting, and style (e.g., cyberpunk, watercolor, oil painting, fantasy art).
        2. Include quality keywords (e.g., 8k, masterpiece, trending on artstation, cinematic lighting).
        3. Provide the prompt strictly in ENGLISH.
        4. Do not include any conversational filler, just the prompt text.`;
    case 'STRUCTURE_EXPANSION':
      return `Based on the parent summary: "${parentSummary}", generate a summary for the next level of the story structure. Context: ${JSON.stringify(siblingContext)}`;
    case 'CONTENT':
      return `Write the actual story content for the chapter titled "${title}". Summary: ${parentSummary}.`;
    default:
      return "";
  }
};