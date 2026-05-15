<template>
  <div class="page-grid" :style="{ gridTemplateColumns: columns, gridTemplateRows: rows }">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  columns?: string
  rows?: string
}>()
</script>
