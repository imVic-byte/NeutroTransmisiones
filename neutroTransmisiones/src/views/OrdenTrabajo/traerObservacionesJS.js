import { supabase } from "../../lib/supabaseClient";

export const traerObservacionesJS = async (id_ot) => {
  const { data } = await supabase
    .from("ot_bitacora")
    .select("*")
    .eq("ot_id", id_ot)
    .eq("tipo_evento", "observacion")
    .order("created_at", { ascending: true });
  if (data) {
    const observaciones = await Promise.all(
      data.map(async (obs) => ({
        id: obs.id,
        texto: obs.observacion,
        fecha: obs.created_at,
        isNew: false,
        fotos: await traerFotosObservacionesJS(obs.id)
      }))
    );
    return observaciones;
  }
  return [];
};

export const traerFotosObservacionesJS = async (id_ot_bitacora) => {
  const { data } = await supabase
    .from("ot_fotos")
    .select("*")
    .eq("id_ot_bitacora", id_ot_bitacora);
  if (data) {
    return data;
  }
  return [];
};
