<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import VueCal from 'vue-cal'
import 'vue-cal/dist/vuecal.css'

const events = ref([])
const showModal = ref(false)
const newTitle = ref('')
const selectedTime = ref(null)

const isMobile = ref(false)
const currentView = ref('week')

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  currentView.value = isMobile.value ? 'day' : 'week'
}

const loadEvents = async () => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
  
  if (data && !error) {
    events.value = data.map(app => ({
      start: new Date(app.start_time),
      end: new Date(app.end_time),
      title: app.title,
      class: 'neutro-event'
    }))
  }
}

const handleCellClick = (date) => {
  selectedTime.value = date
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  newTitle.value = ''
  selectedTime.value = null
}

const saveAppointment = async () => {
  if (!newTitle.value) return

  const start = new Date(selectedTime.value)
  const end = new Date(start)
  end.setHours(start.getHours() + 1)

  const { data, error } = await supabase
    .from('appointments')
    .insert([
      {
        title: newTitle.value,
        start_time: start.toISOString(),
        end_time: end.toISOString()
      }
    ])
    .select()

  if (data && !error) {
    events.value.push({
      start: new Date(data[0].start_time),
      end: new Date(data[0].end_time),
      title: data[0].title,
      class: 'neutro-event'
    })
    closeModal()
  }
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  loadEvents()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>
<template>
  <div class="calendar-container">
    <vue-cal
      locale="es"
      :events="events"
      @cell-click="handleCellClick"
      :default-view="currentView"
      :active-view="currentView"
      :time-from="8 * 60"
      :time-to="20 * 60"
      :disable-views="['years', 'year']"
      :small="isMobile"
    />

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Nueva Cita</h3>
        <input 
          v-model="newTitle" 
          type="text" 
          placeholder="Título de la cita" 
        />
        <div class="modal-actions">
          <button @click="saveAppointment">Guardar</button>
          <button @click="closeModal">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.calendar-container {
  height: 80vh;
  position: relative;
  display: flex;
  flex-direction: column;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 400px;
  max-width: 90%;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

:deep(.neutro-event) {
  background-color: #42b883;
  color: white;
  border: 1px solid #35495e;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .modal-content {
    padding: 1.5rem;
  }
  
  .calendar-container {
    height: 85vh;
  }
}
</style>