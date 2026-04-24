import { cva } from 'class-variance-authority'

export const consoleButton = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-black uppercase tracking-[0.18em] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      tone: {
        primary: 'bg-sky-700 hover:bg-sky-600 text-white shadow-lg shadow-sky-900/15',
        secondary: 'bg-white/80 dark:bg-[#0f1720] text-slate-900 dark:text-slate-100 border border-slate-300/70 dark:border-white/10 hover:bg-white dark:hover:bg-[#111c28]',
        ghost: 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-white/5',
        danger: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/15',
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
        base: 'border-slate-300/60 dark:border-white/10 bg-white/90 dark:bg-[#0b1420]/90 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)]',
        soft: 'border-slate-200/80 dark:border-white/8 bg-slate-50/80 dark:bg-[#0f1722]/80',
        inset: 'border-slate-200/70 dark:border-white/8 bg-white/75 dark:bg-[#101923]/76',
      },
      radius: {
        md: 'rounded-2xl',
        lg: 'rounded-[28px]',
        xl: 'rounded-[32px]',
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
