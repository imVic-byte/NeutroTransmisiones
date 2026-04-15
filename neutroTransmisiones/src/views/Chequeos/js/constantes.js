export const opciones = [
  { valor: 'bueno', label: 'Bueno', color: 'bg-green-100 text-green-700 border-green-300' },
  { valor: 'malo', label: 'Malo', color: 'bg-red-100 text-red-700 border-red-300' },
  { valor: 'no_aplica', label: 'N/A', color: 'bg-gray-100 text-gray-700 border-gray-300' }
]

export const categorias = {
  revision_interior: {
    titulo: 'Revisión Interior',
    items: [
      { key: 'bocina', label: 'Bocina' },
      { key: 'difusores_aire', label: 'Difusores de aire' },
      { key: 'cinturones_asientos', label: 'Cinturones y asientos' },
      { key: 'senalizadores_comandos', label: 'Señalizadores y comandos' },
      { key: 'luces_interiores', label: 'Luces interiores' }
    ]
  },
  revision_exterior: {
    titulo: 'Revisión Exterior',
    items: [
      { key: 'luces_delanteras', label: 'Luces delanteras' },
      { key: 'plumillas_delanteras', label: 'Plumillas delanteras' },
      { key: 'plumilla_trasera', label: 'Plumilla trasera' },
      { key: 'manillas_cerraduras', label: 'Manillas / Cerraduras / Otros' },
      { key: 'luces_traseras', label: 'Luces traseras' }
    ]
  },
  motor: {
    titulo: 'Motor',
    items: [
      { key: 'nivel_refrigerante', label: 'Nivel de refrigerante' },
      { key: 'nivel_lava_parabrisas', label: 'Nivel lava parabrisas' },
      { key: 'estado_correa_tensor', label: 'Estado correa / tensor / polea' },
      { key: 'fuga_refrigerante', label: 'Fuga refrigerante' },
      { key: 'fuga_aceite', label: 'Fuga aceite' },
      { key: 'otros', label: 'Otros' }
    ]
  },
  llantas_neumaticos: {
    titulo: 'Llantas y Neumáticos',
    items: [
      { key: 'delantero_izquierdo', label: 'Delantero izquierdo' },
      { key: 'trasero_derecho', label: 'Trasero derecho' },
      { key: 'trasero_izquierdo', label: 'Trasero izquierdo' },
      { key: 'delantero_derecho', label: 'Delantero derecho' }
    ]
  },
  frenos: {
    titulo: 'Frenos',
    items: [
      { key: 'pastillas_delanteras', label: 'Pastillas delanteras' },
      { key: 'discos_delanteros', label: 'Discos delanteros' },
      { key: 'pastillas_traseras', label: 'Pastillas traseras' },
      { key: 'discos_traseros', label: 'Discos traseros' }
    ]
  },
  suspension_amortiguacion: {
    titulo: 'Suspensión y Amortiguación',
    items: [
      { key: 'amortiguador_del_der', label: 'Amortiguador del. derecho' },
      { key: 'amortiguador_del_izq', label: 'Amortiguador del. izquierdo' },
      { key: 'bujes_rotulas_del_der', label: 'Bujes/Rotulas del. derecha' },
      { key: 'bujes_rotulas_del_izq', label: 'Bujes/Rotulas del. izquierda' },
      { key: 'cremallera_direccion', label: 'Cremallera de dirección' },
      { key: 'amortiguador_tras_der', label: 'Amortiguador tras. derecho' },
      { key: 'amortiguador_tras_izq', label: 'Amortiguador tras. izquierdo' },
      { key: 'bujes_rotulas_tras_izq', label: 'Bujes/Rotulas tras. izquierda' },
      { key: 'bujes_rotulas_tras_der', label: 'Bujes/Rotulas tras. derecha' }
    ]
  },
  transmision_diferencial: {
    titulo: 'Transmisión / Diferencial / VTG',
    items: [
      { key: 'estado_caja_cambios', label: 'Estado caja de cambios' },
      { key: 'estado_diferenciales', label: 'Estado diferenciales' },
      { key: 'estado_caja_transferencia', label: 'Estado caja transferencia' }
    ]
  },
  bateria_aceite: {
    titulo: 'Batería y Aceite',
    items: [
      { key: 'bateria', label: 'Batería' },
      { key: 'nivel_aceite_motor', label: 'Nivel aceite de motor' }
    ]
  }
}