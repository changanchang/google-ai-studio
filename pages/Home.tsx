import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNovelStore } from '../store/useNovelStore';
import { Plus, BookOpenText, Clock, Moon, Sun, PenTool, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { motion, Variants } from 'framer-motion';
import clsx from 'clsx';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { novels, createNovel, isDarkMode, toggleTheme } = useNovelStore();

  const handleCreate = () => {
    const id = createNovel();
    navigate(`/novel/${id}`);
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
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#09090B] transition-colors font-sans selection:bg-brand-500 selection:text-white relative overflow-hidden">
      {/* Decorative Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-400/20 dark:bg-brand-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] animate-blob" />
         <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-400/20 dark:bg-indigo-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000" />
         <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-pink-400/20 dark:bg-pink-500/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000" />
         <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6 md:p-12 space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 animate-fade-in">
          <div className="space-y-2 text-center md:text-left">
             <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="px-2 py-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 text-xs font-bold tracking-wider uppercase">Beta v1.0</span>
             </div>
             <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                AI Novel <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-fuchsia-600">Architect</span>
             </h1>
             <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-md">
                从灵感到完本，AI 辅助的专业长篇小说创作工坊。
             </p>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={toggleTheme}
                className="p-3 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:shadow-lg hover:text-brand-600 dark:hover:text-brand-400 transition-all"
             >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
             <Button 
                variant="gradient" 
                size="lg" 
                onClick={handleCreate}
                className="shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 hover:-translate-y-0.5 transition-all"
             >
                <Plus className="w-5 h-5 mr-2" />
                开始创作新书
             </Button>
          </div>
        </div>

        {/* Projects Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <BookOpenText className="w-5 h-5" />
              最近项目
            </h2>
            <span className="text-sm text-zinc-500">{novels.length} 个项目</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {novels.length === 0 && (
              <motion.div variants={itemVariants} onClick={handleCreate} className="group col-span-full py-24 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer transition-all duration-300 backdrop-blur-sm">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <PenTool className="w-8 h-8 text-zinc-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-brand-600 dark:group-hover:text-brand-400">暂无小说项目</h3>
                  <p className="text-zinc-500 dark:text-zinc-500 mt-2">点击此处创建您的第一部作品</p>
              </motion.div>
            )}
            
            {novels.map((novel) => (
              <motion.div 
                variants={itemVariants}
                key={novel.id}
                onClick={() => navigate(`/novel/${novel.id}`)}
                className="group relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-2xl hover:shadow-brand-500/20 hover:-translate-y-2 hover:border-brand-300/50 dark:hover:border-brand-700/50 hover:scale-[1.01] transition-all duration-300 cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-brand-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-brand-100 group-hover:text-brand-600 dark:group-hover:bg-brand-900/30 dark:group-hover:text-brand-400 transition-colors">
                      <BookOpenText className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {new Date(novel.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 truncate pr-4 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {novel.title || '未命名项目'}
                </h3>
                
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 line-clamp-2 h-10 leading-relaxed">
                  {novel.idea || novel.outline || '暂无简介...'}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                        "text-[10px] font-medium px-2 py-1 rounded-md border",
                        novel.type 
                            ? "bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800" 
                            : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                    )}>
                        {novel.type || '未分类'}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-brand-500 transform group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};