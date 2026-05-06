import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabaseClient.js' 

export function useNotificacionesCitas() {
  const Citas = ref([])
  const loading = ref(false)

  const fetchRecentNotifications = async () => {
    loading.value = true
    const { data, error } = await supabase
      .from('notificaciones_citas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (data) Citas.value = data
    loading.value = false
  }
  
  const handleNewNotification = async (payload) => {
    const newNotif = payload.new
    Citas.value.unshift(newNotif)
  }

  const markAsReadCita = async (id) => {
    const notif = Citas.value.find(n => n.id === id)
    if (notif) notif.leido = true

    const { error } = await supabase
      .from('notificaciones_citas')
      .update({ leido: true })
      .eq('id', id)

    if (error && notif) notif.leido = false
  }

  const markAllAsReadCita = async () => {
    const unreadIds = Citas.value.filter(n => !n.leido).map(n => n.id)
    if (unreadIds.length === 0) return

    Citas.value.forEach(n => { n.leido = true })

    const { error } = await supabase
      .from('notificaciones_citas')
      .update({ leido: true })
      .in('id', unreadIds)

    if (error) {
       fetchRecentNotifications()
    }
  }

  let channel

  onMounted(() => {
    fetchRecentNotifications()
    
    channel = supabase
      .channel('realtime:notificaciones_citas')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones_citas'
        },
        handleNewNotification
      )
      .subscribe()
  })

  onUnmounted(() => {
    if (channel) supabase.removeChannel(channel)
  })

  return {
    Citas,
    loading,
    markAsReadCita,
    markAllAsReadCita
  }
}
