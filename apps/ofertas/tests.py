import os
import shutil
from io import BytesIO

from django.test import TestCase, Client, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.conf import settings

from apps.usuarios.models import Usuario, Vecino
from apps.vehiculos.models import Vehiculo
from apps.repuestos.models import Repuesto
from apps.ofertas.models import Oferta, Fotografia, validar_extension_imagen


# Directorio temporal para media en tests
TEST_MEDIA_ROOT = os.path.join(settings.BASE_DIR, 'test_media')


def crear_imagen_test(nombre='foto_test.jpg', contenido=b'contenido-imagen-falso'):
    """Crea un archivo simulado para tests."""
    return SimpleUploadedFile(
        name=nombre,
        content=contenido,
        content_type='image/jpeg'
    )


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class TestValidadorExtension(TestCase):
    """
    HU 7 - Escenario 2: Restricción de formatos de archivo.
    Pruebas unitarias del validador de extensión de imagen.
    """

    def test_extension_jpg_valida(self):
        """Debe aceptar archivos .jpg"""
        archivo = crear_imagen_test('foto.jpg')
        # No debe lanzar excepción
        validar_extension_imagen(archivo)

    def test_extension_jpeg_valida(self):
        """Debe aceptar archivos .jpeg"""
        archivo = crear_imagen_test('foto.jpeg')
        validar_extension_imagen(archivo)

    def test_extension_png_valida(self):
        """Debe aceptar archivos .png"""
        archivo = crear_imagen_test('foto.png')
        validar_extension_imagen(archivo)

    def test_extension_pdf_invalida(self):
        """Debe rechazar archivos .pdf"""
        archivo = crear_imagen_test('documento.pdf')
        with self.assertRaises(ValidationError):
            validar_extension_imagen(archivo)

    def test_extension_gif_invalida(self):
        """Debe rechazar archivos .gif"""
        archivo = crear_imagen_test('animacion.gif')
        with self.assertRaises(ValidationError):
            validar_extension_imagen(archivo)

    def test_extension_bmp_invalida(self):
        """Debe rechazar archivos .bmp"""
        archivo = crear_imagen_test('imagen.bmp')
        with self.assertRaises(ValidationError):
            validar_extension_imagen(archivo)


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class TestRegistroOfertaConFotos(TestCase):
    """
    HU 7 - Escenarios 1, 2 y 3: Tests de integración para el endpoint
    registrar_oferta con validación de fotografías.
    """

    def setUp(self):
        """Preparar datos necesarios para cada test."""
        self.client = Client()

        # Crear usuario vecino
        self.usuario = Usuario.objects.create_user(
            username='vecino_test',
            password='password123',
            id_usuario='VEC001',
            nombre_completo='Vecino de Prueba'
        )
        self.vecino = Vecino.objects.create(
            usuario=self.usuario,
            residencia='Calle Falsa 123',
            saldo_puntos=100.0
        )

        # Crear vehículo y repuesto
        self.vehiculo = Vehiculo.objects.create(
            marca='Toyota',
            modelo='Corolla',
            anio=2020
        )
        self.repuesto = Repuesto.objects.create(
            nombre_pieza='Motor',
            descripcion_tecnica='Motor 1.8L en buen estado',
            estado_fisico='Usado - Funcional'
        )
        self.repuesto.compatibilidad.add(self.vehiculo)

        # Iniciar sesión para obtener session_id
        self.client.login(username='vecino_test', password='password123')
        self.session_id = self.client.session.session_key

    def tearDown(self):
        """Limpiar archivos media de test."""
        if os.path.exists(TEST_MEDIA_ROOT):
            shutil.rmtree(TEST_MEDIA_ROOT)

    def _datos_oferta(self):
        """Retorna los datos base para crear una oferta."""
        return {
            'repuesto_id': str(self.repuesto.id_repuesto),
            'rango_horario': 'Lunes a Viernes 8am-4pm',
            'referencia_ubicacion': 'Frente a la plaza central',
        }

    def _crear_imagenes(self, cantidad, extension='.jpg'):
        """Crea una lista de archivos de imagen para tests."""
        imagenes = []
        for i in range(cantidad):
            nombre = f'foto_{i+1}{extension}'
            imagenes.append(crear_imagen_test(nombre))
        return imagenes

    # ========================================================
    # Escenario 1: Validación de cantidad mínima de fotos
    # ========================================================

    def test_rechazar_oferta_con_menos_de_3_fotos(self):
        """
        Dado que un vecino está completando el formulario de Registro de Oferta,
        Cuando intenta guardar con menos de 3 fotografías,
        Entonces el sistema debe impedir el guardado y mostrar error.
        """
        datos = self._datos_oferta()
        imagenes = self._crear_imagenes(2)  # Solo 2 fotos

        datos['imagenes'] = imagenes
        response = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('al menos 3 fotografías', response.json()['error'])
        # Verificar que NO se creó ninguna oferta
        self.assertEqual(Oferta.objects.count(), 0)

    def test_rechazar_oferta_con_mas_de_5_fotos(self):
        """
        Dado que un vecino está completando el formulario de Registro de Oferta,
        Cuando intenta guardar con más de 5 fotografías,
        Entonces el sistema debe impedir el guardado y mostrar error.
        """
        datos = self._datos_oferta()
        imagenes = self._crear_imagenes(6)  # 6 fotos

        datos['imagenes'] = imagenes
        response = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('No se aceptan más de 5', response.json()['error'])
        self.assertEqual(Oferta.objects.count(), 0)

    def test_aceptar_oferta_con_3_fotos(self):
        """Debe aceptar exactamente 3 fotos (límite inferior)."""
        datos = self._datos_oferta()
        imagenes = self._crear_imagenes(3)

        datos['imagenes'] = imagenes
        response = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Oferta.objects.count(), 1)
        self.assertEqual(Fotografia.objects.count(), 3)

    def test_aceptar_oferta_con_4_fotos(self):
        """Debe aceptar 4 fotos (dentro del rango)."""
        datos = self._datos_oferta()
        imagenes = self._crear_imagenes(4)

        datos['imagenes'] = imagenes
        response = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Fotografia.objects.count(), 4)

    def test_aceptar_oferta_con_5_fotos(self):
        """Debe aceptar exactamente 5 fotos (límite superior)."""
        datos = self._datos_oferta()
        imagenes = self._crear_imagenes(5)

        datos['imagenes'] = imagenes
        response = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Fotografia.objects.count(), 5)

    # ========================================================
    # Escenario 2: Restricción de formatos de archivo
    # ========================================================

    def test_rechazar_archivo_pdf(self):
        """
        Dado que el usuario procede a cargar las imágenes,
        Cuando selecciona un archivo .pdf,
        Entonces el sistema debe notificar que el formato es inválido.
        """
        datos = self._datos_oferta()
        # 2 JPG válidas + 1 PDF inválida
        imagenes = self._crear_imagenes(2, '.jpg')
        imagenes.append(crear_imagen_test('documento.pdf'))

        datos['imagenes'] = imagenes
        response = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('formato inválido', response.json()['error'])
        self.assertEqual(Oferta.objects.count(), 0)

    def test_rechazar_archivo_gif(self):
        """
        Dado que el usuario procede a cargar las imágenes,
        Cuando selecciona un archivo .gif,
        Entonces el sistema debe notificar que el formato es inválido.
        """
        datos = self._datos_oferta()
        imagenes = self._crear_imagenes(2, '.jpg')
        imagenes.append(crear_imagen_test('animacion.gif'))

        datos['imagenes'] = imagenes
        response = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('formato inválido', response.json()['error'])

    def test_aceptar_mezcla_jpg_y_png(self):
        """Debe aceptar una mezcla de archivos JPG y PNG."""
        datos = self._datos_oferta()
        imagenes = [
            crear_imagen_test('foto1.jpg'),
            crear_imagen_test('foto2.png'),
            crear_imagen_test('foto3.jpg'),
        ]

        datos['imagenes'] = imagenes
        response = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Fotografia.objects.count(), 3)

    # ========================================================
    # Escenario 3: Persistencia y vinculación exitosa
    # ========================================================

    def test_consultar_galeria_completa_por_id_inventario(self):
        """
        Dado que se han cargado 3 fotos válidas y se ha guardado la oferta,
        Cuando un usuario interesado consulte el detalle de esa pieza,
        Entonces el sistema debe recuperar del ORM y mostrar la galería 
        completa vinculada a ese ID único de inventario.
        """
        # Primero crear la oferta con fotos
        datos = self._datos_oferta()
        imagenes = self._crear_imagenes(3)
        datos['imagenes'] = imagenes

        response_crear = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )
        self.assertEqual(response_crear.status_code, 201)

        id_inventario = response_crear.json()['id_inventario']

        # Ahora consultar el detalle
        response_detalle = self.client.get(f'/api/oferta/{id_inventario}/')

        self.assertEqual(response_detalle.status_code, 200)
        data = response_detalle.json()

        # Verificar que se recupera la galería completa
        self.assertEqual(data['id_inventario'], id_inventario)
        self.assertEqual(data['cantidad_fotos'], 3)
        self.assertEqual(len(data['galeria']), 3)
        self.assertEqual(data['repuesto'], 'Motor')

        # Verificar que cada foto tiene URL válida
        for foto in data['galeria']:
            self.assertIn('url', foto)
            self.assertIn('fecha_carga', foto)
            self.assertTrue(foto['url'].startswith('/media/'))

    def test_vinculacion_fotos_con_oferta_via_orm(self):
        """
        Verifica la integridad referencial: cada Fotografia está
        vinculada al objeto Oferta correcto via ORM.
        """
        datos = self._datos_oferta()
        imagenes = self._crear_imagenes(4)
        datos['imagenes'] = imagenes

        response = self.client.post(
            '/api/registrar/',
            data=datos,
            HTTP_X_SESSION_ID=self.session_id,
        )
        self.assertEqual(response.status_code, 201)

        oferta = Oferta.objects.first()
        fotos = oferta.fotos.all()

        # Todas las fotos pertenecen a esta oferta
        self.assertEqual(fotos.count(), 4)
        for foto in fotos:
            self.assertEqual(foto.oferta.id_inventario, oferta.id_inventario)

    def test_oferta_inexistente_retorna_404(self):
        """Consultar una oferta que no existe debe retornar 404."""
        import uuid
        id_falso = uuid.uuid4()
        response = self.client.get(f'/api/oferta/{id_falso}/')
        self.assertEqual(response.status_code, 404)
