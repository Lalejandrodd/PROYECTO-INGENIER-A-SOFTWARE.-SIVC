import React, { useState, useEffect } from 'react';
import axios from 'axios'; 
import { useNavigate } from 'react-router-dom'; // Enrutamiento programático para la interconexión

// Interfaz de la HU 1, 7, 12

export default function RegistroOfertas() {
  const navigate = useNavigate(); // Instancia para conectar las interfaces individualmente

  const [formData, setFormData] = useState({ marca: '', modelo: '', anio: '', descripcion: '' });
  const [imagenes, setImagenes] = useState([]);
  const [puntosCalculados, setPuntosCalculados] = useState(0);
  const [error, setError] = useState(''); // Estado local de React para mostrar errores en la interfaz
  const [success, setSuccess] = useState(false);

  // HU 12: Tasación automática basada en los valores técnicos ingresados (Algoritmo simulado)
  useEffect(() => {
    if (formData.marca && formData.modelo && formData.anio) {
      let basePoints = 150;
      if (parseInt(formData.anio, 10) > 2018) basePoints += 100;
      if (formData.marca.toLowerCase() === 'toyota' || formData.marca.toLowerCase() === 'chevrolet') basePoints += 50;
      setPuntosCalculados(basePoints);
    } else {
      setPuntosCalculados(0);
    }
  }, [formData]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImagenes(files);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones locales obligatorias por la ERS
    if (imagenes.length < 3 || imagenes.length > 5) {
      setError('Error inmediato: Debes subir obligatoriamente entre 3 y 5 fotografías (.jpg/.png).');
      return;
    }
    if (!formData.marca || !formData.modelo || !formData.anio) {
      setError('Todos los campos técnicos de cabecera son obligatorios.');
      return;
    }
    
    setError(''); // Limpiamos errores visuales antes de iniciar la petición HTTP

    // 1. Preparamos el paquete de datos estructurado FormData para envío de multimedia
    const formPayload = new FormData();
    formPayload.append('marca', formData.marca);
    formPayload.append('modelo', formData.modelo);
    formPayload.append('anio', formData.anio);
    formPayload.append('descripcion', formData.descripcion);

    // Adjuntamos la colección de imágenes cargadas
    imagenes.forEach((imagen) => {
      formPayload.append('imagenes', imagen); 
    });

    try {
      // 2. Disparamos la petición POST asíncrona hacia Django
      const response = await axios.post('http://localhost:8000/api/crear/', formPayload, {

        headers: {
          'Content-Type': 'multipart/form-data', // Requisito esencial para procesar archivos
        },
      });

      console.log("Respuesta de Django con éxito:", response.data);
      
      // 3. Modificamos estados de notificación exitosa
      setSuccess(true);
      setError('');
      
      // 4. Redirección automática al catálogo individual al guardar correctamente en la base de datos
      navigate('/catalogo');
      
    } catch (err) { 
      console.error("Detalle del fallo de conexión capturado:", err);
      
      // 🔄 NUEVA LÓGICA DE CONTROL CORREGIDA Y BLINDADA:
      // Evaluamos de forma segura si existe una respuesta estructurada del servidor
      if (err.response && err.response.data) {
        const mensajeDjango = err.response.data.error || 'Datos de formulario inválidos.';
        // CORRECCIÓN LÍNEA 90: Cambiado comillas simples por backticks para habilitar la interpolación
        setError(`Error del servidor: ${mensajeDjango}`);
      } else if (err.request) {
        // La petición se realizó pero no hubo respuesta (servidor de Django apagado o caído)
        setError('No se pudo obtener respuesta del servidor de Django. Por favor, verifica en tu terminal que el backend esté corriendo en http://localhost:8000 (python manage.py runserver).');
      } else {
        // Cualquier otro error de configuración en la petición
        // CORRECCIÓN LÍNEA 96: Cambiado comillas simples por backticks para habilitar la interpolación
        setError(`Error de inicialización: ${err.message}`);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Publicar Repuesto Automotriz</h2>
      
      {/* Mensajes informativos de la UI */}
      {error && <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded border border-green-200">¡Oferta registrada exitosamente en la comunidad!</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase">Marca *</label>
            <select name="marca" onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm">
              <option value="">Seleccione</option>
              <option value="Toyota">Toyota</option>
              <option value="Chevrolet">Chevrolet</option>
              <option value="Ford">Ford</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase">Modelo *</label>
            <input type="text" name="modelo" placeholder="Ej: Corolla" onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase">Año *</label>
            <input type="number" name="anio" placeholder="Ej: 2015" onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase">Descripción de la Pieza</label>
          <textarea name="descripcion" onChange={handleInputChange} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" placeholder="Detalles sobre el estado físico o de recuperación..."></textarea>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase">Galería Visual (Mínimo 3, Máximo 5) *</label>
          <input type="file" multiple accept=".jpg,.jpeg,.png" onChange={handleImageChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <span className="text-xs text-gray-400 mt-1 block">Archivos cargados: {imagenes.length}</span>
        </div>

        {/* HU 12: Bloque de Visualización de Puntos Ineditable */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-blue-900 text-sm">Valor de Intercambio Asignado</h4>
            <p className="text-xs text-blue-700">Calculado automáticamente mediante el algoritmo de tasación comunitaria.</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-blue-900">{puntosCalculados}</span>
            <span className="text-xs block text-blue-900 font-medium">Puntos de Valor</span>
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-150 text-sm">
          Guardar e Indexar Oferta
        </button>
      </form>
    </div>
  );
}