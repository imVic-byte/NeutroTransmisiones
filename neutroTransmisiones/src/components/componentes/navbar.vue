<script setup>
import { ref, computed, watch } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore()
const mostrarModal = ref(false)
const notificacionesLista = ref([])

const hasNotifications = computed(() => notificacionesLista.value.filter(n => !n.leido).length > 0)

const handleMostrarNotificaciones = () => {
  mostrarModal.value = !mostrarModal.value
}

defineProps({
    titulo: String,
    subtitulo: String,
    searchInput: String,
    notificaciones: String
})


const emit = defineEmits(['buscar'])

const onInput = (event) => {
  emit('buscar', event.target.value.toUpperCase())
}
</script>
<template>
<nav>
    <header class="navbar header neutro-primary text-white px-5 py-3 pt-13 shadow-lg rounded-b-xl justify-between h-auto">
    <div class="flex-center flex justify-between h-auto">
      <div class="user-info">
      <h2 class="welcome">{{ titulo }}</h2>
      <h1 class="user-name">{{ subtitulo }}</h1>
    </div>
    </div>
    <div v-if="searchInput === 'true'" class="search-container">
      <input type="text" placeholder="Buscar..." class="search-input" @input="onInput">
    </div>
  </header>
</nav>
</template>

<style scoped>
.header {
  border-radius: 0 0 30px 30px;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.user-name {
  font-size: 24px;
  margin: 5px 0;
}

.search-input {
  width: 100%;
  padding: 12px 12px 12px 20px;
  border-radius: 25px;
  border: none;
  background-color: white;
  color: black;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  text-transform: uppercase;
}

.search-icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
}
</style>

