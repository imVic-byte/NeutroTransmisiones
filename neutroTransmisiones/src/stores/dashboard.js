import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDashboardStore = defineStore('dashboard', () => {
  const activeTab = ref('simple')

  const setTab = (tab) => {
    activeTab.value = tab
  }

  return { activeTab, setTab }
})
