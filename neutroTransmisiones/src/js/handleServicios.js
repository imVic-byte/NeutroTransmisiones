import { supabase } from "../lib/supabaseClient";

export const verificarServicio = async (servicioData) => {
    // 1. Normalización
    const nombreLimpio = servicioData.nombre.trim().toUpperCase();

    try {
        // 2. Búsqueda por nombre (insensible a mayúsculas/minúsculas)
        const { data: coincidencias, error } = await supabase
            .from('servicios')
            .select()
            .ilike('nombre', nombreLimpio);

        if (error) throw error;

        // 3. Lógica de Decisión
        let servicioEncontrado = null;

        if (coincidencias && coincidencias.length > 0) {
            // Buscamos coincidencia exacta (ignorando espacios extra y mayúsculas)
            servicioEncontrado = coincidencias.find(s => s.nombre.trim().toUpperCase() === nombreLimpio);
        }

        // 4. Retorno o Creación/Actualización
        if (servicioEncontrado) {
            let updates = {};
            
            // Si el precio cambió en el formulario, lo actualizamos en el catálogo
            if (servicioData.precio !== undefined && Number(servicioEncontrado.precio) !== Number(servicioData.precio)) {
                updates.precio = Number(servicioData.precio);
            }
            
            if (Object.keys(updates).length > 0) {
                const { data: servicioActualizado, error: errorUpdate } = await supabase
                    .from('servicios')
                    .update(updates)
                    .eq('id', servicioEncontrado.id)
                    .select()
                    .single();
                
                if (!errorUpdate && servicioActualizado) {
                    servicioEncontrado = servicioActualizado;
                } else {
                    console.error('Error actualizando precio del servicio:', errorUpdate);
                }
            }

            return { exito: true, servicio: servicioEncontrado, mensaje: 'Servicio existente verificado y actualizado' };
        }

        // Si no se encontró, procedemos a insertar
        const { data: servicioNuevo, error: errorInsert } = await supabase
            .from('servicios')
            .insert({
                // Guardamos el nombre con el formato original (solo sin espacios extra)
                nombre: servicioData.nombre.trim(),
                precio: Number(servicioData.precio) || 0,
                activo: true
            })
            .select()
            .single();

        if (errorInsert) throw errorInsert;

        return { exito: true, servicio: servicioNuevo, mensaje: 'Nuevo servicio registrado en el catálogo' };

    } catch (err) {
        console.error('Error en algoritmo de verificación de servicio:', err);
        return { exito: false, mensaje: 'No se pudo verificar el servicio' };
    }
}
