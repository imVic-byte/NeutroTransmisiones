export const formatearRut = (rut) => {
  let valor = rut.replace(/[^0-9kK]/g, '');
  if (valor.length < 2) return valor;
  const cuerpo = valor.slice(0, -1);
  const dv = valor.slice(-1).toUpperCase();
  let cuerpoFormateado = '';
  let count = 0;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    cuerpoFormateado = cuerpo[i] + cuerpoFormateado;
    count++;
    if (count === 3 && i !== 0) {
      cuerpoFormateado = '.' + cuerpoFormateado;
      count = 0;
    }
  }
  return `${cuerpoFormateado}-${dv}`;
};

export const validarDigitoRut = (rut) => {
  const limpio = rut.replace(/[.\-]/g, '');
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dvIngresado = limpio.slice(-1).toUpperCase();
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = suma % 11;
  let dvEsperado;
  if (resto === 0) dvEsperado = '0';
  else if (resto === 1) dvEsperado = 'K';
  else dvEsperado = String(11 - resto);
  return dvIngresado === dvEsperado;
};