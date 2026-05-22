import React, { useState, useEffect } from 'react';

import axios from 'axios'; 

// Interfaz de la HU 1, 7, 12

export default function RegistroOfertas() {
  const [formData, setFormData] = useState({ marca: '', modelo: '', anio: '', descripcion: '' });
  const [imagenes, setImagenes] = useState([]);
  const [puntosCalculados, setPuntosCalculados] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // HU 12: Tasación automática basada en los valores técnicos ingresados (Algoritmo simulado)
  useEffect(() => {
    if (formData.marca && formData.modelo && formData.anio) {
      let basePoints = 150;
      if (parseInt(formData.anio) > 2018) basePoints += 100;
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
    
    // Validaciones (manteniendo tus reglas de negocio)
    if (imagenes.length < 3 || imagenes.length > 5) {
      setError('Error inmediato: Debes subir obligatoriamente entre 3 y 5 fotografías (.jpg/.png).');
      return;
    }
    if (!formData.marca || !formData.modelo || !formData.anio) {
      setError('Todos los campos técnicos de cabecera son obligatorios.');
      return;
    }
    
    setError(''); // Limpiamos errores previos

    // 1. Preparamos el "paquete" de datos usando FormData (necesario para imágenes)
    const formPayload = new FormData();
    formPayload.append('marca', formData.marca);
    formPayload.append('modelo', formData.modelo);
    formPayload.append('anio', formData.anio);
    formPayload.append('descripcion', formData.descripcion);

    // Adjuntamos todas las imágenes al paquete
    imagenes.forEach((imagen) => {
      formPayload.append('imagenes', imagen); 
    });

    try {
      // 2. Disparamos la petición POST al nuevo endpoint de Django
      // (Asegúrate de ajustar la URL base según cómo hayas configurado tu proyecto raíz)
      const response = await axios.post('http://localhost:8000/api/crear/', formPayload, {
        headers: {
          'Content-Type': 'multipart/form-data', // Fundamental para enviar fotos
        },
      });

      console.log("Respuesta de Django:", response.data);
      
      // 3. Mostramos éxito
      setSuccess(true);
      
      // Opcional: limpiar el formulario aquí si lo deseas
      
    } catch (error) {
      console.error("Error conectando al backend:", error);
      if (error.response) {
        // Django devolvió un error (ej. error 400)
        setError(`Error del servidor: ${error.response.data.error || 'Algo salió mal'}`);
      } else {
        setError('No se pudo conectar con el servidor de Django. Verifica que esté encendido.');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Publicar Repuesto Automotriz</h2>
      
      {error && <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded">¡Oferta registrada exitosamente en la comunidad!</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase">Marca *</label>
            <select name="marca" onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
              <option value="">Seleccione</option>
              <option value="Toyota">Toyota</option>
              <option value="Chevrolet">Chevrolet</option>
              <option value="Ford">Ford</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase">Modelo *</label>
            <input type="text" name="modelo" placeholder="Ej: Corolla" onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase">Año *</label>
            <input type="number" name="anio" placeholder="Ej: 2015" onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase">Descripción de la Pieza</label>
          <textarea name="descripcion" onChange={handleInputChange} rows="3" className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm" placeholder="Detalles sobre el estado físico o de recuperación..."></textarea>
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

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-150">
          Guardar e Indexar Oferta
        </button>
      </form>
    </div>
  );
}