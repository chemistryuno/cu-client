<template>
  <div class="console-page-shell min-h-screen">
    <div class="console-grid-overlay" />

    <div class="console-page-container" data-testid="reactions-page">
      <header class="console-page-header animate-in fade-in slide-in-from-top-2">
        <div class="console-page-heading">
          <div class="console-page-icon">
            <Beaker class="h-5 w-5" />
          </div>
          <div>
            <p class="console-eyebrow">Experimental Wiki</p>
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="console-page-title">Chemical Reaction Encyclopedia</h1>
              <span class="console-notice-chip">{{ user?.role?.toUpperCase() || 'USER' }}</span>
            </div>
            <p class="console-page-subtitle">实验室化学反应百科 / Reaction database</p>
          </div>
        </div>

        <div class="console-toolbar">
          <div class="console-toolbar-group">
            <div class="console-metric-chip">
              <span class="h-1.5 w-1.5 rounded-full bg-sky-500" />
              {{ user?.role?.toUpperCase() || 'USER' }}
            </div>
            <router-link to="/ranking" class="console-button text-amber-600 dark:text-amber-300">
              <Trophy class="h-4 w-4" />
              Rank
            </router-link>
          </div>
          <button @click="router.push('/data')" class="console-button group">
            <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
        </div>
      </header>

      <section class="console-panel animate-in fade-in slide-in-from-bottom-2">
        <div class="console-panel-header">
          <div>
            <p class="console-eyebrow">Global Wiki</p>
            <h2 class="console-section-title text-lg">Reaction Registry</h2>
          </div>
          <div class="flex w-full flex-col gap-2 md:w-auto md:min-w-[320px]">
            <label class="console-input-shell">
              <SearchIcon class="h-4 w-4 text-slate-400" />
              <input
                v-model="searchTerm"
                type="text"
                placeholder="搜索反应物或生成物"
                class="console-input"
              />
            </label>
            <div class="flex justify-end">
              <span class="console-metric-chip">Matched {{ pagination.total }}</span>
            </div>
          </div>
        </div>

        <div class="console-filter-bar">
          <span class="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Status</span>
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
            @click="filterInvalidElements = filterInvalidElements === true ? null : true"
            :class="['console-filter-pill', filterInvalidElements === true && 'console-filter-pill--active text-rose-600 dark:text-rose-300']"
          >
            无效元素
          </button>
          <button
            v-if="filterStatus !== 'all' || filterInvalidElements !== null || searchTerm"
            @click="() => { filterStatus = 'all'; filterInvalidElements = null; searchTerm = '' }"
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
                <th>Reaction Formula</th>
                <th>Status</th>
                <th>Creator</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="reaction in filteredReactions" :key="reaction.id">
                <td>
                  <div class="flex flex-col gap-2 border-l-2 pl-4"
                    :class="{
                      'border-sky-500/40': reaction.status === 'pending_coworker' || reaction.status === 'pending_admin' || reaction.status === 'pending',
                      'border-emerald-500/40': reaction.status === 'approved',
                      'border-rose-500/40': reaction.status === 'rejected'
                    }">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-sm font-bold text-slate-900 dark:text-white">{{ reaction.display }}</span>
                      <span v-if="reaction.has_invalid_elements" class="console-notice-chip border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                        <AlertCircle class="h-3 w-3" />
                        Invalid
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span v-if="reaction.status === 'pending_coworker'" class="console-notice-chip border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <Clock class="h-3 w-3" />
                    Pending Co-worker
                  </span>
                  <span v-else-if="reaction.status === 'pending_admin'" class="console-notice-chip">
                    <Clock class="h-3 w-3" />
                    Pending Admin
                  </span>
                  <span v-else-if="reaction.status === 'approved'" class="console-notice-chip border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle class="h-3 w-3" />
                    Verified
                  </span>
                  <span v-else-if="reaction.status === 'rejected'" class="console-notice-chip border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                    <Trash2 class="h-3 w-3" />
                    Rejected
                  </span>
                </td>
                <td>
                  <div class="flex flex-col gap-1">
                    <span class="text-xs font-bold uppercase tracking-[0.1em] text-slate-700 dark:text-slate-200">{{ reaction.creator_name || 'SYSTEM' }}</span>
                    <span class="text-[11px] text-slate-500 dark:text-slate-400">{{ new Date(reaction.created_at).toLocaleDateString() }}</span>
                  </div>
                </td>
                <td class="text-right">
                  <span class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Read Only</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="filteredReactions.length === 0 && !loading" class="console-empty-state mt-4">
            <Database class="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p class="text-sm font-bold text-slate-500 dark:text-slate-400">未检索到相关化学反应数据</p>
          </div>

          <div v-if="loading" class="py-10 text-center">
            <div class="mx-auto mb-3 h-8 w-8 rounded-full border-2 border-sky-500/20 border-t-sky-500 animate-spin" />
            <p class="text-sm font-medium text-slate-500 dark:text-slate-400">加载中...</p>
          </div>

          <div class="mt-4 flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 pt-4 sm:flex-row dark:border-white/10">
            <p class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Page {{ pagination.page }} / {{ Math.max(pagination.totalPages, 1) }} · Total {{ pagination.total }}
            </p>
            <div class="flex items-center gap-2">
              <button
                @click="goToPreviousPage"
                :disabled="loading || pagination.page <= 1"
                class="console-button"
              >
                Prev
              </button>
              <button
                @click="goToNextPage"
                :disabled="loading || pagination.page >= Math.max(pagination.totalPages, 1)"
                class="console-button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { reactionAPI } from '../utils/api'
import {
  AlertCircle,
  ArrowLeft,
  Beaker,
  CheckCircle,
  Clock,
  Database,
  Plus,
  Search as SearchIcon,
  Trash2,
  Trophy
} from 'lucide-vue-next'

const router = useRouter()

const user = ref<any>({})
try {
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  if (userData.id && !userData.uid) {
    userData.uid = userData.id
  }
  user.value = userData
} catch (e) {
  console.error('Failed to parse user in Reactions:', e)
}

const reactions = ref<any[]>([])
const loading = ref(false)
const searchTerm = ref('')
const pagination = ref({
  page: 1,
  pageSize: 30,
  total: 0,
  totalPages: 0
})
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const filterStatus = ref<string>('all')
const filterInvalidElements = ref<boolean | null>(null)

onMounted(() => {
  try {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      user.value = JSON.parse(savedUser)
    }
  } catch (e) {
    console.error('解析用户信息失败', e)
  }
  void loadReactions()
})

watch([filterStatus, filterInvalidElements], () => {
  pagination.value.page = 1
  void loadReactions()
})

watch(() => pagination.value.page, () => {
  void loadReactions()
})

watch(searchTerm, () => {
  pagination.value.page = 1
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    void loadReactions()
  }, 250)
})

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})

const filteredReactions = computed(() => reactions.value)

const loadReactions = async () => {
  loading.value = true
  try {
    const params: Record<string, any> = {
      paginated: 1,
      page: pagination.value.page,
      page_size: pagination.value.pageSize
    }

    if (searchTerm.value.trim()) {
      params.q = searchTerm.value.trim()
    }

    if (filterStatus.value !== 'all') {
      params.status = filterStatus.value
    }

    if (filterInvalidElements.value !== null) {
      params.has_invalid = filterInvalidElements.value
    }

    const response = await reactionAPI.getReactions(params)
    reactions.value = response.data?.items || []
    pagination.value.total = response.data?.pagination?.total || 0
    pagination.value.totalPages = response.data?.pagination?.total_pages || 0
    pagination.value.page = response.data?.pagination?.page || pagination.value.page
    pagination.value.pageSize = response.data?.pagination?.page_size || pagination.value.pageSize

    if (pagination.value.totalPages > 0 && pagination.value.page > pagination.value.totalPages) {
      pagination.value.page = pagination.value.totalPages
      return
    }
  } catch (error) {
    console.error('加载反应数据失败:', error)
  } finally {
    loading.value = false
  }
}

const goToPreviousPage = () => {
  if (pagination.value.page <= 1 || loading.value) return
  pagination.value.page -= 1
}

const goToNextPage = () => {
  const totalPages = Math.max(pagination.value.totalPages, 1)
  if (pagination.value.page >= totalPages || loading.value) return
  pagination.value.page += 1
}
</script>
