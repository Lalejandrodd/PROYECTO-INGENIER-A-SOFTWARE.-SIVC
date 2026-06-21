import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render
from django.http import JsonResponse
from apps.ofertas.models import Oferta
from apps.repuestos.models import Repuesto
from apps.vehiculos.models import Vehiculo
from rest_framework.response import Response
from rest_framework.decorators import api_view

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

# @csrf_exempt
# @require_http_methods(["POST"])
# def crear_oferta(request):
#     """POST /api/crear/ - Crear una oferta"""
#     try:
#         # Obtener sessionid del header
#         session_id = request.headers.get('X-Session-ID')
        
#         from django.contrib.sessions.models import Session
#         from apps.usuarios.models import Usuario
        
#         user = None
#         if session_id:
#             try:
#                 session = Session.objects.get(session_key=session_id)
#                 session_data = session.get_decoded()
#                 user_id = session_data.get('_auth_user_id')
#                 if user_id:
#                     user = Usuario.objects.get(id=user_id)
#             except Exception as e:
#                 print(f"Error recuperando sesión: {e}")
        
#         if not user:
#             return JsonResponse({"error": "Usuario no autenticado"}, status=401)
        
#         # Leer datos (FormData o JSON)
#         if request.content_type and 'multipart/form-data' in request.content_type:
#             repuesto_id = request.POST.get('repuesto_id')
#             rango_horario = request.POST.get('rango_horario')
#             referencia_ubicacion = request.POST.get('referencia_ubicacion')
#         else:
#             data = json.loads(request.body)
#             repuesto_id = data.get('repuesto_id')
#             rango_horario = data.get('rango_horario')
#             referencia_ubicacion = data.get('referencia_ubicacion')
        
#         # Validaciones
#         if not repuesto_id:
#             return JsonResponse({"error": "repuesto_id es requerido"}, status=400)
#         if not rango_horario:
#             return JsonResponse({"error": "rango_horario es requerido"}, status=400)
#         if not referencia_ubicacion:
#             return JsonResponse({"error": "referencia_ubicacion es requerido"}, status=400)
        
#         # Buscar repuesto
#         from apps.repuestos.models import Repuesto
#         try:
#             repuesto = Repuesto.objects.get(id_repuesto=repuesto_id)
#         except Repuesto.DoesNotExist:
#             return JsonResponse({"error": "Repuesto no encontrado"}, status=404)
        
#         # Obtener año del vehículo compatible para tasación
#         vehiculo = repuesto.compatibilidad.first()
#         anio_ref = vehiculo.anio if vehiculo else 2020
        
#         from apps.transacciones.services import TasacionService
#         datos_tecnicos = {
#             'estado_fisico': repuesto.estado_fisico,
#             'categoria': repuesto.nombre_pieza,
#             'anio_vehiculo': anio_ref
#         }
#         valor_puntos = TasacionService.calcularPuntosAlgoritmicamente(datos_tecnicos)
        
#         # Crear oferta
#         from apps.ofertas.models import Oferta
#         oferta = Oferta.objects.create(
#             repuesto=repuesto,
#             usuario=user,
#             rango_horario=rango_horario,
#             referencia_ubicacion=referencia_ubicacion,
#             estado_oferta=True,
#             valor_puntos=valor_puntos
#         )
        
#         return JsonResponse({
#             'success': True,
#             'message': 'Oferta creada exitosamente',
#             'id_inventario': str(oferta.id_inventario),
#             'valor_puntos': oferta.valor_puntos
#         }, status=201)
        
#     except Exception as e:
#         print(f"Error en crear_oferta: {str(e)}")
#         return JsonResponse({"error": str(e)}, status=500)

#Adaptada Para el video

@csrf_exempt
@require_http_methods(["POST"])
def crear_oferta(request):
    """POST /api/crear/ - Crear una oferta utilizando el Intermediario de Valor"""
    try:
        session_id = request.headers.get('X-Session-ID')
        from django.contrib.sessions.models import Session
        from apps.usuarios.models import Usuario
        from apps.transacciones.gestores.valor_mediator import gestor_valor # <- NUEVO
        
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
        
        # Leer datos (FormData o JSON) e incluir las nuevas variables del Frontend
        valor_manual = 0.0
        horas_tiempo = 0.0
        
        if request.content_type and 'multipart/form-data' in request.content_type:
            repuesto_id = request.POST.get('repuesto_id')
            rango_horario = request.POST.get('rango_horario')
            referencia_ubicacion = request.POST.get('referencia_ubicacion')
            tipo_tasacion = request.POST.get('tipo_tasacion', 'algoritmico') # <- NUEVO
            valor_manual = request.POST.get('valor_manual', 0.0)             # <- NUEVO
            horas_tiempo = request.POST.get('horas', 0.0)                    # <- NUEVO
        else:
            data = json.loads(request.body)
            repuesto_id = data.get('repuesto_id')
            rango_horario = data.get('rango_horario')
            referencia_ubicacion = data.get('referencia_ubicacion')
            tipo_tasacion = data.get('tipo_tasacion', 'algoritmico') # <- NUEVO
            valor_manual = data.get('valor_manual', 0.0)             # <- NUEVO
            horas_tiempo = data.get('horas', 0.0)                    # <- NUEVO
        
        if not repuesto_id or not rango_horario or not referencia_ubicacion:
            return JsonResponse({"error": "Faltan parámetros requeridos"}, status=400)
        
        from apps.repuestos.models import Repuesto
        try:
            repuesto = Repuesto.objects.get(id_repuesto=repuesto_id)
        except Repuesto.DoesNotExist:
            return JsonResponse({"error": "Repuesto no encontrado"}, status=404)
        
        # Preparación de datos para el Intermediario
        vehiculo = repuesto.compatibilidad.first()
        anio_ref = vehiculo.anio if vehiculo else 2020
        
        datos_contexto = {
            'estado_fisico': repuesto.estado_fisico,
            'categoria': repuesto.nombre_pieza,
            'anio_vehiculo': anio_ref,
            'valor_manual': valor_manual,
            'horas': horas_tiempo
        }
        
        # CONTROL CENTRALIZADO POR EL INTERMEDIARIO (Md)
        try:
            valor_puntos = gestor_valor.procesar_valor(tipo_tasacion, datos_contexto)
        except ValueError as val_err:
            return JsonResponse({"error": str(val_err)}, status=400)
        
        # Crear oferta almacenando la estrategia utilizada
        from apps.ofertas.models import Oferta
        oferta = Oferta()
        oferta.repuesto = repuesto
        oferta.usuario = user
        oferta.rango_horario = rango_horario
        oferta.referencia_ubicacion = referencia_ubicacion
        oferta.estado_oferta = True
        oferta.tipo_tasacion = tipo_tasacion
        oferta.valor_puntos = valor_puntos
        
        # Truco en memoria por si el save() vuelve a evaluar
        oferta._valor_manual = valor_manual 
        oferta.save()
        
        return JsonResponse({
            'success': True,
            'message': f'Oferta creada exitosamente usando la modalidad: {tipo_tasacion}',
            'id_inventario': str(oferta.id_inventario),
            'valor_puntos': oferta.valor_puntos
        }, status=201)
        
    except Exception as e:
        print(f"Error en crear_oferta: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)
    
def listar_repuestos(request):
    repuestos = Repuesto.objects.all().values('id_repuesto', 'nombre_pieza', 'estado_fisico')
    return JsonResponse(list(repuestos), safe=False)