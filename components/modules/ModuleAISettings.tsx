
import React, { useState, useRef, useEffect } from 'react';
import { NovelState } from '../../types';
import { AI_PROVIDERS, AI_MODELS } from '../../constants';
import { useNovelStore } from '../../store/useNovelStore';
import { Bot, Key, Cpu, Eye, EyeOff, Globe, ExternalLink, Gift, ShieldCheck, ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { DebouncedInput } from '../ui/DebouncedComponents';

interface ModuleAISettingsProps {
  novel: NovelState;
}

export const ModuleAISettings: React.FC<ModuleAISettingsProps> = ({ novel }) => {
  const updateNovelInfo = useNovelStore((state) => state.updateNovelInfo);
  const [showKey, setShowKey] = useState(false);
  
  // Model Dropdown State
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelWrapperRef = useRef<HTMLDivElement>(null);

  const availableModels = AI_MODELS[novel.aiProvider] || [];
  const currentProvider = AI_PROVIDERS.find(p => p.id === novel.aiProvider);
  const currentModelInfo = availableModels.find(m => m.id === novel.aiModel);
  const isCustomProvider = novel.aiProvider === 'Custom';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (modelWrapperRef.current && !modelWrapperRef.current.contains(event.target as Node)) {
            setShowModelDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    const models = AI_MODELS[newProvider];
    // Reset to default model of new provider, or empty string if custom/unknown
    updateNovelInfo(novel.id, { 
        aiProvider: newProvider,
        aiModel: models?.[0]?.id || '' 
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Core Selection Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Provider Card */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all duration-300">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Bot className="w-4 h-4 text-brand-500" /> AI 服务商
            </label>
            <div className="relative">
                <select 
                    value={novel.aiProvider}
                    onChange={handleProviderChange}
                    className="w-full bg-transparent font-bold text-zinc-900 dark:text-white border-b border-zinc-300 dark:border-zinc-600 focus:border-brand-500 focus:ring-0 px-0 py-2 outline-none text-base transition-all cursor-pointer appearance-none"
                >
                    {AI_PROVIDERS.map(p => (
                        <option 
                            key={p.id} 
                            value={p.id} 
                            className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        >
                            {p.name}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            </div>

            {/* Custom Provider: Base URL Input */}
            {isCustomProvider ? (
                 <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-700 animate-fade-in">
                     <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                         <Globe className="w-3 h-3" /> API Base URL
                     </label>
                     <DebouncedInput
                        type="text"
                        value={novel.apiBaseUrl || ''}
                        onChange={(e) => updateNovelInfo(novel.id, { apiBaseUrl: e.target.value })}
                        placeholder="https://api.openai.com/v1"
                        className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded text-xs px-2 font-mono focus:ring-1 focus:ring-brand-500"
                     />
                 </div>
            ) : (
                /* Pricing Badge */
                <div className="mt-3 flex items-start gap-2">
                    <Gift className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight">
                        {currentProvider?.pricing || '需自行查询计费标准'}
                    </span>
                </div>
            )}
        </div>

        {/* Model Card (Editable Combobox) */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 hover:shadow-xl hover:shadow-fuchsia-500/10 hover:-translate-y-1 transition-all duration-300 z-20" ref={modelWrapperRef}>
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-fuchsia-500" /> 模型选择 / Model ID
            </label>
            <div className="relative">
                 <DebouncedInput
                    type="text"
                    value={novel.aiModel}
                    onChange={(e) => updateNovelInfo(novel.id, { aiModel: e.target.value })}
                    onFocus={() => !isCustomProvider && setShowModelDropdown(true)}
                    placeholder={isCustomProvider ? "请输入模型ID (如 gpt-4)" : "选择或输入模型ID..."}
                    className="w-full bg-transparent font-bold text-zinc-900 dark:text-white border-b border-zinc-300 dark:border-zinc-600 focus:border-fuchsia-500 focus:ring-0 px-0 py-2 outline-none text-base transition-all placeholder:font-normal placeholder:text-zinc-400"
                 />
                 
                 {!isCustomProvider && (
                    <>
                        <button 
                            onClick={() => setShowModelDropdown(!showModelDropdown)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            <ChevronDown className={clsx("w-4 h-4 transition-transform", showModelDropdown ? "rotate-180" : "")} />
                        </button>

                        {/* Dropdown */}
                        <AnimatePresence>
                            {showModelDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar p-1.5 z-50"
                                >
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                        {novel.aiProvider} 推荐模型
                                    </div>
                                    {availableModels.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => {
                                                updateNovelInfo(novel.id, { aiModel: m.id });
                                                setShowModelDropdown(false);
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-sm flex flex-col hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 group"
                                        >
                                            <span className={clsx(
                                                "font-bold flex items-center justify-between",
                                                novel.aiModel === m.id ? "text-fuchsia-600 dark:text-fuchsia-400" : "text-zinc-800 dark:text-zinc-200"
                                            )}>
                                                {m.name}
                                                {novel.aiModel === m.id && <Check className="w-3.5 h-3.5" />}
                                            </span>
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400 group-hover:text-fuchsia-500/80">
                                                {m.id}
                                            </span>
                                        </button>
                                    ))}
                                    <div className="mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800 px-2 py-1.5 text-xs text-zinc-400 italic">
                                        支持手动输入其他模型 ID
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                 )}
            </div>
             {/* Model Description */}
             <div className="mt-3 flex items-start gap-2 h-4">
                <ShieldCheck className="w-3.5 h-3.5 text-fuchsia-500 mt-0.5 shrink-0" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight truncate">
                    {isCustomProvider ? '手动输入模型ID，如 claude-3-5-sonnet' : (currentModelInfo?.description || '使用自定义或未收录的模型 ID')}
                </span>
            </div>
        </div>
      </div>

      {/* 2. Key Configuration Row */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 shadow-sm">
           <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <Key className="w-4 h-4 text-zinc-500" /> API Access Key
                        </label>
                        {currentProvider?.website && (
                            <a 
                                href={currentProvider.website} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline"
                            >
                                <ExternalLink className="w-3 h-3" /> 获取 {novel.aiProvider} Key
                            </a>
                        )}
                    </div>
                    <div className="relative">
                        <DebouncedInput 
                            type={showKey ? "text" : "password"}
                            value={novel.apiKey || ''}
                            onChange={(e) => updateNovelInfo(novel.id, { apiKey: e.target.value })}
                            placeholder={currentProvider?.isGoogle ? "可选 (默认使用环境变量)" : `粘贴您的 ${novel.aiProvider} API Key`}
                            className="flex h-10 w-full rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-mono"
                        />
                        <button 
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
           </div>
      </div>
    </div>
  );
};
