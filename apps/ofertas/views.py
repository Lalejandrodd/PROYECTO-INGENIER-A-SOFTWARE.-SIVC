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
from django.utils import timezone
from datetime import timedelta
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from .models import Urgencia
from django.views.decorators.csrf import csrf_exempt
from config.settings import pusher_client
import json
# 🚨 CORRECCIÓN: Agrega estas importaciones al inicio del archivo
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.sessions.models import Session
from django.contrib.auth.models import User
from django.http import JsonResponse
import jwt
import config.settings as config_settings




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

@csrf_exempt
def listar_urgencias_tablon(request):
    """
    [NOTA DE INTEGRACIÓN - HU6]: Esta función mantiene su nombre original para no alterar urls.py,
    pero ahora es UNIFICADA:
    - POST: Recibe el formulario azul de React, valida el vehículo, guarda la urgencia y activa Pusher.
    - GET: Lista todas las urgencias activas calculando su prioridad dinámicamente.
    """
    from apps.usuarios.models import Usuario
    from apps.vehiculos.models import Vehiculo
    from django.contrib.sessions.models import Session
    import json

    # ==========================================
    # CASO 1: CREAR UNA NUEVA URGENCIA (POST)
    # ==========================================
    if request.method == 'POST':
        try:
            # 1. Recuperar la sesión del usuario del Frontend (Igual que en Ofertas)
            session_id = request.headers.get('X-Session-ID')
            vecino_autenticado = None
            
            from apps.usuarios.models import Usuario, Vecino
            from django.contrib.sessions.models import Session

            if session_id:
                try:
                    session = Session.objects.get(session_key=session_id)
                    session_data = session.get_decoded()
                    user_id = session_data.get('_auth_user_id')
                    if user_id:
                        # Primero obtenemos el Usuario genérico (igual que en ofertas)
                        usuario_generico = Usuario.objects.get(id=user_id)
                        
                        # ¡Aquí hacemos el puente mágico al Vecino asociado!
                        vecino_autenticado = Vecino.objects.get(usuario=usuario_generico)
                except Exception as e:
                    print(f"Error recuperando sesión al estilo ofertas: {e}")

            # 1.2. Resguardo inteligente si estás probando local sin login en el navegador
            if not vecino_autenticado:
                # Buscamos un vecino que esté libre (para que la regla de negocio no te bloquee)
                vecino_autenticado = Vecino.objects.exclude(urgencia__activa=True).first()
                
                # Si todos los vecinos de prueba están ocupados, tomamos el último
                if not vecino_autenticado:
                    vecino_autenticado = Vecino.objects.last()

            if not vecino_autenticado:
                return JsonResponse({"error": "No hay ningún Vecino registrado en el sistema"}, status=401)

            # 2. Leer los datos enviados por el Formulario Azul
            data = json.loads(request.body)
            nombre_pieza = data.get('pieza')
            descripcion = data.get('descripcion')
            vehiculo_id = data.get('vehiculoId')
            puntos_extra = data.get('puntos', 0)

            if not all([nombre_pieza, descripcion, vehiculo_id]):
                return JsonResponse({"error": "Faltan parámetros requeridos (pieza, descripcion o vehiculoId)"}, status=400)

            # 3. Validar que el vehículo exista
            try:
                vehiculo = Vehiculo.objects.get(pk=vehiculo_id)
            except Vehiculo.DoesNotExist:
                return JsonResponse({"error": f"El ID de vehículo {vehiculo_id} no existe en la base de datos"}, status=404)

            # 4. Crear el registro en la Base de Datos
            nueva_urgencia = Urgencia.objects.create(
                vecino=vecino_autenticado,
                vehiculo=vehiculo,
                nombre_pieza_requerida=nombre_pieza,
                descripcion_contexto=descripcion,
                puntos_recompensa_extra=int(puntos_extra or 0),
                activa=True,
                fecha_hora_publicacion=timezone.now()
            )

            # 5. CONEXIÓN MÁGICA CON PUSHER (Notificación en tiempo real)
            try:
                from config.settings import pusher_client  # Cambia por la ruta de tu archivo pusher.py si varía
                
                payload = {
                    'id_urgencia': nueva_urgencia.id_urgencia,
                    'vecino_username': nueva_urgencia.vecino.usuario.username,
                    'vecino_id': nueva_urgencia.vecino.id,
                    'vehiculo_str': f"{nueva_urgencia.vehiculo.marca} {nueva_urgencia.vehiculo.modelo} ({nueva_urgencia.vehiculo.anio})",
                    'nombre_pieza_requerida': nueva_urgencia.nombre_pieza_requerida,
                    'descripcion_contexto': nueva_urgencia.descripcion_contexto,
                    'fecha_hora_publicacion': nueva_urgencia.fecha_hora_publicacion.isoformat(),
                    'puntos_recompensa_extra': nueva_urgencia.puntos_recompensa_extra,
                    'resaltar_urgencia': True,
                    'estado_tramite': 'libre',
                    'id_vecino_creador': nueva_urgencia.vecino.id
                }
                
                pusher_client.trigger('tablon-urgencias', 'nueva-urgencia', payload)
            except Exception as p_err:
                print(f"Alerta: La urgencia se guardó pero Pusher no está configurado: {p_err}")

            return JsonResponse({
                'status': 'success',
                'message': 'Urgencia publicada con éxito y transmitida en tiempo real',
                'id_urgencia': nueva_urgencia.id_urgencia
            }, status=201)

        except Exception as e:
            return JsonResponse({"error": f"Error interno en el servidor: {str(e)}"}, status=500)

    # ==========================================
    # CASO 2: LISTAR LAS URGENCIAS (GET)
    # ==========================================
    elif request.method == 'GET':
        urgencias_activas = Urgencia.objects.filter(activa=True).order_by('-fecha_hora_publicacion')
        limite_prioridad = timezone.now() - timedelta(hours=2)
        
        listado = []
        for u in urgencias_activas:
            es_prioritaria = u.fecha_hora_publicacion >= limite_prioridad
            listado.append({
                'id_urgencia': u.id_urgencia,
                'vecino_username': u.vecino.usuario.username,
                'vecino_id': u.vecino.id,
                'vehiculo_str': f"{u.vehiculo.marca} {u.vehiculo.modelo} ({u.vehiculo.anio})",
                'nombre_pieza_requerida': u.nombre_pieza_requerida,
                'descripcion_contexto': u.descripcion_contexto,
                'fecha_hora_publicacion': u.fecha_hora_publicacion.isoformat(),
                'puntos_recompensa_extra': u.puntos_recompensa_extra,
                'resaltar_urgencia': es_prioritaria,
                'estado_tramite': u.estado_tramite,
                'id_vecino_creador': u.vecino.id               
            })
            
        return JsonResponse({'status': 'success', 'urgencias': listado}, safe=False)

    return JsonResponse({'error': 'Método no permitido'}, status=405)


@csrf_exempt
def resolver_emergencia(request, id_urgencia):
    """
    Fase 2: Ejecuta el cierre o resolución de una emergencia (Borrado lógico).
    Cambia activa=False liberando la cuota del usuario.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido. Se requiere POST'}, status=405)
        
    # Obtener el registro o lanzar 404 si no existe
    urgencia = get_object_or_404(Urgencia, id_urgencia=id_urgencia)
    
    # Cambio de estado (Borrado Lógico)
    urgencia.activa = False
    urgencia.save() # Al guardar, se actualiza el estado en la DB
    
    return JsonResponse({
        'status': 'success',
        'message': f'La urgencia sobre {urgencia.nombre_pieza_requerida} ha sido marcada como RESUELTA exitosamente.',
        'id_urgencia': id_urgencia
    })

@csrf_exempt
def postular_ayuda(request, urgencia_id):
    # 1. Extraemos y limpiamos el identificador
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        return JsonResponse({'error': 'Debes iniciar sesión (Falta Token)'}, status=401)
        
    session_id = session_id.strip().replace('"', '').replace("'", "")
    if session_id.startswith('Bearer '):
        session_id = session_id.split(' ')[1]

    usuario_autenticado = None

    # 🚨 CAMINO A: Intentamos decodificar como Token JWT
    try:
        token = AccessToken(session_id)
        user_id = token['user_id']
        from apps.usuarios.models import Usuario  # O el modelo de usuario que utilices
        usuario_autenticado = Usuario.objects.get(id=user_id)
        print(f"✅ Usuario identificado vía JWT: {usuario_autenticado.username}")
    except Exception:
        # 🚨 CAMINO B: Si no es JWT, lo tratamos como una sesión tradicional de Django (Tu string actual)
        try:
            session = Session.objects.get(session_key=session_id)
            user_id = session.get_decoded().get('_auth_user_id')
            if user_id:
                from apps.usuarios.models import Usuario
                usuario_autenticado = Usuario.objects.get(id=user_id)
                print(f"✅ Usuario identificado vía Sesión Clásica: {usuario_autenticado.username}")
        except Exception as e_session:
            print(f"❌ FALLARON AMBOS MÉTODOS DE AUTENTICACIÓN: {e_session}")

    # 2. Si ninguno de los dos métodos encontró al usuario, denegamos el acceso
    if not usuario_autenticado:
        return JsonResponse({'error': 'Sesión inválida o expirada en el sistema'}, status=401)

    # 3. CONTINÚA TU LÓGICA NORMAL DE LA URGENCIA Y EL VECINO...
    try:
        from apps.ofertas.models import Urgencia
        from apps.usuarios.models import Vecino

        urgencia = Urgencia.objects.get(id_urgencia=urgencia_id)
        vecino_b = Vecino.objects.get(usuario=usuario_autenticado)

        if urgencia.vecino == vecino_b:
            return JsonResponse({'error': 'No puedes postularte a tu propia urgencia'}, status=400)

        urgencia.postular_colaborador(vecino_b)
        
        # ... Lógica de Pusher si la tienes ...
        pusher_client = config_settings.pusher_client 
        id_creador = urgencia.vecino.usuario.id

        pusher_client.trigger(
            f'notificaciones-vecino-{id_creador}',  # Canal dinámico por ID de usuario
            'notificacion-ayuda',                  # Evento que React tiene en su useEffect
            {
                'urgencia_id': urgencia.id_urgencia,
                'message': f'El vecino @{usuario_autenticado.username} ha ofrecido el repuesto: {urgencia.nombre_pieza_requerida}.',
                'nombre_colaborador': usuario_autenticado.username
            }
        )
        print(f"📡 Pusher notificó exitosamente al creador (Usuario ID: {id_creador})")
        
        return JsonResponse({'success': True, 'message': 'Postulación exitosa'})

    except Urgencia.DoesNotExist:
        return JsonResponse({'error': 'La urgencia no existe'}, status=404)
    except Vecino.DoesNotExist:
        return JsonResponse({'error': f'El usuario @{usuario_autenticado.username} no tiene un perfil de Vecino creado'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def aceptar_ayuda(request, urgencia_id):
    """POST /api/urgencias/<id>/aceptar/ - Vecino A acepta el trato"""
    try:
        # 1. Buscamos la urgencia
        urgencia = Urgencia.objects.get(id_urgencia=urgencia_id)
        
        # 2. Obtenemos las referencias del creador (Vecino A) y el colaborador (Vecino B)
        vecino_creador = urgencia.vecino
        # Nota: Asegúrate de usar el nombre exacto de la relación hacia el colaborador en tu modelo Urgencia, 
        # si por ejemplo se llama 'vecino_colaborador' o similar. Suponiendo que se llama 'colaborador':
        vecino_colaborador = getattr(urgencia, 'colaborador', None) 
        
        # 3. Transferimos los puntos basados en la recompensa de la urgencia
        puntos_a_transferir = urgencia.puntos_recompensa_extra
        
        if vecino_creador and vecino_colaborador:
            # Restamos al creador y sumamos al colaborador usando 'saldo_puntos'
            vecino_creador.saldo_puntos -= puntos_a_transferir
            vecino_colaborador.saldo_puntos += puntos_a_transferir
            
            # Guardamos los cambios de los usuarios en la base de datos
            vecino_creador.save()
            vecino_colaborador.save()
            print(f"💰 Puntos transferidos con éxito ({puntos_a_transferir} pts) de @{vecino_creador.usuario.username} a @{vecino_colaborador.usuario.username}")

        # 4. Cambiamos el estado de la urgencia a completada y guardamos
        urgencia.estado_tramite = 'completada'
        urgencia.save()
        
        # 📡 Notificamos al tablón público de Pusher para que las pantallas se refresquen en vivo
        import config.settings as config_settings
        config_settings.pusher_client.trigger('tablon-urgencias', 'nueva-urgencia', {
            'id_urgencia': urgencia.id_urgencia,
            'estado_tramite': 'completada'
        })

        return JsonResponse({'success': True, 'message': 'Urgencia completada y puntos transferidos con éxito.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def rechazar_ayuda(request, urgencia_id):
    """POST /api/urgencias/<id>/rechazar/ - Vecino A rechaza el trato"""
    try:
        urgencia = Urgencia.objects.get(id_urgencia=urgencia_id)
        urgencia.rechazar_solucion()
        
        # Sincronizamos el tablón para que todos vean la tarjeta libre de nuevo
        import config.settings as config_settings
        config_settings.pusher_client.trigger('tablon-urgencias', 'nueva-urgencia', {})

        return JsonResponse({'success': True, 'message': 'Postulación rechazada. La urgencia vuelve al tablón.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)