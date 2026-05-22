import React, { useState, useEffect } from 'react';
import axios from 'axios'; 
import { useNavigate } from 'react-router-dom'; // <-- Enrutamiento para conectar interfaces

export default function BusquedaInteligente({ saldoUsuario = 140 }) {
  const navigate = useNavigate(); // <-- Instancia para cambiar de pantalla individualmente

  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState(''); 
  const [soloAsequibles, setSoloAsequibles] = useState(false);

  const [piezas, setPiezas] = useState([]); 
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const realizarBusqueda = async (e) => {
    if (e) e.preventDefault();

    if (!marca || !modelo || !anio) {
      setError('Para buscar, debes ingresar obligatoriamente Marca, Modelo y Año del vehículo.');
      return;
    }

    setError('');
    setCargando(true);

    try {
      const response = await axios.get('http://localhost:8000/api/buscar/', {
        params: { marca, modelo, anio }
      });
      setPiezas(response.data);
    } catch (err) {
      console.error("Error al consultar el catálogo:", err);
      setError('Hubo un error al conectar con el servidor o no se encontraron vehículos coincidentes.');
    } finally {
      setCargando(false);
    }
  };

  // Acción al presionar solicitar trueque
  const handleSolicitarTrueque = (idInventario) => {
    console.log("Iniciando solicitud para el item:", idInventario);
    navigate('/perfil'); // Redirige de forma individual al Perfil Historial
  };

  const piezasFiltradas = piezas.filter(pieza => {
    return soloAsequibles ? pieza.valor_puntos <= saldoUsuario : true;
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800">Buscador Inteligente de Repuestos</h2>

      {error && <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">{error}</div>}

      <form onSubmit={realizarBusqueda} className="p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">Marca *</label>
          <select value={marca} onChange={(e) => setMarca(e.target.value)} className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm">
            <option value="">Todas las marcas</option>
            <option value="Toyota">Toyota</option>
            <option value="Chevrolet">Chevrolet</option>
            <option value="Ford">Ford</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">Modelo *</label>
          <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Ej: Corolla" className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase">Año *</label>
          <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="Ej: 2015" className="mt-1 block w-full p-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm" />
        </div>
        
        <div className="pt-4 md:pt-4 flex flex-col gap-2">
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-xs transition">
            {cargando ? 'Buscando...' : 'Buscar Compatibles'}
          </button>
        </div>

        <div className="flex items-center col-span-full pt-2 border-t border-gray-200 mt-2">
          <input type="checkbox" id="saldoFilter" checked={soloAsequibles} onChange={(e) => setSoloAsequibles(e.target.checked)} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
          <label htmlFor="saldoFilter" className="ml-2 text-xs font-medium text-gray-700">
            Ver solo lo que puedo adquirir con mi saldo actual ({saldoUsuario} pts disp.)
          </label>
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {piezasFiltradas.map((pieza) => (
          <div key={pieza.id_inventario} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
            <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">[Sin Imagen]</div>
            <div className="p-3 space-y-1">
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{marca}</span>
              <h3 className="font-bold text-gray-800 text-sm truncate">{pieza.repuesto}</h3>
              <p className="text-xs text-gray-400">{modelo} • Año {anio}</p>
              <p className="text-[11px] text-gray-500 italic truncate">{pieza.referencia_ubicacion}</p>
              <div className="pt-2 flex justify-between items-center border-t border-gray-100 mt-2">
                <span className="text-xs text-gray-500">Costo:</span>
                <span className="text-base font-black text-gray-900">{pieza.valor_puntos} Puntos</span>
              </div>
              <button 
                onClick={() => handleSolicitarTrueque(pieza.id_inventario)}
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