<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Beaker, Globe, Loader2, PencilLine } from 'lucide-vue-next'
import { authAPI } from '../utils/api'
import { completeAuthSuccess } from '../utils/authSession'
import UserAvatar from '../components/UserAvatar.vue'
import { AVATAR_PRESETS } from '../utils/avatarPresets'
import { useI18n } from '../utils/i18n'

const router = useRouter()
const { locale, t, setLocale } = useI18n()

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
    error.value = t('login.errors.empty')
    return
  }

  if (trimmedNickname.length > 20) {
    error.value = t('login.errors.tooLong')
    return
  }

  if (!nicknameRegex.test(trimmedNickname)) {
    error.value = t('login.errors.invalid')
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
    error.value = err.response?.data?.error || t('login.errors.failed')
  } finally {
    loading.value = false
  }
}

const randomizeNickname = () => {
  if (locale.value === 'zh-CN') {
    const prefixes = ['元素', '量子', '轨道', '催化', '离子', '星焰', '裂变', '晶格', '燃素', '极光', '反应', '分子']
    const suffixes = ['旅人', '术士', '猎手', '行者', '学徒', '骑士', '使者', '工匠', '指挥官', '观测者', '调和者', '先驱']
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
  nickname: nickname.value.trim() || t('common.localPlayer'),
  avatar: avatar.value,
}))
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#1a1a1e] relative overflow-hidden font-sans">
    <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]"></div>

    <div class="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
      <div class="glass-panel-light rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden">
        <div class="p-5 sm:p-6 md:p-7">
          <div class="flex items-center justify-end mb-3">
            <div class="inline-flex items-center gap-1 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/20 p-1">
              <button
                type="button"
                @click="setLocale('zh-CN')"
                :class="[
                  'px-3 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5',
                  locale === 'zh-CN' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400'
                ]"
              >
                <Globe class="w-3.5 h-3.5" />
                {{ t('common.zh') }}
              </button>
              <button
                type="button"
                @click="setLocale('en-US')"
                :class="[
                  'px-3 py-1.5 rounded-xl text-[11px] font-black transition-all',
                  locale === 'en-US' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400'
                ]"
              >
                {{ t('common.en') }}
              </button>
            </div>
          </div>

          <div class="flex flex-col items-center mb-5">
            <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <Beaker class="w-6 h-6 text-white" />
            </div>
            <h1 class="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
              Chemistry <span class="text-blue-600">UNO</span>
            </h1>
            <p class="text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-[0.2em] mt-1 font-mono">{{ t('login.setup') }}</p>
          </div>

          <div class="mb-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-black/20 p-4 flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-2xl overflow-hidden">
              <UserAvatar :avatar="previewUser.avatar" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{{ t('login.preview') }}</p>
              <p class="text-lg font-black text-slate-900 dark:text-white truncate">{{ previewUser.nickname }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('login.previewDesc') }}</p>
            </div>
          </div>

          <div v-if="error" class="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-500 px-3 py-2 rounded-xl mb-4 text-center text-xs font-bold">
            {{ error }}
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-5" data-testid="login-form">
            <div class="space-y-2">
              <div class="flex items-center justify-between px-1">
                <label class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ t('login.nickname') }}</label>
                <button
                  type="button"
                  data-testid="login-randomize-button"
                  @click="randomizeNickname"
                  class="text-[10px] font-black text-blue-500 hover:text-blue-600 uppercase tracking-widest"
                >
                  {{ t('login.random') }}
                </button>
              </div>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <PencilLine class="w-4 h-4" />
                </div>
                <input
                  v-model="nickname"
                  data-testid="login-nickname-input"
                  type="text"
                  maxlength="20"
                  required
                  class="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 pl-10 pr-3 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500/50 text-sm font-bold"
                  :placeholder="t('login.nicknamePlaceholder')"
                />
              </div>
            </div>

            <div class="space-y-3">
              <div class="px-1">
                <label class="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{{ t('login.avatar') }}</label>
              </div>
              <div class="grid grid-cols-4 sm:grid-cols-6 gap-3">
                <button
                  v-for="item in avatarOptions"
                  :key="item"
                  :data-testid="`avatar-option-${item}`"
                  type="button"
                  @click="avatar = item"
                  :class="[
                    'h-14 rounded-2xl border transition-all flex items-center justify-center bg-slate-50 dark:bg-white/5',
                    avatar === item
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]'
                      : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-500/40'
                  ]"
                >
                  <div class="w-8 h-8 flex items-center justify-center text-lg overflow-hidden">
                    <UserAvatar :avatar="item" />
                  </div>
                </button>
              </div>
            </div>

            <div class="rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {{ t('login.intro') }}
            </div>

            <button
              type="submit"
              data-testid="login-submit-button"
              :disabled="loading"
              class="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-2xl font-black transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-sm"
            >
              <template v-if="loading">
                <Loader2 class="w-4 h-4 animate-spin" />
                {{ t('login.submitting') }}
              </template>
              <template v-else>
                {{ t('login.submit') }}
              </template>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
