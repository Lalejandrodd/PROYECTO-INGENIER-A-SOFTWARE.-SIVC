import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.sessions.models import Session
from apps.usuarios.models import Vecino, Usuario
from apps.chat.services import ChatService

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