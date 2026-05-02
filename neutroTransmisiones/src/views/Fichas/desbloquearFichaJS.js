import { supabase } from "../../lib/supabaseClient.js"

export const desbloquearFichaJS = async (fichaId) => {
  try {
    const { error } = await supabase
      .from('ficha_de_trabajo')
      .update({ bloqueada: false })
      .eq('id', fichaId)
    if (error) throw error
    return true
  } catch (err) {
    console.error('Error al desbloquear la ficha:', err)
    return false
  }
}
