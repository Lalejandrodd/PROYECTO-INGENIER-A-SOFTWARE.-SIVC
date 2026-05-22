from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from apps.vehiculos.models import Vehiculo
from .models import Repuesto
import json

def listar_repuestos(request):
    repuestos = Repuesto.objects.all().values('id_repuesto', 'nombre_pieza', 'estado_fisico', 'descripcion_tecnica')
    return JsonResponse(list(repuestos), safe=False)

@csrf_exempt
@require_http_methods(["POST"])
def crear_repuesto(request):
    try:
        data = json.loads(request.body)
        
        nombre_pieza = data.get('nombre_pieza')
        descripcion_tecnica = data.get('descripcion_tecnica')
        estado_fisico = data.get('estado_fisico')
        marca = data.get('marca')
        modelo = data.get('modelo')
        anio = data.get('anio')
        
        vehiculo, created = Vehiculo.objects.get_or_create(
            marca=marca,
            modelo=modelo,
            anio=anio
        )
        
        repuesto = Repuesto.objects.create(
            nombre_pieza=nombre_pieza,
            descripcion_tecnica=descripcion_tecnica,
            estado_fisico=estado_fisico
        )
        
        repuesto.compatibilidad.add(vehiculo)
        repuesto.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Repuesto creado exitosamente',
            'repuesto': {
                'id_repuesto': str(repuesto.id_repuesto),
                'nombre_pieza': repuesto.nombre_pieza,
                'estado_fisico': repuesto.estado_fisico,
                'marca': marca,
                'modelo': modelo,
                'anio': anio
            }
        }, status=201)
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)