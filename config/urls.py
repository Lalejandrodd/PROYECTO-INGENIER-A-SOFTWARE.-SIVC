"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import json

from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.views.decorators.http import require_http_methods
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate, login
import json

from apps.usuarios.models import Usuario, Vecino

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
            
            return JsonResponse({
                'success': True, 
                'username': user.username,
                'is_superuser': user.is_superuser,
                'sessionid': request.session.session_key  # ← IMPORTANTE
            })
        else:
            return JsonResponse({
                'success': False, 
                'error': 'Usuario o contraseña incorrectos'
            }, status=401)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def registrar_usuario(request):
    """Endpoint para registrar nuevos vecinos con contraseña hasheada"""
    try:
        data = json.loads(request.body)
        
        username = data.get('username')
        password = data.get('password')
        nombre_completo = data.get('nombre_completo')
        id_usuario = data.get('id_usuario') or username.upper()
        residencia = data.get('residencia')
        
        # Validaciones
        if not username or not password or not nombre_completo or not residencia:
            return JsonResponse({'success': False, 'error': 'Todos los campos son obligatorios'}, status=400)
        
        if Usuario.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': 'El nombre de usuario ya existe'}, status=400)
        
        # Crear usuario con contraseña HASHEADA
        usuario = Usuario.objects.create(
            username=username,
            password=make_password(password),  # ← Esto hashea la contraseña
            nombre_completo=nombre_completo,
            id_usuario=id_usuario,
            is_active=True,
            is_staff=False,
            is_superuser=False
        )
        
        # Crear perfil de vecino asociado
        vecino = Vecino.objects.create(
            usuario=usuario,
            residencia=residencia,
            saldo_puntos=100,  # Puntos iniciales
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

@csrf_exempt
@csrf_exempt
def verificar_sesion(request):
    """Endpoint para verificar si el usuario está autenticado"""
    # Intentar obtener sessionid del header
    session_id = request.headers.get('X-Session-ID')
    
    if session_id:
        from django.contrib.sessions.models import Session
        try:
            session = Session.objects.get(session_key=session_id)
            user_id = session.get_decoded().get('_auth_user_id')
            if user_id:
                from apps.usuarios.models import Usuario
                user = Usuario.objects.get(id=user_id)
                return JsonResponse({
                    'authenticated': True,
                    'username': user.username,
                    'is_superuser': user.is_superuser
                })
        except Exception as e:
            print(f"Error al recuperar sesión: {e}")
    
    return JsonResponse({'authenticated': False}, status=401)


@csrf_exempt
@require_http_methods(["POST"])
def logout_api(request):
    """Endpoint para cerrar sesión"""
    from django.contrib.auth import logout
    logout(request)
    return JsonResponse({'success': True, 'message': 'Sesión cerrada correctamente'})


# Agregar la URL en urlpatterns
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/login/', login_api),
    path('api/registrar-usuario/', registrar_usuario),
    path('api/verificar/', verificar_sesion),  
    path('api/logout/', logout_api),          
    path('api/', include('apps.ofertas.urls')),
    path('api/', include('apps.transacciones.urls')),
]
