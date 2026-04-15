export const formatearDinero = (valor) => {
  if (valor === null || valor === undefined || isNaN(Number(valor))) return "$0";
  
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Number(valor));
};

export const formatearFecha = (fechaString) => {
  if (!fechaString) return "---";
  const stringLimpio = fechaString.includes('T') || fechaString.includes(' ')
    ? fechaString.replace(' ', 'T')
    : `${fechaString}T00:00:00`;

  const fecha = new Date(stringLimpio);
  if (isNaN(fecha)) return "Fecha inválida";

  return fecha.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const formatearFechaYHora = (fechaString) => {
  if (!fechaString) return "---";

  const stringLimpio = fechaString.replace(' ', 'T');
  const fecha = new Date(stringLimpio);
  
  if (isNaN(fecha)) return "Fecha inválida";

  return fecha.toLocaleString("es-CL", {
    day: "2-digit", 
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit", 
    minute: "2-digit"
  });
};

export const formatearMesAnio = (fechaString) => {
  if (!fechaString) return "---";

  const stringLimpio = fechaString.includes('T') ? fechaString : `${fechaString}T00:00:00`;
  const fecha = new Date(stringLimpio);
  
  if (isNaN(fecha)) return "---";

  const formato = fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  return formato.charAt(0).toUpperCase() + formato.slice(1);
};

export const formatearMes = (fechaString) => {
  if (!fechaString) return "---";

  const stringLimpio = fechaString.includes('T') ? fechaString : `${fechaString}T00:00:00`;
  const fecha = new Date(stringLimpio);
  
  if (isNaN(fecha)) return "---";
  const formato = fecha.toLocaleDateString('es-CL', { month: 'long' });
  
  return formato.charAt(0).toUpperCase() + formato.slice(1);
};