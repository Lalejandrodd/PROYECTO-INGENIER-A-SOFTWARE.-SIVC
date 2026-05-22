from django.shortcuts import render
from django.http import JsonResponse
from apps.ofertas.models import Oferta
from apps.vehiculos.models import Vehiculo
from rest_framework.response import Response
from rest_framework.decorators import api_view

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
                
            return JsonResponse(resultados, safe=False, status=200)
            
        except Vehiculo.DoesNotExist:
            return JsonResponse([], safe=False, status=200)
        except Exception as e:
            return JsonResponse({"error": f"Error en el servidor: {str(e)}"}, status=500)
            
    return JsonResponse({"error": "Método no permitido. Usa GET."}, status=405)

@api_view(['POST'])
def crear_oferta(request):
    """
    Endpoint para recibir los datos del frontend (HU 1, 7, 12)
    """
    try:
        
        # ---- prueba :p ----
        #print("=== ¡NUEVA PETICIÓN DESDE REACT ===")
        #print("Datos de texto recibidos:", request.data)
        #print("Archivos/Fotos recibidos:", request.FILES.getlist('imagenes'))
        #print("==================================")
        # --------------------------------------

        # 1. Extraemos los datos de texto
        marca = request.data.get('marca')
        modelo = request.data.get('modelo')
        anio = request.data.get('anio')
        descripcion = request.data.get('descripcion')
        
        # 2. Extraemos las imágenes enviadas (es una lista de archivos)
        imagenes = request.FILES.getlist('imagenes')

        # Validaciones básicas de seguridad en backend
        if not all([marca, modelo, anio]) or len(imagenes) < 3:
            return Response({"error": "Datos incompletos o faltan imágenes."}, status=400)
        
        # Respuesta exitosa para decirle a React que todo salió bien
        return Response({
            "mensaje": "¡Oferta recibida en el servidor y procesada con éxito!",
            "datos_recibidos": f"{marca} {modelo} ({anio})"
        }, status=201)

    except Exception as e:
        return Response({"error": f"Error interno: {str(e)}"}, status=500)