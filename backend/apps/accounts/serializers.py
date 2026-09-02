from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="first_name", required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["id", "email", "name"]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    name = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже есть.")
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        user = User(
            username=email,
            email=email,
            first_name=validated_data.get("name", ""),
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
