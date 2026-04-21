<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authAPI } from '../utils/api'
import { clearClientAuthState, getStoredUser, sanitizeStoredUser } from '../utils/authSession'
import { useDialog } from '../utils/dialog'
import ProfileHeader from '../components/profile/ProfileHeader.vue'
import SettingsPanel from '../components/profile/SettingsPanel.vue'
import CustomDecks from '../components/profile/CustomDecks.vue'
import MatchHistory from '../components/profile/MatchHistory.vue'
import ChangeAvatarModal from '../components/profile/ChangeAvatarModal.vue'
import { useI18n } from '../utils/i18n'
import { ArrowLeft, FlaskConical, History, LogOut, Menu, Sliders, X as CloseIcon } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { showAlert, showConfirm } = useDialog()
const { locale, t } = useI18n()

const user = ref<any>(getStoredUser() || {})
const currentCategory = ref('settings')
const isSidebarOpen = ref(false)
const showChangeAvatar = ref(false)
const loading = ref(false)

const categories = [
  { id: 'research', name: 'profile.categories.research', icon: FlaskConical },
  { id: 'history', name: 'profile.categories.history', icon: History },
  { id: 'settings', name: 'profile.categories.settings', icon: Sliders },
]

const categoryIDs = categories.map((cat) => cat.id)

const resolveProfileCategory = (raw: string) => {
  return categoryIDs.includes(raw) ? raw : 'settings'
}

const buildProfileCategoryPath = (category: string) => {
  return `/profile/${resolveProfileCategory(category)}`
}

const switchCategory = (category: string, closeSidebar = false) => {
  const nextCategory = resolveProfileCategory(String(category || ''))
  currentCategory.value = nextCategory
  if (closeSidebar) {
    isSidebarOpen.value = false
  }
  const targetPath = buildProfileCategoryPath(nextCategory)
  if (route.path !== targetPath) {
    router.push(targetPath)
  }
}

const syncCategoryFromRoute = () => {
  const routeTab = typeof route.params.tab === 'string'
    ? route.params.tab
    : typeof route.query.tab === 'string'
      ? route.query.tab
      : ''
  const nextCategory = resolveProfileCategory(routeTab)
  currentCategory.value = nextCategory
  const canonicalPath = buildProfileCategoryPath(nextCategory)
  if (route.path !== canonicalPath || route.query.tab) {
    router.replace(canonicalPath)
  }
}

watch(() => route.params.tab, () => {
  syncCategoryFromRoute()
}, { immediate: true })

const fetchLatestUserInfo = async () => {
  try {
    const response = await authAPI.getUserInfo()
    const sanitized = sanitizeStoredUser(response.data)
    user.value = sanitized || {}
    if (sanitized) {
      localStorage.setItem('user', JSON.stringify(sanitized))
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

const handleChangeAvatar = async (newAvatar: string) => {
  loading.value = true
  try {
    await authAPI.updateAvatar(newAvatar)
    const updatedUser = sanitizeStoredUser({ ...user.value, avatar: newAvatar }) || {}
    localStorage.setItem('user', JSON.stringify(updatedUser))
    user.value = updatedUser
    showChangeAvatar.value = false
    await showAlert(locale.value === 'zh-CN' ? '头像更新成功。' : 'Avatar updated successfully.', locale.value === 'zh-CN' ? '同步完成' : 'Updated')
  } catch (error: any) {
    showAlert(error.response?.data?.error || (locale.value === 'zh-CN' ? '更新头像失败' : 'Failed to update avatar'), locale.value === 'zh-CN' ? '错误' : 'Error')
  } finally {
    loading.value = false
  }
}

const handleResetLocalPlayer = async () => {
  const confirmed = await showConfirm(t('profile.resetProfileConfirm'), t('profile.resetTitle'))
  if (!confirmed) return

  try {
    await authAPI.resetOfflineProfile()
  } catch (error) {
    console.error('Failed to reset offline profile:', error)
  } finally {
    clearClientAuthState()
    router.replace('/login')
  }
}

onMounted(() => {
  fetchLatestUserInfo()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-[#0a0a0c] text-slate-900 dark:text-white selection:bg-blue-500/30" data-testid="profile-page">
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
      <div class="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 rounded-full blur-[120px]" />
    </div>

    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden" />

    <aside
      :class="[
        'fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-[#0d0d10] border-r border-slate-200 dark:border-white/5 z-[70] transition-transform duration-300 lg:hidden',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <span class="font-black text-xs tracking-[0.2em] text-slate-400">{{ t('profile.title') }}</span>
        <button @click="isSidebarOpen = false" class="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">
          <CloseIcon class="w-4 h-4" />
        </button>
      </div>
      <nav class="p-3 space-y-1">
        <button
          v-for="cat in categories"
          :key="cat.id"
          :data-testid="`profile-nav-${cat.id}`"
          @click="switchCategory(cat.id, true)"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm"
          :class="[
            currentCategory === cat.id
              ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
          ]"
        >
          <component :is="cat.icon" class="w-4 h-4" />
          <span class="text-sm">{{ t(cat.name) }}</span>
        </button>

        <div class="pt-4 mt-4 border-t border-slate-100 dark:border-white/5">
          <button
            @click="handleResetLocalPlayer"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm text-red-500 hover:bg-red-500/10"
          >
            <LogOut class="w-4 h-4" />
            <span>{{ t('profile.resetProfile') }}</span>
          </button>
        </div>
      </nav>
    </aside>

    <div class="max-w-[1400px] mx-auto relative z-10 px-4 pt-6 pb-12 md:px-6">
      <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button @click="router.push('/')" class="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:scale-105 transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div class="lg:hidden">
            <button @click="isSidebarOpen = true" class="flex items-center gap-2 px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500">
              <Menu class="w-3.5 h-3.5" /> {{ t('common.localProfile') }}
            </button>
          </div>
          <div class="hidden md:block">
            <h1 class="text-2xl font-black tracking-tighter uppercase italic text-slate-800 dark:text-white">{{ t('profile.title') }} <span class="text-blue-500 font-mono text-[10px] not-italic ml-2 opacity-50">/ LOCAL_PROFILE</span></h1>
          </div>
        </div>

        <div class="hidden lg:flex items-center gap-1 p-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl backdrop-blur-xl shrink-0 overflow-hidden">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :data-testid="`profile-tab-${cat.id}`"
            @click="switchCategory(cat.id)"
            class="flex flex-col items-center justify-center min-w-[90px] py-2 px-4 rounded-xl transition-all"
            :class="[
              currentCategory === cat.id
                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
            ]"
          >
            <component :is="cat.icon" class="w-3.5 h-3.5" />
            <span class="text-[9px] font-black uppercase tracking-tight mt-0.5">{{ t(cat.name) }}</span>
          </button>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-6 items-start">
        <div class="w-full lg:w-[320px] space-y-5 shrink-0 lg:sticky lg:top-6">
          <ProfileHeader :user="user" @change-avatar="showChangeAvatar = true" />
        </div>

        <div class="flex-1 w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

          <div v-if="currentCategory === 'research'">
            <div class="bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
              <CustomDecks />
            </div>
          </div>

          <div v-if="currentCategory === 'history'" class="space-y-6">
            <div class="bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
              <MatchHistory />
            </div>
          </div>

          <div v-if="currentCategory === 'settings'" class="space-y-6">
            <SettingsPanel :user="user" @update="fetchLatestUserInfo" />
            <div class="bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <button @click="handleResetLocalPlayer" class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-red-500/20">
                <LogOut class="w-4 h-4" />
                {{ t('profile.resetProfile') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ChangeAvatarModal
      :show="showChangeAvatar"
      :current-avatar="user.avatar"
      :loading="loading"
      @close="showChangeAvatar = false"
      @save="handleChangeAvatar"
    />
  </div>
</template>
