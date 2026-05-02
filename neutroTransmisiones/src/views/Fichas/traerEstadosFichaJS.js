import { supabase } from "../../lib/supabaseClient.js";

export const traerEstadosFichaJS = async () => {
  try{
    const {data,error} = await supabase
    .from('tabla_estados_ficha')
    .select('*')
    .order('orden')
    if(error) throw error
    return data
  }
  catch(err){
    console.error("Error al cargar los estados:", err)
    return err
  }
}