import { supabase } from '../../lib/supabaseClient.js'

export const traerTrabajadores = async () => {
  try {
    const { data, error } = await supabase
      .from('trabajadores')
      .select('*')
      .eq('activo', true)
    
    if (error) throw error
    return data || []
  } catch (err) {
    console.error("Error al cargar trabajadores:", err)
    return []
  }
}