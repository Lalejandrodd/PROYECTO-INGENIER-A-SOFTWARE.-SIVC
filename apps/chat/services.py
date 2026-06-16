from django.db import models
from django.core.exceptions import ValidationError
from .models import Conversacion, Mensaje
from apps.transacciones.models import AcuerdoIntercambio
from apps.usuarios.models import Vecino

class ChatService:
    """Encapsula la lógica de creación y envío de mensajes (SOLID: SRP)"""

    @staticmethod
    def crear_conversacion_si_es_posible(acuerdo_id: str) -> Conversacion:
        """
        Crea una conversación solo si el acuerdo está en estado 'aceptado'.
        Lanza ValidationError si no corresponde.
        """
        try:
            acuerdo = AcuerdoIntercambio.objects.get(id=acuerdo_id)
        except AcuerdoIntercambio.DoesNotExist:
            raise ValidationError("Acuerdo no existe")

        if acuerdo.estado != 'aceptado':
            raise ValidationError("El acuerdo debe estar aceptado para iniciar el chat")

        conversacion, created = Conversacion.objects.get_or_create(acuerdo=acuerdo)
        return conversacion

    @staticmethod
    def enviar_mensaje(conversacion_id: str, emisor: Vecino, texto: str) -> Mensaje:
        """Crea un nuevo mensaje con estado 'sent'."""
        try:
            conversacion = Conversacion.objects.get(id_conversacion=conversacion_id)
        except Conversacion.DoesNotExist:
            raise ValidationError("Conversación no encontrada")

        # Validar que el emisor sea parte del acuerdo
        acuerdo = conversacion.acuerdo
        if emisor != acuerdo.ofertante and emisor != acuerdo.demandante:
            raise ValidationError("No eres parte de esta conversación")

        if not texto.strip():
            raise ValidationError("El mensaje no puede estar vacío")

        mensaje = Mensaje.objects.create(
            conversacion=conversacion,
            emisor=emisor,
            texto=texto.strip(),
            estado='sent'
        )
        return mensaje

    @staticmethod
    def obtener_historial_completo(conversacion_id: str, vecino: Vecino):
        """
        Retorna todos los mensajes de la conversación y marca como leídos
        los mensajes no leídos que fueron enviados por la otra persona.
        """
        try:
            conversacion = Conversacion.objects.get(id_conversacion=conversacion_id)
        except Conversacion.DoesNotExist:
            raise ValidationError("Conversación no encontrada")

        acuerdo = conversacion.acuerdo
        if vecino != acuerdo.ofertante and vecino != acuerdo.demandante:
            raise ValidationError("No eres parte de esta conversación")

        # Obtener todos los mensajes ordenados
        mensajes = Mensaje.objects.filter(conversacion=conversacion).order_by('fecha_envio')

        # Marcar como leídos los mensajes enviados por la otra persona que aún no lo están
        for msg in mensajes:
            if msg.emisor != vecino and not msg.leido:
                msg.marcar_leido()

        return mensajes

    @staticmethod
    def get_conversaciones_usuario(vecino: Vecino):
        """Retorna todas las conversaciones activas donde el vecino participa."""
        acuerdos = AcuerdoIntercambio.objects.filter(
            models.Q(ofertante=vecino) | models.Q(demandante=vecino),
            estado='aceptado'
        )
        conversaciones = Conversacion.objects.filter(acuerdo__in=acuerdos, activa=True)
        return conversaciones