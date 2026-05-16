from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Vecino
from apps.transacciones.models import Historial


@receiver(post_save, sender=Vecino)
def crear_historial_vecino(sender, instance, created, **kwargs):
    """Cuando se crea un Vecino, automáticamente se crea su Historial"""
    if created:
        Historial.objects.create(vecino=instance)