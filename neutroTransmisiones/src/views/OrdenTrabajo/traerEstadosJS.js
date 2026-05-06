import { supabase } from "../../lib/supabaseClient";

export const obtenerEstadosJS = async () => {
    const { data } = await supabase
        .from("tabla_estados")
        .select("*")
        .order("orden");
    return data || [];
};