<script setup>
import { useDark } from '@/stores/useDark'
const { isDark, toggleDark } = useDark()
</script>

<template>
  <button @click="toggleDark"
    class="p-2 rounded-lg neutro-primary text-white hover:opacity-80 transition-colors cursor-pointer mt-5">
    <span v-if="isDark">☀️ Claro</span>
    <span v-else>🌙 Oscuro</span>
  </button>
</template>