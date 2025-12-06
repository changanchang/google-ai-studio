
export enum StructureLevel {
  ROOT = 'ROOT',
  VOLUME = 'VOLUME', // 册
  PART = 'PART',     // 卷
  STAGE = 'STAGE',   // 阶段
  CHAPTER = 'CHAPTER', // 章节
  PLOT = 'PLOT'      // 情节
}

export interface StructureNode {
  id: string;
  title: string;
  summary: string;
  content?: string;
  level: StructureLevel;
  children: StructureNode[];
  isExpanded?: boolean;
  isDeleted?: boolean; // Soft delete flag
  lastModified?: number; // Timestamp for latest update tracking
}

export interface StructureConfig {
  volumes: number;
  partsPerVolume: number;
  stagesPerPart: number;
  chaptersPerStage: number;
  plotsPerChapter: number;
  wordsPerChapter: number; // New field
}

export interface NovelState {
  id: string;
  title: string;
  type: string;
  idea: string;
  outline: string;
  introduction?: string; // Novel Synopsis/Intro
  coverPrompt?: string; // AI Image Generation Prompt
  
  // AI Config
  aiProvider: string; // 'DeepSeek' | 'Moonshot' | 'Yi' | 'Qwen' | 'Google' | 'OpenAI' etc.
  aiModel: string;
  apiKey?: string; // User provided API Key
  apiBaseUrl?: string; // Optional custom base URL for OpenAI compatible providers
  systemInstruction?: string; // AI Persona/Role Definition
  
  // Prompt Config for Idea Generation
  ideaPromptType?: 'default' | 'custom';
  customIdeaPrompt?: string;

  // Prompt Config for Outline Generation
  outlinePromptType?: 'default' | 'custom';
  customOutlinePrompt?: string;

  // Prompt Config for Introduction Generation
  introPromptType?: 'default' | 'custom';
  customIntroPrompt?: string;

  // Structure Logic
  structureConfig: StructureConfig;
  rootNode: StructureNode; 
  
  createdAt: number;
}

export type GenerationTarget = 'IDEA' | 'OUTLINE' | 'STRUCTURE_EXPANSION' | 'CONTENT' | 'INTRODUCTION' | 'COVER_PROMPT';

export interface AIModelOption {
  id: string;
  name: string;
  description: string;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  defaultModel: string;
  baseUrl?: string; // Default base URL for this provider
  isGoogle?: boolean; // If true, uses Google GenAI SDK
  website?: string; // Official website for API keys
  pricing?: string; // Brief pricing/free tier info
}