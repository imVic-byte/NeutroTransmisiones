<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useDeudas } from '@/stores/deudas.js';
import { useNotificacionesCitas } from '@/stores/notificacionesCitas.js';
import { useNotifications } from '@/stores/notificaciones.js';

const userStore = useUserStore()
const storeDeudas = useDeudas()
const storeCitas = useNotificacionesCitas()
const storeGlobal = useNotifications()
const router = useRouter()

const mostrarModal = ref(false)

// Aquí combinamos notificaciones de diferentes stores para futuras implementaciones
const todasLasNotificaciones = computed(() => {
  let lista = []
  
  // Notificaciones de Deudas
  if (storeDeudas.Deudas && storeDeudas.Deudas.value) {
    const deudasFormat = storeDeudas.Deudas.value.map(n => ({
      id: `deuda_${n.id}`,
      original_id: n.id,
      tipo: 'deuda',
      titulo: 'Recordatorio de Cobro',
      mensaje: `Cliente: ${n.deudas?.nombre || 'Sin nombre'}`,
      fecha: n.created_at,
      leido: n.leido,
      ruta: { name: 'ver-deuda', params: { id: n.deuda } },
      marcarLeido: () => storeDeudas.markAsReadDeuda(n.id)
    }))
    lista = [...lista, ...deudasFormat]
  }

  // Notificaciones de Citas
  if (storeCitas.Citas && storeCitas.Citas.value) {
    const citasFormat = storeCitas.Citas.value.map(n => ({
      id: `cita_${n.id}`,
      original_id: n.id,
      tipo: 'cita',
      titulo: n.titulo,
      mensaje: n.contenido,
      fecha: n.created_at,
      leido: n.leido,
      ruta: { name: 'agenda' },
      marcarLeido: () => storeCitas.markAsReadCita(n.id)
    }))
    lista = [...lista, ...citasFormat]
  }

  // Notificaciones Globales (Inventario, etc)
  if (storeGlobal.notifications && storeGlobal.notifications.value) {
    const globalFormat = storeGlobal.notifications.value.map(n => ({
      id: `global_${n.id}`,
      original_id: n.id,
      tipo: n.tipo || 'notificacion',
      titulo: n.titulo,
      mensaje: n.contenido,
      fecha: n.created_at,
      leido: n.leido,
      ruta: null, // Si es inventario, no hay ruta definida por ahora
      marcarLeido: () => storeGlobal.markAsRead(n.id)
    }))
    lista = [...lista, ...globalFormat]
  }

  // TODO: Agregar notificaciones de otros stores aquí en el futuro

  // Ordenamos por fecha descendente
  return lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
})

const hasNotifications = computed(() => todasLasNotificaciones.value.some(n => !n.leido))
const unreadCount = computed(() => todasLasNotificaciones.value.filter(n => !n.leido).length)

const handleMostrarNotificaciones = () => {
  mostrarModal.value = !mostrarModal.value
}

const marcarTodoComoLeido = () => {
  storeDeudas.markAllAsReadDeuda()
  storeCitas.markAllAsReadCita()
  storeGlobal.markAllAsRead()
}

const irRutaNotificacion = (notif) => {
  if (!notif.leido) {
    notif.marcarLeido()
  }
  mostrarModal.value = false
  if (notif.ruta) {
    router.push(notif.ruta)
  }
}

// Clic fuera del dropdown para cerrarlo
const notifDropdown = ref(null)
const handleClickOutside = (event) => {
  if (mostrarModal.value && notifDropdown.value && !notifDropdown.value.contains(event.target)) {
    mostrarModal.value = false;
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

const props = defineProps({
    titulo: String,
    subtitulo: String,
    searchInput: String,
    notificaciones: String,
    modelValue: {
      type: String,
      default: ''
    }
})

const emit = defineEmits(['buscar', 'update:modelValue'])

const onInput = (event) => {
  const val = event.target.value
  emit('update:modelValue', val)
  emit('buscar', val.toUpperCase())
}

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '';
  const f = new Date(fechaStr);
  return f.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
}
</script>
<template>
<nav>
  <header class="navbar header neutro-secondary text-white px-5 py-3 shadow-lg rounded-b-xl h-auto">
    <div class="flex justify-between items-center w-full">
      <div class="user-info">
        <h2 class="welcome">{{ titulo }}</h2>
        <h1 class="user-name">{{ subtitulo }}</h1>
      </div>
      
      <!-- Contenedor de iconos a la derecha -->
      <div class="flex items-center gap-4 relative" ref="notifDropdown">
        
        <!-- Campana de notificaciones -->
        <button @click="handleMostrarNotificaciones" class="relative p-2 rounded-full hover:bg-white/10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          <span v-if="unreadCount > 0" class="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
            {{ unreadCount }}
          </span>
        </button>

        <!-- Dropdown de notificaciones -->
        <div v-if="mostrarModal" class="absolute top-full right-0 mt-2 w-80 neutro-secondary text-white rounded-xl shadow-xl overflow-hidden z-50 ">
          <div class="px-4 py-3 border-b border-gray-700 flex justify-between items-center neutro-primary">
            <h3 class="font-bold text-sm">Notificaciones</h3>
            <button v-if="unreadCount > 0" @click="marcarTodoComoLeido" class="text-xs text-blue-200 font-semibold hover:text-blue-800">
              Marcar como leído
            </button>
          </div>
          
          <div class="max-h-80 overflow-y-auto">
            <div v-if="todasLasNotificaciones.length === 0" class="px-4 py-6 text-center text-gray-100 text-sm">
              No hay notificaciones
            </div>
            
            <div v-else class="divide-y divide-gray-70">
              <div v-for="notif in todasLasNotificaciones" :key="notif.id" 
                   class="p-4 transition-colors neutro-secondary text-white cursor-pointer"
                   :class="!notif.leido ? 'bg-blue-50/30' : ''"
                   @click="irRutaNotificacion(notif)">
                <div class="flex justify-between items-start gap-2">
                  <div class="flex-1">
                    <p class="text-xs font-bold" :class="!notif.leido ? 'text-blue-300' : 'text-gray-300'">
                      {{ notif.titulo }}
                    </p>
                    <p class="text-sm mt-1" :class="!notif.leido ? 'font-medium text-gray-100' : 'text-gray-300'">
                      {{ notif.mensaje }}
                    </p>
                    <p class="text-[10px] text-gray-300 mt-2">
                      {{ formatFecha(notif.fecha) }}
                    </p>
                  </div>
                  <button v-if="!notif.leido" @click.stop="notif.marcarLeido()" class="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0 cursor-pointer" title="Marcar como leído">
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="px-4 py-2 neutro-primary bg-gray-50 text-center" v-if="todasLasNotificaciones.length > 0">
            <span class="text-[10px] text-gray-300">
              {{ todasLasNotificaciones.length }} notificaciones
            </span>
          </div>
        </div>

      </div>
    </div>
    
    <div v-if="searchInput === 'true'" class="search-container mt-4">
      <input type="text" placeholder="Buscar..." class="search-input" :value="props.modelValue" @input="onInput">
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

