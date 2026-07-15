import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.sessions.models import Session
from apps.usuarios.models import Vecino, Usuario
from apps.chat.services import ChatService
from config.settings import pusher_client  # <-- Asegúrate de que esta importación exista

# ----------------------------------------------------------------------
# HELPER: Obtener vecino desde sessionid en header
# ----------------------------------------------------------------------
def _get_vecino_from_session(request):
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        return None
    try:
        session = Session.objects.get(session_key=session_id)
        user_id = session.get_decoded().get('_auth_user_id')
        if user_id:
            user = Usuario.objects.get(id=user_id)
            if hasattr(user, 'vecino'):
                return user.vecino
    except Exception:
        pass
    return None


# ----------------------------------------------------------------------
# ENDPOINTS EXISTENTES
# ----------------------------------------------------------------------
@csrf_exempt
@require_http_methods(["POST"])
def iniciar_conversacion(request):
    vecino = _get_vecino_from_session(request)
    if not vecino:
        return JsonResponse({"error": "No autenticado"}, status=401)

    try:
        data = json.loads(request.body)
        acuerdo_id = data.get('acuerdo_id')
        if not acuerdo_id:
            return JsonResponse({"error": "acuerdo_id requerido"}, status=400)

        conversacion = ChatService.crear_conversacion_si_es_posible(acuerdo_id)
        return JsonResponse({
            "success": True,
            "conversacion_id": str(conversacion.id_conversacion),
            "message": "Chat habilitado"
        }, status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def enviar_mensaje(request):
    vecino = _get_vecino_from_session(request)
    if not vecino:
        return JsonResponse({"error": "No autenticado"}, status=401)

    try:
        data = json.loads(request.body)
        conversacion_id = data.get('conversacion_id')
        texto = data.get('texto', '').strip()
        if not conversacion_id or not texto:
            return JsonResponse({"error": "conversacion_id y texto son requeridos"}, status=400)

        mensaje = ChatService.enviar_mensaje(conversacion_id, vecino, texto)
        print(f"✅ Mensaje guardado: {mensaje.id_mensaje} - {mensaje.texto[:30]}...")

        # ------------------------------------------------------------------
        # 🚀 NOTIFICACIÓN PUSHER AL DESTINATARIO
        # ------------------------------------------------------------------
        conversacion = mensaje.conversacion
        acuerdo = conversacion.acuerdo
        ofertante = acuerdo.ofertante
        demandante = acuerdo.demandante
        destinatario = demandante if vecino == ofertante else ofertante

        print(f"📨 Enviando evento Pusher a private-user-{destinatario.id}")
        print(f"   Mensaje: {mensaje.texto[:50]}...")

        pusher_client.trigger(
            f'private-user-{destinatario.id}',
            'nuevo-mensaje',
            {
                'conversacion_id': str(conversacion.id_conversacion),
                'emisor': mensaje.emisor.usuario.username,
                'emisor_nombre': mensaje.emisor.usuario.nombre_completo,
                'repuesto': acuerdo.oferta.repuesto.nombre_pieza,
                'texto': mensaje.texto,
                'fecha': mensaje.fecha_envio.isoformat(),
                'mensaje_id': str(mensaje.id_mensaje),
            }
        )
        print("✅ Evento enviado a Pusher")

        return JsonResponse({
            "success": True,
            "mensaje": {
                "id": str(mensaje.id_mensaje),
                "texto": mensaje.texto,
                "fecha": mensaje.fecha_envio.isoformat(),
                "emisor": mensaje.emisor.usuario.username,
                "emisor_id": str(mensaje.emisor.id),
                "estado": mensaje.estado,
                "leido": mensaje.leido
            }
        }, status=201)
    except Exception as e:
        print(f"❌ Error en enviar_mensaje: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
def historial_mensajes(request, conversacion_id):
    vecino = _get_vecino_from_session(request)
    if not vecino:
        return JsonResponse({"error": "No autenticado"}, status=401)

    try:
        mensajes = ChatService.obtener_historial_completo(conversacion_id, vecino)
        data = []
        for m in mensajes:
            data.append({
                "id": str(m.id_mensaje),
                "texto": m.texto,
                "fecha": m.fecha_envio.isoformat(),
                "emisor": m.emisor.usuario.username,
                "emisor_id": str(m.emisor.id),
                "estado": m.estado,
                "leido": m.leido,
            })
        return JsonResponse({"mensajes": data}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_http_methods(["GET"])
def mis_conversaciones(request):
    vecino = _get_vecino_from_session(request)
    if not vecino:
        return JsonResponse({"error": "No autenticado"}, status=401)

    conversaciones = ChatService.get_conversaciones_usuario(vecino)
    data = []
    for conv in conversaciones:
        acuerdo = conv.acuerdo
        otra_parte = acuerdo.demandante if vecino == acuerdo.ofertante else acuerdo.ofertante
        data.append({
            "conversacion_id": str(conv.id_conversacion),
            "repuesto": acuerdo.oferta.repuesto.nombre_pieza,
            "contraparte": otra_parte.usuario.nombre_completo,
            "fecha_inicio": conv.fecha_inicio.isoformat()
        })
    return JsonResponse({"conversaciones": data}, status=200)


# PRUEBA, QUITAR DESPUÉS
@csrf_exempt
@require_http_methods(["POST"])
def crear_acuerdo_prueba(request):
    vecino = _get_vecino_from_session(request)
    if not vecino:
        return JsonResponse({"error": "No autenticado"}, status=401)
    from apps.ofertas.models import Oferta
    from apps.transacciones.models import AcuerdoIntercambio
    oferta = Oferta.objects.filter(estado_oferta=True).first()
    if not oferta:
        return JsonResponse({"error": "No hay ofertas activas"}, status=400)
    ofertante = oferta.usuario.vecino
    if vecino == ofertante:
        otro = Vecino.objects.exclude(id=vecino.id).first()
        if not otro:
            return JsonResponse({"error": "No hay otro vecino"}, status=400)
        demandante = otro
    else:
        demandante = vecino
    acuerdo, created = AcuerdoIntercambio.objects.get_or_create(
        oferta=oferta,
        ofertante=ofertante,
        demandante=demandante,
        defaults={'estado': 'aceptado'}
    )
    if created:
        ChatService.crear_conversacion_si_es_posible(str(acuerdo.id))
    return JsonResponse({"success": True, "acuerdo_id": str(acuerdo.id)})


# ----------------------------------------------------------------------
# 🆕 NUEVO ENDPOINT PARA AUTENTICACIÓN DE CANALES PRIVADOS DE PUSHER (CORREGIDO)
# ----------------------------------------------------------------------
@csrf_exempt
@require_http_methods(["POST"])
def pusher_auth(request):
    print("🔐 Recibida solicitud de autenticación Pusher")
    print(f"   Headers: {request.headers}")
    print(f"   Body: {request.body}")

    session_id = request.headers.get('X-Session-ID')
    print(f"   Session ID: {session_id}")

    if not session_id:
        print("❌ No session ID")
        return JsonResponse({'error': 'No session'}, status=401)

    try:
        session = Session.objects.get(session_key=session_id)
        user_id = session.get_decoded().get('_auth_user_id')
        print(f"   User ID from session: {user_id}")
        if not user_id:
            raise ValueError('No user in session')
        user = Usuario.objects.get(id=user_id)
        vecino = Vecino.objects.get(usuario=user)
        print(f"   Vecino autenticado: ID={vecino.id}, user={vecino.usuario.username}")
    except Exception as e:
        print(f"❌ Error recuperando vecino: {e}")
        return JsonResponse({'error': 'Invalid session'}, status=401)

    # Obtener parámetros del POST (form-urlencoded)
    channel_name = request.POST.get('channel_name')
    socket_id = request.POST.get('socket_id')
    print(f"   channel_name: {channel_name}, socket_id: {socket_id}")

    if not channel_name or not socket_id:
        print("❌ Missing parameters")
        return JsonResponse({'error': 'Missing parameters'}, status=400)

    # Validar que el canal sea privado y pertenezca al usuario autenticado
    expected_channel = f'private-user-{vecino.id}'
    print(f"   Expected channel: {expected_channel}")
    if channel_name != expected_channel:
        print(f"❌ Channel mismatch: {channel_name} != {expected_channel}")
        return JsonResponse({'error': 'Unauthorized channel'}, status=403)

    try:
        auth_response = pusher_client.authenticate(
            channel=channel_name,
            socket_id=socket_id
        )
        print("✅ Autenticación exitosa")
        return JsonResponse(auth_response)
    except Exception as e:
        print(f"❌ Error en autenticación con Pusher: {e}")
        return JsonResponse({'error': str(e)}, status=500)