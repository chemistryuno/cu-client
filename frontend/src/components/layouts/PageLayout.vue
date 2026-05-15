<template>
  <div class="page-shell" :class="customClass">
    <!-- 可选的固定头部 -->
    <header v-if="$slots.header" class="page-fixed border-b border-slate-200 dark:border-white/10">
      <slot name="header" />
    </header>

    <!-- 可滚动的主内容区 -->
    <main class="page-scroll">
      <slot />
    </main>

    <!-- 可选的固定底部 -->
    <footer v-if="$slots.footer" class="page-fixed border-t border-slate-200 dark:border-white/10">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  customClass?: string
}>()
</script>
