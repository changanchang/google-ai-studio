
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNovelStore } from '../store/useNovelStore';
import { ModuleAISettings } from '../components/modules/ModuleAISettings';
import { ModuleNovelInfo } from '../components/modules/ModuleNovelInfo';
import { StructureTree } from '../components/StructureTree';
import { Button } from '../components/ui/Button';
import { CollapsibleSection } from '../components/ui/CollapsibleSection';
import { StructureLevel, StructureNode } from '../types';
import { ArrowLeft, Save, Settings, BookOpen, Sun, Moon, Download } from 'lucide-react';
import { generateNovelText } from '../services/geminiService';
import { motion } from 'framer-motion';
import { 
    generateStructureSkeleton, 
    updateNodeRecursive, 
    addNodeRecursive, 
    renumberTree, 
    softDeleteNodeRecursive, 
    restoreNodeRecursive, 
    createNode
} from '../utils/treeUtils';

export const NovelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const novel = useNovelStore(state => state.novels.find(n => n.id === id));
  const updateStructureTree = useNovelStore(state => state.updateStructureTree);
  const { isDarkMode, toggleTheme } = useNovelStore();
  
  const [isGeneratingStruct, setIsGeneratingStruct] = useState(false);

  if (!novel) {
    return <div className="p-20 text-center text-zinc-500 dark:text-zinc-400">未找到该小说项目。</div>;
  }

  const generateSkeleton = useCallback(async () => {
    setIsGeneratingStruct(true);
    await new Promise(r => setTimeout(r, 600));

    const root = generateStructureSkeleton(novel.structureConfig, novel.title, novel.outline);
    
    updateStructureTree(novel.id, root);
    setIsGeneratingStruct(false);
  }, [novel.structureConfig, novel.title, novel.outline, novel.id, updateStructureTree]);

  // --- CRUD Operations ---

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<StructureNode>) => {
      // Add lastModified timestamp to every update
      const newRoot = updateNodeRecursive(novel.rootNode, nodeId, { ...updates, lastModified: Date.now() });
      updateStructureTree(novel.id, newRoot);
  }, [novel, updateStructureTree]);

  const handleAddNode = (parentId: string, level: StructureLevel) => {
      const newNode = createNode(`新增${level}`, level);
      let newRoot = addNodeRecursive(novel.rootNode, parentId, newNode);
      newRoot = renumberTree(newRoot);
      updateStructureTree(novel.id, newRoot);
  };

  const handleRemoveNode = (nodeId: string) => {
      const currentRoot = JSON.parse(JSON.stringify(novel.rootNode));
      let newRoot = softDeleteNodeRecursive(currentRoot, nodeId);
      newRoot = renumberTree(newRoot);
      updateStructureTree(novel.id, newRoot);
  };

  const handleRestoreNode = (nodeId: string) => {
      const currentRoot = JSON.parse(JSON.stringify(novel.rootNode));
      let newRoot = restoreNodeRecursive(currentRoot, nodeId);
      newRoot = renumberTree(newRoot); 
      updateStructureTree(novel.id, newRoot);
  };

  const handleGenerateContent = async (node: StructureNode) => {
     if(node.isDeleted) return; 
     if(!confirm(`确认为 "${node.title}" 生成AI内容吗?`)) return;
     
     let prompt = "";
     if (node.level === StructureLevel.CHAPTER) {
         const plotsText = node.children?.filter(p => !p.isDeleted).map(p => `- ${p.title}`).join('\n') || "无具体情节设定";
         prompt = `你是一个专业的小说家。请根据以下情节大纲，撰写"${node.title}"的完整正文内容。
         小说标题: ${novel.title}
         小说背景/大纲: ${novel.outline.substring(0, 300)}...
         本章包含的情节点:\n${plotsText}\n
         要求: 字数充足，描写细腻，严格遵循逻辑顺序，对话自然。`;
     } else {
         prompt = `为小说${node.level}节点"${node.title}"生成详细内容/大纲。背景:${novel.outline.substring(0, 300)}...`;
     }
     
     try {
         const result = await generateNovelText(
             prompt, 
             novel.aiModel,
             novel.aiProvider,
             novel.apiKey,
             novel.apiBaseUrl,
             novel.systemInstruction
         );
         handleNodeUpdate(node.id, { 
             summary: node.level !== StructureLevel.CHAPTER ? result : node.summary,
             content: node.level === StructureLevel.CHAPTER ? result : undefined,
         });
     } catch(e) {
         alert(`生成失败: ${e instanceof Error ? e.message : '未知错误'}`);
     }
  };

  const handleExport = () => {
    let md = `# ${novel.title || '未命名小说'}\n\n`;
    if (novel.type) md += `**类型**: ${novel.type}\n\n`;
    if (novel.idea) md += `## 核心创意 (Idea)\n${novel.idea}\n\n`;
    if (novel.outline) md += `## 大纲 (Outline)\n${novel.outline}\n\n`;
    md += `## 正文内容\n\n`;

    const traverse = (node: StructureNode) => {
         if (node.isDeleted) return;
         
         const headingLevel = node.level === StructureLevel.ROOT ? 1 : 
                              node.level === StructureLevel.VOLUME ? 2 : 
                              node.level === StructureLevel.PART ? 3 : 
                              node.level === StructureLevel.STAGE ? 4 : 
                              node.level === StructureLevel.CHAPTER ? 5 : 6;
                              
         const prefix = '#'.repeat(Math.min(6, headingLevel));
         
         if (node.level !== StructureLevel.ROOT && node.level !== StructureLevel.PLOT) {
             md += `${prefix} ${node.title}\n\n`;
             if (node.summary) md += `> **摘要**: ${node.summary}\n\n`;
             if (node.content) md += `${node.content}\n\n`;
             if (node.level === StructureLevel.CHAPTER) md += `---\n\n`;
         }
         
         node.children?.forEach(traverse);
    };
    traverse(novel.rootNode);

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${novel.title || 'novel'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#F8F9FA] dark:bg-[#09090B] font-sans transition-colors overflow-hidden selection:bg-brand-500/20">
      {/* Dynamic Animated Background - Static opacity to reduce calc */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-50">
         <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-400/20 dark:bg-brand-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] animate-blob" />
         <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
         <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-400/20 dark:bg-pink-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000" />
         <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-[1px]" />
      </div>

      {/* Header */}
      <header className="shrink-0 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm z-30 relative transition-all duration-300">
        <div className="max-w-[1920px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-baseline gap-3">
              <h1 className="font-bold text-zinc-900 dark:text-white text-lg leading-none tracking-tight">
                  {novel.title || '未命名项目'}
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-brand-100/50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 rounded-full border border-brand-200/50 dark:border-brand-500/30">
                  {novel.type || '草稿'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={toggleTheme} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                className="hidden md:flex border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-800/50"
             >
                <Download className="w-4 h-4 mr-2" />
                导出 Markdown
             </Button>
             <Button variant="primary" size="sm" className="bg-zinc-900 dark:bg-zinc-100 shadow-glow-sm shadow-zinc-500/20">
                <Save className="w-4 h-4 mr-2" />
                保存项目
             </Button>
          </div>
        </div>
      </header>

      {/* Body - Simplified Animation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative z-10"
      >
        <div className="max-w-[1920px] mx-auto p-4 md:p-6 space-y-6 flex flex-col min-h-full pb-10">
            
            {/* Config Sections */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 shrink-0">
                <div className="xl:col-span-4 space-y-6">
                     <CollapsibleSection title="AI 大脑配置" icon={Settings} defaultOpen={false}>
                        <ModuleAISettings novel={novel} />
                     </CollapsibleSection>
                </div>
                <div className="xl:col-span-8">
                     <CollapsibleSection title="小说灵魂设定" icon={BookOpen} defaultOpen={true}>
                        <ModuleNovelInfo novel={novel} />
                     </CollapsibleSection>
                </div>
            </div>

            {/* Workspace */}
            <div className="flex-1 h-[calc(100vh-320px)] min-h-[600px] flex flex-col bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/10 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 overflow-hidden">
                 <StructureTree 
                    rootNode={novel.rootNode} 
                    onGenerateContent={handleGenerateContent}
                    onUpdateNode={handleNodeUpdate}
                    onAddNode={handleAddNode}
                    onRemoveNode={handleRemoveNode}
                    onRestoreNode={handleRestoreNode}
                    novel={novel}
                    onGenerateStructure={generateSkeleton}
                    isGeneratingStructure={isGeneratingStruct}
                />
            </div>
        </div>
      </motion.div>
    </div>
  );
};
