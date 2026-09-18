from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthenticatedViaCookie(BasePermission):
    """
    sirf ek readadility wrapper - CookieJWTAuthentication already user to request .user mein daal deta hahi agr 
    token vaild hai yeh permission sirf explict check hai ki user authticated hai
 """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

class HasRole(BasePermission):
    """
    Generic role-check permission . View mein use karne ke liye 

    class SomeView(APIVIEW):
       permission_classess = [hasrole ]
       allowed_roles = ["admin", "manager"]



    """


    def has_permission(self, request, view):
        if not(request.user and request.user.is_authenticated):
          return False

        allowed_roles = getattr(view, "allowed_roles", None)
        if not allowed_roles:
            # View ne roles specify nahi kiye -> safe default: deny
            return False

        user_role = getattr(request.user, "role",None)
        return user_role in allowed_roles


class IsAdmin(BasePermission):
    """Shortcuut :sirf admin role allowed """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request.user,"role", None) =="admin"

        )

class IsOwerOrAdmin(BasePermission):
    """
        Object-level permission: owner khud ya admin hi access kar sakta hai.
        Object mein `user` ya `owner` field expect karta hai — jo bhi match kare
        wahi use hoga.
        """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS and getattr(request.user, "role", None)=="admin":
            return True

        owner = getattr(obj, "user",None) or getattr(obj, "owner", None)
        is_owner = owner is not None and owner == request.user
        is_admin = getattr(request.user, "role", None)== "admin"
        return is_owner or is_admin

    

    