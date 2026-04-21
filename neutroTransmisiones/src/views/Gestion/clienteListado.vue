<script setup>
import { ref, computed, onMounted } from 'vue'
import navbar from '../../components/componentes/navbar.vue'
import { useInterfaz } from '../../stores/interfaz.js'
import { supabase } from '../../lib/supabaseClient.js'
import { useRouter } from 'vue-router'

const router = useRouter()
const interfaz = useInterfaz()
const clientes = ref([])
const busqueda = ref('')

const clientesFiltrados = computed(() => {
  const q = busqueda.value.toLowerCase().trim()
  if (!q) return clientes.value
  return clientes.value.filter(c =>
    (c.nombre + ' ' + c.apellido).toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    (c.telefono || '').includes(q)
  )
})

const obtenerClientes = async () => {
  const { data, error } = await supabase
    .from('cliente')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) {
    console.error('Error al obtener clientes:', error)
    return
  }
  if (data) clientes.value = data
}

const iniciales = (nombre, apellido) => {
  return ((nombre?.[0] || '') + (apellido?.[0] || '')).toUpperCase()
}

const camelCase = (texto) => {
  if (!texto) return ''
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
}

const verCliente = (id) => {
  router.push({ name: 'ver-cliente', params: { id } })
}

onMounted(async () => {
  interfaz.showLoading()
  await obtenerClientes()
  interfaz.hideLoading()
})
</script>

<template>
  <div class="neutro-background min-h-screen">
    <navbar class="navbar" titulo="NeutroTransmisiones" subtitulo="Clientes" search-input="true" v-model="busqueda" />

    <div class="neutro-background min-h-screen pb-24">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 pt-4">

      <!-- Header -->
      <div class="mb-6 hidden sm:block">
        <h1 class="text-2xl font-bold neutro-font">Listado de Clientes</h1>
        <p class="text-sm neutro-font mt-1">{{ clientes.length }} clientes registrados</p>
      </div>
      <!-- Tabla (pantallas grandes) -->
      <div class="hidden md:block neutro-secondary rounded-xl shadow-sm dark:border border-gray-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-700 text-sm">
            <thead class="neutro-primary text-white">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibol uppercase tracking-wider">Cliente</th>
                <th class="px-6 py-3 text-left text-xs font-semibol uppercase tracking-wider">Email</th>
                <th class="px-6 py-3 text-left text-xs font-semibol uppercase tracking-wider">Teléfono</th>
                <th class="px-6 py-3 text-left text-xs font-semibol uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="neutro-secondary divide-y divide-gray-700">
              <tr v-for="cliente in clientesFiltrados" :key="cliente.id" class="hover:opacity-80 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full neutro-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {{ iniciales(cliente.nombre, cliente.apellido) }}
                    </div>
                    <div>
                      <p class="font-semibold text-white">{{ camelCase(cliente.nombre) }} {{ camelCase(cliente.apellido) }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-white">{{ cliente.email || '—' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-white">
                  <span v-if="cliente.telefono">+{{ cliente.codigo_pais || '56' }} {{ cliente.telefono }}</span>
                  <span v-else>—</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-white">
                  <button @click="verCliente(cliente.id)" class="neutro-primary text-white px-2 py-1 rounded-full hover:opacity-80 transition-colors">
                    <svg class="w-6 h-6 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 5 7 7-7 7"/>
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="clientesFiltrados.length === 0" class="p-10 text-center">
          <p class="text-white font-medium">{{ busqueda ? 'No se encontraron resultados' : 'No hay clientes registrados' }}</p>
        </div>
      </div>

      <!-- Cards (pantallas pequeñas) -->
      <div class="md:hidden space-y-3">
        <div
          v-for="cliente in clientesFiltrados"
          :key="cliente.id"
          class="neutro-secondary rounded-xl shadow-sm dark:border border-gray-700 p-4"
          @click="verCliente(cliente.id)"
        >
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-full neutro-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
              {{ iniciales(cliente.nombre, cliente.apellido) }}
            </div>
            <div class="min-w-0">
              <p class="font-bold text-white text-sm truncate">{{ camelCase(cliente.nombre) }} {{ camelCase(cliente.apellido) }}</p>
            </div>
          </div>
          <div class="space-y-1.5 text-sm border-b border-gray-700 pb-2">
            <div class="flex items-center gap-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span class="truncate">{{ cliente.email || '—' }}</span>
            </div>
            <div class="flex items-center gap-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span v-if="cliente.telefono">+{{ cliente.codigo_pais || '56' }} {{ cliente.telefono }}</span>
              <span v-else>—</span>
            </div>
          </div>
          <button @click="verCliente(cliente.id)" class="neutro-primary mt-2 w-full text-white px-2 py-1 rounded-xl hover:opacity-80 transition-colors">
            Ver Cliente
          </button>
        </div>
        <div v-if="clientesFiltrados.length === 0" class="neutro-secondary rounded-xl shadow-sm dark:border border-gray-700 p-10 text-center">
          <p class="text-white font-medium">{{ busqueda ? 'No se encontraron resultados' : 'No hay clientes registrados' }}</p>
        </div>
      </div>

    </div>
  </div>
</div>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
}
</style>