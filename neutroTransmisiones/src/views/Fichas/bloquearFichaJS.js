import { supabase } from "../../lib/supabaseClient.js"

export const bloquearFichaJS = async (fichaId) => {
  try {
    const { error } = await supabase
      .from('ficha_de_trabajo')
      .update({ bloqueada: true })
      .eq('id', fichaId)
    if (error) throw error
  } catch (err) {
    console.error('Error al bloquear la ficha:', err)
  }
}
