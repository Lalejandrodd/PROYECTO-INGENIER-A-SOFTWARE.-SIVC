from django.shortcuts import render

# apps/usuarios/views.py (o puedes crear un archivo serializers.py)
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Admin # Importamos tus modelos de relación

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # attrs contiene el username/email y password enviados por el cliente
        data = super().validate(attrs)
        
        # Obtenemos el objeto usuario actual
        user = self.user
        
        # Lógica para determinar el rol basándonos en tus modelos Relacionales OneToOne
        if Admin.objects.filter(usuario=user).exists():
            user_role = 'admin'
        else:
            user_role = 'user'
            
        # Inyectamos las propiedades extras que tu Front almacena en el localStorage
        data['role'] = user_role
        data['email'] = user.email
        data['nombre_completo'] = user.nombre_completo # Campo personalizado de tu modelo
        data['success'] = True
        data['user_id'] = user.id                 
        data['username'] = user.username           
        data['is_superuser'] = user.is_superuser   
        data['sessionid'] = data['access']

        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer