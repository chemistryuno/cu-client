import { cva } from 'class-variance-authority'

export const consoleButton = cva(
  'inline-flex items-center justify-center gap-2 rounded-[7px] border font-black uppercase tracking-[0.16em] transition-all active:translate-y-[1px] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:saturate-50',
  {
    variants: {
      tone: {
        primary: 'console-button-accent',
        secondary: 'border-slate-300/80 bg-white/[0.86] text-slate-900 shadow-[inset_0_-2px_0_rgba(15,23,42,0.06)] hover:border-cyan-400/60 hover:bg-white dark:border-white/[0.12] dark:bg-[#101820]/[0.88] dark:text-slate-100 dark:hover:border-cyan-300/[0.45] dark:hover:bg-[#142330]',
        ghost: 'border-transparent bg-transparent text-slate-600 hover:border-slate-300/70 hover:bg-white/[0.55] dark:text-slate-300 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.055]',
        danger: 'border-rose-400/70 bg-rose-600 text-white shadow-[0_14px_28px_-20px_rgba(225,29,72,0.8),inset_0_-2px_0_rgba(15,23,42,0.2)] hover:border-rose-300 hover:bg-rose-500',
      },
      size: {
        sm: 'min-h-9 px-3 py-2 text-[10px]',
        md: 'min-h-11 px-4 py-3 text-[11px]',
        lg: 'min-h-12 px-5 py-3 text-[11px]',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      tone: 'primary',
      size: 'md',
      block: false,
    },
  }
)

export const consolePanel = cva(
  'border overflow-hidden',
  {
    variants: {
      tone: {
        base: 'border-slate-300/80 bg-white/[0.88] shadow-[0_28px_60px_-44px_rgba(15,23,42,0.55),inset_0_1px_0_rgba(255,255,255,0.62)] dark:border-white/[0.12] dark:bg-[#0c141b]/[0.92] dark:shadow-[0_28px_68px_-42px_rgba(0,0,0,0.82),inset_0_1px_0_rgba(255,255,255,0.04)]',
        soft: 'border-slate-300/70 bg-slate-100/[0.72] dark:border-white/10 dark:bg-[#111b22]/[0.78]',
        inset: 'border-slate-300/70 bg-white/[0.76] dark:border-white/10 dark:bg-[#101a21]/[0.80]',
      },
      radius: {
        md: 'rounded-[6px]',
        lg: 'rounded-[8px]',
        xl: 'rounded-[8px]',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-5 sm:p-6',
        lg: 'p-6 sm:p-7',
      },
    },
    defaultVariants: {
      tone: 'base',
      radius: 'lg',
      padding: 'md',
    },
  }
)
