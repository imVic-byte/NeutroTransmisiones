<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import navbar from '@/components/componentes/navbar.vue';
import { useInterfaz } from '@/stores/interfaz.js';
import { supabase } from '@/lib/supabaseClient.js';
import { useUserStore } from '@/stores/user.js';
import volver from '../../components/componentes/volver.vue'
const router = useRouter();
const interfaz = useInterfaz();
const userStore = useUserStore();

const formulario = reactive({
  nuevaPassword: '',
  confirmarPassword: ''
});

const errores = reactive({
  nuevaPassword: '',
  confirmarPassword: ''
});

// --- Modal State ---
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

const cerrarModal = () => {
  modal.value.mostrar = false;
  if (modal.value.callback) modal.value.callback();
};

const validarFormulario = () => {
  let valido = true;
  Object.keys(errores).forEach(k => errores[k] = '');

  if (!formulario.nuevaPassword) {
    errores.nuevaPassword = 'La contraseña es obligatoria.';
    valido = false;
  } else if (formulario.nuevaPassword.length < 6) {
    errores.nuevaPassword = 'La contraseña debe tener al menos 6 caracteres.';
    valido = false;
  }

  if (formulario.nuevaPassword !== formulario.confirmarPassword) {
    errores.confirmarPassword = 'Las contraseñas no coinciden.';
    valido = false;
  }

  return valido;
};

const actualizarPassword = async () => {
  if (!validarFormulario()) return;

  interfaz.showLoadingOverlay();

  try {
    const { error } = await supabase.auth.updateUser({
      password: formulario.nuevaPassword
    });

    if (error) throw error;

    modal.value.callback = () => {
      formulario.nuevaPassword = '';
      formulario.confirmarPassword = '';
    };
    abrirAlerta('Éxito', 'Tu contraseña ha sido actualizada correctamente.');

  } catch (error) {
    abrirAlerta('Error', 'No se pudo actualizar la contraseña: ' + error.message);
  } finally {
    interfaz.hideLoadingOverlay();
  }
};
</script>

<template>
  <div class="neutro-background min-h-screen pb-25">
    <navbar class="navbar" titulo="Mi Perfil" subtitulo="Configura tu cuenta de acceso." />
    
    <div class="max-w-2xl mx-auto pt-5 px-4 md:px-8">
      <volver />
      <div class="flex items-center gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold neutro-font">Mi Perfil</h1>
          <p class="text-sm neutro-font mt-1">Configuración de seguridad personal.</p>
        </div>
      </div>

      <div class="neutro-secondary rounded-2xl shadow-sm p-6 space-y-6">
        <div class="border-b border-gray-700 pb-4">
          <h2 class="text-lg font-bold text-white mb-1">Cambiar Contraseña</h2>
          <p class="text-sm text-white/60">Actualiza tu contraseña de acceso al sistema para mayor seguridad.</p>
        </div>

        <div class="space-y-4">
          <!-- Nueva Contraseña -->
          <div>
            <label class="block text-xs font-bold text-white uppercase tracking-wider mb-2">Nueva Contraseña</label>
            <input 
              v-model="formulario.nuevaPassword" 
              type="password" 
              class="w-full neutro-primary text-white rounded-xl border border-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Escribe tu nueva contraseña"
              @input="errores.nuevaPassword = ''"
            />
            <p v-if="errores.nuevaPassword" class="text-red-400 text-xs mt-1 font-medium">{{ errores.nuevaPassword }}</p>
          </div>

          <!-- Confirmar Contraseña -->
          <div>
            <label class="block text-xs font-bold text-white uppercase tracking-wider mb-2">Confirmar Contraseña</label>
            <input 
              v-model="formulario.confirmarPassword" 
              type="password" 
              class="w-full neutro-primary text-white rounded-xl border border-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Vuelve a escribir la contraseña"
              @input="errores.confirmarPassword = ''"
            />
            <p v-if="errores.confirmarPassword" class="text-red-400 text-xs mt-1 font-medium">{{ errores.confirmarPassword }}</p>
          </div>
        </div>

        <div class="flex justify-end pt-4 border-t border-gray-700">
          <button 
            @click="actualizarPassword"
            class="px-6 py-3 neutro-primary text-white rounded-xl text-sm font-bold hover:opacity-80 shadow-md transition-all cursor-pointer w-full md:w-auto"
          >
            Actualizar Contraseña
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Genérico -->
    <Teleport to="body">
      <div v-if="modal.mostrar" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cerrarModal"></div>
        <div class="relative neutro-secondary rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
          <div class="p-6 text-center">
            <div class="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-blue-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-white mb-2">{{ modal.titulo }}</h3>
            <p class="text-sm text-white/80 leading-relaxed">{{ modal.mensaje }}</p>
          </div>
          <div class="p-4 flex gap-3 border-t border-gray-700">
            <button @click="cerrarModal" class="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition cursor-pointer neutro-primary hover:opacity-80">
              Entendido
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
