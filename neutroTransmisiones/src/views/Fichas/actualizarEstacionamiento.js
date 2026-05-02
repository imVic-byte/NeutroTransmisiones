import { supabase } from "../../lib/supabaseClient.js"

export const actualizarEstadoEstacionamientoJS = async (fichaId) => {
  try {
    const { error } = await supabase
      .from('ficha_de_trabajo')
      .update({ estado: 4 })
      .eq('id', fichaId)
    if (error) throw error
  } catch (err) {
    console.error('Error al actualizar el estado de estacionamiento:', err)
  }
}