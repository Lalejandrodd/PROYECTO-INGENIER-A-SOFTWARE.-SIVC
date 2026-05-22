# crear_admin.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings') # Ajusta 'config' si tu proyecto se llama diferente
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    # Usamos el correo en el 'username' para que coincida con el input de React
    user = User.objects.create(
        username='admin@comunidad.com', 
        email='admin@comunidad.com',
        nombre_completo='Administrador General',
        id_usuario='ADMIN001',
        is_superuser=True,
        is_staff=True,
        is_active=True
    )
    user.set_password('Comunidad123*')
    user.save()
    print("¡Usuario de prueba creado con éxito!")
except Exception as e:
    print(f"Error al crear: {str(e)}")