
import { StructureConfig, AIModelOption, AIProviderConfig } from './types';

export const DEFAULT_STRUCTURE_CONFIG: StructureConfig = {
  volumes: 3,     // 册
  partsPerVolume: 3, // 卷
  stagesPerPart: 3,  // 阶段
  chaptersPerStage: 10, // 章节
  plotsPerChapter: 3,  // 情节 (1解钩 + n主要 + 1钩子)
  wordsPerChapter: 2500 // 每章字数
};

export const DEFAULT_IDEA_PROMPT = `角色
你是世界顶级的网络文学小说创作大师

任务
仔细理解我给出的小说书名的全部含义，结合小说类型，分点式为小说写五点超级核心脑洞，生成的小说脑洞内容要要与小说类型相符合，严禁出现与小说类型不符的内容和元素，小说创作要点：第一是不断制造各个角色之间的矛盾冲突，通过不断激化这些矛盾冲突，进而推动小说故事情节向前发展，最终多条矛盾冲突故事线汇集到一块，使之达到无法调和解决的极限，所有的矛盾冲突在这一刻全都爆发开来，让小说故事达到阶段性的高潮，而多个轮次的阶段性高潮推动小说故事达到最终的高潮（即小说终极矛盾的爆发）；第二是对小说情节的安排应该是多轮次的反转和反差，让故事走向与读者预设的路线不同出乎意料但又在情理之中，提起读者的阅读和追更的兴趣，为了故事的紧凑性，需要突出对小说中各个主要角色特别是主角的的行为动机，必须有一把达摩克里斯之剑（生死危机、复仇火焰、拯救族群、信念信仰、致命危机、背负责任等等）悬在主要角色的头顶推动这些角色完成一系列惊心动魄的冒险和挑战；第三就是对小说中角色的行为、性格和心理的精心描写和刻画，每个角色都是一个丰富饱满的多面性的，要使每个角色都无比鲜活、栩栩如生，让读者产生强烈的带入感和情感共鸣，甚至与角色共情，为读者提供沉浸式阅读体验，减少对环境的描写，多运用角色之间的对手戏；第四请使用第三人称上帝视角的叙事方式创作，创作内容中尽量不使用使用人称代词（主角、配角、你、我、他、它等），必须让人一眼就可以清楚看出“什么场景下，谁做了什么事，得到了什么结果，产生了什么影响”`;

export const DEFAULT_OUTLINE_PROMPT = `角色
你是世界顶级的网络文学小说创作大师

任务
仔细理解小说核心脑洞中的所有要点，结合小说书名和小说类型，生成一份详细完善的小说大纲，生成的小说大纲内容要与小说类型相符合，严禁出现与小说类型不符的内容和元素，小说大纲创作要点：第一是不断制造各个角色之间的矛盾冲突，通过不断激化这些矛盾冲突，进而推动小说故事情节向前发展，最终多条矛盾冲突故事线汇集到一块，使之达到无法调和解决的极限，所有的矛盾冲突在这一刻全都爆发开来，让小说故事达到阶段性的高潮，而多个轮次的阶段性高潮推动小说故事达到最终的高潮（即小说终极矛盾的爆发）；第二是对小说情节的安排应该是多轮次的反转和反差，让故事走向与读者预设的路线不同出乎意料但又在情理之中，提起读者的阅读和追更的兴趣，为了故事的紧凑性，需要突出对小说中各个主要角色特别是主角的的行为动机，必须有一把达摩克里斯之剑（生死危机、复仇火焰、拯救族群、信念信仰、致命危机、背负责任等等）悬在主要角色的头顶推动这些角色完成一系列惊心动魄的冒险和挑战；第三就是对小说中角色的行为、性格和心理的精心描写和刻画，每个角色绝不是只有单一的一面而都是像一个真的人一样，具有丰富饱满的多面性和多样性，要使每个角色都无比鲜活、栩栩如生，让读者产生强烈的带入感和情感共鸣，甚至与角色共情，为读者提供沉浸式阅读体验，减少对环境的描写，多运用角色之间的对手戏；第四请使用第三人称上帝视角的叙事方式创作，创作内容中尽量不使用使用人称代词（主角、配角、你、我、他、它等），必须让人一眼就可以清楚看出“什么场景下，谁做了什么事，得到了什么结果，产生了什么影响”；第五是应该为小说构建完整的世界观`;

export const DEFAULT_INTRO_PROMPT = `角色
你是世界顶级的网络文学小说创作大师

任务
仔细理解小说故事大纲中的所有要点，结合核心脑洞、小说书名和小说类型，生成一段300字左右有趣、富有深意且十分吸引人的简介`;

// --- New Structure Generation Prompts ---

export const DEFAULT_VOLUME_SPLIT_PROMPT = `# 角色
你是世界顶级的网络文学小说创作大师

# 任务
仔细阅读全面理解小说大纲：{Soul_Outline}，结合小说核心脑洞：{Soul_Idea}、小说书名：{Soul_Title}和小说类型：{Soul_Type}后，将小说大纲分为{Config_Volumes}块，细化这{Config_Volumes}块大纲的内容，分别作为小说{Config_Volumes}册的详细大纲，并填入小说{Config_Volumes}个分册节点下的输入框中，生成的小说{Config_Volumes}册的详细大纲内容要与小说类型相符合，严禁出现与小说类型不符的内容和元素，小说创作要点：第一是不断制造各个角色之间的矛盾冲突，通过不断激化这些矛盾冲突，进而推动小说故事情节向前发展，最终多条矛盾冲突故事线汇集到一块，使之达到无法调和解决的极限，所有的矛盾冲突在这一刻全都爆发开来，让小说故事达到阶段性的高潮，而多个轮次的阶段性高潮推动小说故事达到最终的高潮（即小说终极矛盾的爆发）；第二是对小说情节的安排应该是多轮次的反转和反差，让故事走向与读者预设的路线不同出乎意料但又在情理之中，提起读者的阅读和追更的兴趣，为了故事的紧凑性，需要突出对小说中各个主要角色特别是主角的行为动机，设定短期目标与长期目标，且必须一直有一把达摩克里斯之剑（生死危机、复仇火焰、拯救族群、信念信仰、致命危机、背负责任等等）悬在主要角色的头顶逼迫这些角色完成一系列惊心动魄的冒险和挑战；第三就是对小说中角色的行为、性格和心理的精心描写和刻画，每个角色绝不是只有单一的一面而都是像一个真的人一样，具有丰富饱满的多面性和多样性，要使每个角色都无比鲜活、栩栩如生，让读者产生强烈的带入感和情感共鸣，甚至与角色共情，为读者提供沉浸式阅读体验，减少对环境的描写，多运用角色之间的对手戏；第四请使用第三人称上帝视角的叙事方式创作，创作内容中尽量不使用使用人称代词（主角、配角、你、我、他、它等），必须让人一眼就可以清楚看出“什么场景下，谁做了什么事，得到了什么结果，产生了什么影响”；第五是顺应小说故事大纲构建小说{Count}册的详细世界观。`;

export const VOLUME_SPLIT_SUFFIX = `
# 要求
仔细阅读全面理解小说大纲，结合小说核心脑洞、小说书名和小说类型后，将小说大纲分为{Count}块，细化这{Count}块大纲的内容（以json形式输出，json 前后不要有任何内容，输出的 json 必须可以被 JSON.parse 解析），分别作为小说{Count}册的详细大纲，并填入小说{Count}个分册节点下的输入框中。

# 输出示例
[
  {
    "title": "小说第1册的册名",
    "summary": "小说第1册的详细大纲内容..."
  },
  {
    "title": "小说第2册的册名",
    "summary": "小说第2册的详细大纲内容..."
  }
]
`;

export const DEFAULT_PART_SPLIT_PROMPT = `# 角色
你是世界顶级的网络文学小说创作大师

# 任务
仔细阅读全面理解{ParentTitle}的大纲：{ParentSummary}，结合小说故事大纲：{Soul_Outline}、小说书名：{Soul_Title}和小说类型：{Soul_Type}后，将{ParentTitle}的大纲分为{Count}块，细化这{Count}块大纲的内容，分别作为小说{Count}卷的详细大纲，并填入小说{Count}个分卷节点下的输入框中，生成的小说{Count}卷的详细大纲内容要与小说类型相符合，严禁出现与小说类型不符的内容和元素，小说创作要点：第一是不断制造各个角色之间的矛盾冲突，通过不断激化这些矛盾冲突，进而推动小说故事情节向前发展，最终多条矛盾冲突故事线汇集到一块，使之达到无法调和解决的极限，所有的矛盾冲突在这一刻全都爆发开来，让小说故事达到阶段性的高潮，而多个轮次的阶段性高潮推动小说故事达到最终的高潮（即小说终极矛盾的爆发）；第二是对小说情节的安排应该是多轮次的反转和反差，让故事走向与读者预设的路线不同出乎意料但又在情理之中，提起读者的阅读和追更的兴趣，为了故事的紧凑性，需要突出对小说中各个主要角色特别是主角的行为动机，设定短期目标与长期目标，且必须一直有一把达摩克里斯之剑（生死危机、复仇火焰、拯救族群、信念信仰、致命危机、背负责任等等）悬在主要角色的头顶逼迫这些角色完成一系列惊心动魄的冒险和挑战；第三就是对小说中角色的行为、性格和心理的精心描写和刻画，每个角色绝不是只有单一的一面而都是像一个真的人一样，具有丰富饱满的多面性和多样性，要使每个角色都无比鲜活、栩栩如生，让读者产生强烈的带入感和情感共鸣，甚至与角色共情，为读者提供沉浸式阅读体验，减少对环境的描写，多运用角色之间的对手戏；第四请使用第三人称上帝视角的叙事方式创作，创作内容中尽量不使用使用人称代词（主角、配角、你、我、他、它等），必须让人一眼就可以清楚看出“什么场景下，谁做了什么事，得到了什么结果，产生了什么影响”；第五是顺应小说故事大纲构建小说{Count}卷的详细世界观。`;

export const PART_SPLIT_SUFFIX = `
# 要求
仔细阅读全面理解{ParentTitle}的大纲，结合小说故事大纲、小说书名和小说类型后，将{ParentTitle}大纲分为{Count}块，细化这{Count}块大纲的内容（以json形式输出，json 前后不要有任何内容，输出的 json 必须可以被 JSON.parse 解析），分别作为小说{Count}卷的详细大纲，并填入小说{Count}个分卷节点下的输入框中。

# 输出示例
[
  {
    "title": "第1卷的卷名",
    "summary": "第1卷的详细大纲..."
  },
  {
    "title": "第2卷的卷名",
    "summary": "第2卷的详细大纲..."
  }
]
`;

export const DEFAULT_STAGE_SPLIT_PROMPT = `# 角色
你是世界顶级的网络文学小说创作大师

# 任务
仔细阅读全面理解{ParentTitle}的大纲：{ParentSummary}，结合{GrandParentTitle}的大纲：{GrandParentSummary}、小说书名：{Soul_Title}和小说类型：{Soul_Type}后，将{ParentTitle}的大纲分为{Count}份，细化这{Count}份大纲的内容，ai生成小说{Count}阶段的详细大纲，并填入小说{Count}个阶段节点下的输入框中，生成的小说{Count}个阶段的详细大纲内容要与小说类型相符合，严禁出现与小说类型不符的内容和元素，小说创作要点：第一是不断制造各个角色之间的矛盾冲突，通过不断激化这些矛盾冲突，进而推动小说故事情节向前发展，最终多条矛盾冲突故事线汇集到一块，使之达到无法调和解决的极限，所有的矛盾冲突在这一刻全都爆发开来，让小说故事达到阶段性的高潮，而多个轮次的阶段性高潮推动小说故事达到最终的高潮（即小说终极矛盾的爆发）；第二是对小说情节的安排应该是多轮次的反转和反差，让故事走向与读者预设的路线不同出乎意料但又在情理之中，提起读者的阅读和追更的兴趣，为了故事的紧凑性，需要突出对小说中各个主要角色特别是主角的的行为动机，设定短期目标与长期目标，且必须一直有一把达摩克里斯之剑（生死危机、复仇火焰、拯救族群、信念信仰、致命危机、背负责任等等）悬在主要角色的头顶逼迫这些角色完成一系列惊心动魄的冒险和挑战；第三就是对小说中角色的行为、性格和心理的精心描写和刻画，每个角色绝不是只有单一的一面而都是像一个真的人一样，具有丰富饱满的多面性和多样性，要使每个角色都无比鲜活、栩栩如生，让读者产生强烈的带入感和情感共鸣，甚至与角色共情，为读者提供沉浸式阅读体验，减少对环境的描写，多运用角色之间的对手戏；第四请使用第三人称上帝视角的叙事方式创作，创作内容中尽量不使用使用人称代词（主角、配角、你、我、他、它等），必须让人一眼就可以清楚看出“什么场景下，谁做了什么事，得到了什么结果，产生了什么影响”；第五是顺应{ParentTitle}大纲构建小说{Count}个阶段的详细世界观。`;

export const STAGE_SPLIT_SUFFIX = `
# 要求
仔细阅读全面理解{ParentTitle}的大纲，结合{GrandParentTitle}大纲、小说书名和小说类型后，将{ParentTitle}的大纲分为{Count}份，细化这{Count}份大纲的内容（以json形式输出，json 前后不要有任何内容，输出的 json 必须可以被 JSON.parse 解析），ai生成小说{Count}阶段的详细大纲，并填入小说{Count}个阶段节点下的输入框中

# 输出示例
[
  {
    "title": "第1阶段的阶段名",
    "summary": "第1阶段的大纲..."
  },
  {
    "title": "第2阶段的阶段名",
    "summary": "第2阶段的大纲..."
  }
]
`;

export const NOVEL_TYPES = [
  "玄幻", "奇幻", "武侠", "仙侠", "都市", "历史", "军事", "游戏", "竞技", "科幻", "悬疑", "灵异", "同人", "轻小说"
];

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'Custom',
    name: '自定义 (Custom)',
    defaultModel: '',
    baseUrl: '',
    website: '',
    pricing: '自建或第三方代理'
  },
  { 
    id: 'DeepSeek', 
    name: 'DeepSeek (深度求索)', 
    defaultModel: 'deepseek-reasoner',
    baseUrl: 'https://api.deepseek.com',
    website: 'https://platform.deepseek.com/api_keys',
    pricing: '注册即送 500万 Tokens (免费体验)'
  },
  { 
    id: 'Moonshot', 
    name: 'Moonshot AI (Kimi)', 
    defaultModel: 'moonshot-v1-8k',
    baseUrl: 'https://api.moonshot.cn/v1',
    website: 'https://platform.moonshot.cn/console/api-keys',
    pricing: '新用户注册赠送 15元 额度'
  },
  { 
    id: 'Qwen', 
    name: 'Qwen (阿里通义千问)', 
    defaultModel: 'qwen-turbo',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    website: 'https://dashscope.console.aliyun.com/apiKey',
    pricing: '新用户限时免费 / 赠送 Token 包'
  },
  { 
    id: 'Yi', 
    name: 'Yi (零一万物)', 
    defaultModel: 'yi-large',
    baseUrl: 'https://api.lingyiwanwu.com/v1',
    website: 'https://platform.lingyiwanwu.com/apikeys',
    pricing: '新用户注册赠送一定额度'
  },
  { 
    id: 'OpenAI', 
    name: 'OpenAI (GPT)', 
    defaultModel: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    website: 'https://platform.openai.com/api-keys',
    pricing: '按量付费，需绑定信用卡'
  },
  { 
    id: 'Google', 
    name: 'Google Gemini', 
    defaultModel: 'gemini-2.5-flash',
    isGoogle: true,
    website: 'https://aistudio.google.com/app/apikey',
    pricing: 'AI Studio 提供免费额度 (需特定地区IP)'
  }
];

export const AI_MODELS: Record<string, AIModelOption[]> = {
  DeepSeek: [
    { id: 'deepseek-reasoner', name: 'DeepSeek R1 (推理模型)', description: '最强逻辑推理，适合复杂大纲' },
    { id: 'deepseek-chat', name: 'DeepSeek V3 (通用)', description: '高性价比，响应速度快' },
  ],
  Moonshot: [
    { id: 'moonshot-v1-8k', name: 'Moonshot V1 8k', description: '适合短篇生成' },
    { id: 'moonshot-v1-32k', name: 'Moonshot V1 32k', description: '适合中长篇' },
    { id: 'moonshot-v1-128k', name: 'Moonshot V1 128k', description: '超长上下文支持' },
  ],
  Qwen: [
    { id: 'qwen-plus', name: 'Qwen Plus', description: '能力均衡，效果优秀' },
    { id: 'qwen-max', name: 'Qwen Max', description: '通义千问最强模型' },
    { id: 'qwen-turbo', name: 'Qwen Turbo', description: '速度极快' },
  ],
  Yi: [
    { id: 'yi-large', name: 'Yi Large', description: '千亿参数大模型' },
    { id: 'yi-medium', name: 'Yi Medium', description: '中等规模，高性价比' },
  ],
  OpenAI: [
    { id: 'gpt-4o', name: 'GPT-4o', description: '目前最强综合能力' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '快速且便宜' },
  ],
  Google: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '速度快，综合能力强' },
    { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini 2.0 Flash Thinking', description: '具备思维链能力' },
    { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.0 Pro', description: '最强逻辑推理' },
  ]
};
