<template>
  <div class="console-page-shell min-h-screen">
    <div class="console-grid-overlay" />

    <div class="console-page-container" data-testid="substances-page">
      <header class="console-page-header animate-in fade-in slide-in-from-top-2">
        <div class="console-page-heading">
          <div class="console-page-icon text-emerald-600 dark:text-emerald-300">
            <FlaskConical class="h-5 w-5" />
          </div>
          <div>
            <p class="console-eyebrow">Substance Wiki</p>
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="console-page-title">Substance Encyclopedia</h1>
              <span class="console-notice-chip border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                {{ user?.role || 'USER' }}
              </span>
            </div>
            <p class="console-page-subtitle">物质百科全书 / Substance registry</p>
          </div>
        </div>

        <div class="console-toolbar">
          <div class="console-metric-chip">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Registry Online
          </div>
          <router-link to="/data" class="console-button group">
            <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </router-link>
        </div>
      </header>

      <section class="console-panel animate-in fade-in slide-in-from-bottom-2">
        <div class="console-panel-header">
          <div>
            <p class="console-eyebrow">Substances Registry</p>
            <h2 class="console-section-title text-lg">Database Entries</h2>
          </div>
          <label class="console-input-shell w-full md:w-[320px]">
            <SearchIcon class="h-4 w-4 text-slate-400" />
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Search formula or name"
              class="console-input"
            />
          </label>
        </div>

        <div class="console-filter-bar">
          <span class="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Filters</span>
          <div class="console-tab-strip overflow-x-auto">
            <button
              v-for="status in ['all', 'pending', 'approved', 'rejected']"
              :key="status"
              @click="filterStatus = status"
              :class="['console-tab-button whitespace-nowrap', filterStatus === status && 'console-tab-button--active']"
            >
              {{ status === 'all' ? 'All' : status === 'pending' ? 'Pending' : status.toUpperCase() }}
            </button>
          </div>
          <button
            @click="filterNeedsImprovement = filterNeedsImprovement === true ? null : true"
            :class="['console-filter-pill', filterNeedsImprovement === true && 'console-filter-pill--active text-amber-700 dark:text-amber-300']"
          >
            需完善
          </button>
          <button
            @click="filterInvalidElements = filterInvalidElements === true ? null : true"
            :class="['console-filter-pill', filterInvalidElements === true && 'console-filter-pill--active text-rose-600 dark:text-rose-300']"
          >
            无效元素
          </button>
          <button
            v-if="filterStatus !== 'all' || filterNeedsImprovement !== null || filterInvalidElements !== null || searchTerm"
            @click="() => { filterStatus = 'all'; filterNeedsImprovement = null; filterInvalidElements = null; searchTerm = '' }"
            class="console-button console-button-ghost text-rose-600 dark:text-rose-300"
          >
            <Plus class="h-3.5 w-3.5 rotate-45" />
            Clear
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="console-data-table">
            <thead>
              <tr>
                <th>Formula / Name</th>
                <th>Status</th>
                <th>Author</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in filteredSubstances" :key="sub.id">
                <td>
                  <div class="flex flex-col gap-1">
                    <span class="text-base font-black tracking-tight text-slate-900 dark:text-white">{{ sub.formula }}</span>
                    <span class="text-sm text-slate-500 dark:text-slate-400">{{ sub.name }}</span>
                  </div>
                </td>
                <td>
                  <div class="flex flex-wrap gap-2">
                    <span :class="[
                      'console-notice-chip',
                      sub.status === 'approved'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : sub.status.startsWith('pending')
                          ? ''
                          : 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                    ]">
                      {{ sub.status }}
                    </span>
                    <span v-if="sub.needs_improvement" class="console-notice-chip border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      <AlertTriangle class="h-3 w-3" />
                      需完善
                    </span>
                    <span v-if="sub.has_invalid_elements" class="console-notice-chip border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                      <AlertTriangle class="h-3 w-3" />
                      无效元素
                    </span>
                  </div>
                </td>
                <td>
                  <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <UserIcon class="h-4 w-4" />
                    <span class="text-sm font-medium">{{ sub.creator_name }}</span>
                  </div>
                </td>
                <td class="text-right">
                  <span class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Read Only</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="filteredSubstances.length === 0 && !loading" class="console-empty-state mt-4">
            <FlaskConical class="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p class="text-sm font-bold text-slate-500 dark:text-slate-400">未检索到相关物质数据</p>
          </div>

          <div v-if="loading" class="py-10 text-center">
            <div class="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">加载中...</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { substanceAPI } from '../utils/api'
import {
  AlertTriangle,
  ArrowLeft,
  Database,
  FlaskConical,
  Plus,
  Search as SearchIcon,
  User as UserIcon
} from 'lucide-vue-next'

interface Substance {
  id: number
  formula: string
  name: string
  elements: string
  status: string
  group_id: number | null
  needs_improvement: boolean
  has_invalid_elements: boolean
  creator_name: string
  created_at: string
}

const user = ref<any>({})
try {
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  if (userData.id && !userData.uid) {
    userData.uid = userData.id
  }
  user.value = userData
} catch (e) {
  console.error('Failed to parse user in Substances:', e)
}

const substances = ref<Substance[]>([])
const loading = ref(false)
const searchTerm = ref('')
const filterStatus = ref<string>('all')
const filterNeedsImprovement = ref<boolean | null>(null)
const filterInvalidElements = ref<boolean | null>(null)
let searchTimer: number | null = null

const fetchSubstances = async () => {
  loading.value = true
  try {
    const res = await substanceAPI.getSubstances(searchTerm.value)
    substances.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch substances')
  } finally {
    loading.value = false
  }
}

const filteredSubstances = computed(() => {
  let filtered = substances.value

  if (searchTerm.value && !loading.value) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter((s) =>
      s.formula.toLowerCase().includes(term) ||
      s.name.toLowerCase().includes(term)
    )
  }

  if (filterStatus.value !== 'all') {
    filtered = filtered.filter((s) => s.status === filterStatus.value)
  }

  if (filterNeedsImprovement.value !== null) {
    filtered = filtered.filter((s) => s.needs_improvement === filterNeedsImprovement.value)
  }

  if (filterInvalidElements.value !== null) {
    filtered = filtered.filter((s) => s.has_invalid_elements === filterInvalidElements.value)
  }

  return filtered
})

watch(searchTerm, () => {
  if (searchTimer != null) {
    window.clearTimeout(searchTimer)
  }
  searchTimer = window.setTimeout(() => {
    fetchSubstances()
    searchTimer = null
  }, 280)
})

onUnmounted(() => {
  if (searchTimer != null) {
    window.clearTimeout(searchTimer)
    searchTimer = null
  }
})

onMounted(fetchSubstances)
</script>
