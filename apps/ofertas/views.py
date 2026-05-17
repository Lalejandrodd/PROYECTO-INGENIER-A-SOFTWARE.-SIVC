from django.shortcuts import render
from django.http import JsonResponse
from apps.ofertas.models import Oferta
from apps.vehiculos.models import Vehiculo

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
            
            # IMPORTANTE: Usar la relación ManyToMany directamente
            ofertas = Oferta.objects.filter(
                repuesto__compatibilidad=vehiculo,  # ← Esto usa la tabla repuestos_repuesto_compatibilidad
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