<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-slate-200 p-4 lg:p-6 font-sans selection:bg-emerald-500/30">
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px]" />
      <div class="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
      <div class="absolute inset-0 opacity-20 brightness-50 contrast-150" />
    </div>

    <div class="max-w-7xl mx-auto relative z-10" data-testid="substances-page">
      <header class="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
        <div class="flex items-center gap-6">
          <div class="relative group">
            <div class="absolute inset-x-0 inset-y-0 bg-emerald-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
            <div class="w-12 h-12 rounded-xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-emerald-500/40 flex items-center justify-center relative z-10 shadow-2xl">
              <FlaskConical class="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <h1 class="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase flex items-center gap-3">
              Substance Wiki <span class="text-[8px] font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 not-italic uppercase">{{ user?.role || 'USER' }}</span>
            </h1>
            <p class="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-widest uppercase mt-0.5">
              物质百科全书 / Substance encyclopedia
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="px-4 py-2 bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/5 rounded-xl flex items-center gap-4 shadow-xl">
            <div class="flex flex-col items-end">
              <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Registry Status</span>
              <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                ONLINE
              </span>
            </div>
            <div class="w-px h-6 bg-slate-200 dark:bg-white/5" />
            <router-link 
              to="/data"
              class="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group"
            >
              <ArrowLeft class="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span class="text-[10px] font-black uppercase tracking-widest">Back</span>
            </router-link>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- 列表面板 -->
        <div class="lg:col-span-4 bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/10 p-5 rounded-2xl shadow-xl">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-6">
            <h3 class="text-base font-black text-slate-800 dark:text-white flex items-center gap-3 italic">
              <Database class="w-5 h-5 text-blue-600 dark:text-blue-400" />
              DATABASE_ENTRIES <span class="text-slate-400 dark:text-slate-600 text-[10px] font-mono not-italic uppercase tracking-widest">/ Substances_Registry</span>
            </h3>

            <div class="flex items-center gap-4">
              <div class="relative group">
                <SearchIcon class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  v-model="searchTerm"
                  type="text"
                  placeholder="Search formula/name..."
                  class="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50 w-full md:w-64 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          <!-- 过滤器标签 -->
          <div class="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-white/5">
            <span class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-2">Quick Filters:</span>
            
            <!-- 状态过滤器 -->
            <div class="flex items-center bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 overflow-x-auto no-scrollbar">
              <button 
                v-for="status in ['all', 'pending', 'approved', 'rejected']" 
                :key="status"
                @click="filterStatus = status"
                :class="[
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all whitespace-nowrap',
                  filterStatus === status 
                    ? 'bg-white dark:bg-emerald-500 text-emerald-600 dark:text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                ]"
              >
                {{ status === 'all' ? 'All' : status === 'pending' ? 'Pending' : status.toUpperCase() }}
              </button>
            </div>

            <!-- 特殊状态过滤器 -->
            <button 
              @click="filterNeedsImprovement = filterNeedsImprovement === true ? null : true"
              :class="[
                'px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border',
                filterNeedsImprovement === true
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              ]"
            >
              需完善
            </button>

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
              v-if="filterStatus !== 'all' || filterNeedsImprovement !== null || filterInvalidElements !== null"
              @click="() => { filterStatus = 'all'; filterNeedsImprovement = null; filterInvalidElements = null; searchTerm = '' }"
              class="text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase ml-2 flex items-center gap-1"
            >
              <Plus class="w-3 h-3 rotate-45" /> Clear All
            </button>
          </div>
          
          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left">
              <thead>
                <tr class="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-white/5">
                  <th class="px-4 py-2.5">Formula / Name</th>
                  <th class="px-4 py-2.5">Status</th>
                  <th class="px-4 py-2.5">Author</th>
                  <th class="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                <tr v-for="sub in filteredSubstances" :key="sub.id" class="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                  <td class="px-4 py-3">
                    <div class="flex flex-col">
                      <span class="text-base font-black italic text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors tracking-tighter">{{ sub.formula }}</span>
                      <span class="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{{ sub.name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 flex flex-col gap-1 items-start">
                    <span :class="[
                      'px-1.5 py-0.5 rounded text-[8px] font-black uppercase letter-spacing-widest border',
                      sub.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      sub.status.startsWith('pending') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    ]">
                      {{ sub.status }}
                    </span>
                    <span v-if="sub.needs_improvement" class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase letter-spacing-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                      <AlertTriangle class="w-2.5 h-2.5" />
                      需完善
                    </span>
                    <span v-if="sub.has_invalid_elements" class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase letter-spacing-widest bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                      <AlertTriangle class="w-2.5 h-2.5" />
                      无效元素
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2 text-slate-400">
                      <UserIcon class="w-3 h-3" />
                      <span class="text-[10px] font-bold">{{ sub.creator_name }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Read Only</span>
                  </td>
                </tr>
                <tr v-if="filteredSubstances.length === 0 && !loading">
                  <td colspan="4" class="py-10 text-center">
                    <FlaskConical class="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                    <p class="text-slate-400 dark:text-slate-500 font-medium italic text-xs">未检索到相关物质数据</p>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div v-if="loading" class="text-center py-6">
              <div class="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p class="text-slate-400 dark:text-slate-500 font-medium text-xs">加载中...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { substanceAPI } from '../utils/api'
import {
  FlaskConical,
  Database,
  ArrowLeft,
  Search as SearchIcon,
  User as UserIcon,
  AlertTriangle,
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
  // 兼容旧版本的 id 字段
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

// 过滤状态
const filterStatus = ref<string>('all')
const filterNeedsImprovement = ref<boolean | null>(null)
const filterInvalidElements = ref<boolean | null>(null)

const fetchSubstances = async () => {
  loading.value = true
  try {
    const res = await substanceAPI.getSubstances()
    substances.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch substances')
  } finally {
    loading.value = false
  }
}


const filteredSubstances = computed(() => {
  let filtered = substances.value

  // 1. 搜索词筛选
  if (searchTerm.value) {
    const term = searchTerm.value.toLowerCase()
    filtered = filtered.filter(s => 
      s.formula.toLowerCase().includes(term) || 
      s.name.toLowerCase().includes(term)
    )
  }

  // 2. 状态筛选
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(s => s.status === filterStatus.value)
  }

  // 3. 需完善筛选
  if (filterNeedsImprovement.value !== null) {
    filtered = filtered.filter(s => s.needs_improvement === filterNeedsImprovement.value)
  }

  // 4. 无效元素筛选
  if (filterInvalidElements.value !== null) {
    filtered = filtered.filter(s => s.has_invalid_elements === filterInvalidElements.value)
  }

  return filtered
})

onMounted(fetchSubstances)
</script>