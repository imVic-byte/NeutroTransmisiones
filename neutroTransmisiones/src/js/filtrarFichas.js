export const aplicarFiltros = () => {
  let resultado = [...fichasOriginales.value];

  // Filtro por estado
  if (filtroEstado.value !== null) {
    resultado = resultado.filter(f => f.estado === filtroEstado.value);
  }

  // Filtro por búsqueda
  if (textoBusqueda.value && textoBusqueda.value.trim() !== '') {
    const busqueda = textoBusqueda.value.toLowerCase().trim();
    
    resultado = resultado.filter(f => {
      const idCoincide = f.id?.toString().includes(busqueda);
      const nombreCompleto = `${f.cliente?.nombre || ''} ${f.cliente?.apellido || ''}`.toLowerCase();
      const patenteCoincide = f.orden_trabajo?.some(ot => 
        ot.vehiculo?.patente?.toLowerCase().includes(busqueda)
      );
      const motivoCoincide = f.motivo_ingreso?.toLowerCase().includes(busqueda);
      return idCoincide || nombreCompleto.includes(busqueda) || patenteCoincide || motivoCoincide;
    });
  }

  fichas.value = resultado;
};