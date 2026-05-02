import { supabase } from '../../lib/supabaseClient.js'

export const traerEstadosJS = async () => {
  try {
    const{data,error} = await supabase
    .from('tabla_estados')
    .select('*')
    if(error) throw error
    return data
  }
  catch(err){
    console.error("Error al cargar los estados:", err)
    return err
  }
}