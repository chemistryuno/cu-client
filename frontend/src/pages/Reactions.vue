<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-slate-200 p-4 lg:p-6 font-sans selection:bg-blue-500/30">
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
      <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-500/5 rounded-full blur-[120px]" />
      <div class="absolute inset-0 opacity-20 brightness-50 contrast-150" />
    </div>

    <div class="max-w-7xl mx-auto relative z-10">
      <header class="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
        <div class="flex items-center gap-6">
          <div class="relative group">
            <div class="absolute inset-x-0 inset-y-0 bg-blue-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div class="w-12 h-12 rounded-xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-blue-500/40 flex items-center justify-center relative z-10 shadow-2xl">
              <Beaker class="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <h1 class="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase flex items-center gap-3">
              Experimental Wiki <span class="text-[8px] font-mono bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 not-italic">{{ user?.role?.toUpperCase() || 'USER' }}</span>
            </h1>
            <p class="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-widest uppercase mt-0.5">
              实验室化学反应百科 / Chemical Reaction Encyclopedia
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="px-4 py-2 bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/5 rounded-xl flex items-center gap-4 shadow-xl">
            <div class="flex flex-col items-end">
              <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">User Role</span>
              <span class="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                {{ user?.role?.toUpperCase() || 'USER' }}
              </span>
            </div>
            <div class="w-px h-6 bg-slate-200 dark:bg-white/5" />
            <router-link 
              to="/ranking"
              class="flex items-center gap-2 text-amber-500 hover:text-amber-400 transition-colors group"
            >
              <Trophy class="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span class="text-[10px] font-black uppercase tracking-widest">Rank</span>
            </router-link>
            <div class="w-px h-6 bg-slate-200 dark:bg-white/5" />
            <button 
              @click="router.push('/data')"
              class="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group"
            >
              <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span class="text-[10px] font-black uppercase tracking-widest">Back</span>
            </button>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 反应列表 (全宽) -->
        <div class="lg:col-span-3 bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-xl">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6">
            <h3 class="text-base font-black text-slate-800 dark:text-white flex items-center gap-3 italic">
              <Database class="w-5 h-5 text-green-600 dark:text-green-400" />
              反应库索引 <span class="text-slate-400 dark:text-slate-600 text-[10px] font-mono not-italic uppercase tracking-widest">/ Global_Wiki</span>
            </h3>

            <div class="flex items-center gap-4">
              <div class="relative group">
                <SearchIcon class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                <input 
                  v-model="searchTerm"
                  type="text" 
                  placeholder="搜索反应物/生成物..."
                  class="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50 w-full md:w-64 transition-all placeholder:text-slate-400"
                />
              </div>
              <div class="text-[8px] font-black text-blue-600 dark:text-white bg-blue-600/10 dark:bg-blue-600/20 px-2 py-1.5 rounded-lg border border-blue-600/20 dark:border-blue-600/30 whitespace-nowrap">
                MATCHED: {{ pagination.total }}
              </div>
            </div>
          </div>

          <!-- 过滤器标签 -->
          <div class="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-white/5">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">Quick Filters:</span>
            
            <!-- 状态过滤器 -->
            <div class="flex items-center bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 overflow-x-auto custom-scrollbar no-scrollbar">
              <button 
                v-for="status in ['all', 'pending', 'approved', 'rejected']" 
                :key="status"
                @click="filterStatus = status"
                :class="[
                  'px-3 py-1.5 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-tight transition-all whitespace-nowrap',
                  filterStatus === status 
                    ? 'bg-white dark:bg-blue-500 text-blue-600 dark:text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                ]"
              >
                {{ status === 'all' ? 'All' : status === 'pending' ? 'Pending' : status.toUpperCase() }}
              </button>
            </div>

            <!-- 特殊状态过滤器 -->
            <button 
              @click="filterInvalidElements = filterInvalidElements === true ? null : true"
              :class="[
                'px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border',
                filterInvalidElements === true
                  ? 'bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              ]"
            >
              无效元素
            </button>

            <button 
              v-if="filterStatus !== 'all' || filterInvalidElements !== null"
              @click="() => { filterStatus = 'all'; filterInvalidElements = null; searchTerm = '' }"
              class="text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase ml-2 flex items-center gap-1"
            >
              <Plus class="w-3 h-3 rotate-45" /> Clear All
            </button>
          </div>
          
          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left">
              <thead>
                <tr class="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-white/5">
                  <th class="px-4 py-2.5">Reaction Formula</th>
                  <th class="px-4 py-2.5">Status</th>
                  <th class="px-4 py-2.5">Creator</th>
                  <th class="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                <tr v-for="reaction in filteredReactions" :key="reaction.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                  <td class="px-4 py-3 font-bold text-slate-900 dark:text-white text-[10px]">
                    <div class="flex items-center gap-4 border-l-2" 
                      :class="{
                        'border-blue-500/50 pl-4': reaction.status === 'pending_coworker' || reaction.status === 'pending_admin' || reaction.status === 'pending',
                        'border-emerald-500/50 pl-4': reaction.status === 'approved',
                        'border-red-500/50 pl-4': reaction.status === 'rejected'
                      }">
                      <div class="flex flex-col gap-1.5 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-slate-900 dark:text-white text-xs tracking-tight leading-relaxed">{{ reaction.display }}</span>
                          <span v-if="reaction.has_invalid_elements" class="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 whitespace-nowrap">
                            <AlertCircle class="w-2.5 h-2.5" /> INVALID ELEMENTS
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-2">
                      <span v-if="reaction.status === 'pending_coworker'" class="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <Clock class="w-2.5 h-2.5" /> PENDING CO-WORKER
                      </span>
                      <span v-else-if="reaction.status === 'pending_admin'" class="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        <Clock class="w-2.5 h-2.5" /> PENDING ADMIN
                      </span>
                      <span v-else-if="reaction.status === 'approved'" class="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle class="w-2.5 h-2.5" /> VERIFIED
                      </span>
                      <span v-else-if="reaction.status === 'rejected'" class="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                        <Trash2 class="w-2.5 h-2.5" /> REJECTED
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-5 text-[10px] text-slate-900 dark:text-slate-400">
                    <div class="flex flex-col">
                      <span class="font-bold text-slate-800 dark:text-slate-300 opacity-80 uppercase tracking-tighter">{{ reaction.creator_name || 'SYSTEM' }}</span>
                      <span class="text-[8px] opacity-60 text-slate-500 dark:text-slate-400">{{ new Date(reaction.created_at).toLocaleDateString() }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-5 text-right">
                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Read Only</span>
                  </td>
                </tr>
                <tr v-if="filteredReactions.length === 0 && !loading">
                  <td colspan="4" class="py-20 text-center">
                    <Database class="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                    <p class="text-slate-400 dark:text-slate-500 font-medium italic">未检索到相关化学反应数据</p>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="loading" class="text-center py-12">
              <div class="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p class="text-slate-500 font-medium">加载中...</p>
            </div>

            <div class="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5 pt-4">
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Page {{ pagination.page }} / {{ Math.max(pagination.totalPages, 1) }} · Total {{ pagination.total }}
              </p>
              <div class="flex items-center gap-2">
                <button
                  @click="goToPreviousPage"
                  :disabled="loading || pagination.page <= 1"
                  class="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 transition-all hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  @click="goToNextPage"
                  :disabled="loading || pagination.page >= Math.max(pagination.totalPages, 1)"
                  class="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 transition-all hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { reactionAPI } from '../utils/api'
import { useDialog } from '../utils/dialog'
import {
  ArrowLeft,
  Beaker,
  Plus,
  Database,
  Trash2,
  Search as SearchIcon,
  CheckCircle,
  Clock,
  Trophy,
  AlertCircle
} from 'lucide-vue-next'

const router = useRouter()
const { showAlert } = useDialog()

const user = ref<any>({})
try {
  const userData = JSON.parse(localStorage.getItem('user') || '{}')
  // 兼容旧版本的 id 字段
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

// 过滤状态
const filterStatus = ref<string>('all')
const filterInvalidElements = ref<boolean | null>(null)

// 初始化用户信息并增加容错
onMounted(() => {
  try {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      user.value = JSON.parse(savedUser)
    }
  } catch (e) {
    console.error('解析用户信息失败', e)
  }
  loadReactions()
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

const filteredReactions = computed(() => {
  return reactions.value
})

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

    selectedReactions.value.clear()
    selectAllReactions.value = false
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
