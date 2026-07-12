from django.apps import AppConfig
from django.db.models.signals import post_migrate


def cargar_marcas_iniciales(sender, **kwargs):
    """
    Función que se ejecuta después de migrar la app 'vehiculos'.
    Carga las marcas iniciales en la base de datos.
    """
    from django.apps import apps
    Marca = apps.get_model('vehiculos', 'Marca')
    
    marcas = [
        "JAC Motors", "Toyota", "Changan", "Ford", "Fiat", "Hyundai",
        "Foton", "Kia", "Mack", "Honda", "Jeep", "RAM", "Renault",
        "Chery", "Volkswagen", "Chevrolet", "Mitsubishi", "Dodge",
        "Nissan", "Mazda", "Tesla"
    ]
    
    for nombre in marcas:
        Marca.objects.get_or_create(nombre=nombre)
    
    print(f"✅ Marcas iniciales cargadas: {len(marcas)} marcas.")


class VehiculosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.vehiculos'

    def ready(self):
        # Conectar la señal post_migrate para que se ejecute después de migrar esta app
        post_migrate.connect(cargar_marcas_iniciales, sender=self)