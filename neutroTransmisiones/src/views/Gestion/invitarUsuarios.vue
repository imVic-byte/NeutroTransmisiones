<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import navbar from '../../components/componentes/navbar.vue';
import { useInterfaz } from '@/stores/interfaz.js';
import { supabase } from '../../lib/supabaseClient.js';
import { formatearRut } from '@/js/validarRut.js';
import volver from '@/components/componentes/volver.vue';

const router = useRouter();
const interfaz = useInterfaz();

const formulario = reactive({
  nombre: '',
  apellido: '',
  rut: '',
  email: '',
  telefono: '',
  rol: 'Mecánico General'
});

const estado = reactive({
  cargando: false,
  mensaje: '',
  tipo: ''
});

const errores = reactive({
  nombre: '',
  apellido: '',
  rut: '',
  telefono: ''
});

const validarRut = ref(true);
const mostrarModal = ref(false);

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

  const nombre = String(formulario.nombre || '').trim();
  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.';
    valido = false;
  } else if (nombre.length < 2) {
    errores.nombre = 'El nombre debe tener al menos 2 caracteres.';
    valido = false;
  }

  const apellido = String(formulario.apellido || '').trim();
  if (!apellido) {
    errores.apellido = 'El apellido es obligatorio.';
    valido = false;
  } else if (apellido.length < 2) {
    errores.apellido = 'El apellido debe tener al menos 2 caracteres.';
    valido = false;
  }

  const rutLimpio = String(formulario.rut || '').replace(/[.\-]/g, '');
  if (!rutLimpio) {
    errores.rut = 'El RUT es obligatorio.';
    valido = false;
  } else if (rutLimpio.length < 8) {
    errores.rut = 'El RUT debe tener al menos 8 caracteres.';
    valido = false;
  }

  const telefono = String(formulario.telefono || '').trim();
  if (!telefono) {
    errores.telefono = 'El teléfono es obligatorio.';
    valido = false;
  } else if (telefono.length < 7) {
    errores.telefono = 'El teléfono debe tener al menos 7 dígitos.';
    valido = false;
  }

  return valido;
};

const gestionarRegistro = async () => {
  if (!validarFormulario()) return;

  estado.cargando = true;
  estado.mensaje = '';
  estado.tipo = '';

  try {
    // Como NO inician sesión, solo los insertamos como un registro normal en la tabla
    const { error } = await supabase
      .from('trabajadores')
      .insert({
        nombre: toCamelCase(formulario.nombre),
        apellido: toCamelCase(formulario.apellido),
        rut: formatearRut(formulario.rut),
        email: formulario.email.trim() || null, // El email ahora es opcional
        telefono: formulario.telefono,
        rol: formulario.rol,
        activo: true // Lo dejamos activo para que aparezca en tu modal de OT
      });

    if (error) throw error;

    estado.mensaje = 'Trabajador registrado correctamente. Ya está disponible para ser asignado a órdenes de trabajo.';
    estado.tipo = 'success';
    mostrarModal.value = true;

    // Limpiar formulario
    Object.assign(formulario, {
      nombre: '',
      apellido: '',
      rut: '',
      email: '',
      telefono: '',
      rol: 'Trabajador'
    });
  } catch (error) {
    console.error(error);
    estado.mensaje = `Error al registrar: Verifica que el RUT no esté duplicado en la base de datos.`;
    estado.tipo = 'error';
    mostrarModal.value = true;
  } finally {
    estado.cargando = false;
  }
};

const cerrarModal = () => {
  mostrarModal.value = false;
  if (estado.tipo === 'success') {
    router.push('/gestion-usuarios'); // O la ruta a tu lista
  }
};


onMounted(async () => {
  interfaz.showLoading();
  await new Promise(resolve => setTimeout(resolve, 500));
  interfaz.hideLoading();
});
</script>

<template>
  <div class="min-h-screen neutro-background pb-25">
    <navbar class="navbar" titulo="Registrar Personal" subtitulo="Gestión de equipo del taller"></navbar>

    <div class="max-w-2xl mx-auto mt-6 px-4 sm:px-0 sm:mt-10">

      <volver></volver>

      <div class="neutro-secondary rounded-2xl shadow-2xl overflow-hidden">

        <div class="neutro-primary p-8 sm:p-10 text-center relative border-b-4 border-[#D8B462]">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Nuevo Trabajador</h2>
          <p class="text-white opacity-90 text-base mt-3 max-w-lg mx-auto leading-relaxed">
            Ingresa los datos del trabajador para poder asignarlo a los vehículos. (Este perfil no tiene acceso al sistema).
          </p>
          <div class="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D8B462] to-transparent opacity-50"></div>
        </div>

        <form @submit.prevent="gestionarRegistro" class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-10">

          <div class="space-y-2 group">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-[#D8B462]">
              Nombre <span class="text-red-400">*</span>
            </label>
            <input v-model="formulario.nombre" type="text"
              class="w-full border-2 rounded-xl p-3.5 neutro-secondary text-white focus:border-[#D8B462] focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-400"
              :class="errores.nombre ? 'border-red-400' : 'border-green-900'" />
            <p v-if="errores.nombre" class="text-red-500 text-xs font-medium">{{ errores.nombre }}</p>
          </div>

          <div class="space-y-2 group">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-[#D8B462]">
              Apellido <span class="text-red-400">*</span>
            </label>
            <input v-model="formulario.apellido" type="text"
              class="w-full border-2 rounded-xl p-3.5 neutro-secondary text-white focus:border-[#D8B462] focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-400"
              :class="errores.apellido ? 'border-red-400' : 'border-green-900'" />
            <p v-if="errores.apellido" class="text-red-500 text-xs font-medium">{{ errores.apellido }}</p>
          </div>

          <div class="space-y-2 group">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-[#D8B462]">
              RUT <span class="text-red-400">*</span>
            </label>
            <input v-model="formulario.rut" @input="onRutInput" type="text" placeholder="12.345.678-9" maxlength="12"
              class="w-full border-2 rounded-xl p-3.5 neutro-secondary text-white focus:border-[#D8B462] focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-400"
              :class="errores.rut ? 'border-red-400' : 'border-green-900'" />
            <p v-if="errores.rut" class="text-red-500 text-xs font-medium">{{ errores.rut }}</p>
          </div>

          <div class="space-y-2 group">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-[#D8B462]">
              Teléfono <span class="text-red-400">*</span>
            </label>
            <input :value="formulario.telefono" @input="filtrarTelefono" type="text" inputmode="numeric" placeholder="912345678"
              class="w-full border-2 rounded-xl p-3.5 neutro-secondary text-white focus:border-[#D8B462] focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-400"
              :class="errores.telefono ? 'border-red-400' : 'border-green-900'" />
            <p v-if="errores.telefono" class="text-red-500 text-xs font-medium">{{ errores.telefono }}</p>
          </div>

          <div class="space-y-2 group md:col-span-2">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-[#D8B462]">
              Correo electrónico <span class="text-gray-400 text-xs font-normal">(opcional)</span>
            </label>
            <input v-model="formulario.email" type="email" placeholder="trabajador@ejemplo.com"
              class="w-full border-2 border-green-900 rounded-xl p-3.5 neutro-secondary text-white focus:border-[#D8B462] focus:ring-0 focus:outline-none transition-all text-base font-medium placeholder-gray-400" />
          </div>

          <div class="md:col-span-2 space-y-2 group">
            <label class="block text-sm font-bold text-white transition-colors group-focus-within:text-[#D8B462]">Especialidad / Cargo</label>
            <div class="relative">
              <select v-model="formulario.rol"
                class="w-full border-2 border-green-900 rounded-xl p-3.5 neutro-secondary text-white focus:border-[#D8B462] focus:ring-0 focus:outline-none transition-all cursor-pointer appearance-none text-base font-medium">
                <option value="Administrador" class="neutro-secondary">Administrador</option>
                <option value="Mecánico General" class="neutro-secondary">Mecánico General</option>
                <option value="Ayudante" class="neutro-secondary">Ayudante</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="md:col-span-2 mt-6">
            <button type="submit" :disabled="estado.cargando"
              class="w-full neutro-primary text-white font-extrabold py-4 rounded-xl hover:opacity-90 hover:shadow-lg transform active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-3 text-lg cursor-pointer">
              <svg v-if="estado.cargando" class="animate-spin h-6 w-6 text-[#D8B462]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ estado.cargando ? 'Guardando...' : 'Registrar Trabajador' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="mostrarModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="neutro-secondary rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div class="p-6 text-center">
          <div class="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" :class="estado.tipo === 'success' ? 'bg-green-100' : 'bg-red-100'">
            <svg v-if="estado.tipo === 'success'" class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-white mb-2">
            {{ estado.tipo === 'success' ? '¡Guardado!' : 'Error' }}
          </h3>
          <p class="text-sm text-white leading-relaxed">{{ estado.mensaje }}</p>
        </div>
        <div class="p-4 flex justify-center border-t border-green-900">
          <button @click="cerrarModal" class="w-full py-3 rounded-xl font-bold transition-transform active:scale-95 neutro-primary text-white cursor-pointer">
            {{ estado.tipo === 'success' ? 'Volver a la lista' : 'Cerrar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>