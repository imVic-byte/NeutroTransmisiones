import { supabase } from "../../lib/supabaseClient";

export const traerFotosRecepcionJS = async (id_ot) => {
  const { data } = await supabase
    .from('ot_fotos_ingreso')
    .select('*')
    .eq('id_ot', id_ot);
  if (data) {
    return data.map(f => ({
      url: f.url,
      isNew: false
    }));
  }
  return [];
};
