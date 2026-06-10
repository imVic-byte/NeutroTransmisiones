import { supabase } from "../lib/supabaseClient";

export const verificarInsumo = async (insumoData) => {
    // 1. Normalización
    const nombreLimpio = insumoData.nombre.trim().toUpperCase();

    try {
        // 2. Búsqueda por nombre (insensible a mayúsculas/minúsculas)
        const { data: coincidencias, error } = await supabase
            .from('inventario')
            .select()
            .ilike('nombre', nombreLimpio);

        if (error) throw error;

        // 3. Lógica de Decisión
        let insumoEncontrado = null;

        if (coincidencias && coincidencias.length > 0) {
            // Buscamos coincidencia exacta (ignorando espacios extra y mayúsculas)
            insumoEncontrado = coincidencias.find(s => s.nombre.trim().toUpperCase() === nombreLimpio);
        }

        // 4. Retorno o Creación/Actualización
        if (insumoEncontrado) {
            let updates = {};
            
            // Si el precio cambió en el formulario, lo actualizamos en el catálogo
            // Nota: En inventario la columna se llama precio_venta
            if (insumoData.precio !== undefined && Number(insumoEncontrado.precio_venta) !== Number(insumoData.precio)) {
                updates.precio_venta = Number(insumoData.precio);
            }
            
            if (Object.keys(updates).length > 0) {
                const { data: insumoActualizado, error: errorUpdate } = await supabase
                    .from('inventario')
                    .update(updates)
                    .eq('id', insumoEncontrado.id)
                    .select()
                    .single();
                
                if (!errorUpdate && insumoActualizado) {
                    insumoEncontrado = insumoActualizado;
                } else {
                    console.error('Error actualizando precio del insumo:', errorUpdate);
                }
            }

            return { exito: true, insumo: insumoEncontrado, mensaje: 'Insumo existente verificado y actualizado' };
        }

        // Si no se encontró, procedemos a insertar
        const { data: insumoNuevo, error: errorInsert } = await supabase
            .from('inventario')
            .insert({
                // Guardamos el nombre con el formato original (solo sin espacios extra)
                nombre: insumoData.nombre.trim(),
                precio_venta: Number(insumoData.precio) || 0,
                estado: true,
                stock: 0,
                tipo: 'insumo',
                unidad_medida: 'Unidad'
            })
            .select()
            .single();

        if (errorInsert) throw errorInsert;

        return { exito: true, insumo: insumoNuevo, mensaje: 'Nuevo insumo registrado en el inventario' };

    } catch (err) {
        console.error('Error en algoritmo de verificación de insumo:', err);
        return { exito: false, mensaje: 'No se pudo verificar el insumo' };
    }
}
