"""
URL configuration for config project.
"""
import json

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate, login

from apps.usuarios.models import Usuario, Vecino
from apps.chat.views import pusher_auth  # 👈 Importar la vista de autenticación de Pusher


# ============================================
# ENDPOINT DE LOGIN
# ============================================
@csrf_exempt
@require_POST
def login_api(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            request.session.save()
            
            vecino = user.vecino if hasattr(user, 'vecino') else None
            
            return JsonResponse({
                'success': True, 
                'username': user.username,
                'is_superuser': user.is_superuser,
                'sessionid': request.session.session_key,
                'user_id': str(vecino.id) if vecino else None
            })
        else:
            return JsonResponse({
                'success': False, 
                'error': 'Usuario o contraseña incorrectos'
            }, status=401)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


# ============================================
# ENDPOINT DE REGISTRO DE USUARIO
# ============================================
@csrf_exempt
@require_http_methods(["POST"])
def registrar_usuario(request):
    try:
        data = json.loads(request.body)
        
        username = data.get('username')
        password = data.get('password')
        nombre_completo = data.get('nombre_completo')
        id_usuario = data.get('id_usuario') or username.upper()
        residencia = data.get('residencia')
        
        if not username or not password or not nombre_completo or not residencia:
            return JsonResponse({'success': False, 'error': 'Todos los campos son obligatorios'}, status=400)
        
        if Usuario.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': 'El nombre de usuario ya existe'}, status=400)
        
        usuario = Usuario.objects.create(
            username=username,
            password=make_password(password),
            nombre_completo=nombre_completo,
            id_usuario=id_usuario,
            is_active=True,
            is_staff=False,
            is_superuser=False
        )
        
        Vecino.objects.create(
            usuario=usuario,
            residencia=residencia,
            saldo_puntos=100,
            ranking=1
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Usuario registrado exitosamente',
            'username': usuario.username,
            'id': usuario.id
        }, status=201)
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


# ============================================
# ENDPOINT DE VERIFICACIÓN DE SESIÓN (con user_id)
# ============================================
@csrf_exempt
def verificar_sesion(request):
    session_id = request.headers.get('X-Session-ID')
    
    if session_id:
        from django.contrib.sessions.models import Session
        try:
            session = Session.objects.get(session_key=session_id)
            user_id = session.get_decoded().get('_auth_user_id')
            if user_id:
                from apps.usuarios.models import Usuario
                user = Usuario.objects.get(id=user_id)
                vecino = user.vecino if hasattr(user, 'vecino') else None
                return JsonResponse({
                    'authenticated': True,
                    'username': user.username,
                    'is_superuser': user.is_superuser,
                    'user_id': str(vecino.id) if vecino else None  # ← NUEVO
                })
        except Exception as e:
            print(f"Error al recuperar sesión: {e}")
    
    return JsonResponse({'authenticated': False}, status=401)


# ============================================
# ENDPOINT DE LOGOUT
# ============================================
@csrf_exempt
@require_http_methods(["POST"])
def logout_api(request):
    from django.contrib.auth import logout
    logout(request)
    return JsonResponse({'success': True, 'message': 'Sesión cerrada correctamente'})


# ============================================
# URLS PRINCIPALES
# ============================================
urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Autenticación
    path('api/login/', login_api),
    path('api/registrar-usuario/', registrar_usuario),
    path('api/verificar/', verificar_sesion),
    path('api/logout/', logout_api),
    
    # 👇 RUTA DE AUTENTICACIÓN DE PUSHER (fuera de chat para que coincida con el frontend)
    path('api/pusher/auth/', pusher_auth, name='pusher-auth'),  # <-- NUEVA
    
    # Apps del proyecto
    path('api/', include('apps.ofertas.urls')),        # buscar/, crear/, repuestos/
    path('api/', include('apps.transacciones.urls')),  # historial/, ranking/
    path('api/repuestos/', include('apps.repuestos.urls')),  # listar/, crear/
    path('api/vehiculos/', include('apps.vehiculos.urls')),  # listar vehículos
    path('api/chat/', include('apps.chat.urls')),  # iniciar/, enviar/
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)