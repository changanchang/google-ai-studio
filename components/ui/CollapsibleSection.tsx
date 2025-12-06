import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface CollapsibleSectionProps {
  title: string;
  icon: any;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const CollapsibleSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  className
}: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={clsx("bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm transition-all duration-300 overflow-hidden", className)}>
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between p-4 transition-colors group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
        >
            <div className="flex items-center gap-3 text-zinc-800 dark:text-zinc-100 font-bold text-sm">
                <div className="p-2 bg-zinc-100/80 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-lg group-hover:bg-brand-100 group-hover:text-brand-600 dark:group-hover:bg-brand-900/30 dark:group-hover:text-brand-300 transition-colors">
                    <Icon className="w-4 h-4" />
                </div>
                {title}
            </div>
            <div className="text-zinc-400 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-transform duration-300" 
                 style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <ChevronDown className="w-5 h-5" />
            </div>
        </button>
        
        <div className={clsx(
            "collapsible-content border-t border-zinc-100/50 dark:border-zinc-800/30", 
            isOpen ? "open" : ""
        )}>
             <div className="collapsible-overflow">
                 <div className="p-6">
                    {children}
                 </div>
             </div>
        </div>
    </div>
  );
};