<template>
  <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <!-- 背景蒙层 -->
    <div class="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md" @click="$emit('close')" />

    <!-- 自适应模态框内容容器，最大宽度 max-w-2xl -->
    <div class="modal-adaptive animate-in fade-in zoom-in" role="dialog">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  close: []
}>()
</script>
