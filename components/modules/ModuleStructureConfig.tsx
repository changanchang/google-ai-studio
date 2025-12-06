
import React, { useState, useEffect } from 'react';
import { NovelState } from '../../types';
import { useNovelStore } from '../../store/useNovelStore';
import { GitFork, RefreshCw, AlertTriangle, Plus, Minus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import clsx from 'clsx';

interface ModuleStructureConfigProps {
  novel: NovelState;
  onGenerateStructure: () => void;
  isGenerating: boolean;
}

// Internal modal for reset confirmation
const ResetConfirmModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
    const [timeLeft, setTimeLeft] = useState(5);

    useEffect(() => {
        if (isOpen) {
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
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-6 flex flex-col items-center text-center gap-4">
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    警告：重置小说结构
                </h3>
                <div className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
                    <p>您确定要重新生成小说结构吗？</p>
                    <p className="font-bold text-red-600 dark:text-red-400">
                        此操作将完全覆盖当前的所有章节、情节和已生成的正文内容，且无法恢复！
                    </p>
                </div>
                
                <div className="flex gap-3 w-full mt-4">
                    <Button variant="secondary" onClick={onClose} className="flex-1">
                        取消
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1"
                        disabled={timeLeft > 0}
                    >
                        {timeLeft > 0 ? `请等待 (${timeLeft}s)` : '确认重置'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// Optimized Input Component with Steppers
const ConfigInput = ({ 
    label, 
    field, 
    value, 
    onChange, 
    min = 1,
    step = 1
}: { 
    label: string, 
    field: string, 
    value: number, 
    onChange: (field: string, val: number) => void, 
    min?: number,
    step?: number
}) => {
    const [localValue, setLocalValue] = useState<string>(value.toString());

    // Sync from props
    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow digits or empty string
        if (val === '' || /^\d+$/.test(val)) {
            setLocalValue(val);
        }
    };

    const commitValue = () => {
        let num = parseInt(localValue, 10);
        if (isNaN(num) || localValue === '') {
            num = value; // Revert to last valid value from props if invalid/empty
        } else if (num < min) {
            num = min;
        }
        setLocalValue(num.toString());
        onChange(field, num);
    };

    const increment = () => {
        const current = parseInt(localValue, 10) || min;
        const next = current + step;
        onChange(field, next);
        setLocalValue(next.toString());
    };

    const decrement = () => {
        const current = parseInt(localValue, 10) || min;
        const next = Math.max(min, current - step);
        onChange(field, next);
        setLocalValue(next.toString());
    };

    return (
        <div className="relative group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-2.5 flex flex-col justify-between hover:border-brand-300 dark:hover:border-brand-700 transition-colors shadow-sm">
            <label className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider mb-1">
                {label}
            </label>
            
            <div className="flex items-center gap-2">
                 {/* Decrement Badge */}
                <button 
                    onClick={decrement}
                    className="w-6 h-6 rounded flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors"
                    tabIndex={-1}
                >
                    <Minus className="w-3 h-3" />
                </button>

                {/* Input */}
                <input
                    type="text"
                    inputMode="numeric"
                    className="flex-1 w-full bg-transparent text-center text-lg font-bold text-zinc-900 dark:text-white outline-none p-0 selection:bg-brand-200 dark:selection:bg-brand-800 font-mono"
                    value={localValue}
                    onChange={handleInputChange}
                    onBlur={commitValue}
                    onFocus={(e) => e.target.select()}
                />

                {/* Increment Badge */}
                <button 
                    onClick={increment}
                    className="w-6 h-6 rounded flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 transition-colors"
                    tabIndex={-1}
                >
                    <Plus className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

export const ModuleStructureConfig: React.FC<ModuleStructureConfigProps> = ({ 
  novel, 
  onGenerateStructure,
  isGenerating
}) => {
  const updateStructureConfig = useNovelStore((state) => state.updateStructureConfig);
  const config = novel.structureConfig;
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (field: string, val: number) => {
    updateStructureConfig(novel.id, { [field as any]: val });
  };

  const handleGenerateClick = () => {
      if (novel.rootNode.children && novel.rootNode.children.length > 0) {
          setShowConfirm(true);
      } else {
          onGenerateStructure();
      }
  };

  return (
    <div className="w-full p-4">
      <ResetConfirmModal 
          isOpen={showConfirm} 
          onClose={() => setShowConfirm(false)} 
          onConfirm={onGenerateStructure} 
      />

      {/* Inputs Grid with Button Integrated */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <ConfigInput label="册数 (Volumes)" field="volumes" value={config.volumes} onChange={handleChange} />
        <ConfigInput label="每册卷数 (Parts)" field="partsPerVolume" value={config.partsPerVolume} onChange={handleChange} />
        <ConfigInput label="每卷阶段 (Stages)" field="stagesPerPart" value={config.stagesPerPart} onChange={handleChange} />
        <ConfigInput label="每阶章节 (Chapters)" field="chaptersPerStage" value={config.chaptersPerStage} onChange={handleChange} />
        <ConfigInput label="每章情节 (Plots)" field="plotsPerChapter" value={config.plotsPerChapter} onChange={handleChange} min={3} />
        <ConfigInput label="每章字数 (Words)" field="wordsPerChapter" value={config.wordsPerChapter || 2500} onChange={handleChange} min={100} step={100} />
      
        {/* Action Button - Spanning Full Width as a Footer of Grid */}
        <div className="col-span-2 md:col-span-3 lg:col-span-6 pt-1">
            <button
                onClick={handleGenerateClick}
                disabled={isGenerating}
                className={clsx(
                    "w-full py-3.5 flex items-center justify-center gap-2 rounded-xl text-white font-bold text-sm tracking-wide transition-all duration-300 shadow-md",
                    "bg-gradient-to-r from-indigo-500 to-purple-600",
                    "hover:brightness-110 hover:shadow-lg hover:shadow-purple-500/40 hover:-translate-y-0.5",
                    "active:scale-[0.99] active:shadow-sm active:translate-y-0",
                    isGenerating && "opacity-70 cursor-wait grayscale-[0.3]"
                )}
            >
                {isGenerating ? (
                <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    正在构建宏大世界...
                </>
                ) : (
                <>
                    <GitFork className="w-5 h-5" />
                    {novel.rootNode.children.length > 0 ? '重置并重新生成小说结构 (Reset Structure)' : '一键生成标准小说结构 (Generate Structure)'}
                </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
