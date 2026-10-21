import re

from rest_framework import serializers

PHONE_RE = re.compile(r"^\+?[1-9]\d{9,14}$")


class RequestOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)

    def validate_phone_number(self, value):
        value = value.strip().replace(" ", "")
        if not PHONE_RE.match(value):
            raise serializers.ValidationError("Valid phone number daalo.")
        return value


class VerifyOTPSerializer(RequestOTPSerializer):
    otp = serializers.RegexField(r"^\d{6}$", max_length=6)    