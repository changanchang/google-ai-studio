
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NovelState, StructureConfig, StructureLevel, StructureNode } from '../types';
import { DEFAULT_STRUCTURE_CONFIG, DEFAULT_IDEA_PROMPT, DEFAULT_OUTLINE_PROMPT, DEFAULT_INTRO_PROMPT } from '../constants';
import { v4 as uuidv4 } from 'uuid';

interface NovelStore {
  novels: NovelState[];
  activeNovelId: string | null;
  isDarkMode: boolean;
  
  // Actions
  createNovel: () => string;
  setActiveNovel: (id: string) => void;
  updateNovelInfo: (id: string, data: Partial<NovelState>) => void;
  updateStructureConfig: (id: string, config: Partial<StructureConfig>) => void;
  updateStructureTree: (id: string, rootNode: StructureNode) => void;
  getActiveNovel: () => NovelState | undefined;
  toggleTheme: () => void;
}

const createEmptyNode = (level: StructureLevel, title: string = '无标题'): StructureNode => ({
  id: uuidv4(),
  title,
  summary: '',
  level,
  children: [],
  isExpanded: true
});

const initialRootNode = (): StructureNode => ({
  id: 'root',
  title: '小说根节点',
  summary: '全书故事梗概',
  level: StructureLevel.ROOT,
  children: [], 
  isExpanded: true
});

export const useNovelStore = create<NovelStore>()(
  persist(
    (set, get) => ({
      novels: [],
      activeNovelId: null,
      isDarkMode: false,

      createNovel: () => {
        const newId = uuidv4();
        const newNovel: NovelState = {
          id: newId,
          title: '',
          type: '',
          idea: '',
          outline: '',
          introduction: '',
          coverPrompt: '',
          // Default to DeepSeek
          aiProvider: 'DeepSeek',
          aiModel: 'deepseek-reasoner',
          systemInstruction: '你是一个专业的小说家，擅长构思宏大的世界观和细腻的人物情感。',
          
          // Prompt Defaults
          ideaPromptType: 'default',
          customIdeaPrompt: DEFAULT_IDEA_PROMPT,
          
          outlinePromptType: 'default',
          customOutlinePrompt: DEFAULT_OUTLINE_PROMPT,

          introPromptType: 'default',
          customIntroPrompt: DEFAULT_INTRO_PROMPT,

          structureConfig: { ...DEFAULT_STRUCTURE_CONFIG },
          rootNode: initialRootNode(),
          createdAt: Date.now(),
        };

        set((state) => ({
          novels: [newNovel, ...state.novels],
          activeNovelId: newId,
        }));
        
        return newId;
      },

      setActiveNovel: (id) => set({ activeNovelId: id }),

      updateNovelInfo: (id, data) =>
        set((state) => ({
          novels: state.novels.map((n) => (n.id === id ? { ...n, ...data } : n)),
        })),

      updateStructureConfig: (id, config) =>
        set((state) => ({
          novels: state.novels.map((n) =>
            n.id === id
              ? { ...n, structureConfig: { ...n.structureConfig, ...config } }
              : n
          ),
        })),

      updateStructureTree: (id, rootNode) =>
        set((state) => ({
          novels: state.novels.map((n) => (n.id === id ? { ...n, rootNode } : n)),
        })),

      getActiveNovel: () => {
        const { novels, activeNovelId } = get();
        return novels.find((n) => n.id === activeNovelId);
      },

      toggleTheme: () => set((state) => {
        const newMode = !state.isDarkMode;
        if (newMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { isDarkMode: newMode };
      }),
    }),
    {
      name: 'novel-architect-storage',
      onRehydrateStorage: () => (state) => {
        if (state?.isDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
  )
);