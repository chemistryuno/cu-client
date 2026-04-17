<script setup lang="ts">
import { ref, watch } from 'vue'
import { User, Info, Calendar } from 'lucide-vue-next'
import { useDialog } from '../../utils/dialog'
import { authAPI } from '../../utils/api'

const props = defineProps<{
  user: any
}>()

const emit = defineEmits<{
  (e: 'update'): void
}>()

const { showAlert } = useDialog()
const loading = ref(false)

const form = ref({
  nickname: props.user.nickname || '',
  bio: props.user.bio || '',
  custom_contact: props.user.custom_contact || '',
  birthday: props.user.birthday ? new Date(props.user.birthday).toISOString().split('T')[0] : ''
})

watch(() => props.user, (newUser) => {
  form.value = {
    nickname: newUser.nickname || '',
    bio: newUser.bio || '',
    custom_contact: newUser.custom_contact || '',
    birthday: newUser.birthday ? new Date(newUser.birthday).toISOString().split('T')[0] : ''
  }
}, { deep: true, immediate: true })

const handleSave = async () => {
  if (!form.value.nickname.trim()) {
    showAlert('昵称不能为空', '校验失败')
    return
  }

  loading.value = true
  try {
    const submitData: Record<string, any> = {
      nickname: form.value.nickname.trim(),
      bio: form.value.bio,
      custom_contact: form.value.custom_contact,
      birthday: form.value.birthday ? new Date(form.value.birthday).toISOString() : null,
    }
    await authAPI.updateProfile(submitData)
    showAlert('本地玩家资料已更新。', '变更成功')
    emit('update')
  } catch (error: any) {
    showAlert(error.response?.data?.error || '更新失败', '错误')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
    <h3 class="text-base font-black uppercase tracking-widest mb-6 flex items-center gap-2.5 text-slate-800 dark:text-white">
      <User class="w-4 h-4 text-blue-500" />
      本地玩家资料 <span class="text-[10px] font-mono opacity-30">/ LOCAL_PROFILE</span>
    </h3>

    <div class="space-y-5">
      <div class="space-y-2">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">昵称 / Nickname</label>
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <User class="h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            v-model="form.nickname"
            type="text"
            placeholder="你的本地玩家昵称"
            class="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">自我介绍 / Bio</label>
        <textarea
          v-model="form.bio"
          rows="3"
          placeholder="介绍一下你自己..."
          class="block w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
        ></textarea>
      </div>

      <div class="space-y-2">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">本地备注 / Note</label>
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Info class="h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
          </div>
          <input
            v-model="form.custom_contact"
            type="text"
            placeholder="记录你想保存在本地的说明"
            class="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl text-sm transition-all focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
          />
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">生日 / Birthday</label>
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Calendar class="h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
          </div>
          <input
            v-model="form.birthday"
            type="date"
            class="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl text-sm transition-all focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none"
          />
        </div>
      </div>

      <div class="pt-2">
        <button
          @click="handleSave"
          :disabled="loading"
          class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
        >
          <span v-if="loading">同步中...</span>
          <span v-else>保存本地资料</span>
        </button>
      </div>
    </div>
  </div>
</template>
