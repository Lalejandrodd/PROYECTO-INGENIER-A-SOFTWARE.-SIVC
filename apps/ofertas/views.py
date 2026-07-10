import json
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
from django.contrib.sessions.models import Session
from django.contrib.auth.models import User

from apps.ofertas.models import Oferta, Urgencia
from apps.repuestos.models import Repuesto
from apps.vehiculos.models import Vehiculo, Marca
from apps.usuarios.models import Usuario, Vecino

from rest_framework.response import Response
from rest_framework.decorators import api_view

from config.settings import pusher_client
import config.settings as config_settings

# Importaciones para autenticación JWT (si se usan)
from rest_framework_simplejwt.tokens import AccessToken
import jwt


# ============================================================
# BÚSQUEDA INTELIGENTE DE REPUESTOS (HU2) – CORREGIDA
# ============================================================
def buscar_repuestos(request):
    """
    GET /api/buscar/
    Recibe marca_id, modelo, anio y retorna ofertas compatibles.
    """
    if request.method != 'GET':
        return JsonResponse({"error": "Método no permitido. Usa GET."}, status=405)

    marca_id = request.GET.get('marca_id')
    modelo = request.GET.get('modelo')
    anio = request.GET.get('anio')

    if not all([marca_id, modelo, anio]):
        return JsonResponse(
            {"error": "Faltan parámetros obligatorios: marca_id, modelo y anio."},
            status=400
        )

    try:
        vehiculo = Vehiculo.objects.get(
            marca_id=marca_id,
            modelo__iexact=modelo,
            anio=anio
        )
    except Vehiculo.DoesNotExist:
        return JsonResponse([], safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": f"Error al buscar vehículo: {str(e)}"}, status=500)

    ofertas = Oferta.objects.filter(
        repuesto__compatibilidad=vehiculo,
        estado_oferta=True
    ).distinct()

    resultados = []
    for oferta in ofertas:
        rutas_fotos = [foto.imagen.url for foto in oferta.fotos.all() if foto.imagen]
        resultados.append({
            "id_inventario": str(oferta.id_inventario),
            "repuesto": oferta.repuesto.nombre_pieza,
            "valor_puntos": oferta.valor_puntos,
            "rango_horario": oferta.rango_horario,
            "referencia_ubicacion": oferta.referencia_ubicacion,
            "estado_oferta": oferta.estado_oferta,
            "fotos": rutas_fotos
        })

    return JsonResponse(resultados, safe=False, status=200)


# ============================================================
# CREAR OFERTA (HU1, HU7, HU12) – USANDO INTERMEDIARIO DE VALOR
# ============================================================
@csrf_exempt
@require_http_methods(["POST"])
def crear_oferta(request):
    """POST /api/crear/ - Crear una oferta utilizando el Intermediario de Valor"""
    try:
        session_id = request.headers.get('X-Session-ID')
        from apps.transacciones.gestores.valor_mediator import gestor_valor

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

        valor_manual = 0.0
        horas_tiempo = 0.0
        imagenes = []

        if request.content_type and 'multipart/form-data' in request.content_type:
            repuesto_id = request.POST.get('repuesto_id')
            rango_horario = request.POST.get('rango_horario')
            referencia_ubicacion = request.POST.get('referencia_ubicacion')
            tipo_tasacion = request.POST.get('tipo_tasacion', 'algoritmico')
            valor_manual = request.POST.get('valor_manual', 0.0)
            horas_tiempo = request.POST.get('horas', 0.0)

            imagenes = request.FILES.getlist('imagenes')
            import os
            EXTENSIONES_PERMITIDAS = ['.jpg', '.jpeg', '.png']

            if len(imagenes) < 3 or len(imagenes) > 5:
                return JsonResponse({"error": "Debe cargar entre 3 y 5 fotografías."}, status=400)

            for imagen in imagenes:
                ext = os.path.splitext(imagen.name)[1].lower()
                if ext not in EXTENSIONES_PERMITIDAS:
                    return JsonResponse({"error": f"Formato inválido en '{imagen.name}'. Solo JPG o PNG."}, status=400)
                if imagen.size > 10 * 1024 * 1024:
                    return JsonResponse({"error": f"El archivo '{imagen.name}' excede el límite de 10 MB."}, status=400)

        else:
            data = json.loads(request.body)
            repuesto_id = data.get('repuesto_id')
            rango_horario = data.get('rango_horario')
            referencia_ubicacion = data.get('referencia_ubicacion')
            tipo_tasacion = data.get('tipo_tasacion', 'algoritmico')
            valor_manual = data.get('valor_manual', 0.0)
            horas_tiempo = data.get('horas', 0.0)

        if not repuesto_id or not rango_horario or not referencia_ubicacion:
            return JsonResponse({"error": "Faltan parámetros requeridos"}, status=400)

        try:
            repuesto = Repuesto.objects.get(id_repuesto=repuesto_id)
        except Repuesto.DoesNotExist:
            return JsonResponse({"error": "Repuesto no encontrado"}, status=404)

        vehiculo = repuesto.compatibilidad.first()
        anio_ref = vehiculo.anio if vehiculo else 2020

        datos_contexto = {
            'estado_fisico': repuesto.estado_fisico,
            'categoria': repuesto.nombre_pieza,
            'anio_vehiculo': anio_ref,
            'valor_manual': valor_manual,
            'horas': horas_tiempo
        }

        try:
            valor_puntos = gestor_valor.procesar_valor(tipo_tasacion, datos_contexto)
        except ValueError as val_err:
            return JsonResponse({"error": str(val_err)}, status=400)

        oferta = Oferta()
        oferta.repuesto = repuesto
        oferta.usuario = user
        oferta.rango_horario = rango_horario
        oferta.referencia_ubicacion = referencia_ubicacion
        oferta.estado_oferta = True
        oferta.tipo_tasacion = tipo_tasacion
        oferta.valor_puntos = valor_puntos
        oferta._valor_manual = valor_manual
        oferta.save()

        from apps.ofertas.models import Fotografia
        for imagen in imagenes:
            Fotografia.objects.create(oferta=oferta, imagen=imagen)

        return JsonResponse({
            'success': True,
            'message': f'Oferta creada usando modalidad: {tipo_tasacion}',
            'id_inventario': str(oferta.id_inventario),
            'valor_puntos': oferta.valor_puntos,
            'cantidad_fotos': len(imagenes)
        }, status=201)

    except Exception as e:
        print(f"Error en crear_oferta: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


# ============================================================
# LISTAR REPUESTOS (para selectores del frontend)
# ============================================================
def listar_repuestos(request):
    repuestos = Repuesto.objects.all().values('id_repuesto', 'nombre_pieza', 'estado_fisico')
    return JsonResponse(list(repuestos), safe=False)


# ============================================================
# URGENCIAS – TABLÓN Y GESTIÓN (HU6)
# ============================================================
@csrf_exempt
def listar_urgencias_tablon(request):
    """
    GET  /api/urgencias/  → Lista urgencias activas
    POST /api/urgencias/  → Crea una nueva urgencia y notifica por Pusher
    """
    from apps.usuarios.models import Usuario, Vecino
    from apps.vehiculos.models import Vehiculo

    if request.method == 'POST':
        try:
            session_id = request.headers.get('X-Session-ID')
            vecino_autenticado = None

            if session_id:
                try:
                    session = Session.objects.get(session_key=session_id)
                    session_data = session.get_decoded()
                    user_id = session_data.get('_auth_user_id')
                    if user_id:
                        usuario_generico = Usuario.objects.get(id=user_id)
                        vecino_autenticado = Vecino.objects.get(usuario=usuario_generico)
                except Exception as e:
                    print(f"Error recuperando sesión: {e}")

            if not vecino_autenticado:
                vecino_autenticado = Vecino.objects.exclude(urgencia__activa=True).first()
                if not vecino_autenticado:
                    vecino_autenticado = Vecino.objects.last()

            if not vecino_autenticado:
                return JsonResponse({"error": "No hay ningún Vecino registrado en el sistema"}, status=401)

            data = json.loads(request.body)
            nombre_pieza = data.get('pieza')
            descripcion = data.get('descripcion')
            vehiculo_id = data.get('vehiculoId')
            puntos_extra = data.get('puntos', 0)

            if not all([nombre_pieza, descripcion, vehiculo_id]):
                return JsonResponse({"error": "Faltan parámetros requeridos"}, status=400)

            try:
                vehiculo = Vehiculo.objects.get(pk=vehiculo_id)
            except Vehiculo.DoesNotExist:
                return JsonResponse({"error": f"Vehículo ID {vehiculo_id} no existe"}, status=404)

            nueva_urgencia = Urgencia.objects.create(
                vecino=vecino_autenticado,
                vehiculo=vehiculo,
                nombre_pieza_requerida=nombre_pieza,
                descripcion_contexto=descripcion,
                puntos_recompensa_extra=int(puntos_extra or 0),
                activa=True,
                fecha_hora_publicacion=timezone.now()
            )

            try:
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
                print(f"Pusher no configurado: {p_err}")

            return JsonResponse({
                'status': 'success',
                'message': 'Urgencia publicada con éxito',
                'id_urgencia': nueva_urgencia.id_urgencia
            }, status=201)

        except Exception as e:
            return JsonResponse({"error": f"Error interno: {str(e)}"}, status=500)

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


# ============================================================
# RESOLVER EMERGENCIA (HU6)
# ============================================================
@csrf_exempt
def resolver_emergencia(request, id_urgencia):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    urgencia = get_object_or_404(Urgencia, id_urgencia=id_urgencia)
    urgencia.activa = False
    urgencia.save()

    return JsonResponse({
        'status': 'success',
        'message': f'Urgencia {urgencia.nombre_pieza_requerida} resuelta exitosamente.',
        'id_urgencia': id_urgencia
    })


# ============================================================
# POSTULAR, ACEPTAR Y RECHAZAR AYUDA (HU6)
# ============================================================
@csrf_exempt
def postular_ayuda(request, urgencia_id):
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        return JsonResponse({'error': 'Debes iniciar sesión'}, status=401)

    session_id = session_id.strip().replace('"', '').replace("'", "")
    if session_id.startswith('Bearer '):
        session_id = session_id.split(' ')[1]

    usuario_autenticado = None

    try:
        token = AccessToken(session_id)
        user_id = token['user_id']
        usuario_autenticado = Usuario.objects.get(id=user_id)
        print(f"✅ Usuario identificado vía JWT: {usuario_autenticado.username}")
    except Exception:
        try:
            session = Session.objects.get(session_key=session_id)
            user_id = session.get_decoded().get('_auth_user_id')
            if user_id:
                usuario_autenticado = Usuario.objects.get(id=user_id)
                print(f"✅ Usuario identificado vía Sesión: {usuario_autenticado.username}")
        except Exception as e_session:
            print(f"❌ Error de autenticación: {e_session}")

    if not usuario_autenticado:
        return JsonResponse({'error': 'Sesión inválida o expirada'}, status=401)

    try:
        urgencia = Urgencia.objects.get(id_urgencia=urgencia_id)
        vecino_b = Vecino.objects.get(usuario=usuario_autenticado)

        if urgencia.vecino == vecino_b:
            return JsonResponse({'error': 'No puedes postularte a tu propia urgencia'}, status=400)

        urgencia.postular_colaborador(vecino_b)

        id_creador = urgencia.vecino.usuario.id
        config_settings.pusher_client.trigger(
            f'notificaciones-vecino-{id_creador}',
            'notificacion-ayuda',
            {
                'urgencia_id': urgencia.id_urgencia,
                'message': f'El vecino @{usuario_autenticado.username} ha ofrecido el repuesto: {urgencia.nombre_pieza_requerida}.',
                'nombre_colaborador': usuario_autenticado.username
            }
        )
        return JsonResponse({'success': True, 'message': 'Postulación exitosa'})

    except Urgencia.DoesNotExist:
        return JsonResponse({'error': 'La urgencia no existe'}, status=404)
    except Vecino.DoesNotExist:
        return JsonResponse({'error': 'El usuario no tiene perfil de Vecino'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def aceptar_ayuda(request, urgencia_id):
    try:
        urgencia = Urgencia.objects.get(id_urgencia=urgencia_id)
        vecino_creador = urgencia.vecino
        vecino_colaborador = getattr(urgencia, 'colaborador', None)

        if vecino_creador and vecino_colaborador:
            puntos = urgencia.puntos_recompensa_extra
            vecino_creador.saldo_puntos -= puntos
            vecino_colaborador.saldo_puntos += puntos
            vecino_creador.save()
            vecino_colaborador.save()
            print(f"💰 Transferidos {puntos} pts")

        urgencia.estado_tramite = 'completada'
        urgencia.save()

        config_settings.pusher_client.trigger('tablon-urgencias', 'nueva-urgencia', {
            'id_urgencia': urgencia.id_urgencia,
            'estado_tramite': 'completada'
        })

        return JsonResponse({'success': True, 'message': 'Urgencia completada y puntos transferidos.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def rechazar_ayuda(request, urgencia_id):
    try:
        urgencia = Urgencia.objects.get(id_urgencia=urgencia_id)
        urgencia.rechazar_solucion()
        config_settings.pusher_client.trigger('tablon-urgencias', 'nueva-urgencia', {})
        return JsonResponse({'success': True, 'message': 'Postulación rechazada.'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)