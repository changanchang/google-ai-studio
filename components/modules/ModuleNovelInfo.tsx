import React, { useState, useRef, useEffect } from 'react';
import { NovelState } from '../../types';
import { NOVEL_TYPES, DEFAULT_IDEA_PROMPT, DEFAULT_OUTLINE_PROMPT, DEFAULT_INTRO_PROMPT } from '../../constants';
import { useNovelStore } from '../../store/useNovelStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Sparkles, Loader2, AlignLeft, Lightbulb, PenLine, Hash, Wand2, ChevronDown, BookType, Type, FileText, Image, Palette, Settings2, RotateCcw, Save, Code, ChevronRight } from 'lucide-react';
import { generateNovelText, buildPromptForStep, replaceTemplateVariables } from '../../services/geminiService';
import { generateGlobalVariables, getNovelVariableCategories, VariableCategory } from '../../utils/treeUtils';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import clsx from 'clsx';
import { DebouncedInput, DebouncedTextarea } from '../ui/DebouncedComponents';

// --- Reusable Categorized Variable Menu ---

const VariableCategoryMenu = ({ 
    categories, 
    onSelect 
}: { 
    categories: VariableCategory[], 
    onSelect: (key: string) => void 
}) => {
    const [openCategory, setOpenCategory] = useState<string | null>(null);

    return (
        <div className="absolute top-full left-0 mt-1 w-72 max-h-[300px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-[60] flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                {categories.map(cat => {
                    const isOpen = openCategory === cat.name;
                    const isDisabled = cat.items.length === 0;

                    return (
                        <div key={cat.name} className="border-b last:border-0 border-zinc-100 dark:border-zinc-800/50">
                            <button
                                onClick={() => !isDisabled && setOpenCategory(isOpen ? null : cat.name)}
                                className={clsx(
                                    "w-full px-3 py-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-left transition-colors",
                                    isDisabled 
                                        ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed" 
                                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                )}
                            >
                                {cat.name}
                                {!isDisabled && (
                                    <ChevronDown className={clsx("w-3 h-3 transition-transform", isOpen ? "rotate-180" : "")} />
                                )}
                            </button>
                            
                            {isOpen && !isDisabled && (
                                <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-1 space-y-0.5 border-t border-zinc-100 dark:border-zinc-800/50">
                                    {cat.items.map(item => (
                                        <button
                                            key={item.key}
                                            onClick={() => {
                                                onSelect(item.key);
                                                setOpenCategory(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 rounded transition-colors truncate font-mono flex items-center justify-between group"
                                            title={item.label}
                                        >
                                            <span className="truncate flex-1">{item.label}</span>
                                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400 ml-2">插入</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
             </div>
        </div>
    );
};

// --- Reusable Settings Modal ---

const PromptSettingsModal = ({ 
    isOpen, 
    onClose, 
    title,
    defaultPrompt,
    currentType,
    currentCustomPrompt,
    variableCategories,
    onSave 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    title: string,
    defaultPrompt: string,
    currentType: 'default' | 'custom',
    currentCustomPrompt: string,
    variableCategories: VariableCategory[],
    onSave: (type: 'default' | 'custom', customPrompt: string) => void 
}) => {
    const [editorContent, setEditorContent] = useState(
        currentType === 'custom' && currentCustomPrompt ? currentCustomPrompt : defaultPrompt
    );
    const [showVariables, setShowVariables] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside to close variables
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowVariables(false);
            }
        };
        if(showVariables) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showVariables]);

    useEffect(() => {
        if (isOpen) {
            setEditorContent(
                currentType === 'custom' && currentCustomPrompt ? currentCustomPrompt : defaultPrompt
            );
        }
    }, [isOpen, currentType, currentCustomPrompt, defaultPrompt]);

    const handleInsertVariable = (key: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = editorContent;
        const newText = text.substring(0, start) + `{${key}}` + text.substring(end);
        
        setEditorContent(newText);
        setShowVariables(false);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + key.length + 2, start + key.length + 2);
        }, 0);
    };

    const handleReset = () => {
        if(confirm('确定要重置为系统默认提示词吗？当前编辑的内容将丢失。')) {
            setEditorContent(defaultPrompt);
        }
    };

    const handleSave = () => {
        const isDefault = editorContent === defaultPrompt;
        onSave(isDefault ? 'default' : 'custom', editorContent);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
            <div className="flex flex-col h-[600px]">
                <div className="flex justify-between items-center p-6 pb-2 shrink-0">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-amber-500" />
                        {title}
                    </h3>
                </div>

                <div className="p-6 pt-2 flex-1 flex flex-col min-h-0 overflow-visible relative">
                    {/* Toolbar */}
                    <div className="mb-3 flex items-center gap-2 z-20">
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowVariables(!showVariables)}
                                className={clsx(
                                    "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-2",
                                    showVariables 
                                        ? "bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-300"
                                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-brand-300"
                                )}
                            >
                                <Code className="w-3.5 h-3.5" />
                                插入变量 / Insert Variable
                                <ChevronDown className={clsx("w-3 h-3 transition-transform", showVariables ? "rotate-180" : "")} />
                            </button>

                            {showVariables && (
                                <VariableCategoryMenu 
                                    categories={variableCategories} 
                                    onSelect={handleInsertVariable} 
                                />
                            )}
                        </div>

                        <div className="flex-1"></div>
                        <button 
                            onClick={handleReset}
                            className="text-xs text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" /> 重置默认
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all shadow-inner overflow-hidden">
                        <textarea 
                            ref={textareaRef}
                            className="flex-1 w-full bg-transparent border-none resize-none focus:ring-0 outline-none text-sm font-mono leading-relaxed custom-scrollbar text-zinc-800 dark:text-zinc-200"
                            value={editorContent}
                            onChange={(e) => setEditorContent(e.target.value)}
                            placeholder="请输入提示词..."
                        />
                    </div>
                    
                    <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                        提示：如果不使用变量，系统会自动将相关信息附加到提示词末尾。如果使用了变量（如 {"{Soul_Title}"}），系统将进行精确替换。
                    </p>
                </div>

                <div className="p-6 pt-0 flex justify-end gap-3 shrink-0">
                    <Button variant="ghost" onClick={onClose}>取消</Button>
                    <Button 
                        onClick={handleSave}
                        className="bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                    >
                        <Save className="w-4 h-4 mr-2" /> 保存设置
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// --- Main Component ---

interface ModuleNovelInfoProps {
  novel: NovelState;
}

export const ModuleNovelInfo: React.FC<ModuleNovelInfoProps> = ({ novel }) => {
  const updateNovelInfo = useNovelStore((state) => state.updateNovelInfo);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingIntro, setIsGeneratingIntro] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  
  // Settings Modal State
  const [showIdeaSettings, setShowIdeaSettings] = useState(false);
  const [showOutlineSettings, setShowOutlineSettings] = useState(false);
  const [showIntroSettings, setShowIntroSettings] = useState(false);

  // State for Type Combobox
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeWrapperRef = useRef<HTMLDivElement>(null);

  // Dynamic Variable Categories
  const variableCategories = getNovelVariableCategories(novel);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (typeWrapperRef.current && !typeWrapperRef.current.contains(event.target as Node)) {
            setShowTypeDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers
  const handleChange = (field: keyof NovelState, value: string) => {
    updateNovelInfo(novel.id, { [field]: value });
  };

  /**
   * Automatically analyzes and fills the Genre if it is empty.
   */
  const ensureNovelType = async (): Promise<string> => {
      if (novel.type && novel.type.trim()) return novel.type;
      if (!novel.title) return "";

      try {
          const prompt = `作为资深网文编辑，请根据小说标题《${novel.title}》自动分析并推断该小说最可能的类型定义。
          要求：
          1. 返回格式为多个标签组合，中间用"/"分隔，例如："穿越/历史/权谋/战争/热血"。
          2. 标签应精准概括小说可能的题材、流派和风格。
          3. 严禁返回任何解释性文字，只返回类型字符串。`;

          const generatedType = await generateNovelText(
              prompt,
              novel.aiModel,
              novel.aiProvider,
              novel.apiKey,
              novel.apiBaseUrl,
              "You are a helpful assistant specialized in classifying web novels." 
          );

          const cleanType = generatedType.replace(/['"«»]/g, '').trim();
          
          if (cleanType) {
              updateNovelInfo(novel.id, { type: cleanType });
              return cleanType;
          }
      } catch (e) {
          console.error("Auto-genre failed", e);
      }
      return "";
  };

  // Helper to generate prompt with variable support
  const constructSmartPrompt = (basePrompt: string, localVariables: Record<string, string>, defaultFooter: string) => {
      // 1. Gather all possible variables
      const globalVariables = generateGlobalVariables(novel);
      const allVariables = { ...globalVariables, ...localVariables };

      // 2. Check for variables in the prompt
      // We look for any pattern {Key}
      const hasPlaceholders = /\{(\w+)\}/.test(basePrompt);
      
      if (hasPlaceholders) {
          return replaceTemplateVariables(basePrompt, allVariables);
      } else {
          // Legacy append mode
          return `${basePrompt}\n\n${defaultFooter}`;
      }
  };

  const handleGenerateIdea = async () => {
    if (!novel.title) {
      alert("请先填写小说标题 (书名)。");
      return;
    }
    setIsGeneratingIdea(true);
    try {
      const resolvedType = await ensureNovelType();
      
      const basePrompt = novel.ideaPromptType === 'custom' && novel.customIdeaPrompt 
          ? novel.customIdeaPrompt 
          : DEFAULT_IDEA_PROMPT;

      // Local context variables (ensure these exist for logic compatibility even if user uses Global ones)
      const localVars = {
          Title: novel.title,
          Type: resolvedType || '未指定',
          ExistingIdea: novel.idea || '暂无'
      };
      
      const defaultFooter = `--- 当前任务输入 ---\n` + 
                          `小说书名：${novel.title}\n` + 
                          `小说类型：${resolvedType || '未指定'}\n` +
                          `现有脑洞点：${novel.idea}\n\n` +
                          `请根据以上信息执行创作任务。`;

      const finalPrompt = constructSmartPrompt(basePrompt, localVars, defaultFooter);

      const idea = await generateNovelText(
          finalPrompt, 
          novel.aiModel, 
          novel.aiProvider, 
          novel.apiKey,
          novel.apiBaseUrl,
          novel.systemInstruction
      );
      updateNovelInfo(novel.id, { idea });
    } catch (error) {
      alert(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!novel.idea && !novel.title) {
        alert("生成大纲需要小说标题和核心脑洞。");
        return;
    }
    setIsGeneratingOutline(true);
    try {
        const resolvedType = await ensureNovelType();

        const basePrompt = novel.outlinePromptType === 'custom' && novel.customOutlinePrompt
            ? novel.customOutlinePrompt
            : DEFAULT_OUTLINE_PROMPT;
        
        const localVars = {
          Title: novel.title,
          Type: resolvedType || '未指定',
          Idea: novel.idea || ''
        };

        const defaultFooter = `--- 当前任务输入 ---\n` + 
                          `小说书名：${novel.title}\n` + 
                          `小说类型：${resolvedType || '未指定'}\n` +
                          `核心脑洞：${novel.idea}\n\n` +
                          `请根据以上信息创作详细的小说故事大纲。`;

        const finalPrompt = constructSmartPrompt(basePrompt, localVars, defaultFooter);

        const outline = await generateNovelText(
            finalPrompt, 
            novel.aiModel,
            novel.aiProvider,
            novel.apiKey,
            novel.apiBaseUrl,
            novel.systemInstruction
        );
        updateNovelInfo(novel.id, { outline });
    } catch (error) {
        alert(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
        setIsGeneratingOutline(false);
    }
  };

  const handleGenerateIntro = async () => {
      if (!novel.idea && !novel.outline) {
          alert("生成简介需要至少有核心脑洞或大纲内容。");
          return;
      }
      setIsGeneratingIntro(true);
      try {
          const resolvedType = await ensureNovelType();
          
          const basePrompt = novel.introPromptType === 'custom' && novel.customIntroPrompt
            ? novel.customIntroPrompt
            : DEFAULT_INTRO_PROMPT;

          const localVars = {
            Title: novel.title,
            Type: resolvedType || '未指定',
            Idea: novel.idea || '',
            Outline: novel.outline || ''
          };

          const defaultFooter = `--- 当前任务输入 ---\n` + 
                            `小说书名：${novel.title}\n` + 
                            `小说类型：${resolvedType || '未指定'}\n` +
                            `核心脑洞：${novel.idea}\n` +
                            `故事大纲：${novel.outline}\n\n` +
                            `请根据以上信息创作小说简介。`;

          const finalPrompt = constructSmartPrompt(basePrompt, localVars, defaultFooter);

          const introduction = await generateNovelText(
              finalPrompt, 
              novel.aiModel,
              novel.aiProvider,
              novel.apiKey,
              novel.apiBaseUrl,
              novel.systemInstruction
          );
          updateNovelInfo(novel.id, { introduction });
      } catch (error) {
          alert(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
          setIsGeneratingIntro(false);
      }
  };

  const handleGenerateCoverPrompt = async () => {
      if (!novel.idea && !novel.outline) {
          alert("生成封面提示词需要至少有核心脑洞或大纲内容。");
          return;
      }
      setIsGeneratingCover(true);
      try {
          const resolvedType = await ensureNovelType();
          
          // Cover prompt uses simple hardcoded logic for now, or use buildPromptForStep
          // To allow full variable support, we'd need to expose a Cover Prompt Settings UI in the future.
          // For now, we reuse the basic flow but we can still try to use smart variables if we had a stored prompt.
          const prompt = buildPromptForStep('COVER_PROMPT', { title: novel.title, type: resolvedType, idea: novel.idea, outline: novel.outline });
          
          const coverPrompt = await generateNovelText(
              prompt, 
              novel.aiModel,
              novel.aiProvider,
              novel.apiKey,
              novel.apiBaseUrl,
              novel.systemInstruction
          );
          updateNovelInfo(novel.id, { coverPrompt });
      } catch (error) {
          alert(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
          setIsGeneratingCover(false);
      }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
      {/* Settings Modal - Idea */}
      <PromptSettingsModal 
          isOpen={showIdeaSettings}
          onClose={() => setShowIdeaSettings(false)}
          title="核心脑洞 - 提示词设置"
          defaultPrompt={DEFAULT_IDEA_PROMPT}
          currentType={novel.ideaPromptType || 'default'}
          currentCustomPrompt={novel.customIdeaPrompt || DEFAULT_IDEA_PROMPT}
          variableCategories={variableCategories}
          onSave={(type, customPrompt) => {
              updateNovelInfo(novel.id, { 
                  ideaPromptType: type,
                  customIdeaPrompt: customPrompt
              });
          }}
      />

      {/* Settings Modal - Outline */}
      <PromptSettingsModal 
          isOpen={showOutlineSettings}
          onClose={() => setShowOutlineSettings(false)}
          title="故事大纲 - 提示词设置"
          defaultPrompt={DEFAULT_OUTLINE_PROMPT}
          currentType={novel.outlinePromptType || 'default'}
          currentCustomPrompt={novel.customOutlinePrompt || DEFAULT_OUTLINE_PROMPT}
          variableCategories={variableCategories}
          onSave={(type, customPrompt) => {
              updateNovelInfo(novel.id, { 
                  outlinePromptType: type,
                  customOutlinePrompt: customPrompt
              });
          }}
      />

      {/* Settings Modal - Introduction */}
      <PromptSettingsModal 
          isOpen={showIntroSettings}
          onClose={() => setShowIntroSettings(false)}
          title="小说简介 - 提示词设置"
          defaultPrompt={DEFAULT_INTRO_PROMPT}
          currentType={novel.introPromptType || 'default'}
          currentCustomPrompt={novel.customIntroPrompt || DEFAULT_INTRO_PROMPT}
          variableCategories={variableCategories}
          onSave={(type, customPrompt) => {
              updateNovelInfo(novel.id, { 
                  introPromptType: type,
                  customIntroPrompt: customPrompt
              });
          }}
      />

      {/* 1. HERO SECTION */}
      <motion.div variants={itemVariants} className="relative group rounded-2xl p-0.5 bg-gradient-to-br from-brand-500/20 via-fuchsia-500/20 to-sky-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-fuchsia-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition duration-700"></div>
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-sm group-hover:shadow-2xl group-hover:shadow-brand-500/10 transition-all overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-zinc-800">
              
              <div className="flex-[2] p-6 flex flex-col justify-center gap-3">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <PenLine className="w-3.5 h-3.5 text-brand-500" /> 书名 / Novel Title
                  </label>
                  <DebouncedInput
                      className="w-full bg-transparent text-3xl md:text-4xl font-black text-zinc-900 dark:text-white placeholder:text-zinc-200 dark:placeholder:text-zinc-800 border-none p-0 focus:ring-0 outline-none font-serif tracking-tight transition-colors"
                      value={novel.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="请输入书名..."
                  />
              </div>

              <div className="flex-1 p-6 flex flex-col justify-center gap-3 bg-zinc-50/50 dark:bg-zinc-800/20" ref={typeWrapperRef}>
                   <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <BookType className="w-3.5 h-3.5 text-cyan-500" /> 类型 / Genre
                  </label>
                  <div className="relative">
                      <DebouncedInput
                          className="w-full bg-transparent text-lg font-bold text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 border-none p-0 focus:ring-0 outline-none transition-colors"
                          value={novel.type}
                          onChange={(e) => handleChange('type', e.target.value)}
                          onFocus={() => setShowTypeDropdown(true)}
                          placeholder="AI 自动推断..."
                      />
                      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 dark:text-zinc-600 pointer-events-none" />
                      
                      <AnimatePresence>
                          {showTypeDropdown && (
                              <motion.div 
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute top-[calc(100%+16px)] left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto custom-scrollbar p-1.5"
                              >
                                  <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                      常用类型标签
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {NOVEL_TYPES.map(t => (
                                        <button
                                            key={t}
                                            className="text-left px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 transition-colors flex items-center gap-2 group/item"
                                            onClick={() => {
                                                handleChange('type', t);
                                                setShowTypeDropdown(false);
                                            }}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 group-hover/item:bg-brand-400 transition-colors"></div>
                                            {t}
                                        </button>
                                    ))}
                                  </div>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
              </div>
          </div>
      </motion.div>

      {/* 2. CREATIVE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Idea Card */}
        <motion.div variants={itemVariants} className="relative group flex flex-col h-full min-h-[300px]">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-400/30 to-orange-300/10 dark:from-amber-800/30 dark:to-orange-900/10 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative flex-1 flex flex-col bg-white dark:bg-zinc-900/80 backdrop-blur-xl rounded-[1.8rem] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-amber-900/5 overflow-hidden transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-[1.01] group-hover:shadow-2xl group-hover:shadow-amber-500/10">
                <div className="px-6 pt-6 pb-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400">
                            <Lightbulb className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">核心脑洞</span>
                    </div>
                    <button 
                        onClick={() => setShowIdeaSettings(true)}
                        className="p-1.5 rounded-full text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                        title="配置核心脑洞提示词"
                    >
                        <Settings2 className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 relative">
                    <DebouncedTextarea 
                        className="w-full h-full p-6 bg-transparent border-none resize-none focus:ring-0 outline-none text-base leading-relaxed text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                        placeholder="这里是一切的开始... 描述你的核心创意，或者点击右下角按钮让 AI 帮你构思。"
                        value={novel.idea}
                        onChange={(e) => handleChange('idea', e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleGenerateIdea}
                            disabled={isGeneratingIdea}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all border",
                                isGeneratingIdea 
                                    ? "bg-amber-50 text-amber-400 border-amber-100 cursor-wait" 
                                    : "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent hover:shadow-amber-500/30"
                            )}
                        >
                            {isGeneratingIdea ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            {isGeneratingIdea ? '正在构思...' : 'AI自动生成'}
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* Outline Card */}
        <motion.div variants={itemVariants} className="relative group flex flex-col h-full min-h-[300px]">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-brand-400/30 to-fuchsia-300/10 dark:from-brand-800/30 dark:to-fuchsia-900/10 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative flex-1 flex flex-col bg-white dark:bg-zinc-900/80 backdrop-blur-xl rounded-[1.8rem] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-brand-900/5 overflow-hidden transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-[1.01] group-hover:shadow-2xl group-hover:shadow-brand-500/10">
                <div className="px-6 pt-6 pb-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-600 dark:text-brand-400">
                            <AlignLeft className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">故事大纲</span>
                    </div>
                    <button 
                        onClick={() => setShowOutlineSettings(true)}
                        className="p-1.5 rounded-full text-zinc-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
                        title="配置大纲生成提示词"
                    >
                        <Settings2 className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 relative">
                    <DebouncedTextarea 
                        className="w-full h-full p-6 bg-transparent border-none resize-none focus:ring-0 outline-none text-sm leading-loose font-mono text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                        placeholder="起承转合，故事的骨架..."
                        value={novel.outline}
                        onChange={(e) => handleChange('outline', e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleGenerateOutline}
                            disabled={isGeneratingOutline}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all border",
                                isGeneratingOutline 
                                    ? "bg-brand-50 text-brand-400 border-brand-100 cursor-wait" 
                                    : "bg-gradient-to-r from-brand-600 to-fuchsia-600 text-white border-transparent hover:shadow-brand-500/30"
                            )}
                        >
                            {isGeneratingOutline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {isGeneratingOutline ? '正在推演...' : '生成/润色大纲'}
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
      </div>

      {/* 3. INTRO & COVER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <motion.div variants={itemVariants} className="relative group flex flex-col h-full min-h-[250px]">
             <div className="absolute -inset-0.5 bg-gradient-to-br from-sky-400/30 to-blue-300/10 dark:from-sky-800/30 dark:to-blue-900/10 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <div className="relative flex-1 flex flex-col bg-white dark:bg-zinc-900/80 backdrop-blur-xl rounded-[1.8rem] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-sky-900/5 overflow-hidden transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-[1.01] group-hover:shadow-2xl group-hover:shadow-sky-500/10">
                 <div className="px-6 pt-6 pb-2 flex justify-between items-center">
                     <div className="flex items-center gap-2">
                         <div className="p-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg text-sky-600 dark:text-sky-400">
                             <FileText className="w-5 h-5" />
                         </div>
                         <span className="font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">小说简介 (Synopsis)</span>
                     </div>
                     <button 
                        onClick={() => setShowIntroSettings(true)}
                        className="p-1.5 rounded-full text-zinc-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
                        title="配置简介生成提示词"
                    >
                        <Settings2 className="w-4 h-4" />
                    </button>
                 </div>
                 <div className="flex-1 relative">
                     <DebouncedTextarea 
                         className="w-full h-full p-6 bg-transparent border-none resize-none focus:ring-0 outline-none text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                         placeholder="吸引读者的简短介绍，通常用于封面或书背..."
                         value={novel.introduction || ''}
                         onChange={(e) => handleChange('introduction', e.target.value)}
                     />
                     <div className="absolute bottom-4 right-4">
                         <motion.button
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             onClick={handleGenerateIntro}
                             disabled={isGeneratingIntro}
                             className={clsx(
                                 "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all border",
                                 isGeneratingIntro
                                     ? "bg-sky-50 text-sky-400 border-sky-100 cursor-wait" 
                                     : "bg-gradient-to-r from-sky-500 to-blue-500 text-white border-transparent hover:shadow-sky-500/30"
                             )}
                         >
                             {isGeneratingIntro ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
                             {isGeneratingIntro ? '撰写中...' : '生成简介'}
                         </motion.button>
                     </div>
                 </div>
             </div>
         </motion.div>

         <motion.div variants={itemVariants} className="relative group flex flex-col h-full min-h-[250px]">
             <div className="absolute -inset-0.5 bg-gradient-to-br from-rose-400/30 to-pink-300/10 dark:from-rose-800/30 dark:to-pink-900/10 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <div className="relative flex-1 flex flex-col bg-white dark:bg-zinc-900/80 backdrop-blur-xl rounded-[1.8rem] border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-rose-900/5 overflow-hidden transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-[1.01] group-hover:shadow-2xl group-hover:shadow-rose-500/10">
                 <div className="px-6 pt-6 pb-2 flex justify-between items-center">
                     <div className="flex items-center gap-2">
                         <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-rose-600 dark:text-rose-400">
                             <Palette className="w-5 h-5" />
                         </div>
                         <span className="font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">封面提示词 (Cover Prompt)</span>
                     </div>
                 </div>
                 <div className="flex-1 relative">
                     <DebouncedTextarea 
                         className="w-full h-full p-6 bg-transparent border-none resize-none focus:ring-0 outline-none text-sm leading-relaxed font-mono text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                         placeholder="用于 AI 绘画工具（如 Midjourney / Stable Diffusion）的提示词..."
                         value={novel.coverPrompt || ''}
                         onChange={(e) => handleChange('coverPrompt', e.target.value)}
                     />
                     <div className="absolute bottom-4 right-4">
                         <motion.button
                             whileHover={{ scale: 1.05 }}
                             whileTap={{ scale: 0.95 }}
                             onClick={handleGenerateCoverPrompt}
                             disabled={isGeneratingCover}
                             className={clsx(
                                 "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all border",
                                 isGeneratingCover
                                     ? "bg-rose-50 text-rose-400 border-rose-100 cursor-wait" 
                                     : "bg-gradient-to-r from-rose-500 to-pink-500 text-white border-transparent hover:shadow-rose-500/30"
                             )}
                         >
                             {isGeneratingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
                             {isGeneratingCover ? '描绘中...' : '生成封面词'}
                         </motion.button>
                     </div>
                 </div>
             </div>
         </motion.div>
      </div>
    </motion.div>
  );
};