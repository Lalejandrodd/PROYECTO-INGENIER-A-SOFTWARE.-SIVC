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
    
    MÉTODO DEL DIAGRAMA: realizarBusqueda(filtros)
    Clase de origen en el diagrama: Vecino (hereda de Usuario)
    Aquí se plasma la lógica de negocio de ese método.
    """
    marca = request.query_params.get('marca')
    modelo = request.query_params.get('modelo')
    anio = request.query_params.get('anio')
    
    if not all([marca, modelo, anio]):
        return Response({"error": "Faltan parámetros obligatorios: marca, modelo y anio."}, status=400)
        
    try:
        # Interacción con CLASE DEL DIAGRAMA: Vehiculo
        vehiculo = Vehiculo.objects.get(
            marca__iexact=marca, 
            modelo__iexact=modelo, 
            anio=anio
        )
        
        # Interacción con CLASE DEL DIAGRAMA: Oferta
        # En lugar de usar una Matriz, buscamos a través de la Clase Asociación (relación indirecta)
        ofertas = Oferta.objects.filter(
            repuesto__vehiculos_compatibles=vehiculo, # Uso de la nueva relación
            estado_oferta=True
        ).distinct()
        
        resultados = []
        for oferta in ofertas:
            # Recuperamos atributos definidos en las clases Oferta, Repuesto y Disponibilidad
            resultados.append({
                "id_inventario": str(oferta.id_inventario),      # Atributo de Oferta
                "repuesto": oferta.repuesto.nombre_pieza,        # Atributo de Repuesto
                "valor_puntos": oferta.valor_puntos,             # Atributo de Oferta
                "rango_horario": oferta.rango_horario,           # Atributo de Disponibilidad (usualmente embebido o relacionado)
                "referencia_ubicacion": oferta.referencia_ubicacion, # Atributo de Disponibilidad
                "estado_oferta": oferta.estado_oferta            # Atributo de Oferta
            })
            
        return Response(resultados, status=200)
        
    except Vehiculo.DoesNotExist:
        return Response([], status=200)
    except Exception as e:
        return Response({"error": f"Error en el servidor: {str(e)}"}, status=500)
    
def listar_vehiculos(request):
    # Interacción con CLASE DEL DIAGRAMA: Vehiculo
    vehiculos = Vehiculo.objects.all().values('id', 'marca', 'modelo', 'anio')
    return JsonResponse(list(vehiculos), safe=False)
