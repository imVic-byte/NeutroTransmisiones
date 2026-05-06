import { supabase } from '../lib/supabaseClient.js'

export const handleTransmision = async (modelo_caja, fabricante, tipo_fluido, capacidad_litros, torque_cuerpo_valvulas_nm, torque_carter_nm, notas_tecnicas) => {
    const { data, error } = await supabase
        .from('transmisiones')
        .select('*')
        .eq('modelo_caja', modelo_caja)
        .single()
    if (error) {
        const { data: newTransmision, error: errTransmision } = await supabase
            .from('transmisiones')
            .insert({
                modelo_caja,
                fabricante,
                tipo_fluido,
                capacidad_litros,
                torque_cuerpo_valvulas_nm,
                torque_carter_nm,
                notas_tecnicas
            })
            .select()
            .single()
        if (errTransmision) return null
        return newTransmision
    }
    return data
}

export const buscarTransmisiones = async (query) => {
    if (!query || query.length < 2) return []
    const { data } = await supabase
        .from('transmisiones')
        .select('*')
        .ilike('modelo_caja', `%${query}%`)
        .limit(10)
    return data || []
}
