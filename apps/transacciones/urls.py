from django.urls import path
from . import views

urlpatterns = [
    path('historial/', views.mi_historial, name='mi-historial'),
    path('ranking/', views.ranking_general, name='ranking-general'),
    
    path('calificar/', views.calificar, name='calificar'),
    path('reputacion/<int:user_id>/', views.reputacion_usuario, name='reputacion-usuario'),
    path('transacciones-para-calificar/', views.transacciones_para_calificar, name='transacciones-para-calificar'),
    
    path('solicitar/', views.solicitar_intercambio, name='solicitar-intercambio'),
    path('solicitudes-pendientes/', views.solicitudes_pendientes, name='solicitudes-pendientes'),
    path('aceptar/<int:acuerdo_id>/', views.aceptar_intercambio, name='aceptar-intercambio'),
    path('confirmar-recepcion/<uuid:transaccion_id>/', views.confirmar_recepcion, name='confirmar-recepcion'),
    path('transacciones-para-confirmar/', views.transacciones_para_confirmar, name='transacciones-para-confirmar'),

    path('mis-acuerdos/', views.mis_acuerdos, name='mis-acuerdos'),
    path('solicitar-cancelacion/<int:acuerdo_id>/', views.solicitar_cancelacion, name='solicitar-cancelacion'),
    path('confirmar-cancelacion/<int:acuerdo_id>/', views.confirmar_cancelacion, name='confirmar-cancelacion'),
    path('rechazar-cancelacion/<int:acuerdo_id>/', views.rechazar_cancelacion, name='rechazar-cancelacion'),
]