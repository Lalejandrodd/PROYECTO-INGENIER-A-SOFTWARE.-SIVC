import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import seenCar from '../assets/seenCar.svg';
import blueseenCar from '../assets/blueseenCar.svg';
import errorCar from '../assets/errorCar.svg';

export default function ChatWidget({ conversacionId, contraparte, repuesto, onClose }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const messagesEndRef = useRef(null);
  const userId = localStorage.getItem('user_id');

  // Cargar historial completo desde el backend
  const cargarHistorial = async () => {
    try {
      const sessionid = localStorage.getItem('sessionid');
      const response = await axios.get(`/api/chat/historial/${conversacionId}/`, {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      setMensajes(response.data.mensajes || []);
    } catch (err) {
      console.error('Error cargando historial:', err);
    }
  };

  // Polling cada 3 segundos para actualizar mensajes nuevos y estados de lectura
  useEffect(() => {
    cargarHistorial();
    const interval = setInterval(cargarHistorial, 3000);
    return () => clearInterval(interval);
  }, [conversacionId]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // Enviar mensaje
  const enviarMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;
    setEnviando(true);

    // Crear un mensaje temporal para mostrar instantáneamente (estado "sending")
    const tempId = Date.now().toString();
    const tempMsg = {
      id: tempId,
      texto: nuevoMensaje,
      fecha: new Date().toISOString(),
      emisor: 'tú',
      emisor_id: userId,
      estado: 'sending',
      leido: false
    };
    setMensajes(prev => [...prev, tempMsg]);
    setNuevoMensaje('');

    try {
      const sessionid = localStorage.getItem('sessionid');
      await axios.post('/api/chat/enviar/', {
        conversacion_id: conversacionId,
        texto: tempMsg.texto
      }, {
        headers: { 'X-Session-ID': sessionid || '' },
        withCredentials: true
      });
      // Recargar historial para obtener el mensaje real con su estado y ID definitivo
      await cargarHistorial();
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      // Marcar el mensaje temporal como error
      setMensajes(prev => prev.map(msg =>
        msg.id === tempId ? { ...msg, estado: 'error' } : msg
      ));
    } finally {
      setEnviando(false);
    }
  };

  // Función que devuelve el icono según el estado del mensaje
  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'sent':
        return <img src={seenCar} alt="Enviado" className="w-3.5 h-3.5 ml-1" />;
      case 'read':
        return <img src={blueseenCar} alt="Leído" className="w-3.5 h-3.5 ml-1" />;
      case 'error':
        return <img src={errorCar} alt="Error" className="w-3.5 h-3.5 ml-1" />;
      case 'sending':
        // Opcional: ícono de reloj o loading
        return <div className="w-3.5 h-3.5 ml-1 border-t border-blue-500 rounded-full animate-spin"></div>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
        <div>
          <span className="font-bold">Chat con {contraparte}</span>
          <p className="text-xs opacity-90">{repuesto}</p>
        </div>
        <button onClick={onClose} className="text-white hover:text-gray-200">✕</button>
      </div>

      {/* Área de mensajes */}
      <div className="h-96 overflow-y-auto p-3 bg-gray-50 flex flex-col">
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`mb-2 flex ${msg.emisor_id === userId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm relative ${
                msg.emisor_id === userId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p>{msg.texto}</p>
              <div className="flex justify-end items-center gap-1 mt-1">
                <span className="text-[10px] opacity-70">
                  {new Date(msg.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.emisor_id === userId && getEstadoIcon(msg.estado)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulario de envío */}
      <form onSubmit={enviarMensaje} className="p-2 border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
          disabled={enviando}
        />
        <button
          type="submit"
          disabled={enviando}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}