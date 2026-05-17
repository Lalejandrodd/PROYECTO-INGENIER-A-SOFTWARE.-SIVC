from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.contrib.auth.models import User
from apps.transacciones.models import Transaccion 
from apps.usuarios.models import Vecino

def mi_historial(request):
    """
    Endpoint GET /api/historial/
    Retorna el historial detallado de puntos del usuario autenticado.
    """
    if request.method != 'GET':
        return JsonResponse({"error": "Método no permitido. Usa GET."}, status=405)
        
    # Verificar que el usuario inició sesión
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Usuario no autenticado."}, status=401)
        
    try:
        # 1. Validar si el usuario actual tiene un perfil de vecino asociado
        if not hasattr(request.user, 'vecino'):
            return JsonResponse({
                "error": f"El usuario '{request.user.username}' es administrador o no tiene un perfil de Vecino vinculado en la base de datos."
            }, status=400)

        # 2. Obtener el objeto vecino asociado directamente al usuario autenticado
        vecino = request.user.vecino
        
        # 3. Verificar que exista el historial vinculado al vecino
        try:
            historial = vecino.historial
        except Exception:
            return JsonResponse({"error": "No existe un historial asociado para este Vecino."}, status=400)

        if not hasattr(historial, 'calcular_resumen_puntos'):
            return JsonResponse({"error": "El historial no tiene el método calcular_resumen_puntos()."}, status=500)

        # 4. Ejecutar el método calcular_resumen_puntos() desde el historial del vecino
        resumen = historial.calcular_resumen_puntos()
        
        # 5. Retornar el resumen del historial en formato JSON con estado de éxito
        return JsonResponse(resumen, safe=False, status=200)
        
    except Exception as e:
        # Captura cualquier otro error inesperado para evitar pantallas de fallo globales
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