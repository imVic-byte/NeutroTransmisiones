export const usarDebounce = () => {
  let timeout = null;
  return (funcionAEjecutar, tiempo = 300) => {
    clearTimeout(timeout);
    timeout = setTimeout(funcionAEjecutar, tiempo);
  };
};

export const filtrar = (listaOriginal, textoBusqueda, obtenerVehiculosFunc) => {
  if (!textoBusqueda) return [...listaOriginal];
  
  const textoLower = textoBusqueda.toLowerCase().trim();
  
  return listaOriginal.filter(c => {
    const nombreDirecto = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
    const clienteFicha = c.ficha_de_trabajo?.cliente;
    const nombreCliente = clienteFicha ? `${clienteFicha.nombre || ''} ${clienteFicha.apellido || ''}`.toLowerCase() : '';
    const vehiculosArray = obtenerVehiculosFunc ? obtenerVehiculosFunc(c) : [];
    const patenteCoincide = vehiculosArray.some(v => v.patente?.toLowerCase().includes(textoLower));
    const diagnostico = c.diagnostico?.toLowerCase() || '';
    
    return nombreDirecto.includes(textoLower) || 
           nombreCliente.includes(textoLower) ||
           patenteCoincide ||
           diagnostico.includes(textoLower);
  });
};