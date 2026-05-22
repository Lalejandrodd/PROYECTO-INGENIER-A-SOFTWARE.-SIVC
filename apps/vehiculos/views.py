# views.py
from django.shortcuts import render
from django.http import JsonResponse
from apps.ofertas.models import Oferta
from apps.vehiculos.models import Vehiculo
from rest_framework.response import Response
from rest_framework.decorators import api_view

@api_view(['GET']) 
def buscar_repuestos(request):
    """
    Búsqueda inteligente de repuestos - HU2
    """
    marca = request.query_params.get('marca')
    modelo = request.query_params.get('modelo')
    anio = request.query_params.get('anio')
    
    if not all([marca, modelo, anio]):
        return Response({"error": "Faltan parámetros obligatorios: marca, modelo y anio."}, status=400)
        
    try:
        # Buscar el vehículo en la base de datos
        vehiculo = Vehiculo.objects.get(
            marca__iexact=marca, 
            modelo__iexact=modelo, 
            anio=anio
        )
        
        # Filtrar ofertas activas compatibles
        ofertas = Oferta.objects.filter(
            repuesto__compatibilidad=vehiculo,
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
            
        return Response(resultados, status=200)
        
    except Vehiculo.DoesNotExist:
        return Response([], status=200)
    except Exception as e:
        return Response({"error": f"Error en el servidor: {str(e)}"}, status=500)
