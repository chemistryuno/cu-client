<template>
  <div class="console-page-shell min-h-screen">
    <div class="console-grid-overlay" />

    <div class="console-page-container max-w-6xl" data-testid="data-config-page">
      <header class="console-page-header animate-in fade-in slide-in-from-top-2">
        <div class="console-page-heading">
          <div class="console-page-icon text-emerald-600 dark:text-emerald-300">
            <Database class="h-5 w-5" />
          </div>
          <div>
            <p class="console-eyebrow">Control Center</p>
            <h1 class="console-page-title">Data Hub</h1>
            <p class="console-page-subtitle">核心数据配置与管理中心 / Core configuration center</p>
          </div>
        </div>

        <div class="console-toolbar">
          <div class="console-metric-chip">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {{ userRole }}
          </div>
          <button @click="router.push('/')" class="console-button group">
            <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            返回实验室
          </button>
        </div>
      </header>

      <section class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <router-link
          to="/data/reactions"
          data-testid="data-nav-reactions"
          class="console-panel animate-in fade-in slide-in-from-bottom-2 group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-500/30"
        >
          <div class="absolute right-0 top-0 h-28 w-28 translate-x-6 -translate-y-6 rounded-full bg-emerald-500/10 blur-2xl" />
          <div class="relative flex h-full flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
              <span class="console-notice-chip border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Module 01</span>
              <FlaskConical class="h-5 w-5 text-emerald-500/70 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div class="space-y-2">
              <h2 class="console-section-title text-xl">反应方程式库</h2>
              <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                查看游戏中允许的化学反应。当前玩家模式仅提供只读浏览，不提供审核、编辑或提交流程。
              </p>
            </div>
            <div class="mt-auto flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              进入查看界面
              <ArrowRight class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </router-link>

        <router-link
          to="/data/substances"
          data-testid="data-nav-substances"
          class="console-panel animate-in fade-in slide-in-from-bottom-2 [--enter-duration:380ms] group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-500/30"
        >
          <div class="absolute right-0 top-0 h-28 w-28 translate-x-6 -translate-y-6 rounded-full bg-sky-500/10 blur-2xl" />
          <div class="relative flex h-full flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
              <span class="console-notice-chip">Module 02</span>
              <Beaker class="h-5 w-5 text-sky-500/70 transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div class="space-y-2">
              <h2 class="console-section-title text-xl">物质百科全书</h2>
              <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                查阅游戏中的化学物质与名称映射。当前玩家模式仅提供只读浏览，不提供提交流程。
              </p>
            </div>
            <div class="mt-auto flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
              进入查看界面
              <ArrowRight class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </router-link>
      </section>

      <footer class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:text-slate-400">
        <div class="flex items-center gap-2">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Data Sync Active
        </div>
        <div>Experimental Phase 0.1.4</div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, Beaker, Database, FlaskConical } from 'lucide-vue-next'

const router = useRouter()
let user: any = {}
try {
  user = JSON.parse(localStorage.getItem('user') || '{}')
} catch (e) {
  console.error('Failed to parse user in DataConfig:', e)
}

const userRole = computed(() => user?.role || 'WIKI_READER')
</script>
