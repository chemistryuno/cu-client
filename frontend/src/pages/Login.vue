<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Beaker, Globe, Loader2, PencilLine } from 'lucide-vue-next'
import { authAPI } from '../utils/api'
import { completeAuthSuccess } from '../utils/authSession'
import UserAvatar from '../components/UserAvatar.vue'
import { AVATAR_PRESETS } from '../utils/avatarPresets'
import { useI18n } from '../utils/i18n'
import { cn } from '../utils/cn'
import { consoleButton, consolePanel } from '../utils/ui'

const router = useRouter()
const { locale, t, td, setLocale } = useI18n()

const nickname = ref('')
const avatar = ref('flask')
const loading = ref(false)
const error = ref('')

const avatarOptions = computed(() => Object.keys(AVATAR_PRESETS))
const nicknameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/

const handleSubmit = async () => {
  const trimmedNickname = nickname.value.trim()
  error.value = ''

  if (!trimmedNickname) {
    error.value = td('login.errors.empty')
    return
  }

  if (trimmedNickname.length > 20) {
    error.value = td('login.errors.tooLong')
    return
  }

  if (!nicknameRegex.test(trimmedNickname)) {
    error.value = td('login.errors.invalid')
    return
  }

  loading.value = true
  try {
    const response = await authAPI.initializeOfflineProfile({
      nickname: trimmedNickname,
      avatar: avatar.value,
    })

    await completeAuthSuccess({
      user: response.data.user,
      router,
      redirect: router.currentRoute.value.query.redirect,
      replace: true,
    })
  } catch (err: any) {
    error.value = err.response?.data?.error || td('login.errors.failed')
  } finally {
    loading.value = false
  }
}

const randomizeNickname = () => {
  if (locale.value === 'zh-CN') {
    const prefixes = ['元素', '量子', '轨道', '催化', '离子', '星焰', '裂变', '晶格', '燃素', '极光', '反应', '分子']
    const suffixes = ['旅人', '术士', '猎手', '行者', '学徒', '骑士', '使者', '工匠', '指挥官', '观察者', '调和者', '先驱']
    const extra = ['甲', '乙', '零', 'X', 'Z', 'Nova', 'Prime']
    const useExtra = Math.random() > 0.55
    nickname.value = `${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffixes[Math.floor(Math.random() * suffixes.length)]}${useExtra ? extra[Math.floor(Math.random() * extra.length)] : ''}${Math.floor(Math.random() * 90 + 10)}`
    return
  }

  const prefixes = ['Element', 'Quantum', 'Orbital', 'Catalyst', 'Ion', 'Photon', 'Nebula', 'Plasma', 'Nova', 'Rune', 'Echo', 'Fusion']
  const suffixes = ['Walker', 'Crafter', 'Hunter', 'Voyager', 'Knight', 'Weaver', 'Pilot', 'Striker', 'Sage', 'Smith', 'Spark', 'Rider']
  const extras = ['X', 'Prime', 'Nova', 'Zero', 'Core', 'Flux']
  const connector = Math.random() > 0.6 ? '_' : ''
  const useExtra = Math.random() > 0.5
  nickname.value = `${prefixes[Math.floor(Math.random() * prefixes.length)]}${connector}${suffixes[Math.floor(Math.random() * suffixes.length)]}${useExtra ? extras[Math.floor(Math.random() * extras.length)] : ''}${Math.floor(Math.random() * 90 + 10)}`
}

const previewUser = computed(() => ({
  nickname: nickname.value.trim() || td('common.localPlayer'),
  avatar: avatar.value,
}))
</script>

<template>
  <div class="console-app-shell flex items-center justify-center p-4 relative overflow-hidden">
    <div class="console-grid-overlay"></div>
    <div class="absolute top-[-12%] right-[-8%] w-[36%] h-[36%] bg-sky-500/10 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-[-12%] left-[-8%] w-[34%] h-[34%] bg-orange-500/8 rounded-full blur-[120px]"></div>

    <div class="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
      <div :class="cn(consolePanel({ tone: 'base', radius: 'xl', padding: 'none' }), 'overflow-hidden')">
        <div class="px-5 pt-5 sm:px-6 sm:pt-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="console-notice-chip"><BilingualText zh="本地玩家设置" en="Local Player Setup" /></p>
              <h1 class="console-section-title text-2xl mt-2">
                Chemistry UNO / 化学 UNO
              </h1>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium tracking-[0.08em] uppercase">
                {{ td('login.setup') }}
              </p>
            </div>

            <div class="w-11 h-11 rounded-2xl bg-sky-700 text-white flex items-center justify-center shadow-lg shadow-sky-900/15">
              <Beaker class="w-5 h-5" />
            </div>
          </div>
        </div>

        <div class="px-5 sm:px-6 pt-4 pb-6">
          <div class="flex items-center justify-end mb-4">
            <div class="inline-flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0f1720] p-1">
              <button
                type="button"
                @click="setLocale('zh-CN')"
                :class="cn(
                  consoleButton({ tone: locale === 'zh-CN' ? 'primary' : 'ghost', size: 'sm' }),
                  'px-3 min-h-8 tracking-[0.12em]'
                )"
              >
                <Globe class="w-3.5 h-3.5" />
                <BilingualText zh="中文" en="Chinese" />
              </button>
              <button
                type="button"
                @click="setLocale('en-US')"
                :class="cn(
                  consoleButton({ tone: locale === 'en-US' ? 'primary' : 'ghost', size: 'sm' }),
                  'px-3 min-h-8 tracking-[0.12em]'
                )"
              >
                <BilingualText zh="English" en="英文" />
              </button>
            </div>
          </div>

          <div :class="cn(consolePanel({ tone: 'inset', radius: 'lg', padding: 'sm' }), 'mb-4 flex items-center gap-4 border-sky-500/10')">
            <div class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#0b1420] border border-slate-200 dark:border-white/10 flex items-center justify-center text-2xl overflow-hidden">
              <UserAvatar :avatar="previewUser.avatar" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.18em] mb-1">{{ td('login.preview') }}</p>
              <p class="text-lg font-black text-slate-900 dark:text-white truncate">{{ previewUser.nickname }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ td('login.previewDesc') }}</p>
            </div>
          </div>

          <div v-if="error" class="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-500 px-3 py-2 rounded-xl mb-4 text-center text-xs font-bold">
            {{ error }}
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-4" data-testid="login-form">
            <div class="space-y-2">
              <div class="flex items-center justify-between px-1">
                <label class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ td('login.nickname') }}</label>
                <button
                  type="button"
                  data-testid="login-randomize-button"
                  @click="randomizeNickname"
                  class="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest"
                >
                  {{ td('login.random') }}
                </button>
              </div>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-700 dark:group-focus-within:text-sky-400 transition-colors">
                  <PencilLine class="w-4 h-4" />
                </div>
                <input
                  v-model="nickname"
                  data-testid="login-nickname-input"
                  type="text"
                  maxlength="20"
                  required
                  class="w-full bg-slate-50 dark:bg-[#0b1420] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 pl-10 pr-3 py-3 rounded-2xl focus:ring-2 focus:ring-sky-700/20 focus:border-sky-700 dark:focus:border-sky-400 outline-none transition-all placeholder:text-slate-500/50 text-sm font-bold"
                  :placeholder="td('login.nicknamePlaceholder')"
                />
              </div>
            </div>

            <div class="space-y-3">
              <div class="px-1">
                <label class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ td('login.avatar') }}</label>
              </div>
              <div class="grid grid-cols-4 sm:grid-cols-6 gap-3">
                <button
                  v-for="item in avatarOptions"
                  :key="item"
                  :data-testid="`avatar-option-${item}`"
                  type="button"
                  @click="avatar = item"
                  :class="cn(
                    'h-14 rounded-2xl border transition-all flex items-center justify-center',
                    avatar === item
                      ? 'border-sky-700 dark:border-sky-400 bg-sky-700/10 text-sky-700 dark:text-sky-400 shadow-[0_0_0_1px_rgba(3,105,161,0.18)]'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f1720] text-slate-500 dark:text-slate-400 hover:border-sky-300 dark:hover:border-sky-500/40'
                  )"
                >
                  <div class="w-8 h-8 flex items-center justify-center text-lg overflow-hidden">
                    <UserAvatar :avatar="item" />
                  </div>
                </button>
              </div>
            </div>

            <div :class="cn(consolePanel({ tone: 'soft', radius: 'lg', padding: 'sm' }), 'text-xs text-slate-500 dark:text-slate-400 leading-relaxed')">
              {{ td('login.intro') }}
            </div>

            <button
              type="submit"
              data-testid="login-submit-button"
              :disabled="loading"
              :class="cn(consoleButton({ tone: 'primary', size: 'md', block: true }), 'text-sm rounded-2xl')"
            >
              <template v-if="loading">
                <Loader2 class="w-4 h-4 animate-spin" />
                {{ td('login.submitting') }}
              </template>
              <template v-else>
                {{ td('login.submit') }}
              </template>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
