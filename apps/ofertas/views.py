import json
import os

from django.shortcuts import render
from django.http import JsonResponse
from apps.ofertas.models import Oferta, Fotografia
from apps.repuestos.models import Repuesto
from apps.vehiculos.models import Vehiculo
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

# Extensiones permitidas para fotografías (HU 7 - Escenario 2)
EXTENSIONES_PERMITIDAS = ['.jpg', '.jpeg', '.png']


def buscar_repuestos(request):
    """
    Búsqueda inteligente de repuestos - HU2
    Usa la relación ManyToMany directamente
    """
    if request.method == 'GET':
        marca = request.GET.get('marca')
        modelo = request.GET.get('modelo')
        anio = request.GET.get('anio')
        
        if not all([marca, modelo, anio]):
            return JsonResponse(
                {"error": "Faltan parámetros obligatorios: marca, modelo y anio."}, 
                status=400
            )
            
        try:
            # Buscar el vehículo
            vehiculo = Vehiculo.objects.get(
                marca__iexact=marca, 
                modelo__iexact=modelo, 
                anio=anio
            )
            
            ofertas = Oferta.objects.filter(
                repuesto__compatibilidad=vehiculo,  
                estado_oferta=True
            ).distinct()
            
            resultados = []
            for oferta in ofertas:
                resultados.append({
                    "id_inventario": str(oferta.id_inventario),
                    "repuesto": oferta.repuesto.nombre_pieza,
                    "valor_puntos": oferta.valor_puntos,
                    "rango_horario": oferta.rango_horario,
                    "referencia_ubicacion": oferta.referencia_ubicacion,
                    "estado_oferta": oferta.estado_oferta
                })
                
            return JsonResponse(resultados, safe=False, status=200)
            
        except Vehiculo.DoesNotExist:
            return JsonResponse([], safe=False, status=200)
        except Exception as e:
            return JsonResponse({"error": f"Error en el servidor: {str(e)}"}, status=500)
            
    return JsonResponse({"error": "Método no permitido. Usa GET."}, status=405)

@api_view(['POST'])
def crear_oferta(request):
    """
    Endpoint para recibir los datos del frontend React (HU 1, 7, 12).
    Recibe multipart/form-data con campos de texto e imágenes.
    
    HU 7: Valida cantidad (3-5) y formato (.jpg/.png) de fotografías,
    y las persiste vinculadas a la oferta via ORM.
    """
    try:
        # 1. Extraemos los datos de texto
        marca = request.data.get('marca')
        modelo = request.data.get('modelo')
        anio = request.data.get('anio')
        descripcion = request.data.get('descripcion')
        
        # 2. Extraemos las imágenes enviadas (es una lista de archivos)
        imagenes = request.FILES.getlist('imagenes')

        # Validaciones básicas de campos obligatorios
        if not all([marca, modelo, anio]):
            return Response({"error": "Datos incompletos. Marca, modelo y año son obligatorios."}, status=400)
        
        # --- HU 7 - Escenario 1: Validación de cantidad de fotos (3 a 5) ---
        cantidad_fotos = len(imagenes)
        if cantidad_fotos < 3:
            return Response({
                "error": "Debe cargar al menos 3 fotografías como evidencia visual obligatoria."
            }, status=400)
        
        if cantidad_fotos > 5:
            return Response({
                "error": "No se aceptan más de 5 evidencias visuales obligatorias."
            }, status=400)
        
        # --- HU 7 - Escenario 2: Validación de formato de cada imagen ---
        for imagen in imagenes:
            ext = os.path.splitext(imagen.name)[1].lower()
            if ext not in EXTENSIONES_PERMITIDAS:
                return Response({
                    "error": f"El archivo '{imagen.name}' tiene un formato inválido. "
                             f"Solo se permiten archivos JPG o PNG."
                }, status=400)
        
        # 3. Buscar o crear el repuesto y vehículo para vincular la oferta
        vehiculo, _ = Vehiculo.objects.get_or_create(
            marca__iexact=marca, modelo__iexact=modelo, anio=int(anio),
            defaults={'marca': marca, 'modelo': modelo, 'anio': int(anio)}
        )
        
        repuesto, _ = Repuesto.objects.get_or_create(
            nombre_pieza=descripcion or f"Repuesto {marca} {modelo}",
            defaults={
                'descripcion_tecnica': descripcion or 'Sin descripción',
                'estado_fisico': 'Usado - Funcional'
            }
        )
        if vehiculo not in repuesto.compatibilidad.all():
            repuesto.compatibilidad.add(vehiculo)
        
        # 4. Obtener usuario autenticado (por sesión o primer usuario disponible)
        from apps.usuarios.models import Usuario
        user = None
        
        session_id = request.headers.get('X-Session-ID') or request.COOKIES.get('sessionid')
        if session_id:
            try:
                from django.contrib.sessions.models import Session
                session = Session.objects.get(session_key=session_id)
                session_data = session.get_decoded()
                user_id = session_data.get('_auth_user_id')
                if user_id:
                    user = Usuario.objects.get(id=user_id)
            except Exception:
                pass
        
        if not user:
            # Intentar con autenticación JWT de DRF
            if request.user and request.user.is_authenticated:
                user = request.user
        
        if not user:
            return Response({"error": "Usuario no autenticado"}, status=401)
        
        # 5. Calcular tasación algorítmica (HU 12)
        from apps.transacciones.services import TasacionService
        datos_tecnicos = {
            'estado_fisico': repuesto.estado_fisico,
            'categoria': repuesto.nombre_pieza,
            'anio_vehiculo': int(anio)
        }
        valor_puntos = TasacionService.calcularPuntosAlgoritmicamente(datos_tecnicos)
        
        # 6. Crear la oferta
        oferta = Oferta.objects.create(
            repuesto=repuesto,
            usuario=user,
            rango_horario='Por coordinar',
            referencia_ubicacion=descripcion or 'Por definir',
            estado_oferta=True,
            valor_puntos=valor_puntos
        )
        
        # 7. HU 7 - Escenario 3: Persistencia y vinculación de fotografías
        fotos_guardadas = []
        for imagen in imagenes:
            foto = Fotografia.objects.create(
                oferta=oferta,
                imagen=imagen
            )
            fotos_guardadas.append({
                'id': foto.id,
                'nombre': imagen.name,
                'url': foto.imagen.url
            })
        
        return Response({
            "mensaje": "¡Oferta registrada con evidencias visuales exitosamente!",
            "datos_recibidos": f"{marca} {modelo} ({anio})",
            "id_inventario": str(oferta.id_inventario),
            "valor_puntos": oferta.valor_puntos,
            "cantidad_fotos": len(fotos_guardadas),
            "fotos": fotos_guardadas
        }, status=201)

    except Exception as e:
        return Response({"error": f"Error interno: {str(e)}"}, status=500)
    
@csrf_exempt
@require_http_methods(["POST"])
def registrar_oferta(request):
    """
    Endpoint para registrar una nueva oferta con fotografías (HU1, HU7, HU12).
    Recibe multipart/form-data con campos de texto e imágenes.
    
    Reglas de negocio HU 7:
    - Mínimo 3 fotografías, máximo 5
    - Solo formatos .jpg y .png
    - Cada imagen se vincula al objeto Oferta via ORM
    """
    try:
        # --- Autenticación por sesión ---
        session_id = request.headers.get('X-Session-ID')
        
        from django.contrib.sessions.models import Session
        from apps.usuarios.models import Usuario
        
        user = None
        if session_id:
            try:
                session = Session.objects.get(session_key=session_id)
                session_data = session.get_decoded()
                user_id = session_data.get('_auth_user_id')
                if user_id:
                    user = Usuario.objects.get(id=user_id)
            except Exception as e:
                print(f"Error recuperando sesión: {e}")
        
        if not user:
            return JsonResponse({"error": "Usuario no autenticado"}, status=401)
        
        if not hasattr(user, 'vecino'):
            return JsonResponse({"error": "Debes ser vecino para publicar ofertas"}, status=400)
        
        # --- Leer datos del request (multipart/form-data) ---
        repuesto_id = request.POST.get('repuesto_id')
        rango_horario = request.POST.get('rango_horario')
        referencia_ubicacion = request.POST.get('referencia_ubicacion')
        
        if not repuesto_id or not rango_horario or not referencia_ubicacion:
            return JsonResponse({"error": "Faltan campos obligatorios"}, status=400)
        
        # --- HU 7 - Escenario 1: Validación de cantidad de fotos (3 a 5) ---
        imagenes = request.FILES.getlist('imagenes')
        cantidad_fotos = len(imagenes)
        
        if cantidad_fotos < 3:
            return JsonResponse({
                "error": "Debe cargar al menos 3 fotografías como evidencia visual obligatoria."
            }, status=400)
        
        if cantidad_fotos > 5:
            return JsonResponse({
                "error": "No se aceptan más de 5 evidencias visuales obligatorias."
            }, status=400)
        
        # --- HU 7 - Escenario 2: Validación de formato de cada imagen ---
        for imagen in imagenes:
            ext = os.path.splitext(imagen.name)[1].lower()
            if ext not in EXTENSIONES_PERMITIDAS:
                return JsonResponse({
                    "error": f"El archivo '{imagen.name}' tiene un formato inválido. "
                             f"Solo se permiten archivos JPG o PNG."
                }, status=400)
        
        # --- Buscar el repuesto ---
        try:
            repuesto = Repuesto.objects.get(id_repuesto=repuesto_id)
        except Repuesto.DoesNotExist:
            return JsonResponse({"error": "Repuesto no encontrado"}, status=404)
        
        # --- Validar límite diario (HU 11) ---
        from apps.ofertas.services import OfertaService
        OfertaService.validar_limite_diario(user)
        
        # --- Calcular tasación algorítmica (HU 12) ---
        vehiculo = repuesto.compatibilidad.first()
        anio_ref = vehiculo.anio if vehiculo else 2020
        
        from apps.transacciones.services import TasacionService
        datos_tecnicos = {
            'estado_fisico': repuesto.estado_fisico,
            'categoria': repuesto.nombre_pieza,
            'anio_vehiculo': anio_ref
        }
        valor_puntos = TasacionService.calcularPuntosAlgoritmicamente(datos_tecnicos)
        
        # --- Crear la oferta ---
        oferta = Oferta.objects.create(
            repuesto=repuesto,
            usuario=user,
            rango_horario=rango_horario,
            referencia_ubicacion=referencia_ubicacion,
            estado_oferta=True,
            valor_puntos=valor_puntos
        )
        
        # --- HU 7 - Escenario 3: Persistencia y vinculación de fotografías ---
        fotos_guardadas = []
        for imagen in imagenes:
            foto = Fotografia.objects.create(
                oferta=oferta,
                imagen=imagen
            )
            fotos_guardadas.append({
                'id': foto.id,
                'nombre': imagen.name,
                'url': foto.imagen.url
            })
        
        return JsonResponse({
            'success': True,
            'message': 'Oferta creada exitosamente con evidencias visuales.',
            'id_inventario': str(oferta.id_inventario),
            'valor_puntos': oferta.valor_puntos,
            'cantidad_fotos': len(fotos_guardadas),
            'fotos': fotos_guardadas
        }, status=201)
        
    except Exception as e:
        print(f"Error en registrar_oferta: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def detalle_oferta(request, id_inventario):
    """
    HU 7 - Escenario 3: Persistencia y vinculación exitosa.
    Endpoint para consultar el detalle de una oferta y su galería
    completa de fotografías vinculada al ID único de inventario.
    """
    try:
        oferta = Oferta.objects.get(id_inventario=id_inventario)
        
        # Recuperar la galería completa de fotos vinculadas via ORM
        fotos = oferta.fotos.all().order_by('fecha_carga')
        
        galeria = []
        for foto in fotos:
            galeria.append({
                'id': foto.id,
                'url': foto.imagen.url,
                'fecha_carga': foto.fecha_carga.isoformat()
            })
        
        return JsonResponse({
            'id_inventario': str(oferta.id_inventario),
            'repuesto': oferta.repuesto.nombre_pieza,
            'descripcion_tecnica': oferta.repuesto.descripcion_tecnica,
            'estado_fisico': oferta.repuesto.estado_fisico,
            'valor_puntos': oferta.valor_puntos,
            'rango_horario': oferta.rango_horario,
            'referencia_ubicacion': oferta.referencia_ubicacion,
            'estado_oferta': oferta.estado_oferta,
            'fecha_publicacion': oferta.fecha_publicacion.isoformat(),
            'cantidad_fotos': len(galeria),
            'galeria': galeria
        }, status=200)
        
    except Oferta.DoesNotExist:
        return JsonResponse({"error": "Oferta no encontrada"}, status=404)
    except Exception as e:
        return JsonResponse({"error": f"Error en el servidor: {str(e)}"}, status=500)