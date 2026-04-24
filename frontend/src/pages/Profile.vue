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
  void fetchLatestUserInfo()
})
</script>

<template>
  <div class="console-page-shell min-h-screen" data-testid="profile-page">
    <div class="console-grid-overlay" />

    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="fixed inset-0 z-[60] bg-slate-950/45 backdrop-blur-sm lg:hidden" />

    <aside
      :class="[
        'fixed bottom-0 left-0 top-0 z-[70] w-64 border-r border-slate-200/80 bg-white/92 backdrop-blur transition-transform duration-300 dark:border-white/10 dark:bg-[#0c141e]/94 lg:hidden',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="flex items-center justify-between border-b border-slate-200/70 p-5 dark:border-white/10">
        <div>
          <p class="console-eyebrow">Profile</p>
          <p class="text-sm font-black text-slate-900 dark:text-white">{{ t('profile.title') }}</p>
        </div>
        <button @click="isSidebarOpen = false" class="console-button console-button-ghost p-2">
          <CloseIcon class="h-4 w-4" />
        </button>
      </div>
      <nav class="space-y-1 p-3">
        <button
          v-for="cat in categories"
          :key="cat.id"
          :data-testid="`profile-nav-${cat.id}`"
          @click="switchCategory(cat.id, true)"
          :class="[
            'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all',
            currentCategory === cat.id
              ? 'border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.05]'
          ]"
        >
          <component :is="cat.icon" class="h-4 w-4" />
          <span>{{ t(cat.name) }}</span>
        </button>

        <div class="mt-4 border-t border-slate-200/70 pt-4 dark:border-white/10">
          <button
            @click="handleResetLocalPlayer"
            class="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-rose-600 transition-all hover:bg-rose-500/10 dark:text-rose-300"
          >
            <LogOut class="h-4 w-4" />
            <span>{{ t('profile.resetProfile') }}</span>
          </button>
        </div>
      </nav>
    </aside>

    <div class="console-page-container max-w-[1400px]">
      <header class="console-page-header animate-in fade-in slide-in-from-top-2">
        <div class="flex flex-wrap items-center gap-3">
          <button @click="router.push('/')" class="console-button group">
            <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            返回
          </button>
          <button @click="isSidebarOpen = true" class="console-button lg:hidden">
            <Menu class="h-4 w-4" />
            {{ t('common.localProfile') }}
          </button>
          <div>
            <p class="console-eyebrow">Local Profile</p>
            <h1 class="console-page-title">{{ t('profile.title') }}</h1>
          </div>
        </div>

        <div class="console-tab-strip hidden lg:flex">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :data-testid="`profile-tab-${cat.id}`"
            @click="switchCategory(cat.id)"
            :class="['console-tab-button flex items-center gap-2', currentCategory === cat.id && 'console-tab-button--active']"
          >
            <component :is="cat.icon" class="h-4 w-4" />
            <span>{{ t(cat.name) }}</span>
          </button>
        </div>
      </header>

      <div class="flex flex-col items-start gap-5 lg:flex-row">
        <div class="w-full shrink-0 lg:sticky lg:top-6 lg:w-[320px]">
          <div class="animate-in fade-in slide-in-from-bottom-2">
            <ProfileHeader :user="user" @change-avatar="showChangeAvatar = true" />
          </div>
        </div>

        <div class="w-full flex-1 space-y-5 animate-in fade-in slide-in-from-bottom-2 [--enter-duration:380ms]">
          <div v-if="currentCategory === 'research'" class="console-panel">
            <CustomDecks />
          </div>

          <div v-if="currentCategory === 'history'" class="console-panel">
            <MatchHistory />
          </div>

          <div v-if="currentCategory === 'settings'" class="space-y-5">
            <SettingsPanel :user="user" @update="fetchLatestUserInfo" />
            <div class="console-panel">
              <button @click="handleResetLocalPlayer" class="console-button w-full justify-center border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 dark:text-rose-300">
                <LogOut class="h-4 w-4" />
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
