import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ModuloReputacionYCalificacion() {
  // --- ESTADOS DE CARGA Y PARAMETRIZACIÓN ---
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // --- ESTADOS DE LA HU 11 (Datos Reales de Reputación e Historial) ---
  const [datosUsuario, setDatosUsuario] = useState(null);
  const [comentariosComunidad, setComentariosComunidad] = useState([]); // <-- Conectado al backend ahora

  // --- ESTADOS DE LA HU 10 (Formulario de Calificación) ---
  const [transaccionesPendientes, setTransaccionesPendientes] = useState([]);
  const [txSeleccionada, setTxSeleccionada] = useState('');
  const [estrellasSeleccionadas, setEstrellasSeleccionadas] = useState(0);
  const [comentarioTexto, setComentarioTexto] = useState('');
  const [hoverEstrellas, setHoverEstrellas] = useState(0);
  const [datosReputacion, setDatosReputacion] = useState(null);

  // Mapeo de niveles basados en el saldo
  const nivelesRanking = {
    1: 'Novato',
    2: 'Aprendiz',
    3: 'Colaborador',
    4: 'Experto',
    5: 'Leyenda'
  };

  // --- CARGA DE DATOS DESDE EL BACKEND ---
  useEffect(() => {
    const cargarModulo = async () => {
      try {
        const sessionid = localStorage.getItem('sessionid');
        const headers = { 'X-Session-ID': sessionid || '' };

        // 1. Cargar historial del usuario logueado
        const resHistorial = await axios.get('/api/historial/', { headers, withCredentials: true });
        setDatosUsuario(resHistorial.data);

        // 2. Cargar transacciones pendientes por califcar
        const resPendientes = await axios.get('/api/transacciones-para-calificar/', { headers, withCredentials: true });
        setTransaccionesPendientes(resPendientes.data);

        const vecinoId = resHistorial.data.id || resHistorial.data.vecino_id;
        if (vecinoId) {
          const resReputacion = await axios.get(`/api/reputacion/${vecinoId}/`, { headers, withCredentials: true });
          setComentariosComunidad(resReputacion.data.calificaciones || []);
        }

      } catch (err) {
        console.error('Error al cargar datos de reputación:', err);
        setError(err.response?.status === 401 ? 'Debes iniciar sesión primero' : 'Error al sincronizar datos');
      } finally {
        setCargando(false);
      }
    };

    cargarModulo();

    const obtenerDatosCompletos = async () => {
      try {
        const sessionid = localStorage.getItem('sessionid');
        const configuracion = {
          headers: { 'X-Session-ID': sessionid || '' },
          withCredentials: true
        };

        // 1. Traemos el historial (para obtener los datos y el ID del usuario)
        const resHistorial = await axios.get('/api/historial/', configuracion);
        setDatosUsuario(resHistorial.data);

        // 2. Usamos el ID obtenido para consultar la reputación real del usuario
        const userId = resHistorial.data.id;
        if (userId) {
          const resReputacion = await axios.get(`/api/reputacion/${userId}/`, configuracion);
          setDatosReputacion(resReputacion.data);
          
          // Opcional: Ponemos un log para que veas en la consola la estructura exacta de la reputación
          console.log("Datos de Reputación recibidos:", resReputacion.data);
        }

      } catch (error) {
        console.error("Error al cargar los datos en la pestaña:", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerDatosCompletos();
  }, []);

  

  // --- LOGICA DE ENVÍO DE CALIFICACIÓN (HU10 conectada al backend) ---
  const handleEnviarCalificacion = async (e) => {
    e.preventDefault();

    if (!txSeleccionada) {
      alert("Por favor, selecciona una transacción para calificar.");
      return;
    }
    if (estrellasSeleccionadas === 0) {
      alert("Por favor, selecciona una puntuación en estrellas.");
      return;
    }

    const tx = transaccionesPendientes.find(t => t.id_transaccion === txSeleccionada);
    const calificadoId = tx.ofertante_id; 

    try {
      const sessionid = localStorage.getItem('sessionid');
      const payload = {
        transaccion_id: tx.id_transaccion,
        calificado_id: calificadoId,
        puntuacion: estrellasSeleccionadas,
        comentario: comentarioTexto || "Sin comentarios adicionales."
      };

      await axios.post('/api/calificar/', payload, {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      
      alert("Calificación registrada con éxito en el sistema.");
      
      setTransaccionesPendientes(prev => prev.filter(t => t.id_transaccion !== txSeleccionada));
      setTxSeleccionada('');
      setEstrellasSeleccionadas(0);
      setComentarioTexto('');

      // Recargar datos para ver reflejados los cambios
      const resHistorial = await axios.get('/api/historial/', {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      setDatosUsuario(resHistorial.data);

    } catch (err) {
      alert(err.response?.data?.error || "Error al procesar la calificación");
    }
  };

  if (cargando) return <div style={{ padding: '2rem', textAlign: 'center' }}>Sincronizando reputación con la red vecinal...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#DC2626' }}>{error}</div>;

  // --- DISEÑO VISUAL ---
  const gridLayout = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '1.5rem',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#F8F9FA',
    padding: '1.5rem',
    borderRadius: '8px'
  };

  const cardStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  };

  let promedioFinal = 5.0;
  let totalComentarios = 0;

  if (datosReputacion) {
    // Si el backend ya calcula el promedio directamente, búscalo aquí (ej: datosReputacion.promedio)
    // Ajusta el nombre de la propiedad según lo que veas en el console.log
    if (datosReputacion.promedio !== undefined) {
      promedioFinal = Number(datosReputacion.promedio);
    } else if (datosReputacion.calificaciones && datosReputacion.calificaciones.length > 0) {
      // Si el backend manda la lista, la promediamos en el front
      const lista = datosReputacion.calificaciones;
      const suma = lista.reduce((sum, c) => sum + Number(c.puntuacion || c.estrellas || 0), 0);
      promedioFinal = Math.round((suma / lista.length) * 10) / 10;
      totalComentarios = lista.length;
    }
  }

  return (
    <div style={gridLayout}>
      
      {/* ================= SECCIÓN DE LA HU 11: SISTEMA DE REPUTACIÓN REAL ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Widget de Métricas de Reputación */}
        <div style={cardStyle}>
          <h2 style={{ color: '#1E3A8A', fontSize: '18px', margin: '0 0 1.25rem 0', fontWeight: '600' }}>
            Tu Reputación Inmutable
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>SALDO ACTUAL</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#0D9488' }}>
                {datosUsuario.saldo_actual} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>Pts</span>
              </p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>TU CALIFICACIÓN</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                {[1, 2, 3, 4, 5].map((estrella) => (
                  <span
                    key={estrella}
                    style={{
                      color: estrella <= Math.round(promedioFinal) ? '#F59E0B' : '#D1D5DB',
                      fontSize: '1.75rem'
                    }}
                  >
                    ★
                  </span>
                ))}
                <span className="text-sm font-bold text-gray-600 ml-2">
                  {promedioFinal.toFixed(1)} / 5.0
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>NIVEL DE RANGO</p>
              <span style={{
                display: 'inline-block',
                backgroundColor: '#E0F2FE',
                color: '#0369A1',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginTop: '0.25rem'
              }}>
                {nivelesRanking[datosUsuario.ranking] || 'Novato'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: '#4B5563', margin: '1rem 0 0 0' }}>
            <strong>Intercambios totales realizados:</strong> {datosUsuario.total_intercambios} veces.
          </p>
        </div>

        {/* Panel de Auditoría de Puntos */}
        <div style={cardStyle}>
          <h3 style={{ color: '#1E3A8A', fontSize: '14px', margin: '0 0 0.75rem 0', fontWeight: '600' }}>
            Historial de Auditoría Real (Últimos 10)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
            {datosUsuario.transacciones_recientes?.map((tx, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid #F3F4F6', fontSize: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#374151', fontWeight: '500' }}>{tx.repuesto}</span>
                  <span style={{ fontSize: '10px', color: '#9CA3AF' }}>Con: {tx.contraparte} ({tx.fecha})</span>
                </div>
                <strong style={{ color: tx.tipo === 'Recibido' ? '#0D9488' : '#EA580C', alignSelf: 'center' }}>
                  {tx.tipo === 'Recibido' ? `+${tx.puntos}` : `-${tx.puntos}`} pts
                </strong>
              </div>
            ))}
            {datosUsuario.transacciones_recientes?.length === 0 && (
              <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>No posees registros auditados.</p>
            )}
          </div>
        </div>
      </div>

      {/* ================= SECCIÓN DE LA HU 10: CALIFICACIÓN DINÁMICA ================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Formulario de Calificación Activo */}
        <div style={cardStyle}>
          <h2 style={{ color: '#1E3A8A', fontSize: '18px', margin: '0 0 1rem 0', fontWeight: '600' }}>
            Calificar Vecino de Intercambio
          </h2>
          
          <form onSubmit={handleEnviarCalificacion}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '0.25rem' }}>
                Selecciona el intercambio a evaluar:
              </label>
              <select
                value={txSeleccionada}
                onChange={(e) => setTxSeleccionada(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px'
                }}
              >
                <option value="">-- Selecciona un intercambio pendiente --</option>
                {transaccionesPendientes.map((tx) => (
                  <option key={tx.id_transaccion} value={tx.id_transaccion}>
                    {tx.repuesto} ({tx.fecha})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '0.25rem' }}>
                ¿Cómo califica la experiencia y el componente?
              </label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[1, 2, 3, 4, 5].map((estrella) => (
                  <button
                    key={estrella}
                    type="button"
                    onClick={() => setEstrellasSeleccionadas(estrella)}
                    onMouseEnter={() => setHoverEstrellas(estrella)}
                    onMouseLeave={() => setHoverEstrellas(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '24px',
                      padding: 0,
                      color: estrella <= (hoverEstrellas || estrellasSeleccionadas) ? '#F59E0B' : '#D1D5DB',
                      transition: 'color 0.1s ease'
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '0.25rem' }}>
                Comentarios adicionales
              </label>
              <textarea
                value={comentarioTexto}
                onChange={(e) => setComentarioTexto(e.target.value)}
                placeholder="Indica si la pieza cumplía con lo acordado y la puntualidad."
                style={{
                  width: '100%',
                  height: '65px',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={transaccionesPendientes.length === 0}
              style={{
                backgroundColor: transaccionesPendientes.length === 0 ? '#9CA3AF' : '#0D9488',
                color: '#FFFFFF',
                width: '100%',
                padding: '0.6rem',
                borderRadius: '4px',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                cursor: transaccionesPendientes.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {transaccionesPendientes.length === 0 ? "No hay intercambios por calificar" : "Registrar Calificación"}
            </button>
          </form>
        </div>

        {/* ================= NUEVA SECCIÓN: COMENTARIOS Y RESEÑAS RECIBIDAS ================= */}
        <div style={cardStyle}>
          <h2 style={{ color: '#1E3A8A', fontSize: '16px', margin: '0 0 1rem 0', fontWeight: '600' }}>
            Opiniones de la Comunidad
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {comentariosComunidad.map((resena) => (
              <div key={resena.id} style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: '0.75rem', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ color: '#374151' }}>{resena.calificador}</strong>
                  <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{resena.fecha}</span>
                </div>
                
                {/* Estrellas de la reseña individual */}
                <div style={{ display: 'flex', gap: '0.1rem', marginBottom: '0.25rem' }}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <span key={num} style={{ color: num <= resena.puntuacion ? '#F59E0B' : '#D1D5DB', fontSize: '14px' }}>
                      ★
                    </span>
                  ))}
                </div>
                
                <p style={{ margin: 0, color: '#4B5563', fontStyle: 'italic', lineHeight: '1.4' }}>
                  "{resena.comentario}"
                </p>
              </div>
            ))}

            {comentariosComunidad.length === 0 && (
              <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', margin: '1rem 0' }}>
                Aún no has recibido comentarios de otros vecinos.
              </p>
            )}
          </div>
        </div>
        {/* ================================================================================= */}

      </div>
    </div>
  );
}