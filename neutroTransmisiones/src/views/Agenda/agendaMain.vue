<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import VueCal from 'vue-cal'
import 'vue-cal/dist/vuecal.css'
import navbar from '@/components/componentes/navbar.vue'
import volver from '@/components/componentes/volver.vue'

const events = ref([])
const showModal = ref(false)
const showEventModal = ref(false)
const newTitle = ref('')
const editTitle = ref('')
const selectedTime = ref(null)
const selectedDuration = ref(2)
const selectedEvent = ref(null)

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
            id: app.id,
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

const handleEventClick = (event, e) => {
    e.stopPropagation()
    selectedEvent.value = event
    editTitle.value = event.title
    showEventModal.value = true
}

const handleEventChange = async (payload) => {
    // Vue-cal emits different payloads depending on the event, usually payload.event or just payload
    const event = payload.event || payload
    if (!event || !event.id) return

    const { error } = await supabase
        .from('appointments')
        .update({
            start_time: event.start.toISOString(),
            end_time: event.end.toISOString()
        })
        .eq('id', event.id)

    if (error) {
        console.error('Error al actualizar fecha del evento:', error)
    }
}

const closeModal = () => {
    showModal.value = false
    newTitle.value = ''
    selectedTime.value = null
}

const closeEventModal = () => {
    showEventModal.value = false
    selectedEvent.value = null
    editTitle.value = ''
}

const saveAppointment = async () => {
    if (!newTitle.value) return

    const start = new Date(selectedTime.value)
    const end = new Date(start)
    end.setHours(start.getHours() + selectedDuration.value)

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
            id: data[0].id,
            start: new Date(data[0].start_time),
            end: new Date(data[0].end_time),
            title: data[0].title,
            class: 'neutro-event'
        })
        closeModal()
    }
}

const deleteAppointment = async () => {
    if (!selectedEvent.value || !selectedEvent.value.id) return

    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', selectedEvent.value.id)

    if (!error) {
        events.value = events.value.filter(e => e.id !== selectedEvent.value.id)
        closeEventModal()
    }
}

const updateAppointment = async () => {
    if (!selectedEvent.value || !selectedEvent.value.id || !editTitle.value) return

    const { error } = await supabase
        .from('appointments')
        .update({ title: editTitle.value })
        .eq('id', selectedEvent.value.id)

    if (!error) {
        const index = events.value.findIndex(e => e.id === selectedEvent.value.id)
        if (index !== -1) {
            events.value[index].title = editTitle.value
        }
        selectedEvent.value.title = editTitle.value
        closeEventModal()
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
    <div class="min-h-screen neutro-background font-sans neutro-font pb-20">
        <navbar subtitulo="Agenda" class="navbar" searchInput="false" />
        <div class="px-5 pt-4 flex justify-start">
            <volver />
        </div>
        <div class="calendar-container pt-5 px-5">
            <vue-cal class="neutro-primary rounded-xl text-white" locale="es" :events="events" @cell-click="handleCellClick" @event-click="handleEventClick"
            @event-drop="handleEventChange" @event-duration-change="handleEventChange"
            :editable-events="{ title: false, drag: true, resize: true, delete: false, create: false }"
                :default-view="currentView" :active-view="currentView" :time-from="8 * 60" :time-to="20 * 60"
                :disable-views="['years', 'year']" :small="isMobile" />
        </div>

        <div v-if="showEventModal" class="modal-overlay" @click.self="closeEventModal">
            <div class="modal-content neutro-primary text-white">
                <h3>Detalles de la Cita</h3>
                <input class="input mb-2" v-model="editTitle" type="text" placeholder="Título de la cita" />
                <div class="modal-actions mt-2">
                    <button class="button-confirm mr-auto" @click="updateAppointment">Actualizar</button>
                    <button class="btn-danger" @click="deleteAppointment">Eliminar</button>
                    <button @click="closeEventModal">Cerrar</button>
                </div>
            </div>
        </div>
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
            <div class="modal-content neutro-primary text-white">
                <h3>Nueva Cita</h3>
                <input class="input" v-model="newTitle" type="text" placeholder="Título de la cita" />
                <div class="mt-2">
                    <label class="block mb-2 text-sm">Duración estimada:</label>
                    <select v-model="selectedDuration" class="input w-full cursor-pointer">
                        <option :value="1">1 hora</option>
                        <option :value="2">2 horas</option>
                        <option :value="4">4 horas</option>
                        <option :value="8">Todo el día (8 horas)</option>
                    </select>
                </div>
                <div class="modal-actions mt-2">
                    <button class="button-confirm" @click="saveAppointment">Guardar</button>
                    <button @click="closeModal">Cancelar</button>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.calendar-container {
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.modal-content {
    padding: 2rem;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 400px;
    max-width: 90%;
}

.event-title {
    font-size: 1.2rem;
    font-weight: bold;
    background-color: #CCEBD4;
    color: #14331C;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
}

.input {
    background-color: #CCEBD4;
    color: #14331C;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
}

.modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
}

.btn-danger {
    background-color: #dc3545;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

.btn-danger:hover {
    background-color: #c82333;
}

.button-confirm {
    background-color: #31644d;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

.button-confirm:hover {
    background-color: #22332c;
}

:deep(.neutro-event) {
    background-color: #31644d;
    color: white;
    border: 1px solid #35495e;
    border-radius: 4px;
    cursor: pointer;
}

@media (max-width: 768px) {
    .modal-content {
        padding: 1.5rem;
    }

    .calendar-container {
        height: calc(100vh - 180px);
    }
}
</style>