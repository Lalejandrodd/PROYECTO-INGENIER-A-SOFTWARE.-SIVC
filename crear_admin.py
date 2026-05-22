# crear_admin.py
import os
import django

# Configuramos el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings') # Si tu carpeta principal no se llama 'config', cambia 'config.settings' por el nombre correcto
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

try:
    # Intentamos crear el usuario de forma directa y limpia
    user = User.objects.create(
        username='admin_comunidad',
        email='admin@comunidad.com',
        is_superuser=True,
        is_staff=True,
        is_active=True
    )
    user.set_password('Lol1234567*')
    user.save()
    print("====================================================")
    print("¡ÉXITO: Superusuario 'admin_comunidad' creado con contraseña 'Comunidad123*'!")
    print("====================================================")
except Exception as e:
    print("====================================================")
    print(f"No se pudo crear: {str(e)}")
    print("====================================================")