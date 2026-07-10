import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ChatWidget from './ChatWidget';

const RANKING_LABELS = {
  1: { name: "Novato", color: "bg-gray-100 text-gray-800 border-gray-300" },
  2: { name: "Aprendiz", color: "bg-blue-100 text-blue-800 border-blue-300" },
  3: { name: "Colaborador", color: "bg-purple-100 text-purple-800 border-purple-300" },
  4: { name: "Experto", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  5: { name: "Leyenda", color: "bg-amber-100 text-amber-800 border-amber-300" }
};

export default function PanelTransacciones() {
  const [historial, setHistorial] = useState(null);
  const [ranking, setRanking] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [conversaciones, setConversaciones] = useState([]);
  const [chatAbierto, setChatAbierto] = useState(null);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [transaccionesPendientes, setTransaccionesPendientes] = useState([]);
  const [acuerdos, setAcuerdos] = useState([]); // Todos los acuerdos activos del usuario

  // Cargar conversaciones (chat)
  const cargarConversaciones = async () => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      const response = await axios.get('/api/chat/conversaciones/', {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      setConversaciones(response.data.conversaciones || []);
    } catch (err) {
      console.error('Error cargando conversaciones:', err);
    }
  };

  // Cargar solicitudes pendientes (para el ofertante)
  const cargarSolicitudesPendientes = async () => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      const response = await axios.get('/api/solicitudes-pendientes/', {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      setSolicitudesPendientes(response.data || []);
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
    }
  };

  // Cargar transacciones pendientes de confirmar (para el demandante)
  const cargarTransaccionesPendientes = async () => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      const response = await axios.get('/api/transacciones-para-confirmar/', {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      setTransaccionesPendientes(response.data || []);
    } catch (err) {
      console.error('Error cargando transacciones pendientes:', err);
    }
  };

  // Cargar todos los acuerdos activos del usuario (para cancelaciones)
  const cargarAcuerdos = async () => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      const response = await axios.get('/api/mis-acuerdos/', {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      setAcuerdos(response.data || []);
    } catch (err) {
      console.error('Error cargando acuerdos:', err);
    }
  };

  // Aceptar un trueque (oferta pendiente)
  const aceptarSolicitud = async (acuerdoId) => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      await axios.post(`/api/aceptar/${acuerdoId}/`, {}, {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      alert('✅ Intercambio aceptado. Se ha habilitado el chat.');
      // Recargar listas
      cargarSolicitudesPendientes();
      cargarConversaciones();
      cargarAcuerdos();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Error al aceptar el intercambio';
      alert('❌ ' + mensaje);
    }
  };

  // Confirmar recepción (demandante)
  const confirmarRecepcion = async (transaccionId) => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      await axios.post(`/api/confirmar-recepcion/${transaccionId}/`, {}, {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      alert('✅ Recepción confirmada. Puntos transferidos al ofertante.');
      // Recargar listas
      cargarTransaccionesPendientes();
      cargarConversaciones();
      cargarAcuerdos();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Error al confirmar recepción';
      alert('❌ ' + mensaje);
    }
  };

  // Solicitar cancelación (cualquier parte)
  const solicitarCancelacion = async (acuerdoId) => {
    if (!window.confirm('¿Estás seguro de que deseas cancelar este trueque?')) return;
    try {
      const sessionid = localStorage.getItem('sessionid');
      await axios.post(`/api/solicitar-cancelacion/${acuerdoId}/`, {}, {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      alert('✅ Solicitud de cancelación enviada. Espera la confirmación de la otra parte.');
      cargarAcuerdos();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Error al solicitar cancelación';
      alert('❌ ' + mensaje);
    }
  };

  // Confirmar cancelación (la otra parte)
  const confirmarCancelacion = async (acuerdoId) => {
    if (!window.confirm('¿Confirmar la cancelación de este trueque?')) return;
    try {
      const sessionid = localStorage.getItem('sessionid');
      await axios.post(`/api/confirmar-cancelacion/${acuerdoId}/`, {}, {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      alert('✅ Trueque cancelado exitosamente.');
      cargarAcuerdos();
      cargarConversaciones();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Error al confirmar cancelación';
      alert('❌ ' + mensaje);
    }
  };

  // Rechazar cancelación (la otra parte)
  const rechazarCancelacion = async (acuerdoId) => {
    if (!window.confirm('¿Rechazar la solicitud de cancelación?')) return;
    try {
      const sessionid = localStorage.getItem('sessionid');
      await axios.post(`/api/rechazar-cancelacion/${acuerdoId}/`, {}, {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      alert('✅ Cancelación rechazada. El trueque continúa.');
      cargarAcuerdos();
    } catch (err) {
      const mensaje = err.response?.data?.error || 'Error al rechazar cancelación';
      alert('❌ ' + mensaje);
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const sessionid = localStorage.getItem('sessionid');
        const headers = { 'X-Session-ID': sessionid || '' };
        
        const [
          historialRes,
          rankingRes,
          conversacionesRes,
          solicitudesRes,
          transaccionesPendientesRes,
          acuerdosRes
        ] = await Promise.all([
          axios.get('/api/historial/', { headers, withCredentials: true }),
          axios.get('/api/ranking/', { withCredentials: true }),
          axios.get('/api/chat/conversaciones/', { headers, withCredentials: true }),
          axios.get('/api/solicitudes-pendientes/', { headers, withCredentials: true }),
          axios.get('/api/transacciones-para-confirmar/', { headers, withCredentials: true }),
          axios.get('/api/mis-acuerdos/', { headers, withCredentials: true })
        ]);
        
        setHistorial(historialRes.data);
        setRanking(rankingRes.data.ranking || []);
        setConversaciones(conversacionesRes.data.conversaciones || []);
        setSolicitudesPendientes(solicitudesRes.data || []);
        setTransaccionesPendientes(transaccionesPendientesRes.data || []);
        setAcuerdos(acuerdosRes.data || []);
      } catch (err) {
        console.error('Error:', err);
        if (err.response?.status === 401) {
          setError('Debes iniciar sesión primero');
        } else {
          setError('Error al cargar los datos');
        }
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  if (cargando) return <div className="p-6 text-center">Cargando...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!historial) return <div className="p-6 text-center">No hay datos disponibles</div>;

  const rankingActual = RANKING_LABELS[historial.ranking] || RANKING_LABELS[1];

  // Filtrar acuerdos que no estén completados o cancelados
  const acuerdosActivos = acuerdos.filter(a => a.estado !== 'completado' && a.estado !== 'cancelado');

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-8 font-sans">
      {/* Tarjeta de perfil */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Perfil del Vecino</span>
          <h1 className="text-2xl font-black text-gray-800">{historial.vecino}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-gray-500">Nivel del Reconocimiento:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${rankingActual.color}`}>
              {rankingActual.name}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-100 w-full md:w-auto">
          <div className="text-center px-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Saldo Actual</span>
            <span className="text-xl font-extrabold text-blue-600">{historial.saldo_actual} pts</span>
          </div>
          <div className="text-center px-2 border-x border-gray-200">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Intercambios</span>
            <span className="text-xl font-extrabold text-gray-700">{historial.total_intercambios}</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Acumulado</span>
            <span className="text-xl font-extrabold text-emerald-600">+{historial.puntos_acumulados_historicos} pts</span>
          </div>
        </div>
      </div>

      {/* Historial y Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Historial de Transacciones</h2>
              <p className="text-xs text-gray-400">Listado inmutable indexado bajo protección de datos.</p>
            </div>
            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded uppercase">🔒 Inalterable</span>
          </div>

          {historial.transacciones_recientes?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No hay transacciones aún</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Repuesto</th>
                    <th className="p-3">Asociado</th>
                    <th className="p-3">Operación</th>
                    <th className="p-3 text-right">Puntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historial.transacciones_recientes.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3 text-gray-400 whitespace-nowrap">{tx.fecha}</td>
                      <td className="p-3 font-semibold text-gray-700">{tx.repuesto}</td>
                      <td className="p-3 text-gray-600">{tx.contraparte}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.tipo === 'Recibido' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                          {tx.tipo === 'Recibido' ? 'Ofertante' : 'Demandante'}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-black text-sm ${tx.tipo === 'Recibido' ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {tx.tipo === 'Recibido' ? `+${tx.puntos}` : `-${tx.puntos}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Ranking Comunitario</h2>
          <div className="space-y-2">
            {ranking.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No hay usuarios registrados</p>
            ) : (
              ranking.map((user, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-500 w-6">#{user.posicion}</span>
                    <span className="text-sm font-medium text-gray-800">{user.nombre}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{user.puntos} pts</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN: MIS ACUERDOS ACTIVOS (con opción de cancelar) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🔄 Mis Intercambios Activos</h2>
        {acuerdosActivos.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay intercambios activos.</p>
        ) : (
          <div className="space-y-4">
            {acuerdosActivos.map((acuerdo) => {
              const userId = parseInt(localStorage.getItem('user_id') || '0');
              const esOfertante = acuerdo.ofertante_id === userId;
              const esDemandante = acuerdo.demandante_id === userId;
              const otraParte = esOfertante ? acuerdo.demandante_nombre : acuerdo.ofertante_nombre;

              return (
                <div key={acuerdo.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{acuerdo.repuesto}</p>
                      <p className="text-xs text-gray-500">
                        {esOfertante ? 'Ofreciste' : 'Solicitaste'} a <strong>{otraParte}</strong>
                      </p>
                      <p className="text-xs text-gray-400">
                        Estado: <span className={`font-semibold ${acuerdo.estado === 'aceptado' ? 'text-green-600' : 'text-amber-600'}`}>{acuerdo.estado}</span>
                      </p>
                      {acuerdo.estado === 'cancelacion_pendiente' && (
                        <p className="text-xs text-red-500 mt-1">⚠️ Cancelación solicitada por la otra parte</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {/* Aceptar trueque (solo ofertante cuando está pendiente) */}
                      {acuerdo.estado === 'pendiente' && esOfertante && (
                        <button
                          onClick={() => aceptarSolicitud(acuerdo.id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded"
                        >
                          Aceptar Trueque
                        </button>
                      )}

                      {/* Cancelación pendiente: mostrar botones a la otra parte */}
                      {acuerdo.estado === 'cancelacion_pendiente' && acuerdo.cancelacion_solicitada_por && acuerdo.cancelacion_solicitada_por !== userId && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => confirmarCancelacion(acuerdo.id)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
                          >
                            Confirmar Cancelación
                          </button>
                          <button
                            onClick={() => rechazarCancelacion(acuerdo.id)}
                            className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}

                      {/* Botón solicitar cancelación (disponible para ambas partes en pendiente o aceptado, si no hay solicitud pendiente) */}
                      {acuerdo.estado !== 'cancelacion_pendiente' && acuerdo.estado !== 'completado' && (
                        <button
                          onClick={() => solicitarCancelacion(acuerdo.id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                        >
                          Solicitar Cancelación
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Solicitudes Pendientes (para el ofertante) */}
      {solicitudesPendientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
          <h2 className="text-lg font-bold text-amber-700 mb-4">📩 Solicitudes de Trueque Pendientes</h2>
          <div className="space-y-3">
            {solicitudesPendientes.map(s => (
              <div key={s.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div>
                  <p className="font-medium">{s.repuesto}</p>
                  <p className="text-xs text-gray-500">Solicitado por <strong>{s.demandante_nombre}</strong> • {s.fecha}</p>
                </div>
                <button
                  onClick={() => aceptarSolicitud(s.id)}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded"
                >
                  Aceptar Trueque
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transacciones pendientes de confirmar (demandante) */}
      {transaccionesPendientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <h2 className="text-lg font-bold text-blue-700 mb-4">📦 Repuestos Recibidos – Confirmar Recepción</h2>
          <div className="space-y-3">
            {transaccionesPendientes.map(t => (
              <div key={t.id_transaccion} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div>
                  <p className="font-medium">{t.repuesto}</p>
                  <p className="text-xs text-gray-500">
                    De: <strong>{t.ofertante_nombre}</strong> • {t.fecha}
                  </p>
                  <p className="text-xs text-gray-500">Puntos a transferir: <strong>{t.puntos} pts</strong></p>
                </div>
                <button
                  onClick={() => confirmarRecepcion(t.id_transaccion)}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded"
                >
                  Confirmar Recepción
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversaciones activas (chat) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">💬 Mis Conversaciones Activas</h2>
        {conversaciones.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay conversaciones activas.</p>
        ) : (
          <div className="space-y-3">
            {conversaciones.map(conv => (
              <div key={conv.conversacion_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{conv.repuesto}</p>
                  <p className="text-xs text-gray-500">con {conv.contraparte}</p>
                </div>
                <button
                  onClick={() => setChatAbierto(conv)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
                >
                  Chat Privado
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Widget de chat flotante */}
      {chatAbierto && (
        <ChatWidget
          conversacionId={chatAbierto.conversacion_id}
          contraparte={chatAbierto.contraparte}
          repuesto={chatAbierto.repuesto}
          onClose={() => setChatAbierto(null)}
        />
      )}
    </div>
  );
}