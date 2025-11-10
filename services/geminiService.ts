import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, ContributionPlan, MessageAuthor, ChatStep } from '../types';
import { AURA_CHAT_SYSTEM_INSTRUCTION, CONTRIBUTION_PLAN_SYSTEM_INSTRUCTION } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const chatModel = 'gemini-2.5-pro';
const imageModel = 'imagen-4.0-generate-001';

function formatChatHistoryForApi(chatHistory: ChatMessage[]) {
  return chatHistory.map(message => ({
    role: message.author === MessageAuthor.USER ? 'user' : 'model',
    parts: [{ text: message.text }],
  }));
}

const chatStepSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        isFinal: { type: Type.BOOLEAN }
    },
    required: ["question", "options", "isFinal"]
};

export const getNextChatStep = async (chatHistory: ChatMessage[]): Promise<ChatStep> => {
  try {
    const response = await ai.models.generateContent({
        model: chatModel,
        contents: formatChatHistoryForApi(chatHistory),
        config: {
            systemInstruction: AURA_CHAT_SYSTEM_INSTRUCTION,
            temperature: 0.8,
            responseMimeType: 'application/json',
            responseSchema: chatStepSchema
        }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error getting next chat step:", error);
    throw new Error("AIとの対話中にエラーが発生しました。");
  }
};

const contributionPlanSchema = {
  type: Type.OBJECT,
  properties: {
    planTitle: { type: Type.STRING, description: "ユーザーの貢献活動を表す、キャッチーで感動的なタイトル。" },
    summary: { type: Type.STRING, description: "ユーザーのスキルと情熱がどのように社会貢献に繋がるかを1〜2文で要約。" },
    suggestedOpportunities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "具体的なボランティアやプロジェクトの機会の名称。" },
          description: { type: Type.STRING, description: "その活動内容の詳細な説明。" },
          requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "この活動にマッチするユーザーのスキルリスト。" },
          impactStatement: { type: Type.STRING, description: "この貢献がもたらす社会的インパクトについての短い説明。" },
          actionType: { type: Type.STRING, enum: ["find_organizations", "find_events", "learn_more"], description: "この機会に関連するアクション種別。"},
          actionParams: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: "アクションのための検索クエリやトピック。" }
            },
            required: ["query"]
          }
        },
        required: ["title", "description", "requiredSkills", "impactStatement", "actionType", "actionParams"]
      },
      description: "ユーザーにマッチする具体的な貢献の機会を2〜3個提案。"
    },
    firstSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "実行すべき最初のステップのタイトル。" },
          description: { type: Type.STRING, description: "そのステップの具体的な内容。" },
          actionType: { type: Type.STRING, enum: ["find_organizations", "draft_email", "learn_more", "find_events", "draft_plan"], description: "ステップに対応するアクションの種別。アクションがない場合は省略。"},
          actionParams: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: "アクションに必要なパラメータ。検索クエリ、トピック、アイデアなど。" }
            },
            required: ["query"]
          }
        },
        required: ["title", "description"]
      },
      description: "貢献を始めるための具体的な最初のステップを3つ提案。可能であれば、多様なアクションを紐付けること。"
    },
    moodboardPrompt: { type: Type.STRING, description: "生成するムードボードの画像のコンセプトを説明する、英語の詳細なプロンプト。コミュニティ、協力、ポジティブな変化をテーマにすること。" }
  },
  required: ["planTitle", "summary", "suggestedOpportunities", "firstSteps", "moodboardPrompt"]
};


export const generateContributionPlan = async (chatHistory: ChatMessage[]): Promise<Omit<ContributionPlan, 'images'>> => {
  try {
    const conversation = chatHistory.map(m => `${m.author}: ${m.text}`).join('\n');
    const response = await ai.models.generateContent({
        model: chatModel,
        contents: `以下の会話を分析して、貢献計画を作成してください。\n\n${conversation}`,
        config: {
            systemInstruction: `
You are a Social Impact Strategist. Based on the provided conversation, generate a concrete and inspiring contribution plan in Japanese.
The plan must be in a structured JSON format.
- For 'suggestedOpportunities', you MUST include an action. Primarily use 'find_organizations', but you can also use 'find_events' or 'learn_more' if more appropriate.
- For 'firstSteps', propose a variety of actionable steps using different actionTypes: 'find_organizations', 'learn_more', 'find_events', 'draft_plan', or 'draft_email'. These steps should guide the user from interest to action.
- Ensure all actionParams.query are relevant and specific in Japanese.
`,
            responseMimeType: 'application/json',
            responseSchema: contributionPlanSchema
        }
    });

    const parsedPlan = JSON.parse(response.text);
    return parsedPlan;
  } catch (error) {
    console.error("Error generating contribution plan:", error);
    throw new Error("貢献プランの作成中にエラーが発生しました。");
  }
};

export const generateImagesForPlan = async (prompt: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: `Create a set of 4 beautiful, aesthetic, and inspiring images for a mood board, representing community, collaboration, and positive social change. The style should be hopeful, clean, and modern. Theme: ${prompt}`,
        config: {
            numberOfImages: 4,
            aspectRatio: '1:1',
            outputMimeType: 'image/jpeg',
        }
    });

    return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
  } catch (error)
 {
    console.error("Error generating images:", error);
    throw new Error("画像の生成中にエラーが発生しました。");
  }
};

export const findOrganizations = async (query: string): Promise<{name: string, description: string, url: string}[]> => {
    try {
        const prompt = `「${query}」に関連する日本のNPOやボランティア団体を3つ探し、以下のJSON形式でリストアップしてください。各団体について、公式サイトのURLも必ず含めてください。\n\n[\n  {\n    "name": "団体名",\n    "description": "活動内容の簡単な説明",\n    "url": "公式サイトのURL"\n  }\n]`;

        const response = await ai.models.generateContent({
            model: chatModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            url: { type: Type.STRING }
                        },
                        required: ["name", "description", "url"]
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error finding organizations:", error);
        throw new Error("団体の検索中にエラーが発生しました。");
    }
};

export const generateContactEmail = async (userProfile: string, organizationName: string): Promise<string> => {
    try {
        const prompt = `以下のユーザープロフィールと団体名に基づき、ボランティアや貢献活動への参加を問い合わせる、丁寧で熱意の伝わるメールを作成してください。

# ユーザープロフィール
${userProfile}

# 団体名
${organizationName}

メールは、自己紹介、貢献したい理由、自身のスキルがどう役立つか、具体的な活動について尋ねる内容を含めてください。件名も生成してください。件名は「件名：...」の形式で、本文はそれ以降に記述してください。`;

        const response = await ai.models.generateContent({
            model: chatModel,
            contents: prompt,
            config: {
                temperature: 0.7
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating contact email:", error);
        throw new Error("メールの作成中にエラーが発生しました。");
    }
};

export const learnMoreAboutTopic = async (topic: string): Promise<{ summary: string; keywords: string[] }> => {
    try {
        const prompt = `「${topic}」というトピックについて、初心者にも分かりやすく要点をまとめてください。関連するキーワードも3〜5個挙げてください。以下のJSON形式で回答してください。\n\n{\n  "summary": "トピックの要約",\n  "keywords": ["キーワード1", "キーワード2", "キーワード3"]\n}`;
        const response = await ai.models.generateContent({
            model: chatModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["summary", "keywords"]
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error learning more about topic:", error);
        throw new Error("トピックの学習中にエラーが発生しました。");
    }
};

export const findEvents = async (query: string): Promise<{name: string, date: string, url: string}[]> => {
    try {
        const prompt = `「${query}」に関連する日本のオンラインまたはオフラインのイベントやワークショップを3つ探し、以下のJSON形式でリストアップしてください。各イベントについて、公式サイトのURLも必ず含めてください。\n\n[\n  {\n    "name": "イベント名",\n    "date": "開催日時や期間",\n    "url": "公式サイトや詳細ページのURL"\n  }\n]`;
        const response = await ai.models.generateContent({
            model: chatModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            date: { type: Type.STRING },
                            url: { type: Type.STRING }
                        },
                        required: ["name", "date", "url"]
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error finding events:", error);
        throw new Error("イベントの検索中にエラーが発生しました。");
    }
};

export const draftProjectPlan = async (idea: string): Promise<{ title: string; steps: string[] }> => {
    try {
        const prompt = `「${idea}」というアイデアを実現するための、簡単なプロジェクト計画案を作成してください。具体的なステップを3〜5個挙げてください。以下のJSON形式で回答してください。\n\n{\n  "title": "プロジェクトのタイトル",\n  "steps": ["ステップ1の内容", "ステップ2の内容", "ステップ3の内容"]\n}`;
        const response = await ai.models.generateContent({
            model: chatModel,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "steps"]
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error drafting project plan:", error);
        throw new Error("計画の作成中にエラーが発生しました。");
    }
};