import { supabase } from '../lib/supabaseClient.js'

export const handleVehiculo = async (id_cliente, patente, marca, modelo) => {
    const {data,error} = await supabase.from('vehiculo').select("*").eq('patente', patente).eq('id_cliente', id_cliente).maybeSingle()
    if (error || data === null) {
        const {data:newVehiculo, error:errVehiculo} = await supabase
                .from('vehiculo')
                .insert({
                    id_cliente:id_cliente,
                    patente: patente,
                    marca: marca,
                    modelo: modelo,
                })
                .select()
                .single()
            if (errVehiculo) return null
            return newVehiculo  
    }
    return data
}