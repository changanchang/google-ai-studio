import React from 'react';
import clsx from 'clsx';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed select-none";
  
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-transparent",
    secondary: "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800 shadow-sm",
    outline: "border border-zinc-300 bg-transparent hover:bg-zinc-50 text-zinc-700 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800/50",
    ghost: "bg-transparent hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
    gradient: "bg-gradient-to-br from-brand-600 to-fuchsia-600 text-white shadow-lg shadow-brand-500/25 border-transparent hover:shadow-brand-500/40 hover:brightness-110",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-900/20",
  };

  const sizes = {
    xs: "h-7 px-2.5 text-[11px] gap-1.5",
    sm: "h-9 px-3.5 text-xs gap-2",
    md: "h-10 px-5 py-2 text-sm gap-2",
    lg: "h-12 px-8 text-base gap-2.5",
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};