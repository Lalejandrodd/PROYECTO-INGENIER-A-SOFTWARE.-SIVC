import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from apps.vehiculos.models import Marca, Vehiculo  # ← Importación necesaria
from .models import Repuesto

def listar_repuestos(request):
    """
    GET /api/repuestos/
    Retorna la lista de repuestos disponibles para el formulario de ofertas.
    """
    repuestos = Repuesto.objects.all().values('id_repuesto', 'nombre_pieza', 'estado_fisico', 'descripcion_tecnica')
    return JsonResponse(list(repuestos), safe=False)

@csrf_exempt
@require_http_methods(["POST"])
def crear_repuesto(request):
    """
    POST /api/repuestos/crear/
    Crea un nuevo repuesto y lo vincula a un vehículo (marca, modelo, año).
    Espera: nombre_pieza, descripcion_tecnica, estado_fisico, marca_id, modelo, anio.
    """
    try:
        data = json.loads(request.body)
        nombre_pieza = data.get('nombre_pieza')
        descripcion_tecnica = data.get('descripcion_tecnica')
        estado_fisico = data.get('estado_fisico')
        marca_id = data.get('marca_id')
        modelo = data.get('modelo')
        anio = data.get('anio')

        # --- Validaciones ---
        if not nombre_pieza or not descripcion_tecnica or not estado_fisico:
            return JsonResponse({'success': False, 'error': 'Faltan datos del repuesto'}, status=400)

        if not marca_id:
            return JsonResponse({'success': False, 'error': 'Se requiere seleccionar una marca'}, status=400)

        try:
            marca = Marca.objects.get(id=marca_id)
        except (Marca.DoesNotExist, ValueError):
            return JsonResponse({'success': False, 'error': 'La marca seleccionada no es válida'}, status=400)

        if not modelo or not anio:
            return JsonResponse({'success': False, 'error': 'Faltan el modelo o el año del vehículo'}, status=400)

        # --- Crear o recuperar el vehículo (con la marca FK) ---
        vehiculo, created = Vehiculo.objects.get_or_create(
            marca=marca,
            modelo=modelo,
            anio=anio
        )

        # --- Crear el repuesto ---
        repuesto = Repuesto.objects.create(
            nombre_pieza=nombre_pieza,
            descripcion_tecnica=descripcion_tecnica,
            estado_fisico=estado_fisico
        )

        # --- Vincular compatibilidad ---
        repuesto.compatibilidad.add(vehiculo)
        repuesto.save()

        return JsonResponse({
            'success': True,
            'message': 'Repuesto creado exitosamente',
            'repuesto': {
                'id_repuesto': str(repuesto.id_repuesto),
                'nombre_pieza': repuesto.nombre_pieza,
                'estado_fisico': repuesto.estado_fisico,
                'marca': marca.nombre,
                'modelo': modelo,
                'anio': anio
            }
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Formato JSON inválido'}, status=400)
    except Exception as e:
        print("Error en crear_repuesto:", str(e))
        return JsonResponse({'success': False, 'error': f'Error interno: {str(e)}'}, status=500)