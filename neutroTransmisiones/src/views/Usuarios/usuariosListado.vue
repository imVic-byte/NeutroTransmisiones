<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import navbar from '@/components/componentes/navbar.vue';
import { useInterfaz } from '@/stores/interfaz.js';
import { supabase } from '@/lib/supabaseClient.js';
import volver from '../../components/componentes/volverPanel.vue'
const router = useRouter();
const interfaz = useInterfaz();
const usuarios = ref([]);
const cargando = ref(true);
const errorMsg = ref('');

// --- Modal de Confirmación ---
const modal = ref({
  mostrar: false,
  titulo: '',
  mensaje: '',
  tipo: 'alerta',
  callback: null
});

const abrirAlerta = (titulo, mensaje) => {
  modal.value = { mostrar: true, titulo, mensaje, tipo: 'alerta', callback: null };
};

const abrirConfirmacion = (titulo, mensaje, callback) => {
  modal.value = { mostrar: true, titulo, mensaje, tipo: 'confirmacion', callback };
};

const cerrarModal = () => {
  modal.value.mostrar = false;
};

const confirmarAccion = async () => {
  if (modal.value.callback) await modal.value.callback();
  cerrarModal();
};

const obtenerUsuarios = async () => {
  try {
    cargando.value = true;
    const { data, error } = await supabase
      .from('usuarios')
      .select('*');

    if (error) throw error;
    usuarios.value = data || [];
  } catch (error) {
    errorMsg.value = error.message;
  } finally {
    cargando.value = false;
  }
};

const nuevoUsuario = () => {
  router.push('/usuarios/crear');
};

const editarUsuario = (id) => {
  router.push(`/usuarios/editar/${id}`);
};

const eliminarUsuario = (id) => {
  abrirConfirmacion('Eliminar Usuario', '¿Estás seguro de que deseas eliminar este usuario completamente del sistema? Esto revocará su acceso y eliminará su perfil de forma permanente.', async () => {
    interfaz.showLoadingOverlay();
    try {
      // Usamos una función RPC (Stored Procedure) para eliminar directamente desde auth.users
      // Al hacer "delete cascade", la tabla public.usuarios también eliminará este registro.
      const { error } = await supabase.rpc('eliminar_usuario_auth', { target_user_id: id });

      if (error) throw error;
      
      usuarios.value = usuarios.value.filter(u => u.id !== id);
    } catch (error) {
      abrirAlerta('Error', 'Error al eliminar usuario: ' + error.message);
    } finally {
      interfaz.hideLoadingOverlay();
    }
  });
};

onMounted(async () => {
  interfaz.showLoading();
  await obtenerUsuarios();
  interfaz.hideLoading();
});
</script>

<template>
  <div class="neutro-background min-h-screen pb-25">
    <navbar class="navbar" titulo="Gestión de Usuarios Autenticados" subtitulo="Administra los perfiles de acceso al sistema." />
    
    <div class="max-w-7xl mx-auto pt-5 px-4 md:px-8">
      <volver />
      <div class="flex justify-between items-center mb-6">
        <div class="hidden sm:block">
          <h1 class="text-2xl font-bold neutro-font">Usuarios Autenticados</h1>
          <p class="text-sm neutro-font mt-1">Perfiles con acceso al sistema.</p>
        </div>
        <div class="flex gap-2">
          <button 
            @click="obtenerUsuarios" 
            class="px-4 cursor-pointer py-2 neutro-primary text-white rounded-lg text-sm font-medium hover:opacity-80 shadow-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          <button @click="nuevoUsuario" class="px-4 neutro-primary cursor-pointer py-2 text-white rounded-lg text-sm font-medium hover:opacity-80 shadow-sm transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="rounded-xl shadow-sm overflow-hidden">
        <div v-if="cargando" class="p-8 text-center text-white">
          Cargando usuarios...
        </div>

        <div v-else-if="errorMsg" class="p-8 text-center text-red-600 bg-red-50 rounded-xl">
          {{ errorMsg }}
        </div>

        <div v-else>
          <!-- Mobile: Cards -->
          <div class="md:hidden space-y-3">
            <div v-if="usuarios.length === 0" class="neutro-secondary rounded-xl p-8 text-center">
              <p class="text-white/60 font-semibold">No hay usuarios registrados</p>
              <button @click="nuevoUsuario" class="mt-4 neutro-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition-colors">
                Registrar Usuario
              </button>
            </div>

            <div 
              v-for="usuario in usuarios" 
              :key="usuario.id" 
              class="neutro-secondary rounded-xl shadow-sm p-4 space-y-3"
            >
              <div class="flex items-center gap-3">
                <div class="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {{ usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?' }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-bold text-white truncate">{{ usuario.nombre }} {{ usuario.apellido }}</div>
                  <div class="text-xs text-white/70">RUT: {{ usuario.rut || 'No registrado' }}</div>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {{ usuario.especialidad || 'Sin especialidad' }}
                  </span>
                </div>
              </div>

              <div class="border-t border-gray-700 pt-2 space-y-1">
                <div class="flex items-center gap-2 text-xs text-white/70">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span>{{ usuario.telefono || 'Sin teléfono' }}</span>
                </div>
              </div>

              <div class="flex gap-2 pt-1">
                <button 
                  @click="editarUsuario(usuario.id)"
                  class="flex-1 text-xs font-semibold text-white neutro-primary px-3 py-2 rounded-lg text-center cursor-pointer hover:opacity-80 transition-colors"
                >
                  Editar
                </button>
                <button 
                  @click="eliminarUsuario(usuario.id)"
                  class="flex-1 text-xs font-semibold px-3 py-2 rounded-lg text-center cursor-pointer transition-colors bg-red-500/20 text-red-300 hover:bg-red-500/30"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          <!-- Desktop: Table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-700">
              <thead class="neutro-primary text-white">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">Usuario</th>
                  <th scope="col" class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">Contacto</th>
                  <th scope="col" class="px-6 py-3 text-left text-sm font-medium uppercase tracking-wider">Especialidad</th>
                  <th scope="col" class="px-6 py-3 text-center text-sm font-medium uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="neutro-secondary divide-y divide-gray-700">
                <tr v-if="usuarios.length === 0">
                  <td colspan="4" class="px-6 py-12 text-center text-white/60">
                    No hay usuarios registrados
                  </td>
                </tr>
                <tr v-for="usuario in usuarios" :key="usuario.id" class="hover:opacity-80 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center text-white">
                      <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {{ usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?' }}
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-white">{{ usuario.nombre }} {{ usuario.apellido }}</div>
                        <div class="text-sm text-white/70">RUT: {{ usuario.rut || 'No registrado' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white/70">{{ usuario.telefono || 'Sin teléfono' }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {{ usuario.especialidad || 'Sin especialidad' }}
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div class="flex justify-center items-center gap-2">
                      <button 
                        @click="editarUsuario(usuario.id)"
                        class="neutro-primary cursor-pointer hover:opacity-80 font-semibold text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        @click="eliminarUsuario(usuario.id)"
                        class="cursor-pointer font-semibold px-3 py-1.5 rounded-lg transition-colors bg-red-500/20 text-red-300 hover:bg-red-500/30"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Genérico para Alertas y Confirmaciones -->
    <Teleport to="body">
      <div v-if="modal.mostrar" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cerrarModal"></div>
        <div class="relative neutro-secondary rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
          <div class="p-6 text-center">
            <div class="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4" :class="modal.tipo === 'confirmacion' ? 'bg-red-100' : 'bg-blue-100'">
              <svg v-if="modal.tipo === 'confirmacion'" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-white mb-2">{{ modal.titulo }}</h3>
            <p class="text-sm text-white/80 leading-relaxed">{{ modal.mensaje }}</p>
          </div>
          <div class="p-4 flex gap-3 border-t border-gray-700">
            <button v-if="modal.tipo === 'confirmacion'" @click="cerrarModal" class="flex-1 py-2.5 rounded-xl font-semibold text-sm neutro-primary text-white hover:opacity-80 transition cursor-pointer">Cancelar</button>
            <button @click="confirmarAccion" class="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition cursor-pointer" :class="modal.tipo === 'confirmacion' ? 'bg-red-600 hover:bg-red-700' : 'neutro-primary hover:opacity-80'">
              {{ modal.tipo === 'confirmacion' ? 'Confirmar' : 'Entendido' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 40;
}
</style>
