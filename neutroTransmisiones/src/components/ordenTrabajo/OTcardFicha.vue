<script setup>
import { useRouter } from 'vue-router';
import { formatearFecha } from "@/js/formateadores";

const router = useRouter();

const props = defineProps({
  orden: {
    type: Object,
    required: true
  },
  estado: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: false
  }
});

const emit = defineEmits(['eliminar']);

const irAOrden = () => {
  router.push({ name: 'ver-orden-de-trabajo', params: { id: props.orden.id } });
};

const eliminarOrden = (event) => {
  event.stopPropagation();
  emit('eliminar', props.orden.id);
};
</script>

<template>
  <div 
    @click="irAOrden"
    class="ot-ficha-card group"
  >
    <!-- Barra lateral de estado -->
    <div class="ot-ficha-card__accent" :style="{ backgroundColor: estado.color }"></div>
    
    <div class="ot-ficha-card__content">
      <!-- Fila superior: SVG + Info principal -->
      <div class="ot-ficha-card__top">
        <!-- SVG Vehículo -->
        <div class="ot-ficha-card__icon" :style="{ backgroundColor: estado.color + '18' }">
            <svg width="70%" height="70%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13H8M2 9L4 10L5.27064 6.18807C5.53292 5.40125 5.66405 5.00784 5.90729 4.71698C6.12208 4.46013 6.39792 4.26132 6.70951 4.13878C7.06236 4 7.47705 4 8.30643 4H15.6936C16.523 4 16.9376 4 17.2905 4.13878C17.6021 4.26132 17.8779 4.46013 18.0927 4.71698C18.3359 5.00784 18.4671 5.40125 18.7294 6.18807L20 10L22 9M16 13H19M6.8 10H17.2C18.8802 10 19.7202 10 20.362 10.327C20.9265 10.6146 21.3854 11.0735 21.673 11.638C22 12.2798 22 13.1198 22 14.8V17.5C22 17.9647 22 18.197 21.9616 18.3902C21.8038 19.1836 21.1836 19.8038 20.3902 19.9616C20.197 20 19.9647 20 19.5 20H19C17.8954 20 17 19.1046 17 18C17 17.7239 16.7761 17.5 16.5 17.5H7.5C7.22386 17.5 7 17.7239 7 18C7 19.1046 6.10457 20 5 20H4.5C4.03534 20 3.80302 20 3.60982 19.9616C2.81644 19.8038 2.19624 19.1836 2.03843 18.3902C2 18.197 2 17.9647 2 17.5V14.8C2 13.1198 2 12.2798 2.32698 11.638C2.6146 11.0735 3.07354 10.6146 3.63803 10.327C4.27976 10 5.11984 10 6.8 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>

        <!-- Info del vehículo -->
        <div class="ot-ficha-card__info">
          <div class="ot-ficha-card__header">
            <div class="ot-ficha-card__patente">
              {{ orden.vehiculo?.patente || 'S/P' }}
            </div>
            <span class="ot-ficha-card__badge" :style="{ backgroundColor: estado.color, color: estado.texto || '#fff' }">
              {{ estado.estado || 'Sin estado' }}
            </span>
          </div>
          <p class="ot-ficha-card__vehicle-name">
            {{ orden.vehiculo?.marca || '—' }} {{ orden.vehiculo?.modelo || '' }}
          </p>
        </div>
      </div>

      <!-- Diagnóstico -->
      <div v-if="orden.diagnostico" class="ot-ficha-card__diagnostico">
        <svg xmlns="http://www.w3.org/2000/svg" class="ot-ficha-card__diag-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
        <span class="ot-ficha-card__diag-text">{{ orden.diagnostico }}</span>
      </div>

      <!-- Fila inferior: Metadatos -->
      <div class="ot-ficha-card__meta">
        <div class="ot-ficha-card__meta-item">
          <svg xmlns="http://www.w3.org/2000/svg" class="ot-ficha-card__meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
          </svg>
          <span>OT {{ orden.id }}</span>
        </div>
        <div v-if="orden.fecha_ingreso" class="ot-ficha-card__meta-item">
          <svg xmlns="http://www.w3.org/2000/svg" class="ot-ficha-card__meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <span>{{ formatearFecha(orden.fecha_ingreso) }}</span>
        </div>
        <div class="ot-ficha-card__meta-item ot-ficha-card__meta-arrow">
          <span>Ver detalles</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="ot-ficha-card__arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
      
      <!-- Botón de eliminar (Solo visible si está vacía, es decir, sin diagnóstico) -->
      <button 
        v-if="!orden.diagnostico && !orden.chequeo"
        @click.stop="eliminarOrden" 
        class="absolute top-12 right-3 p-1.5 bg-red-500 text-white rounded-md transition-colors opacity-100"
        title="Eliminar Orden Vacía"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>

    </div>
  </div>
</template>

<style scoped>
.ot-ficha-card {
  position: relative;
  display: flex;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.ot-ficha-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
}

.ot-ficha-card__accent {
  width: 5px;
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.ot-ficha-card:hover .ot-ficha-card__accent {
  width: 7px;
}

.ot-ficha-card__content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--neutro-primary, #1a1a2e);
}

.ot-ficha-card__top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ot-ficha-card__icon {
  width: 64px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}

.ot-ficha-card:hover .ot-ficha-card__icon {
  transform: scale(1.05);
}

.ot-ficha-card__svg {
  width: 48px;
  height: 32px;
}

.ot-ficha-card__info {
  flex: 1;
  min-width: 0;
}

.ot-ficha-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ot-ficha-card__patente {
  font-size: 1.1rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-family: 'Courier New', monospace;
}

.ot-ficha-card__badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
  line-height: 1.4;
}

.ot-ficha-card__vehicle-name {
  font-size: 0.82rem;
  color: #ffffff;
  margin-top: 2px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ot-ficha-card__diagnostico {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.ot-ficha-card__diag-icon {
  width: 14px;
  height: 14px;
  color: #ffffff;
  flex-shrink: 0;
  margin-top: 1px;
}

.ot-ficha-card__diag-text {
  font-size: 0.75rem;
  color: #ffffff;
  font-style: italic;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ot-ficha-card__meta {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.ot-ficha-card__meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: #ffffff;
  font-weight: 500;
}

.ot-ficha-card__meta-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.ot-ficha-card__meta-arrow {
  margin-left: auto;
  color: #ffffff;
  transition: color 0.2s ease;
}

.ot-ficha-card:hover .ot-ficha-card__meta-arrow {
  color: #93c5fd;
}

.ot-ficha-card__arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.25s ease;
}

.ot-ficha-card:hover .ot-ficha-card__arrow {
  transform: translateX(3px);
}
</style>
