from django.contrib.auth import logout, login, authenticate
from django.db import transaction
from django.db.models import F
from rest_framework import viewsets, permissions
from rest_framework.decorators import detail_route, list_route
from rest_framework.parsers import FileUploadParser
from rest_framework.response import Response

from chills_pos.helpers.utils import PaginationPageSizeMixin
from pos.models import Product, Customer, Order, Unit
from .serializers import UserSerializer, SessionSerializer, ProductSerializer, CustomerSerializer, OrderSerializer, \
    UserProfileSerializer, AvatarSerializer, UnitSerializer, CustomerPhotoSerializer


class SessionView(viewsets.ViewSet):
    class SessionPermission(permissions.BasePermission):
        ''' custom class to check permissions for sessions '''

        def has_permission(self, request, view):
            ''' check request permissions '''
            if request.method == 'POST':
                return True
            return request.user.is_authenticated() and request.user.is_active

    permission_classes = (SessionPermission,)
    serializer_class = SessionSerializer

    def initialize_request(self, request, *args, **kwargs):
        request = super(SessionView, self).initialize_request(request, *args, **kwargs)
        if request.method == 'POST':
            # remove authentication_classes to dont check csrf
            request.authenticators = []
        return request

    def get(self, request, format=None):
        ''' api to get current session '''

        return Response(UserSerializer(request.user).data)

    def post(self, request):
        ''' api to login '''
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(**serializer.data)
        if not user:
            return Response({'reason': 'Username or password is incorrect'},
                            status=400)
        if not user.is_active:
            return Response({'reason': 'User is inactive'}, status=403)

        login(request, user)
        return Response(UserSerializer(user).data)

    def delete(self, request):
        ''' api to logout '''

        user_id = request.user.id
        logout(request)
        return Response({'id': user_id})

    create = post  # this is a trick to show this view in api-root


class ProfileView(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserProfileSerializer
    parser_classes = list(viewsets.ViewSet.parser_classes) + [FileUploadParser]

    def list(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = self.serializer_class(instance=request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)

    def __update_avatar(self, request, **kwargs):
        profile = request.user.profile
        file_obj = request.data['file']
        serializer = AvatarSerializer(instance=profile, data={'avatar': file_obj})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        avatar_url = None
        if profile.avatar:
            avatar_url = profile.avatar.url
        return Response({'avatar': avatar_url})

    def __delete_avatar(self, request, **kwargs):
        profile = request.user.profile
        profile.avatar = None
        profile.save()
        return Response({'avatar': None})

    @list_route(methods=['delete', 'put'])
    def avatar(self, request, **kwargs):
        if self.request.method == 'DELETE':
            return self.__delete_avatar(request, **kwargs)
        elif self.request.method == 'PUT':
            return self.__update_avatar(request, **kwargs)

        raise Exception('should not reach here!')

    create = put


class ProductView(PaginationPageSizeMixin, viewsets.ModelViewSet):
    max_page_size = 0
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_fields = ('name', 'upc', 'part_number', 'active',)
    ordering_fields = '__all__'
    ordering = ('id',)


class UnitView(PaginationPageSizeMixin, viewsets.ModelViewSet):
    max_page_size = 0
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    filter_fields = ('name',)
    ordering_fields = '__all__'
    ordering = ('id',)


class CustomerView(PaginationPageSizeMixin, viewsets.ModelViewSet):
    max_page_size = 0
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    filter_fields = ('first_name', 'last_name', 'uid',)
    ordering_fields = '__all__'
    ordering = ('id',)
    parser_classes = list(viewsets.ModelViewSet.parser_classes) + [FileUploadParser]

    def __update_photo(self, request, **kwargs):
        customer = self.get_object()
        file_obj = request.data['file']
        serializer = CustomerPhotoSerializer(instance=customer, data={'photo': file_obj})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        photo_url = None
        if customer.photo:
            photo_url = customer.photo.url
        return Response({'photo': photo_url})

    def __delete_photo(self, request, **kwargs):
        customer = self.get_object()
        customer.photo = None
        customer.save()
        return Response({'photo': None})

    @detail_route(methods=['delete', 'put'])
    def photo(self, request, **kwargs):
        if self.request.method == 'DELETE':
            return self.__delete_photo(request, **kwargs)
        elif self.request.method == 'PUT':
            return self.__update_photo(request, **kwargs)

        raise Exception('should not reach here!')



class OrderView(PaginationPageSizeMixin, viewsets.ModelViewSet):
    max_page_size = 200
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filter_fields = ('customer', 'status', 'clerk',)
    ordering_fields = '__all__'
    ordering = ('-create_datetime',)

    @transaction.atomic()
    def perform_destroy(self, instance):
        for oi in instance.order_items.all():
            if oi.quantity:
                Product.objects.filter(id=oi.product_id).update(quantity=F('quantity') + oi.quantity)
        Customer.objects.filter(id=instance.customer_id).update(points=F('points') + instance.total_price)
        return super(OrderView, self).perform_destroy(instance)