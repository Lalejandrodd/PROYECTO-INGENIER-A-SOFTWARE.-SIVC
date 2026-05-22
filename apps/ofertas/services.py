from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import Oferta


class OfertaService:
    """
    Servicio para manejar reglas de negocio de ofertas
    """
    
    @staticmethod
    def validar_limite_diario(usuario):
        """
        Restricción del Brief (página 11):
        "Cada usuario tiene un límite de 5 publicaciones al día (para evitar spam)."
        
        Retorna True si está dentro del límite, lanza ValidationError si excede.
        """
        hoy = timezone.now().date()
        manana = hoy + timezone.timedelta(days=1)
        
        publicaciones_hoy = Oferta.objects.filter(
            usuario=usuario,
            fecha_publicacion__date=hoy
        ).count()
        
        if publicaciones_hoy >= 5:
            raise ValidationError(
                f"Límite de 5 publicaciones diarias alcanzado. "
                f"Has publicado {publicaciones_hoy} ofertas hoy."
            )
        
        return True