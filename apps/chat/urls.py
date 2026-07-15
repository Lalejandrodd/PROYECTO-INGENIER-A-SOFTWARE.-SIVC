from django.urls import path
from . import views

urlpatterns = [
    path('iniciar/', views.iniciar_conversacion, name='iniciar-conversacion'),
    path('enviar/', views.enviar_mensaje, name='enviar-mensaje'),
    path('historial/<uuid:conversacion_id>/', views.historial_mensajes, name='historial-mensajes'),
    path('conversaciones/', views.mis_conversaciones, name='mis-conversaciones'),
    path('crear-acuerdo-prueba/', views.crear_acuerdo_prueba, name='crear-acuerdo-prueba'),  # opcional
    path('pusher-auth/', views.pusher_auth, name='pusher-auth'),
]