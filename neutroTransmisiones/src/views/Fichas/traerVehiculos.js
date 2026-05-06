import { supabase } from "../../lib/supabaseClient.js"

export const traerVehiculos = async (id_cliente) => {
    try {
        const { data, error } = await supabase
            .from('vehiculo')
            .select('*')
            .eq('id_cliente', id_cliente)
        if (error) throw error
        return data || []
    } catch (err) {
        console.error('Error al cargar vehiculos:', err)
        return []
    }
}