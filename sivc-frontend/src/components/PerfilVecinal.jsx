import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function PerfilVecinal() {
  const [historial, setHistorial] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const obtenerHistorial = async () => {
      try {
        const sessionid = localStorage.getItem('sessionid');
        const response = await axios.get('/api/historial/', {
          headers: {
            'X-Session-ID': sessionid || ''
          },
          withCredentials: true
        });
        setHistorial(response.data);
      } catch (err) {
        console.error('Error:', err);
        if (err.response?.status === 401) {
          setError('Debes iniciar sesión primero');
        } else {
          setError('Error al cargar el historial');
        }
      } finally {
        setCargando(false);
      }
    };
    obtenerHistorial();
  }, []);

  if (cargando) return <div className="p-6 text-center">Cargando perfil...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!historial) return <div className="p-6 text-center">No hay datos disponibles</div>;

  const nivelesRanking = {
    1: 'Novato',
    2: 'Aprendiz',
    3: 'Colaborador',
    4: 'Experto',
    5: 'Leyenda'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-5 shadow-sm">
        <p className="text-xs text-slate-400 font-semibold">Usuario Comunitario</p>
        <h3 className="text-xl font-bold">{historial.vecino}</h3>
        <div className="border-t border-slate-700 my-3"></div>
        <div className="flex justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Saldo Disponible</span>
            <span className="text-3xl font-black text-amber-400">{historial.saldo_actual} pts</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Nivel</span>
            <span className="text-xl font-bold text-emerald-400">{nivelesRanking[historial.ranking] || 'Novato'}</span>
          </div>
        </div>
      </div>

      <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">Historial de Transacciones</h3>
        {historial.transacciones_recientes?.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay transacciones aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Repuesto</th>
                  <th className="p-2">Contraparte</th>
                  <th className="p-2 text-right">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {historial.transacciones_recientes?.map((tx, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 text-gray-500">{tx.fecha}</td>
                    <td className="p-2 font-medium">{tx.repuesto}</td>
                    <td className="p-2 text-gray-600">{tx.contraparte}</td>
                    <td className={`p-2 text-right font-bold ${tx.tipo === 'Recibido' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.tipo === 'Recibido' ? `+${tx.puntos}` : `-${tx.puntos}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}