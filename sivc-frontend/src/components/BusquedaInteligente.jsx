import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function BuscadorCatalogo() {
  // Estados para los filtros del formulario
  const [marcas, setMarcas] = useState([]);
  const [marcaId, setMarcaId] = useState('');        // ← ID de la marca seleccionada
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [soloAsequibles, setSoloAsequibles] = useState(false);

  // Estados para almacenar la respuesta del servidor
  const [piezas, setPiezas] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Estado para el saldo real del usuario (HU9)
  const [saldoUsuario, setSaldoUsuario] = useState(0);
  const [cargandoSaldo, setCargandoSaldo] = useState(true);

  // Obtener marcas al montar el componente
  useEffect(() => {
    const cargarMarcas = async () => {
      try {
        const response = await axios.get('/api/vehiculos/marcas/', { withCredentials: true });
        setMarcas(response.data);
      } catch (err) {
        console.error('Error cargando marcas:', err);
      }
    };
    cargarMarcas();
  }, []);

  // Obtener saldo real del usuario autenticado
  useEffect(() => {
    const obtenerSaldo = async () => {
      try {
        const sessionid = localStorage.getItem('sessionid');
        const response = await axios.get('/api/historial/', {
          headers: { 'X-Session-ID': sessionid || '' },
          withCredentials: true
        });
        if (response.data && response.data.saldo_actual !== undefined) {
          setSaldoUsuario(response.data.saldo_actual);
        }
      } catch (err) {
        console.error('Error obteniendo saldo:', err);
        setSaldoUsuario(0);
      } finally {
        setCargandoSaldo(false);
      }
    };
    obtenerSaldo();
  }, []);

  // Función que realiza la llamada al backend de Django
  const realizarBusqueda = async (e) => {
    if (e) e.preventDefault();

    if (!marcaId || !modelo || !anio) {
      setError('Para buscar, debes ingresar obligatoriamente Marca, Modelo y Año del vehículo.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const response = await axios.get('/api/buscar/', {
        params: {
          marca_id: marcaId,   // ← ahora enviamos ID
          modelo: modelo,
          anio: anio
        },
        withCredentials: true
      });
      setPiezas(response.data);
    } catch (err) {
      console.error("Error al consultar el catálogo:", err);
      setError('Hubo un error al conectar con el servidor o no se encontraron vehículos coincidentes.');
    } finally {
      setCargando(false);
    }
  };

  // HU4 - Solicitar trueque
  const solicitarTrueque = async (ofertaId) => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      if (!sessionid) {
        alert('Debes iniciar sesión para solicitar un trueque');
        return;
      }

      const response = await axios.post('/api/solicitar/',
        { oferta_id: ofertaId },
        {
          headers: { 'X-Session-ID': sessionid || '' },
          withCredentials: true
        }
      );

      if (response.data.success) {
        alert('✅ Solicitud de trueque enviada al ofertante. Espera su respuesta.');
      } else {
        alert(response.data.error || 'Error al solicitar trueque');
      }
    } catch (err) {
      console.error('Error al solicitar trueque:', err);
      const mensaje = err.response?.data?.error || 'Error de conexión al solicitar trueque';
      alert('❌ ' + mensaje);
    }
  };

  // HU 9: Filtro secundario de capacidad económica (usando saldo real)
  const piezasFiltradas = piezas.filter(pieza => {
    const coincideSaldo = soloAsequibles ? pieza.valor_puntos <= saldoUsuario : true;
    return coincideSaldo;
  });

  // Mostrar cargando mientras se obtiene el saldo
  if (cargandoSaldo) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Cargando información del usuario...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Buscador Inteligente de Repuestos</h2>

      {error && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">{error}</div>}

      {/* Formulario de Filtros con combo de marcas */}
      <form onSubmit={realizarBusqueda} className="p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">Marca *</label>
          <select
            value={marcaId}
            onChange={(e) => setMarcaId(e.target.value)}
            className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm"
          >
            <option value="">Seleccione una marca</option>
            {marcas.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">Modelo *</label>
          <input
            type="text"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Ej: Corolla"
            className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">Año *</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            placeholder="Ej: 2015"
            className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm"
          />
        </div>
        
        <div className="pt-4 md:pt-4 flex flex-col gap-2">
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-xs transition">
            {cargando ? 'Buscando...' : 'Buscar Compatibles'}
          </button>
        </div>

        {/* HU 9: Toggle para activar filtro según saldo actual */}
        <div className="flex items-center col-span-full pt-2 border-t border-gray-200 mt-2">
          <input
            type="checkbox"
            id="saldoFilter"
            checked={soloAsequibles}
            onChange={(e) => setSoloAsequibles(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="saldoFilter" className="ml-2 text-xs font-medium text-gray-700">
            Ver solo lo que puedo adquirir con mi saldo actual ({saldoUsuario} pts disponibles)
          </label>
        </div>
      </form>

      {/* Grid de Cards del Catálogo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {piezasFiltradas.map((pieza) => (
          <div key={pieza.id_inventario} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
            {/* HU 7 - Vista Collage de fotos */}
            {pieza.fotos && pieza.fotos.length > 0 ? (
              <div className="w-full h-32 bg-gray-100 flex gap-0.5 overflow-hidden">
                {/* Primera foto (siempre ocupa la izquierda) */}
                <div className={`h-full ${pieza.fotos.length === 1 ? 'w-full' : 'w-2/3'}`}>
                  <img
                    src={`http://127.0.0.1:8000${pieza.fotos[0]}`}
                    alt={`${pieza.repuesto} principal`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Columna derecha con las fotos restantes */}
                {pieza.fotos.length > 1 && (
                  <div className="w-1/3 flex flex-col gap-0.5 h-full">
                    {pieza.fotos.slice(1, 3).map((foto, index) => (
                      <div key={index} className="flex-1 w-full h-1/2 relative">
                        <img
                          src={`http://127.0.0.1:8000${foto}`}
                          alt={`${pieza.repuesto} detalle`}
                          className="w-full h-full object-cover"
                        />
                        {/* Overlay para indicar si hay más de 3 fotos */}
                        {index === 1 && pieza.fotos.length > 3 && (
                          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">+{pieza.fotos.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                [Sin Imagen]
              </div>
            )}
            
            <div className="p-3 space-y-1">
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                {marcas.find(m => m.id === parseInt(marcaId))?.nombre || 'Vehículo'}
              </span>
              <h3 className="font-bold text-gray-800 text-sm truncate">{pieza.repuesto}</h3>
              <p className="text-xs text-gray-400">{modelo || 'Modelo'} • Año {anio || '?'}</p>
              <p className="text-[11px] text-gray-500 italic truncate">{pieza.referencia_ubicacion}</p>
              
              {/* Costo Prominente */}
              <div className="pt-2 flex justify-between items-center border-t border-gray-100 mt-2">
                <span className="text-xs text-gray-500">Costo:</span>
                <span className="text-base font-black text-gray-900">{pieza.valor_puntos} Puntos</span>
              </div>
              
              {/* HU4 - Botón para Solicitar Trueque */}
              <button
                onClick={() => solicitarTrueque(pieza.id_inventario)}
                className="w-full mt-2 bg-gray-800 hover:bg-gray-900 text-white font-medium text-xs py-1.5 px-2 rounded transition"
              >
                Solicitar Trueque
              </button>
            </div>
          </div>
        ))}
        
        {piezasFiltradas.length === 0 && !cargando && (
          <div className="col-span-full py-8 text-center text-gray-400 text-sm">
            No se encontraron piezas en inventario para este vehículo o superan tu capacidad económica.
          </div>
        )}
      </div>
    </div>
  );
}