<template>
  <span v-html="content"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../utils/i18n'

const props = defineProps({
  path: { type: String, required: false },
  zh: { type: String, required: false },
  en: { type: String, required: false },
  separator: { type: String, required: false, default: ' / ' },
  html: { type: Boolean, required: false, default: false },
})

const { td } = useI18n()

const content = computed(() => {
  if (props.path) {
    return td(props.path, props.separator)
  }
  const zhText = props.zh || ''
  const enText = props.en || ''
  if (!zhText && !enText) return ''
  if (!zhText) return enText
  if (!enText) return zhText
  return `${zhText}${props.separator}${enText}`
})
</script>
