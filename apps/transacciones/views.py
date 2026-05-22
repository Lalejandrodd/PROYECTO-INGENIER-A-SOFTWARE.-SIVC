from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.models import User
from apps.transacciones.models import Transaccion 
from apps.usuarios.models import Vecino
from django.contrib.sessions.models import Session

def mi_historial(request):
    """Endpoint GET /api/historial/ - usa sessionid del header"""
    
    # Intentar obtener sessionid del header
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
    
    # Si no, intentar con la cookie normal
    if not user and request.user.is_authenticated:
        user = request.user
    
    if not user:
        return JsonResponse({"error": "Usuario no autenticado."}, status=401)
    
    if not hasattr(user, 'vecino'):
        return JsonResponse({"error": "El usuario no tiene perfil de Vecino."}, status=400)
    
    try:
        vecino = user.vecino
        historial = vecino.historial
        resumen = historial.calcular_resumen_puntos()
        return JsonResponse(resumen, safe=False, status=200)
    except Exception as e:
        return JsonResponse({"error": f"Error al obtener el historial: {str(e)}"}, status=500)
    
def ranking_general(request):
    """
    Endpoint GET /api/ranking/
    Retorna el top de usuarios de la comunidad ordenados por sus puntos.
    """
    if request.method != 'GET':
        return JsonResponse({"error": "Método no permitido. Usa GET."}, status=405)
        
    try:      
        # Buscamos los registros.
        # Para evitar que falle en la primera prueba, intentamos estructurar un top 10:
        ranking_data = []
        
        # 1. Obtener los 10 vecinos con mayor puntaje directamente
        vecinos = Vecino.objects.order_by('-saldo_puntos')[:10]
        
        # 2. Construir la lista del ranking de forma segura
        for i, v in enumerate(vecinos, start=1):
            # Fallback seguro para obtener el nombre de usuario
            nombre_usuario = v.usuario.get_full_name() if v.usuario.get_full_name() else v.usuario.username
            
            ranking_data.append({
                "posicion": i,
                "nombre": nombre_usuario,
                "puntos": v.saldo_puntos,
                "nivel": v.ranking
            })

        return JsonResponse({"ranking": ranking_data}, status=200)
        
    except Exception as e:
        # Si ocurre un error real de base de datos o de atributos, se captura aquí de forma global
        return JsonResponse({"error": f"Error al generar el ranking: {str(e)}"}, status=500)