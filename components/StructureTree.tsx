
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StructureLevel, StructureNode, NovelState } from '../types';
import { ChevronRight, LayoutTemplate, Sparkles, FileText, Trash2, Plus, Undo2, ChevronDown, Settings2, Layers, Book, Scroll, Bookmark, FileType, AlignLeft, MoreHorizontal, PenLine, Wand2, Loader2, Edit3, MessageSquareText, RotateCcw, Save, Code } from 'lucide-react';
import clsx from 'clsx';
import { ModuleStructureConfig } from './modules/ModuleStructureConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { DebouncedInput, DebouncedTextarea } from './ui/DebouncedComponents';
import { Modal } from './ui/Modal';
import { findNodeById, findPath, findDeepestFirstNode, findSmartDefaultNode, batchUpdateChildrenSummaries, getNovelVariableCategories, VariableCategory, generateGlobalVariables } from '../utils/treeUtils';
import { generateBatchSplit } from '../services/geminiService';
import { useNovelStore } from '../store/useNovelStore';
import { DEFAULT_VOLUME_SPLIT_PROMPT, VOLUME_SPLIT_SUFFIX, DEFAULT_PART_SPLIT_PROMPT, PART_SPLIT_SUFFIX, DEFAULT_STAGE_SPLIT_PROMPT, STAGE_SPLIT_SUFFIX } from '../constants';

// --- Utilities ---

const getLevelConfig = (level: StructureLevel) => {
    switch (level) {
        case StructureLevel.VOLUME: 
            return { 
                icon: Book,
                label: "分册",
                colorClass: "text-sky-600 dark:text-sky-400",
                bgClass: "bg-sky-500", // Solid color for indicators
                lightBgClass: "bg-sky-50 dark:bg-sky-900/20",
                borderClass: "border-sky-200 dark:border-sky-800"
            };
        case StructureLevel.PART: 
            return {
                icon: Scroll,
                label: "分卷",
                colorClass: "text-blue-600 dark:text-blue-400",
                bgClass: "bg-blue-500",
                lightBgClass: "bg-blue-50 dark:bg-blue-900/20",
                borderClass: "border-blue-200 dark:border-blue-800"
            };
        case StructureLevel.STAGE: 
            return {
                icon: Layers,
                label: "阶段",
                colorClass: "text-indigo-600 dark:text-indigo-400",
                bgClass: "bg-indigo-500",
                lightBgClass: "bg-indigo-50 dark:bg-indigo-900/20",
                borderClass: "border-indigo-200 dark:border-indigo-800"
            };
        case StructureLevel.CHAPTER: 
            return {
                icon: FileType,
                label: "章节",
                colorClass: "text-fuchsia-600 dark:text-fuchsia-400",
                bgClass: "bg-fuchsia-500",
                lightBgClass: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
                borderClass: "border-fuchsia-200 dark:border-fuchsia-800"
            };
        case StructureLevel.PLOT: 
            return {
                icon: AlignLeft,
                label: "情节",
                colorClass: "text-rose-600 dark:text-rose-400",
                bgClass: "bg-rose-500",
                lightBgClass: "bg-rose-50 dark:bg-rose-900/20",
                borderClass: "border-rose-200 dark:border-rose-800"
            };
        default: 
            return {
                icon: Bookmark,
                label: level,
                colorClass: "text-zinc-600 dark:text-zinc-400",
                bgClass: "bg-zinc-500",
                lightBgClass: "bg-zinc-50 dark:bg-zinc-800",
                borderClass: "border-zinc-200 dark:border-zinc-700"
            };
    }
};

const getLevelBadgeInfo = (level: StructureLevel) => {
    switch (level) {
        case StructureLevel.VOLUME: return { label: 'VOLUME', bg: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' };
        case StructureLevel.PART: return { label: 'PART', bg: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' };
        case StructureLevel.STAGE: return { label: 'STAGE', bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' };
        case StructureLevel.CHAPTER: return { label: 'CHAPTER', bg: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300' };
        case StructureLevel.PLOT: return { label: 'PLOT', bg: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' };
        default: return { label: 'NODE', bg: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' };
    }
};

const getColumnTitle = (level: StructureLevel) => {
    switch (level) {
        case StructureLevel.VOLUME: return "分册列表";
        case StructureLevel.PART: return "分卷列表";
        case StructureLevel.STAGE: return "阶段列表";
        case StructureLevel.CHAPTER: return "章节列表";
        default: return `${level} List`;
    }
};

const getStructureLevelName = (level: StructureLevel) => {
    switch (level) {
        case StructureLevel.VOLUME: return "分册 (二级大纲)";
        case StructureLevel.PART: return "分卷 (三级大纲)";
        case StructureLevel.STAGE: return "阶段 (四级大纲)";
        case StructureLevel.CHAPTER: return "章节 (五级大纲)";
        default: return "大纲";
    }
};

const DEFAULT_SPLIT_PROMPT_TEMPLATE = `你是一个专业的小说架构师。请根据上级大纲（{ParentTitle}），将其拆解为 {Count} 个独立的{TargetUnit}大纲。

要求：
1. 必须生成严格的 JSON 数组格式，包含 {Count} 个字符串元素。
2. 每个字符串对应一个{TargetUnit}的核心剧情摘要。
3. 摘要内容要承上启下，逻辑连贯，字数适中（100-300字）。
4. 不要返回任何 Markdown 标记或多余的解释文字，只返回 JSON。`;

// --- Components ---

interface ActionModalProps {
    isOpen: boolean;
    type: 'delete' | 'restore';
    nodeTitle: string;
    onClose: () => void;
    onConfirm: () => void;
}

const ActionConfirmModal = ({ isOpen, type, nodeTitle, onClose, onConfirm }: ActionModalProps) => {
    const [timeLeft, setTimeLeft] = useState(5);

    useEffect(() => {
        if (isOpen && type === 'restore') {
            setTimeLeft(5);
            const timer = setInterval(() => {
                setTimeLeft(p => {
                    if (p <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return p - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isOpen, type]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
            <div className="p-6 flex flex-col items-center text-center gap-4">
                <div className="p-4 rounded-full shadow-inner bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300">
                    {type === 'delete' ? <Trash2 className="w-6 h-6 text-red-500" /> : <Undo2 className="w-6 h-6 text-blue-500" />}
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                        {type === 'delete' ? '确认删除?' : '确认恢复?'}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[240px] mx-auto">
                        {type === 'delete' 
                            ? "删除后节点不可见，但保留数据。"
                            : "恢复后您可以重新编辑该节点。"
                        }
                    </p>
                </div>
                
                <div className="flex gap-3 w-full mt-2">
                    <Button variant="ghost" onClick={onClose} className="flex-1">
                        取消
                    </Button>
                    <Button 
                        variant={type === 'delete' ? 'danger' : 'primary'} 
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1"
                        disabled={type === 'restore' && timeLeft > 0}
                    >
                        {type === 'delete' 
                            ? '删除' 
                            : timeLeft > 0 ? `${timeLeft}s` : '恢复'
                        }
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

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

// --- Structure Prompt Settings Modal ---

const StructurePromptSettingsModal = ({ 
    isOpen, 
    onClose, 
    level,
    currentType,
    currentCustomPrompt,
    variableCategories,
    onSave 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    level: StructureLevel,
    currentType: 'default' | 'custom',
    currentCustomPrompt: string,
    variableCategories: VariableCategory[],
    onSave: (type: 'default' | 'custom', customPrompt: string) => void 
}) => {
    // Determine the default template based on the level
    const defaultTemplate = level === StructureLevel.VOLUME ? DEFAULT_VOLUME_SPLIT_PROMPT : 
                            level === StructureLevel.PART ? DEFAULT_PART_SPLIT_PROMPT :
                            level === StructureLevel.STAGE ? DEFAULT_STAGE_SPLIT_PROMPT :
                            DEFAULT_SPLIT_PROMPT_TEMPLATE;
    
    const [editorContent, setEditorContent] = useState(
        currentType === 'custom' && currentCustomPrompt ? currentCustomPrompt : defaultTemplate
    );
    const [showVariables, setShowVariables] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler
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
                currentType === 'custom' && currentCustomPrompt ? currentCustomPrompt : defaultTemplate
            );
        }
    }, [isOpen, currentType, currentCustomPrompt, defaultTemplate]);

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
        if(confirm('确定要重置为系统默认提示词吗？')) {
            setEditorContent(defaultTemplate);
        }
    };

    const handleSave = () => {
        const isDefault = editorContent === defaultTemplate;
        onSave(isDefault ? 'default' : 'custom', editorContent);
        onClose();
    };

    if (!isOpen) return null;

    const levelName = getStructureLevelName(level).split(' ')[0];

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
            <div className="flex flex-col h-[600px]">
                <div className="flex justify-between items-center p-6 pb-2 shrink-0">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-brand-500" />
                        配置{levelName}生成提示词
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
                                插入变量
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

                    <div className="flex-1 min-h-0 bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all shadow-inner">
                        <textarea 
                            ref={textareaRef}
                            className="flex-1 w-full bg-transparent border-none resize-none focus:ring-0 outline-none text-sm font-mono leading-relaxed custom-scrollbar text-zinc-800 dark:text-zinc-200"
                            value={editorContent}
                            onChange={(e) => setEditorContent(e.target.value)}
                            placeholder="例如：请按照时间顺序拆分，重点描述主角的心理变化..."
                        />
                    </div>
                     <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                        提示：如果不使用变量，系统会自动将相关信息附加到提示词末尾。如果使用了变量（如 {"{ParentTitle}"}），系统将进行精确替换。
                        {level === StructureLevel.VOLUME && (
                            <span className="block text-brand-500 mt-1 font-bold">
                                * 生成分册大纲时，系统将自动附加 JSON 格式化要求。
                            </span>
                        )}
                        {level === StructureLevel.PART && (
                            <span className="block text-brand-500 mt-1 font-bold">
                                * 生成分卷大纲时，系统将自动附加 JSON 格式化要求。
                            </span>
                        )}
                        {level === StructureLevel.STAGE && (
                            <span className="block text-brand-500 mt-1 font-bold">
                                * 生成阶段大纲时，系统将自动附加 JSON 格式化要求。
                            </span>
                        )}
                    </p>
                </div>

                <div className="p-6 pt-0 flex justify-end gap-3 shrink-0">
                    <Button variant="ghost" onClick={onClose}>取消</Button>
                    <Button 
                        onClick={handleSave}
                        className="bg-brand-600 hover:bg-brand-700 text-white border-transparent"
                    >
                        <Save className="w-4 h-4 mr-2" /> 保存设置
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

/**
 * Rich Miller Columns
 */
const RichMillerColumns = ({ 
    rootNode, 
    selectedId,
    novel,
    onSelect,
    onUpdateNode,
    onGenerateContent,
    onAddNode,
    onRemoveNode,
    onRestoreNode,
    onBatchUpdate,
}: { 
    rootNode: StructureNode, 
    selectedId: string,
    novel: NovelState,
    onSelect: (id: string) => void,
    onUpdateNode: (id: string, updates: Partial<StructureNode>) => void,
    onGenerateContent: (n: StructureNode) => void,
    onAddNode: (parentId: string, level: StructureLevel) => void,
    onRemoveNode: (id: string) => void,
    onRestoreNode: (id: string) => void,
    onBatchUpdate: (root: StructureNode) => void,
}) => {
    // State for Modal
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        type: 'delete' | 'restore';
        nodeId: string;
        nodeTitle: string;
    }>({ isOpen: false, type: 'delete', nodeId: '', nodeTitle: '' });

    // AI Generation State
    const [generatingLevel, setGeneratingLevel] = useState<StructureLevel | null>(null);
    
    // Prompt Configuration State
    const [splitPromptTypes, setSplitPromptTypes] = useState<Record<string, 'default' | 'custom'>>({});
    const [splitPrompts, setSplitPrompts] = useState<Record<string, string>>({}); // level -> prompt
    const [showPromptModalFor, setShowPromptModalFor] = useState<StructureLevel | null>(null);

    // Prepare Variable Categories
    const baseVariableCategories = useMemo(() => getNovelVariableCategories(novel), [novel]);
    const contextVariableCategories = useMemo(() => {
        return [
            {
                name: '当前任务上下文 (Context)',
                items: [
                    { label: '上级标题 (ParentTitle)', key: 'ParentTitle' },
                    { label: '上级大纲 (ParentSummary)', key: 'ParentSummary' },
                    { label: '上上级标题 (GrandParentTitle)', key: 'GrandParentTitle' },
                    { label: '上上级大纲 (GrandParentSummary)', key: 'GrandParentSummary' },
                    
                    // Relative/Dynamic Variables
                    { label: '所属册标题 (Current_Volume_Title)', key: 'Current_Volume_Title' },
                    { label: '所属册大纲 (Current_Volume_Summary)', key: 'Current_Volume_Summary' },
                    { label: '所属卷标题 (Current_Part_Title)', key: 'Current_Part_Title' },
                    { label: '所属卷大纲 (Current_Part_Summary)', key: 'Current_Part_Summary' },
                    { label: '所属阶段标题 (Current_Stage_Title)', key: 'Current_Stage_Title' },
                    { label: '所属阶段大纲 (Current_Stage_Summary)', key: 'Current_Stage_Summary' },

                    { label: '生成数量 (Count)', key: 'Count' },
                    { label: '目标单位 (TargetUnit)', key: 'TargetUnit' },
                ]
            },
            ...baseVariableCategories
        ]
    }, [baseVariableCategories]);

    const openModal = (type: 'delete' | 'restore', node: StructureNode) => {
        setModalConfig({ isOpen: true, type, nodeId: node.id, nodeTitle: node.title });
    };

    const path = useMemo(() => findPath(selectedId, rootNode) || [rootNode], [selectedId, rootNode]);
    
    // Calculate columns based on the current selection path
    const columns = useMemo(() => {
        const cols = [];
        
        if (rootNode.children.length > 0) {
            cols.push({
                type: 'NAVIGATION',
                level: StructureLevel.VOLUME, 
                items: rootNode.children,
                activeItemId: path[1]?.id,
                parent: rootNode
            });
        }

        for (let i = 1; i < path.length; i++) {
            const node = path[i];
            
            if (node.level === StructureLevel.CHAPTER) {
                cols.push({
                    type: 'CHAPTER_CONTENT',
                    level: StructureLevel.PLOT, 
                    items: node.children || [], // Plots
                    parent: node // The Chapter Node
                });
                break;
            }

            if (node.children) {
                const nextLevelNode = node.children[0];
                const activeIdInNextCol = path[i + 1]?.id;

                const nextLevel = nextLevelNode ? nextLevelNode.level : 
                                  node.level === StructureLevel.VOLUME ? StructureLevel.PART :
                                  node.level === StructureLevel.PART ? StructureLevel.STAGE :
                                  node.level === StructureLevel.STAGE ? StructureLevel.CHAPTER : StructureLevel.PLOT;

                cols.push({
                    type: 'NAVIGATION',
                    level: nextLevel,
                    items: node.children,
                    activeItemId: activeIdInNextCol,
                    parent: node
                });
            }
        }
        return cols;
    }, [path, rootNode]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const headerContainerRef = useRef<HTMLDivElement>(null);
    const columnRefs = useRef<Array<HTMLDivElement | null>>([]);
    const [focusedColIndex, setFocusedColIndex] = useState(columns.length - 1);
    const isProgrammaticScroll = useRef(false);

    // Keep focused column in sync when columns added
    useEffect(() => {
        if (columns.length > 0) {
            setTimeout(() => {
                scrollToColumn(columns.length - 1);
            }, 10);
        }
    }, [columns.length]); 

    // Sync Header Scroll
    useEffect(() => {
        const headerContainer = headerContainerRef.current;
        if (headerContainer && !isProgrammaticScroll.current) {
            const activeItem = headerContainer.children[focusedColIndex] as HTMLElement;
            if (activeItem) {
                const scrollLeft = activeItem.offsetLeft - (headerContainer.clientWidth / 2) + (activeItem.clientWidth / 2);
                headerContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [focusedColIndex]);

    // ScrollSpy Logic
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let rafId: number;

        const handleScroll = () => {
            if (isProgrammaticScroll.current) return;
            
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                if (!container) return;
                const center = container.scrollLeft + container.clientWidth / 2;
                let closestIdx = -1;
                let minDiff = Infinity;

                columnRefs.current.forEach((ref, idx) => {
                    if (!ref) return;
                    const colCenter = ref.offsetLeft + ref.offsetWidth / 2;
                    const diff = Math.abs(colCenter - center);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestIdx = idx;
                    }
                });

                if (closestIdx !== -1) {
                    setFocusedColIndex(prev => prev === closestIdx ? prev : closestIdx);
                }
            });
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(rafId);
        };
    }, []);

    const scrollToColumn = (index: number) => {
        const container = scrollContainerRef.current;
        const colEl = columnRefs.current[index];
        const headerContainer = headerContainerRef.current;

        if (!container || !colEl) return;

        isProgrammaticScroll.current = true;
        setFocusedColIndex(index);
        
        // Header Scroll
        if (headerContainer) {
             const activeItem = headerContainer.children[index] as HTMLElement;
             if (activeItem) {
                const scrollLeft = activeItem.offsetLeft - (headerContainer.clientWidth / 2) + (activeItem.clientWidth / 2);
                headerContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
             }
        }
        
        // Content Scroll
        const colLeft = colEl.offsetLeft;
        const colWidth = colEl.offsetWidth;
        const containerWidth = container.clientWidth;
        const targetScrollLeft = colLeft - (containerWidth / 2) + (colWidth / 2);
             
        container.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
        });

        setTimeout(() => { isProgrammaticScroll.current = false; }, 600);
    };

    const handleBatchGenerate = async (
        level: StructureLevel,
        parent: StructureNode,
        items: StructureNode[]
    ) => {
        const activeItems = items.filter(c => !c.isDeleted);
        if (activeItems.length === 0) return;
        
        let sourceSummary = "";
        let sourceTitle = "";
        
        // GrandParent context
        let grandParentTitle = "";
        let grandParentSummary = "";

        // Dynamic Relative Variables (e.g. Current_Volume_Title)
        const dynamicContext: Record<string, string> = {};

        // Find path including parent to calculate ancestors and relative variables
        const parentPath = findPath(parent.id, rootNode) || [];
        
        // Traverse path to populate dynamic context based on node levels
        parentPath.forEach(node => {
            if (node.level === StructureLevel.VOLUME) {
                dynamicContext['Current_Volume_Title'] = node.title;
                dynamicContext['Current_Volume_Summary'] = node.summary || '';
            } else if (node.level === StructureLevel.PART) {
                dynamicContext['Current_Part_Title'] = node.title;
                dynamicContext['Current_Part_Summary'] = node.summary || '';
            } else if (node.level === StructureLevel.STAGE) {
                dynamicContext['Current_Stage_Title'] = node.title;
                dynamicContext['Current_Stage_Summary'] = node.summary || '';
            }
        });

        if (level === StructureLevel.VOLUME) {
            sourceTitle = "全书";
            sourceSummary = novel.outline;
            if (!sourceSummary) {
                alert("请先在小说信息中填写【一级大纲】。");
                return;
            }
        } else {
            sourceTitle = parent.title;
            sourceSummary = parent.summary;
            
            // Try to find grandparent info
            if (parentPath.length >= 2) {
                // path[path.length - 1] is parent
                // path[path.length - 2] is grandparent
                const grandParent = parentPath[parentPath.length - 2];
                if (grandParent) {
                    grandParentTitle = grandParent.title;
                    grandParentSummary = grandParent.summary;
                }
            }

            if (!sourceSummary) {
                alert(`请先完善上级节点【${sourceTitle}】的大纲内容。`);
                return;
            }
        }

        setGeneratingLevel(level);
        try {
            // Determine default template based on level
            const defaultTemplate = level === StructureLevel.VOLUME ? DEFAULT_VOLUME_SPLIT_PROMPT : 
                                    level === StructureLevel.PART ? DEFAULT_PART_SPLIT_PROMPT :
                                    level === StructureLevel.STAGE ? DEFAULT_STAGE_SPLIT_PROMPT :
                                    DEFAULT_SPLIT_PROMPT_TEMPLATE;
            
            const type = splitPromptTypes[level] || 'default';
            const promptToSend = type === 'custom' 
                ? splitPrompts[level] 
                : (splitPrompts[level] || defaultTemplate);
            
            // Gather all global variables to inject into prompt context
            const globalVariables = generateGlobalVariables(novel);
            
            // Fixed Suffix for Volume/Part/Stage generation (mandatory JSON structure)
            let fixedSuffix = undefined;
            if (level === StructureLevel.VOLUME) fixedSuffix = VOLUME_SPLIT_SUFFIX;
            else if (level === StructureLevel.PART) fixedSuffix = PART_SPLIT_SUFFIX;
            else if (level === StructureLevel.STAGE) fixedSuffix = STAGE_SPLIT_SUFFIX;

            const summaries = await generateBatchSplit(
                novel.title,
                novel.type,
                sourceTitle,
                sourceSummary,
                getStructureLevelName(level),
                activeItems.length,
                promptToSend,
                {
                    modelId: novel.aiModel,
                    providerId: novel.aiProvider,
                    apiKey: novel.apiKey,
                    apiBaseUrl: novel.apiBaseUrl,
                    // Inject extra context variables
                    GrandParentTitle: grandParentTitle,
                    GrandParentSummary: grandParentSummary,
                    // Inject dynamic relative variables (Current_Volume_*, etc)
                    ...dynamicContext,
                    // Merge global variables into context so replaceTemplateVariables can find them
                    ...globalVariables
                },
                fixedSuffix
            );

            const newRoot = batchUpdateChildrenSummaries(rootNode, parent.id, summaries);
            onBatchUpdate(newRoot);

        } catch (error) {
            alert(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setGeneratingLevel(null);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden relative bg-zinc-100 dark:bg-zinc-950/50">
            <ActionConfirmModal 
                isOpen={modalConfig.isOpen}
                type={modalConfig.type}
                nodeTitle={modalConfig.nodeTitle}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    if (modalConfig.type === 'delete') onRemoveNode(modalConfig.nodeId);
                    else onRestoreNode(modalConfig.nodeId);
                }}
            />

            {/* Prompt Config Modal for Split Levels */}
            {showPromptModalFor && (
                <StructurePromptSettingsModal
                    isOpen={!!showPromptModalFor}
                    onClose={() => setShowPromptModalFor(null)}
                    level={showPromptModalFor}
                    currentType={splitPromptTypes[showPromptModalFor] || 'default'}
                    currentCustomPrompt={splitPrompts[showPromptModalFor] || ''}
                    variableCategories={contextVariableCategories}
                    onSave={(type, customPrompt) => {
                        if (showPromptModalFor) {
                            setSplitPromptTypes(prev => ({ ...prev, [showPromptModalFor]: type }));
                            setSplitPrompts(prev => ({ ...prev, [showPromptModalFor]: customPrompt }));
                        }
                    }}
                />
            )}

            {/* Segmented Control Navigation Bar */}
            <div className="shrink-0 z-20 w-full pt-4 pb-2 flex justify-center bg-white dark:bg-zinc-950">
                <div 
                    ref={headerContainerRef}
                    className="max-w-[95%] flex items-center p-1 overflow-x-auto no-scrollbar gap-1 snap-x bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm"
                >
                    {columns.map((col, idx) => {
                        const isContent = col.type === 'CHAPTER_CONTENT';
                        const isActive = focusedColIndex === idx;
                        const badgeInfo = getLevelBadgeInfo(col.level);
                        
                        return (
                            <button
                                key={`head-${idx}`} 
                                onClick={() => scrollToColumn(idx)}
                                className={clsx(
                                    "relative shrink-0 snap-center px-3 py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-300 min-w-[80px]",
                                    isActive 
                                        ? "bg-zinc-100 dark:bg-zinc-800 ring-1 ring-black/5 dark:ring-white/5" 
                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 opacity-70 hover:opacity-100"
                                )}
                            >
                                <span className={clsx(
                                    "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider leading-none",
                                    badgeInfo.bg
                                )}>
                                    {badgeInfo.label}
                                </span>
                                <span className={clsx(
                                    "text-xs font-bold whitespace-nowrap",
                                    isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400"
                                )}>
                                    {isContent ? '工作台' : getColumnTitle(col.level)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scroll Container */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent opacity-50 z-10" />
                
                <div 
                    ref={scrollContainerRef}
                    className="flex h-full overflow-x-auto overflow-y-hidden bg-white dark:bg-zinc-900 snap-x snap-mandatory scroll-smooth touch-pan-x"
                >
                    {columns.map((col, idx) => {
                        const isContent = col.type === 'CHAPTER_CONTENT';
                        
                        // Check if this level supports AI Batch Generation/Config
                        const supportsAiConfig = [
                            StructureLevel.VOLUME, 
                            StructureLevel.PART, 
                            StructureLevel.STAGE, 
                            StructureLevel.CHAPTER
                        ].includes(col.level);

                        const widthClass = isContent 
                            ? "w-[95vw] md:w-[650px] lg:w-[850px]" 
                            : "w-[85vw] sm:w-[280px] lg:w-[340px]";
                        
                        const config = getLevelConfig(col.level);
                        const Icon = config.icon;
                        const itemCount = col.items.filter(i => !i.isDeleted).length;
                        const levelName = getStructureLevelName(col.level).split(' ')[0];

                        return (
                            <div 
                                key={`col-idx-${idx}`} 
                                ref={(el) => { columnRefs.current[idx] = el; }}
                                className={clsx(
                                    "shrink-0 h-full border-r border-zinc-100 dark:border-zinc-800 flex flex-col snap-center transform-gpu",
                                    isContent ? "bg-white dark:bg-zinc-900" : "bg-zinc-50/30 dark:bg-zinc-900/50",
                                    widthClass
                                )}
                                onClick={() => scrollToColumn(idx)}
                            >
                                {/* Sticky Column Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                    <div className="flex items-center gap-2">
                                        <div className={clsx("w-1 h-3.5 rounded-full", config.bgClass)}></div>
                                        <h3 className={clsx("font-bold text-sm tracking-tight", config.colorClass)}>
                                            {isContent ? '工作台' : getColumnTitle(col.level)}
                                        </h3>
                                    </div>
                                    
                                    {supportsAiConfig ? (
                                        <div className="flex items-center gap-1.5">
                                            {/* Generate Button */}
                                            <button 
                                                onClick={() => handleBatchGenerate(col.level, col.parent!, col.items)}
                                                disabled={generatingLevel === col.level || itemCount === 0}
                                                className={clsx(
                                                    "group flex items-center justify-center h-7 px-2.5 rounded-md transition-all border text-xs font-bold gap-1.5",
                                                    "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm",
                                                    (generatingLevel === col.level || itemCount === 0)
                                                        ? "opacity-50 cursor-not-allowed text-zinc-400" 
                                                        : "text-zinc-600 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50 dark:hover:bg-brand-900/10"
                                                )}
                                                title={itemCount === 0 ? "请先添加节点" : `一键生成${levelName}大纲`}
                                            >
                                                {generatingLevel === col.level ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                <span>一键生成{levelName}大纲</span>
                                            </button>

                                            {/* Config Button */}
                                            <button 
                                                onClick={() => setShowPromptModalFor(col.level)}
                                                className="group flex items-center justify-center w-7 h-7 rounded-md transition-all border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm"
                                                title="配置生成提示词"
                                            >
                                                <Settings2 className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 px-2 py-0.5 rounded-full">
                                            {itemCount} ITEMS
                                        </span>
                                    )}
                                </div>

                                {/* Column Body */}
                                <div className={clsx(
                                    "flex-1 overflow-y-auto custom-scrollbar",
                                    !isContent && "p-4 space-y-2.5",
                                    isContent && "p-4"
                                )}>
                                    {isContent && col.parent ? (
                                        <div className="flex flex-col gap-6 pb-20 max-w-4xl mx-auto w-full pt-2 px-2">
                                            {col.parent.isDeleted && (
                                                <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-3 rounded-lg text-sm flex items-center justify-center gap-2">
                                                    <Trash2 className="w-4 h-4" /> 章节已删除
                                                    <Button size="xs" variant="secondary" onClick={() => openModal('restore', col.parent!)}>恢复</Button>
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">章节标题</label>
                                                <DebouncedInput
                                                    className="w-full text-2xl font-bold bg-transparent border-none p-0 text-zinc-900 dark:text-white placeholder:text-zinc-300 focus:ring-0 outline-none"
                                                    value={col.parent.title}
                                                    onChange={(val: any) => onUpdateNode(col.parent!.id, { title: val.target.value })}
                                                    placeholder="输入章节标题..."
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                        <AlignLeft className="w-4 h-4" /> 情节规划
                                                    </label>
                                                </div>
                                                {col.items.map((plot) => (
                                                    <div key={plot.id} className="group relative bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 transition-all hover:border-brand-300 dark:hover:border-brand-700 shadow-sm">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className={clsx(
                                                                "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                                                                plot.title.includes('解钩') ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                                                                plot.title.includes('钩子') ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                                                                "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
                                                            )}>
                                                                {plot.title.includes('解钩') ? '开头 / 解钩' : plot.title.includes('钩子') ? '结尾 / 钩子' : '关键情节'}
                                                            </span>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {!plot.isDeleted && (
                                                                    <button onClick={(e) => { e.stopPropagation(); openModal('delete', plot); }} className="text-zinc-400 hover:text-red-500 transition-colors">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <DebouncedTextarea 
                                                            className="w-full h-16 bg-transparent border-none p-0 text-sm resize-none focus:ring-0 text-zinc-700 dark:text-zinc-300 leading-relaxed"
                                                            value={plot.title}
                                                            onChange={(val: any) => onUpdateNode(plot.id, { title: val.target.value })}
                                                            placeholder="描述这一情节发生了什么..."
                                                        />
                                                    </div>
                                                ))}
                                                <Button variant="secondary" size="sm" onClick={() => onAddNode(col.parent!.id, StructureLevel.PLOT)} className="w-full border-dashed text-zinc-500">
                                                    <Plus className="w-4 h-4 mr-1" /> 添加新情节
                                                </Button>
                                            </div>

                                            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                                        <FileText className="w-4 h-4" /> 正文撰写
                                                    </label>
                                                    <Button variant="gradient" size="xs" onClick={() => onGenerateContent(col.parent!)}>
                                                        <Sparkles className="w-3 h-3 mr-1" /> AI 辅助写作
                                                    </Button>
                                                </div>
                                                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 min-h-[500px] shadow-inner">
                                                    <DebouncedTextarea
                                                        className="w-full h-full p-8 bg-transparent border-none resize-none focus:ring-0 outline-none text-base leading-loose font-serif text-zinc-800 dark:text-zinc-200"
                                                        value={col.parent.content || ''}
                                                        onChange={(val: any) => onUpdateNode(col.parent!.id, { content: val.target.value })}
                                                        placeholder="在此处撰写正文..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* List Items */}
                                            {col.items.map(node => {
                                                const isActive = node.id === col.activeItemId;
                                                const isSelected = node.id === selectedId;
                                                const isHighlighted = isActive || isSelected;
                                                
                                                // If Highlighted, render inline editor
                                                if (isHighlighted && !node.isDeleted) {
                                                    return (
                                                        <div 
                                                            key={node.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation(); 
                                                                const target = findDeepestFirstNode(node);
                                                                onSelect(target.id);
                                                            }}
                                                            className={clsx(
                                                                "group relative rounded-xl border p-4 cursor-pointer transition-all duration-200 shadow-md ring-1", 
                                                                "bg-white dark:bg-zinc-800 ring-zinc-200 dark:ring-zinc-700",
                                                                config.borderClass
                                                            )}
                                                        >
                                                            {/* Header: Icon, Title Input, Actions */}
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.lightBgClass, config.colorClass)}>
                                                                    <Icon className="w-4 h-4" />
                                                                </div>
                                                                <DebouncedInput
                                                                    className="flex-1 font-bold bg-transparent border-none p-0 text-zinc-900 dark:text-white focus:ring-0 outline-none text-sm min-w-0"
                                                                    value={node.title}
                                                                    onChange={(e) => onUpdateNode(node.id, { title: e.target.value })}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <div className="flex items-center gap-1">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); onGenerateContent(node); }}
                                                                        className="p-1.5 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded transition-colors"
                                                                        title="AI 自动生成"
                                                                    >
                                                                        <Sparkles className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); openModal('delete', node); }}
                                                                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                        title="删除"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Summary Editor */}
                                                            <DebouncedTextarea
                                                                className="w-full h-24 text-xs bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border-0 p-3 resize-none focus:ring-1 focus:ring-brand-500/20 text-zinc-600 dark:text-zinc-300 leading-relaxed custom-scrollbar placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                                                                value={node.summary}
                                                                onChange={(e) => onUpdateNode(node.id, { summary: e.target.value })}
                                                                onClick={(e) => e.stopPropagation()}
                                                                placeholder={
                                                                    col.level === StructureLevel.VOLUME ? "在此输入分册大纲 (二级大纲)..." :
                                                                    col.level === StructureLevel.PART ? "在此输入分卷大纲 (三级大纲)..." :
                                                                    col.level === StructureLevel.STAGE ? "在此输入阶段大纲 (四级大纲)..." :
                                                                    col.level === StructureLevel.CHAPTER ? "在此输入章节大纲 (五级大纲)..." :
                                                                    `在此输入${node.title}的详细构思...`
                                                                }
                                                            />
                                                            
                                                            {isActive && <ChevronRight className={clsx("absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 z-10", config.colorClass)} />}
                                                        </div>
                                                    );
                                                }

                                                // Standard Card
                                                return (
                                                    <div 
                                                        key={node.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation(); 
                                                            const target = findDeepestFirstNode(node);
                                                            onSelect(target.id);
                                                        }}
                                                        className={clsx(
                                                            "group relative rounded-xl border p-4 cursor-pointer transition-all duration-200", 
                                                            "bg-white dark:bg-zinc-800/60 border-transparent hover:bg-white hover:border-zinc-200 dark:hover:bg-zinc-800 shadow-sm",
                                                            node.isDeleted && "opacity-50 grayscale"
                                                        )}
                                                    >
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="mt-1 shrink-0">
                                                                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", config.lightBgClass, config.colorClass)}>
                                                                    <Icon className="w-4 h-4" />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-sm font-bold truncate text-zinc-800 dark:text-zinc-200">
                                                                    {node.title}
                                                                </div>
                                                                {node.summary && (
                                                                    <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                                                        {node.summary}
                                                                    </div>
                                                                )}
                                                                {!node.summary && (
                                                                    <div className="text-[10px] text-zinc-300 dark:text-zinc-600 mt-2 italic">
                                                                        暂无摘要
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            
                                            {/* Add Button */}
                                            {!isContent && !col.parent?.isDeleted && (
                                                <button 
                                                    onClick={() => onAddNode(col.parent!.id, col.level)}
                                                    className="w-full py-3 mt-1 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-400 transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700">
                                                        <Plus className="w-3 h-3" />
                                                    </div>
                                                    添加{getColumnTitle(col.level).replace('列表', '')}
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export const StructureTree = ({
    rootNode,
    novel,
    onUpdateNode,
    onGenerateContent,
    onAddNode,
    onRemoveNode,
    onRestoreNode,
    onGenerateStructure,
    isGeneratingStructure
}: {
    rootNode: StructureNode;
    novel: NovelState;
    onUpdateNode: (id: string, updates: Partial<StructureNode>) => void;
    onGenerateContent: (n: StructureNode) => void;
    onAddNode: (parentId: string, level: StructureLevel) => void;
    onRemoveNode: (id: string) => void;
    onRestoreNode: (id: string) => void;
    onGenerateStructure: () => void;
    isGeneratingStructure: boolean;
}) => {
    const [selectedId, setSelectedId] = useState<string>(rootNode.id);
    const updateStructureTree = useNovelStore(state => state.updateStructureTree);

    // If structure is empty (only root node without children), show config
    const isEmpty = !rootNode.children || rootNode.children.length === 0;

    if (isEmpty) {
         return (
            <div className="flex flex-col items-center justify-center h-full w-full p-4 md:p-12 animate-fade-in">
                 <div className="max-w-5xl w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl shadow-indigo-500/10 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                     <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900/50">
                         <div className="flex items-center gap-3 mb-2">
                             <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <LayoutTemplate className="w-6 h-6" />
                             </div>
                             <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                 构建世界观骨架
                             </h3>
                         </div>
                         <p className="text-zinc-500 dark:text-zinc-400 ml-1">
                             Define your novel's structural rhythm. AI will generate the hierarchy based on these settings.
                         </p>
                     </div>
                     <div className="p-8 bg-zinc-50/50 dark:bg-zinc-950/50">
                         <ModuleStructureConfig 
                            novel={novel} 
                            onGenerateStructure={onGenerateStructure} 
                            isGenerating={isGeneratingStructure}
                         />
                     </div>
                 </div>
            </div>
        );
    }

    return (
        <RichMillerColumns 
            rootNode={rootNode}
            selectedId={selectedId}
            novel={novel}
            onSelect={setSelectedId}
            onUpdateNode={onUpdateNode}
            onGenerateContent={onGenerateContent}
            onAddNode={onAddNode}
            onRemoveNode={onRemoveNode}
            onRestoreNode={onRestoreNode}
            onBatchUpdate={(newRoot) => updateStructureTree(novel.id, newRoot)}
        />
    );
};
