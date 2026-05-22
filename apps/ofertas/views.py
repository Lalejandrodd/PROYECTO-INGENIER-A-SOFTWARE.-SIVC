import json

from django.shortcuts import render
from django.http import JsonResponse
from apps.ofertas.models import Oferta
from apps.repuestos.models import Repuesto
from apps.vehiculos.models import Vehiculo
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

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
    Endpoint para recibir los datos del frontend (HU 1, 7, 12)
    """
    try:
        
        # ---- prueba :p ----
        #print("=== ¡NUEVA PETICIÓN DESDE REACT ===")
        #print("Datos de texto recibidos:", request.data)
        #print("Archivos/Fotos recibidos:", request.FILES.getlist('imagenes'))
        #print("==================================")
        # --------------------------------------

        # 1. Extraemos los datos de texto
        marca = request.data.get('marca')
        modelo = request.data.get('modelo')
        anio = request.data.get('anio')
        descripcion = request.data.get('descripcion')
        
        # 2. Extraemos las imágenes enviadas (es una lista de archivos)
        imagenes = request.FILES.getlist('imagenes')

        # Validaciones básicas de seguridad en backend
        if not all([marca, modelo, anio]) or len(imagenes) < 3:
            return Response({"error": "Datos incompletos o faltan imágenes."}, status=400)
        
        # Respuesta exitosa para decirle a React que todo salió bien
        return Response({
            "mensaje": "¡Oferta recibida en el servidor y procesada con éxito!",
            "datos_recibidos": f"{marca} {modelo} ({anio})"
        }, status=201)

    except Exception as e:
        return Response({"error": f"Error interno: {str(e)}"}, status=500)
    
@csrf_exempt
@require_http_methods(["POST"])
def registrar_oferta(request):
    """Endpoint para registrar una nueva oferta (HU1, HU7, HU12)"""
    try:
        # Obtener sessionid del header
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
        
        # Leer datos del request
        data = json.loads(request.body)
        
        repuesto_id = data.get('repuesto_id')
        rango_horario = data.get('rango_horario')
        referencia_ubicacion = data.get('referencia_ubicacion')
        
        if not repuesto_id or not rango_horario or not referencia_ubicacion:
            return JsonResponse({"error": "Faltan campos obligatorios"}, status=400)
        
        # Buscar el repuesto
        try:
            repuesto = Repuesto.objects.get(id_repuesto=repuesto_id)
        except Repuesto.DoesNotExist:
            return JsonResponse({"error": "Repuesto no encontrado"}, status=404)
        
        # Crear la oferta usando el servicio
        from apps.ofertas.models import Oferta
        
        # Validar límite diario
        from apps.ofertas.services import OfertaService
        OfertaService.validar_limite_diario(user)
        
        # Obtener año del vehículo compatible
        vehiculo = repuesto.compatibilidad.first()
        anio_ref = vehiculo.anio if vehiculo else 2020
        
        from apps.transacciones.services import TasacionService
        datos_tecnicos = {
            'estado_fisico': repuesto.estado_fisico,
            'categoria': repuesto.nombre_pieza,
            'anio_vehiculo': anio_ref
        }
        valor_puntos = TasacionService.calcularPuntosAlgoritmicamente(datos_tecnicos)
        
        # Crear la oferta
        oferta = Oferta.objects.create(
            repuesto=repuesto,
            usuario=user,
            rango_horario=rango_horario,
            referencia_ubicacion=referencia_ubicacion,
            estado_oferta=True,
            valor_puntos=valor_puntos
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Oferta creada exitosamente',
            'id_inventario': str(oferta.id_inventario),
            'valor_puntos': oferta.valor_puntos
        }, status=201)
        
    except Exception as e:
        print(f"Error en registrar_oferta: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)