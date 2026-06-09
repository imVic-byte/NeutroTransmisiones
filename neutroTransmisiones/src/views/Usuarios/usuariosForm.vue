<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import navbar from '@/components/componentes/navbar.vue';
import { useInterfaz } from '@/stores/interfaz.js';
import { supabase } from '@/lib/supabaseClient.js';
import { formatearRut } from '@/js/validarRut.js';
import { createClient } from '@supabase/supabase-js';
import volver from '@/components/componentes/volver.vue'
const router = useRouter();
const route = useRoute();
const interfaz = useInterfaz();

const isEditing = ref(false);
const usuarioId = ref(null);

const formulario = reactive({
  nombre: '',
  apellido: '',
  rut: '',
  telefono: '',
  especialidad: '',
  email: '', // Solo creación
  password: 'Usuario123!' // Contraseña por defecto
});

const errores = reactive({
  nombre: '',
  apellido: '',
  rut: '',
  telefono: '',
  email: ''
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
};

// --- Helpers ---
const toCamelCase = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/gi, '')
    .trim()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const onRutInput = () => {
  formulario.rut = formatearRut(formulario.rut);
  errores.rut = '';
};

const filtrarTelefono = (event) => {
  const valorLimpio = event.target.value.replace(/\D/g, '').slice(0, 9);
  formulario.telefono = valorLimpio;
  errores.telefono = '';
};

const validarFormulario = () => {
  let valido = true;
  Object.keys(errores).forEach(k => errores[k] = '');

  if (!formulario.nombre.trim()) {
    errores.nombre = 'El nombre es obligatorio.';
    valido = false;
  }
  if (!formulario.apellido.trim()) {
    errores.apellido = 'El apellido es obligatorio.';
    valido = false;
  }
  const rutLimpio = formulario.rut.replace(/[.\-]/g, '');
  if (!rutLimpio) {
    errores.rut = 'El RUT es obligatorio.';
    valido = false;
  } 
  if (!isEditing.value && !formulario.email.trim()) {
    errores.email = 'El email de acceso es obligatorio.';
    valido = false;
  }
  return valido;
};

const cargarUsuario = async (id) => {
  interfaz.showLoadingOverlay();
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (data) {
      formulario.nombre = data.nombre || '';
      formulario.apellido = data.apellido || '';
      formulario.rut = data.rut || '';
      formulario.telefono = data.telefono || '';
      formulario.especialidad = data.especialidad || '';
    }
  } catch (err) {
    abrirAlerta('Error', 'No se pudo cargar la información del usuario.');
  } finally {
    interfaz.hideLoadingOverlay();
  }
};

const guardarUsuario = async () => {
  if (!validarFormulario()) return;

  interfaz.showLoadingOverlay();

  try {
    let authUserId = null;

    if (!isEditing.value) {
      // 1. Crear usuario en Auth usando un cliente temporal para no afectar la sesión actual
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          }
        }
      );

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formulario.email,
        password: formulario.password,
      });

      if (authError) throw new Error('Error al crear cuenta: ' + authError.message);
      if (!authData.user) throw new Error('No se pudo crear la cuenta (posiblemente el email ya existe).');

      authUserId = authData.user.id;
    } else {
      authUserId = usuarioId.value;
    }

    // 2. Actualizar en public.usuarios
    // Como existe un trigger (al_crear_usuario) que inserta automáticamente el ID, 
    // siempre debemos hacer un update, incluso en creación.
    const payload = {
      nombre: toCamelCase(formulario.nombre),
      apellido: toCamelCase(formulario.apellido),
      rut: formatearRut(formulario.rut),
      telefono: formulario.telefono,
      especialidad: formulario.especialidad
    };

    const { error: dbError } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', authUserId);

    if (dbError) throw dbError;

    abrirAlerta('Éxito', isEditing.value ? 'Usuario actualizado exitosamente.' : 'Usuario registrado exitosamente.');
    setTimeout(() => {
      router.push('/usuarios');
    }, 1500);

  } catch (error) {
    abrirAlerta('Error al guardar', error.message);
  } finally {
    interfaz.hideLoadingOverlay();
  }
};

onMounted(() => {
  const id = route.params.id;
  if (id) {
    isEditing.value = true;
    usuarioId.value = id;
    cargarUsuario(id);
  }
});
</script>

<template>
  <div class="neutro-background min-h-screen pb-25">
    <navbar class="navbar" titulo="Gestión de Usuarios" subtitulo="Añadir o editar usuarios del sistema." />
    
    <div class="max-w-3xl mx-auto pt-5 px-4 md:px-8">
        <volver />
      <div class="flex items-center gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold neutro-font">{{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}</h1>
          <p class="text-sm neutro-font mt-1">Completa los datos solicitados.</p>
        </div>
      </div>

      <div class="neutro-secondary rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Nombre -->
          <div>
            <label class="block text-xs font-bold text-white uppercase tracking-wider mb-2">Nombre</label>
            <input 
              v-model="formulario.nombre" 
              type="text" 
              class="w-full neutro-primary text-white rounded-xl border border-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Ej. Juan"
              @input="errores.nombre = ''"
            />
            <p v-if="errores.nombre" class="text-red-400 text-xs mt-1 font-medium">{{ errores.nombre }}</p>
          </div>

          <!-- Apellido -->
          <div>
            <label class="block text-xs font-bold text-white uppercase tracking-wider mb-2">Apellido</label>
            <input 
              v-model="formulario.apellido" 
              type="text" 
              class="w-full neutro-primary text-white rounded-xl border border-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Ej. Pérez"
              @input="errores.apellido = ''"
            />
            <p v-if="errores.apellido" class="text-red-400 text-xs mt-1 font-medium">{{ errores.apellido }}</p>
          </div>

          <!-- RUT -->
          <div>
            <label class="block text-xs font-bold text-white uppercase tracking-wider mb-2">RUT</label>
            <input 
              v-model="formulario.rut" 
              type="text" 
              @input="onRutInput"
              class="w-full neutro-primary text-white rounded-xl border border-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="12.345.678-9"
            />
            <p v-if="errores.rut" class="text-red-400 text-xs mt-1 font-medium">{{ errores.rut }}</p>
          </div>

          <!-- Teléfono -->
          <div>
            <label class="block text-xs font-bold text-white uppercase tracking-wider mb-2">Teléfono</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold">+56</span>
              <input 
                v-model="formulario.telefono" 
                type="text" 
                @input="filtrarTelefono"
                class="w-full neutro-primary text-white rounded-xl border border-gray-100 pl-14 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="9 1234 5678"
              />
            </div>
            <p v-if="errores.telefono" class="text-red-400 text-xs mt-1 font-medium">{{ errores.telefono }}</p>
          </div>

          <!-- Especialidad -->
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-white uppercase tracking-wider mb-2">Especialidad</label>
            <input 
              v-model="formulario.especialidad" 
              type="text" 
              class="w-full neutro-primary text-white rounded-xl border border-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Ej. Transmisiones, Electromecánica..."
            />
          </div>

          <div v-if="!isEditing" class="md:col-span-2 border-t border-gray-700 pt-6 mt-2">
            <h3 class="text-lg font-bold text-white mb-4">Credenciales de Acceso</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Email (Solo en creación) -->
              <div>
                <label class="block text-xs font-bold text-white uppercase tracking-wider mb-2">Email de Acceso</label>
                <input 
                  v-model="formulario.email" 
                  type="email" 
                  class="w-full neutro-primary text-white rounded-xl border border-gray-100 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="usuario@taller.cl"
                  @input="errores.email = ''"
                />
                <p v-if="errores.email" class="text-red-400 text-xs mt-1 font-medium">{{ errores.email }}</p>
              </div>

              <!-- Contraseña -->
              <div>
                <label class="block text-xs font-bold text-white uppercase tracking-wider mb-2">Contraseña por defecto</label>
                <input 
                  v-model="formulario.password" 
                  type="text" 
                  class="w-full neutro-primary text-white/50 rounded-xl border border-gray-100 px-4 py-3 text-sm outline-none cursor-not-allowed bg-black/10"
                  readonly
                />
                <p class="text-[10px] text-white/40 mt-2">El usuario podrá cambiarla luego desde su perfil.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4 border-t border-gray-700">
          <button 
            @click="guardarUsuario"
            class="px-6 py-3 neutro-primary text-white rounded-xl text-sm font-bold hover:opacity-80 shadow-md transition-all cursor-pointer w-full md:w-auto"
          >
            {{ isEditing ? 'Guardar Cambios' : 'Registrar Usuario' }}
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
