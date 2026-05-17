from django.shortcuts import render

# Create your views here.
from django.shortcuts import render
from django.http import JsonResponse
from apps.ofertas.models import Oferta, MatrizCompatibilidad
from apps.vehiculos.models import Vehiculo

def buscar_repuestos(request):
    """
    Vista en Django puro para buscar repuestos compatibles.
    Ruta: GET /api/buscar/?marca=X&modelo=Y&anio=Z
    """
    if request.method == 'GET':
        # 1. Capturar parámetros 
        marca = request.GET.get('marca')
        modelo = request.GET.get('modelo')
        anio = request.GET.get('anio')
        
        # 2. Validación: Verificar que el usuario envíe los 3 campos
        if not all([marca, modelo, anio]):
            return JsonResponse(
                {"error": "Faltan parámetros obligatorios: marca, modelo y anio."}, 
                status=400
            )
            
        try:
            # 3. Buscar el vehículo exacto en la base de datos por sus atributos
            vehiculo = Vehiculo.objects.get(marca__iexact=marca, modelo__iexact=modelo, anio=anio)
            
            # 4. Obtener los IDs de los repuestos que son compatibles con este vehículo usando MatrizCompatibilidad
            repuestos_compatibles_ids = MatrizCompatibilidad.objects.filter(
                vehiculo=vehiculo
            ).values_list('repuesto_id', flat=True)
            
            # 5. Filtrar las ofertas de esos repuestos compatibles que estén activas
            ofertas = Oferta.objects.filter(
                repuesto_id__in=repuestos_compatibles_ids,
                estado_oferta=True
            ).distinct()
            
            # 6. Construir la lista de resultados adaptada a tus campos reales (valor_puntos)
            resultados = []
            for oferta in ofertas:
                resultados.append({
                    "id_inventario": str(oferta.id_inventario),
                    "repuesto": oferta.repuesto.nombre_pieza if hasattr(oferta.repuesto, 'nombre_pieza') else str(oferta.repuesto),
                    "valor_puntos": oferta.valor_puntos,
                    "rango_horario": oferta.rango_horario,
                    "referencia_ubicacion": oferta.referencia_ubicacion,
                    "estado_oferta": oferta.estado_oferta
                })
                
            # 7. Responder con la lista en formato JSON
            return JsonResponse(resultados, safe=False, status=200)
            
        except Vehiculo.DoesNotExist:
            # Si el carro no existe en la base de datos, devolvemos una lista vacía de forma segura
            return JsonResponse([], safe=False, status=200)
            
        except Exception as e:
            # Captura cualquier otro error inesperado para que no se caiga el servidor
            return JsonResponse({"error": f"Error en el servidor: {str(e)}"}, status=500)
            
    return JsonResponse({"error": "Método no permitido. Usa GET."}, status=405)