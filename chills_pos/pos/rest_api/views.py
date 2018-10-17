import csv

from django.contrib.auth import logout, login, authenticate
from django.db import transaction
from django.db.models import F
from django.http import HttpResponse
from rest_framework import viewsets, permissions
from rest_framework.decorators import detail_route, list_route
from rest_framework.parsers import FileUploadParser
from rest_framework.response import Response

from chills_pos.helpers.utils import PaginationPageSizeMixin
from pos.models import Product, Customer, Order, Unit, OrderItem
from pos.rest_api.filters import SalesReportFilter
from .serializers import UserSerializer, SessionSerializer, ProductSerializer, CustomerSerializer, OrderSerializer, \
    UserProfileSerializer, AvatarSerializer, UnitSerializer, CustomerPhotoSerializer, SalesReportSerializer


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
    search_fields = ('name', 'upc', 'type')
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
        Customer.objects.filter(id=instance.customer_id).update(
            needs_balance=F('needs_balance') + instance.needs_total_price)
        Customer.objects.filter(id=instance.customer_id).update(
            want_balance=F('want_balance') + instance.want_total_price)
        return super(OrderView, self).perform_destroy(instance)


class SalesReportView(PaginationPageSizeMixin, viewsets.GenericViewSet):
    '''
    rest view for PatientVisitReport
    '''

    max_page_size = 200
    queryset = OrderItem.objects.all()
    filter_class = SalesReportFilter
    serializer_class = SalesReportSerializer
    ordering = ('-order__create_datetime',)

    def get_queryset(self):
        return self.queryset.values('id', 'order__id', 'order__customer__first_name', 'order__customer__last_name',
                                     'order__customer__unit__name', 'order__clerk__username', 'order__create_datetime',
                                     'product__name', 'product__upc', 'product__part_number', 'quantity', 'price',)
    def serialize_record(self, r):
        return dict(
            id=r['id'],
            order_id=r['order__id'],
            customer_name=r['order__customer__first_name'] + ' ' + r['order__customer__last_name'],
            customer_unit=r['order__customer__unit__name'],
            create_datetime=r['order__create_datetime'],
            product_name=r['product__name'],
            product_upc=r['product__upc'],
            product_part_number=r['product__part_number'],
            quantity=r['quantity'],
            item_price=r['price'],
            clerk=r['order__clerk__username'],
        )

    def list(self, request, *args, **kwargs):
        query = self.filter_queryset(self.get_queryset())

        query = self.paginate_queryset(query)
        data = []
        for r in query:
            data.append(self.serialize_record(r))
        return self.get_paginated_response(data)

    def __export_csv(self, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename=sales-report.csv'
        fieldnames = ['id', 'order_id', 'customer_name', 'customer_unit', 'create_datetime', 'product_name',
                      'product_upc', 'product_part_number', 'quantity', 'item_price', 'sale_price', 'clerk', ]
        writer = csv.DictWriter(response, fieldnames=fieldnames)
        writer.writeheader()
        for obj in queryset:
            row = self.serialize_record(obj)
            row['sale_price'] = row['item_price'] * row['quantity']
            writer.writerow(row)
        return response

    @list_route(methods=['get'])
    def export(self, request, *args, **kwargs):
        valid_formats = {
            'csv': self.__export_csv,
        }
        format = request.GET.get('_format') or 'csv'
        if format not in valid_formats:
            return Response({'reason': 'Invalid format "{}"'.format(format)}, status=200)

        query = self.filter_queryset(self.get_queryset())
        return valid_formats.get(format)(query)
