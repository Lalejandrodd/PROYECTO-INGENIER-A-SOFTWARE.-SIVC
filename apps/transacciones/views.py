import json
from django.shortcuts import render
from django.http import JsonResponse
from django.db import models  # para Q
from django.db.models import Avg
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from apps.transacciones.models import Transaccion, Historial, Calificacion, AcuerdoIntercambio
from apps.usuarios.models import Vecino, Usuario
from apps.ofertas.models import Oferta


# ============================================================
# HELPER: Obtener usuario desde sessionid en header
# ============================================================
def get_user_from_session(session_id):
    if not session_id:
        return None
    try:
        session = Session.objects.get(session_key=session_id)
        user_id = session.get_decoded().get('_auth_user_id')
        if user_id:
            return Usuario.objects.get(id=user_id)
    except Exception:
        return None
    return None


# ============================================================
# HU8 – HISTORIAL DE PUNTOS
# ============================================================
def mi_historial(request):
    """Endpoint GET /api/historial/ - usa sessionid del header"""
    session_id = request.headers.get('X-Session-ID')
    user = None
    
    if session_id:
        try:
            session = Session.objects.get(session_key=session_id)
            session_data = session.get_decoded()
            user_id = session_data.get('_auth_user_id')
            if user_id:
                from apps.usuarios.models import Usuario
                user = Usuario.objects.get(id=user_id)
        except Exception as e:
            print(f"Error recuperando sesión: {e}")
    
    if not user and request.user.is_authenticated:
        user = request.user
    
    if not user:
        return JsonResponse({"error": "Usuario no autenticado."}, status=401)
    
    if not hasattr(user, 'vecino'):
        return JsonResponse({"error": "El usuario no tiene perfil de Vecino."}, status=400)
    
    try:
        vecino = user.vecino
        if not hasattr(vecino, 'historial'):
            Historial.objects.create(vecino=vecino)
        historial = vecino.historial
        resumen = historial.calcular_resumen_puntos()
        return JsonResponse(resumen, safe=False, status=200)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": f"Error al obtener el historial: {str(e)}"}, status=500)


# ============================================================
# HU8 – RANKING GENERAL
# ============================================================
def ranking_general(request):
    """Endpoint GET /api/ranking/ - top 10 vecinos por puntos"""
    if request.method != 'GET':
        return JsonResponse({"error": "Método no permitido. Usa GET."}, status=405)
        
    try:      
        ranking_data = []
        vecinos = Vecino.objects.order_by('-saldo_puntos')[:10]
        
        for i, v in enumerate(vecinos, start=1):
            nombre_usuario = v.usuario.get_full_name() if v.usuario.get_full_name() else v.usuario.username
            ranking_data.append({
                "posicion": i,
                "nombre": nombre_usuario,
                "puntos": v.saldo_puntos,
                "nivel": v.ranking
            })
        return JsonResponse({"ranking": ranking_data}, status=200)
    except Exception as e:
        return JsonResponse({"error": f"Error al generar el ranking: {str(e)}"}, status=500)


# ============================================================
# HU10 – CALIFICACIÓN DE USUARIOS (No autocalificación)
# ============================================================
@csrf_exempt
@require_http_methods(["POST"])
def calificar(request):
    """
    POST /api/calificar/
    Crea una calificación para un vecino después de una transacción.
    VALIDA: No se puede calificar a sí mismo.
    """
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    
    vecino = user.vecino
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    
    transaccion_id = data.get('transaccion_id')
    calificado_id = data.get('calificado_id')
    puntuacion = data.get('puntuacion')
    comentario = data.get('comentario', '')
    
    if not transaccion_id or not calificado_id or not puntuacion:
        return JsonResponse({"error": "Faltan campos requeridos"}, status=400)
    
    try:
        transaccion = Transaccion.objects.get(id_transaccion=transaccion_id)
    except Transaccion.DoesNotExist:
        return JsonResponse({"error": "Transacción no encontrada"}, status=404)
    
    # Validar que el calificador sea parte de la transacción
    if vecino != transaccion.ofertante and vecino != transaccion.demandante:
        return JsonResponse({"error": "No eres parte de esta transacción"}, status=403)
    
    # ❌ EVITAR AUTOCALIFICACIÓN: el calificado no puede ser el mismo que calificador
    if vecino.id == calificado_id:
        return JsonResponse({"error": "No puedes calificarte a ti mismo"}, status=400)
    
    # Validar que el calificado es la otra parte de la transacción
    otra_parte = transaccion.demandante if vecino == transaccion.ofertante else transaccion.ofertante
    if otra_parte.id != calificado_id:
        return JsonResponse({"error": "No puedes calificar a alguien que no participó en esta transacción"}, status=400)
    
    # Verificar si ya calificó esta transacción
    if Calificacion.objects.filter(transaccion=transaccion, calificador=vecino).exists():
        return JsonResponse({"error": "Ya calificaste esta transacción"}, status=400)
    
    calificacion = Calificacion.objects.create(
        transaccion=transaccion,
        calificador=vecino,
        calificado=otra_parte,
        puntuacion=puntuacion,
        comentario=comentario
    )
    return JsonResponse({"success": True, "id": str(calificacion.id_calificacion)}, status=201)


@require_http_methods(["GET"])
def reputacion_usuario(request, user_id):
    """
    GET /api/reputacion/<user_id>/
    Retorna todas las calificaciones recibidas por un vecino.
    """
    try:
        vecino = Vecino.objects.get(id=user_id)
    except Vecino.DoesNotExist:
        return JsonResponse({"error": "Usuario no encontrado"}, status=404)
    
    calificaciones = Calificacion.objects.filter(calificado=vecino).order_by('-fecha')
    promedio = calificaciones.aggregate(Avg('puntuacion'))['puntuacion__avg'] or 0
    
    data = {
        "calificaciones": [{
            "id": str(c.id_calificacion),
            "calificador": c.calificador.usuario.nombre_completo,
            "puntuacion": c.puntuacion,
            "comentario": c.comentario,
            "fecha": c.fecha.strftime('%d/%m/%Y %H:%M'),
        } for c in calificaciones],
        "promedio": round(promedio, 1),
        "total": calificaciones.count()
    }
    return JsonResponse(data, status=200)


@require_http_methods(["GET"])
def transacciones_para_calificar(request):
    """
    GET /api/transacciones-para-calificar/
    Lista transacciones completadas donde el usuario participó y aún no calificó.
    """
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino
    
    # Transacciones donde el usuario es parte y no ha calificado aún
    transacciones = Transaccion.objects.filter(
        models.Q(ofertante=vecino) | models.Q(demandante=vecino)
    ).exclude(
        calificaciones__calificador=vecino
    ).order_by('-fecha_exito')
    
    data = [{
        "id_transaccion": str(t.id_transaccion),
        "repuesto": t.oferta.repuesto.nombre_pieza,
        "fecha": t.fecha_exito.strftime('%d/%m/%Y'),
        "ofertante_id": t.ofertante.id,
        "demandante_id": t.demandante.id,
    } for t in transacciones]
    return JsonResponse(data, safe=False, status=200)


# ============================================================
# HU4 – INTERCAMBIO Y CHAT (Solicitar, Aceptar, Confirmar Recepción)
# ============================================================
@csrf_exempt
@require_http_methods(["POST"])
def solicitar_intercambio(request):
    """
    POST /api/solicitar/
    Un vecino solicita un trueque sobre una oferta activa.
    """
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "JSON inválido"}, status=400)
    
    oferta_id = data.get('oferta_id')
    if not oferta_id:
        return JsonResponse({"error": "Falta oferta_id"}, status=400)
    
    try:
        oferta = Oferta.objects.get(id_inventario=oferta_id, estado_oferta=True)
    except Oferta.DoesNotExist:
        return JsonResponse({"error": "Oferta no encontrada o inactiva"}, status=404)
    
    # No puede solicitar su propia oferta
    if oferta.usuario.vecino == vecino:
        return JsonResponse({"error": "No puedes solicitar tu propia oferta"}, status=400)
    
    # Verificar si ya hay un acuerdo pendiente
    if AcuerdoIntercambio.objects.filter(oferta=oferta, demandante=vecino, estado='pendiente').exists():
        return JsonResponse({"error": "Ya solicitaste este trueque"}, status=400)
    
    acuerdo = AcuerdoIntercambio.objects.create(
        oferta=oferta,
        ofertante=oferta.usuario.vecino,
        demandante=vecino,
        estado='pendiente'
    )
    return JsonResponse({"success": True, "acuerdo_id": str(acuerdo.id)}, status=201)


@require_http_methods(["GET"])
def solicitudes_pendientes(request):
    """
    GET /api/solicitudes-pendientes/
    Lista acuerdos pendientes donde el usuario es el ofertante.
    """
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino
    
    acuerdos = AcuerdoIntercambio.objects.filter(ofertante=vecino, estado='pendiente')
    data = [{
        "id": str(a.id),
        "repuesto": a.oferta.repuesto.nombre_pieza,
        "demandante_nombre": a.demandante.usuario.nombre_completo,
        "demandante_id": a.demandante.id,
        "fecha": a.fecha_creacion.strftime('%d/%m/%Y %H:%M'),
    } for a in acuerdos]
    return JsonResponse(data, safe=False, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def aceptar_intercambio(request, acuerdo_id):
    """
    POST /api/aceptar/<acuerdo_id>/
    El ofertante acepta el trueque, se crea transacción y se habilita el chat.
    """
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino
    
    try:
        acuerdo = AcuerdoIntercambio.objects.get(id=acuerdo_id, estado='pendiente')
    except AcuerdoIntercambio.DoesNotExist:
        return JsonResponse({"error": "Acuerdo no encontrado"}, status=404)
    
    if acuerdo.ofertante != vecino:
        return JsonResponse({"error": "No autorizado – solo el ofertante puede aceptar"}, status=403)
    
    # Cambiar estado
    acuerdo.estado = 'aceptado'
    acuerdo.save()
    
    # Crear transacción (aún no hay transferencia de puntos, solo registro)
    # 🔧 FIX: Se agregó la coma que faltaba entre puntos_transferidos y acuerdo
    transaccion = Transaccion.objects.create(
        oferta=acuerdo.oferta,
        ofertante=acuerdo.ofertante,
        demandante=acuerdo.demandante,
        puntos_transferidos=acuerdo.oferta.valor_puntos,
        acuerdo=acuerdo  # ← Asociamos el acuerdo
    )
    
    # Iniciar conversación de chat (HU4)
    from apps.chat.services import ChatService
    try:
        ChatService.crear_conversacion_si_es_posible(str(acuerdo.id))
    except Exception as e:
        print(f"Error al crear chat: {e}")
    
    return JsonResponse({
        "success": True,
        "transaccion_id": str(transaccion.id_transaccion)
    }, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def confirmar_recepcion(request, transaccion_id):
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino

    try:
        transaccion = Transaccion.objects.get(id_transaccion=transaccion_id)
    except Transaccion.DoesNotExist:
        return JsonResponse({"error": "Transacción no encontrada"}, status=404)

    if transaccion.demandante != vecino:
        return JsonResponse({"error": "Solo el demandante puede confirmar la recepción"}, status=403)

    if transaccion.completada:
        return JsonResponse({"error": "Esta transacción ya fue completada"}, status=400)

    # Transferir puntos al ofertante
    ofertante = transaccion.ofertante
    ofertante.saldo_puntos += transaccion.puntos_transferidos
    ofertante.save()

    # Agregar transacción al historial de ambos
    historial_ofertante = ofertante.historial
    historial_ofertante.agregar_transaccion(transaccion)

    historial_demandante = transaccion.demandante.historial
    historial_demandante.agregar_transaccion(transaccion)

    # Marcar transacción como completada
    transaccion.completada = True
    transaccion.save()

    # ⭐ CAMBIAR EL ESTADO DEL ACUERDO A COMPLETADO
    if transaccion.acuerdo:
        acuerdo = transaccion.acuerdo
        acuerdo.estado = 'completado'
        acuerdo.save()

    return JsonResponse({
        "success": True,
        "message": "Recepción confirmada. Puntos transferidos al ofertante. Trueque completado."
    }, status=200)


@require_http_methods(["GET"])
def transacciones_para_confirmar(request):
    """
    GET /api/transacciones-para-confirmar/
    Retorna las transacciones donde el usuario es demandante y aún no ha confirmado recepción.
    """
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino
    
    transacciones = Transaccion.objects.filter(
        demandante=vecino,
        completada=False
    ).order_by('-fecha_exito')
    
    data = [{
        "id_transaccion": str(t.id_transaccion),
        "repuesto": t.oferta.repuesto.nombre_pieza,
        "ofertante_nombre": t.ofertante.usuario.nombre_completo,
        "puntos": t.puntos_transferidos,
        "fecha": t.fecha_exito.strftime('%d/%m/%Y %H:%M'),
    } for t in transacciones]
    return JsonResponse(data, safe=False, status=200)


# ============================================================
# CANCELACIÓN DE TRUEQUES (con confirmación de ambas partes)
# ============================================================

@require_http_methods(["GET"])
def mis_acuerdos(request):
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino

    acuerdos = AcuerdoIntercambio.objects.filter(
        models.Q(ofertante=vecino) | models.Q(demandante=vecino)
    ).exclude(estado='completado').exclude(estado='cancelado').order_by('-fecha_creacion')

    data = []
    for a in acuerdos:
        data.append({
            "id": a.id,
            "repuesto": a.oferta.repuesto.nombre_pieza,
            "ofertante_id": a.ofertante.id,
            "demandante_id": a.demandante.id,
            "ofertante_nombre": a.ofertante.usuario.nombre_completo,
            "demandante_nombre": a.demandante.usuario.nombre_completo,
            "estado": a.estado,
            "estado_anterior": a.estado_anterior,  # ← para restaurar si se rechaza
            "cancelacion_solicitada_por": a.cancelacion_solicitada_por.id if a.cancelacion_solicitada_por else None,
        })
    return JsonResponse(data, safe=False, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def solicitar_cancelacion(request, acuerdo_id):
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino

    try:
        acuerdo = AcuerdoIntercambio.objects.get(id=acuerdo_id)
    except AcuerdoIntercambio.DoesNotExist:
        return JsonResponse({"error": "Acuerdo no encontrado"}, status=404)

    if acuerdo.estado not in ['pendiente', 'aceptado']:
        return JsonResponse({"error": "No se puede cancelar en este estado"}, status=400)

    if vecino != acuerdo.ofertante and vecino != acuerdo.demandante:
        return JsonResponse({"error": "No eres parte de este acuerdo"}, status=403)

    if acuerdo.cancelacion_solicitada_por:
        return JsonResponse({"error": "Ya hay una solicitud de cancelación pendiente"}, status=400)

    # Guardar estado anterior para poder restaurar si se rechaza
    acuerdo.estado_anterior = acuerdo.estado
    acuerdo.estado = 'cancelacion_pendiente'
    acuerdo.cancelacion_solicitada_por = vecino
    acuerdo.save()

    return JsonResponse({"success": True, "message": "Solicitud de cancelación enviada"}, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def confirmar_cancelacion(request, acuerdo_id):
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino

    try:
        acuerdo = AcuerdoIntercambio.objects.get(id=acuerdo_id)
    except AcuerdoIntercambio.DoesNotExist:
        return JsonResponse({"error": "Acuerdo no encontrado"}, status=404)

    if acuerdo.estado != 'cancelacion_pendiente':
        return JsonResponse({"error": "No hay solicitud de cancelación pendiente"}, status=400)

    if not acuerdo.cancelacion_solicitada_por:
        return JsonResponse({"error": "No hay solicitud de cancelación"}, status=400)

    if vecino == acuerdo.cancelacion_solicitada_por:
        return JsonResponse({"error": "La otra parte debe confirmar la cancelación"}, status=403)

    if vecino != acuerdo.ofertante and vecino != acuerdo.demandante:
        return JsonResponse({"error": "No eres parte de este acuerdo"}, status=403)

    acuerdo.estado = 'cancelado'
    acuerdo.cancelacion_solicitada_por = None
    acuerdo.save()

    return JsonResponse({"success": True, "message": "Trueque cancelado exitosamente"}, status=200)


@csrf_exempt
@require_http_methods(["POST"])
def rechazar_cancelacion(request, acuerdo_id):
    session_id = request.headers.get('X-Session-ID')
    user = get_user_from_session(session_id)
    if not user or not hasattr(user, 'vecino'):
        return JsonResponse({"error": "No autenticado"}, status=401)
    vecino = user.vecino

    try:
        acuerdo = AcuerdoIntercambio.objects.get(id=acuerdo_id)
    except AcuerdoIntercambio.DoesNotExist:
        return JsonResponse({"error": "Acuerdo no encontrado"}, status=404)

    if acuerdo.estado != 'cancelacion_pendiente':
        return JsonResponse({"error": "No hay solicitud de cancelación pendiente"}, status=400)

    if not acuerdo.cancelacion_solicitada_por:
        return JsonResponse({"error": "No hay solicitud de cancelación"}, status=400)

    if vecino == acuerdo.cancelacion_solicitada_por:
        return JsonResponse({"error": "No puedes rechazar tu propia solicitud"}, status=403)

    if vecino != acuerdo.ofertante and vecino != acuerdo.demandante:
        return JsonResponse({"error": "No eres parte de este acuerdo"}, status=403)

    # Restaurar el estado anterior (pendiente o aceptado)
    estado_restaurado = acuerdo.estado_anterior or 'pendiente'
    acuerdo.estado = estado_restaurado
    acuerdo.cancelacion_solicitada_por = None
    acuerdo.save()

    return JsonResponse({"success": True, "message": f"Cancelación rechazada. El trueque vuelve a estado '{estado_restaurado}'."}, status=200)