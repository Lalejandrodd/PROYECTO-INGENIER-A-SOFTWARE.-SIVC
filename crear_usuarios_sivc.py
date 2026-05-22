import os
import sys
import django

# 1. Configurar el entorno de Django manualmente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SIVC.settings') # <-- Cambia 'SIVC' por el nombre exacto de la carpeta de tu proyecto si se llama diferente

try:
    django.setup()
    from django.contrib.auth.models import User
    
    print("Iniciando inyección de usuarios de prueba...")

    # Crear Administrador Técnico
    if not User.objects.filter(username='admin_carlos').exists():
        User.objects.create_superuser('admin_carlos', 'carlos.admin@comunidad.com', 'SivcAdmin2026!')
        print(" -> ¡Administrador 'admin_carlos' guardado con éxito!")
    else:
        print(" -> El administrador 'admin_carlos' ya existía.")

    # Crear Vecino Juan
    if not User.objects.filter(username='vecino_juan').exists():
        User.objects.create_user('vecino_juan', 'juan.perez@email.com', 'VecinoJuan123')
        print(" -> ¡Vecino 'vecino_juan' guardado con éxito!")
    else:
        print(" -> El vecino 'vecino_juan' ya existía.")

    # Crear Vecina María
    if not User.objects.filter(username='vecina_maria').exists():
        User.objects.create_user('vecina_maria', 'maria.gomez@email.com', 'MariaSivc456')
        print(" -> ¡Vecina 'vecina_maria' guardada con éxito!")
    else:
        print(" -> La vecina 'vecina_maria' ya existía.")

    print("\n[PROCESO TERMINADO]: Todos los usuarios están listos en la Base de Datos.")

except Exception as e:
    print(f"\n[ERROR]: Ocurrió un problema al inicializar Django: {e}")
    print("Asegúrate de cambiar 'SIVC.settings' por el nombre correcto de la carpeta de tu configuración.")