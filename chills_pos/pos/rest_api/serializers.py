from django.contrib.auth.models import User
from django.db import IntegrityError
from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from chills_pos.helpers.utils import DynamicFieldsSerializerMixin
from pos.models import Product, Customer, Order, OrderItem


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        exclude = ('password',)


class SessionSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=30)
    password = serializers.CharField(max_length=128)


class ProductSerializer(DynamicFieldsSerializerMixin, serializers.ModelSerializer):
    def validate(self, data):
        upc = (data.get('upc') or '').strip()
        part_number = (data.get('part_number') or '').strip()

        if not upc and not part_number:
            raise serializers.ValidationError('upc and part_number cannot be blank both')
        return data

    class Meta:
        model = Product
        fields = '__all__'


class CustomerSerializer(DynamicFieldsSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'


class NestedCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ('id', 'first_name', 'last_name')


class OrderItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'quantity', 'price')
        extra_kwargs = {
            'price': {'read_only': True}
        }



class OrderSerializer(DynamicFieldsSerializerMixin, serializers.ModelSerializer):
    order_items = OrderItemSerializer(required=True, allow_null=False, allow_empty=False, many=True)
    _customer = NestedCustomerSerializer(read_only=True, source='customer')

    class Meta:
        model = Order
        fields = ('id', 'customer', 'clerk', 'order_items', 'status', 'create_datetime', 'update_datetime',
                  'total_items', 'total_quantity', 'total_price', '_customer')
        extra_kwargs = {
            'status': {'read_only': True},
            'total_quantity': {'read_only': True},
            'total_price': {'read_only': True},
        }

    def save_order_items(self, order, order_items_data, created=True):
        product_items = {}
        product_quantities = {}
        old_total_price= 0
        if not created:
            old_total_price = order.total_price
            for oi in order.order_items.all():
                product_items[oi.product_id] = oi
                product_quantities[oi.product_id] = oi.quantity
        order_items_records = []
        for order_item_data in order_items_data:
            product = order_item_data['product']
            product_id = product.id
            quantity = order_item_data['quantity']
            order_item = product_items.pop(product_id, None)
            if order_item:
                product_quantities[product_id] = quantity - order_item.quantity
                order_item.quantity = quantity
                order_item.price = product.price
            else:
                product_quantities[product_id] = quantity
                order_item = OrderItem(order=order, price=product.price, **order_item_data)
            order_items_records.append(order_item)

        total_quantity = 0
        total_price = 0
        for order_item in order_items_records:
            try:
                order_item.save()
            except IntegrityError:
                raise serializers.ValidationError({'order_item': {'product': ["Duplicated product."]}})
            total_quantity += order_item.quantity
            total_price += (order_item.price * order_item.quantity)

        new_points = total_price - old_total_price
        if new_points:
            updated = Customer.objects.filter(id=order.customer_id, points__gte=new_points
                                             ).update(points=F('points') - new_points)
            if not updated:
                raise serializers.ValidationError(
                    {'order': {'customer': ["Not enough points for customer [{}]".format(order.customer)]}})

        deleted_ids = []
        for oi in product_items.values():
            deleted_ids.append(oi.id)
            product_quantities[oi.product_id] = -oi.quantity
        if deleted_ids:
            OrderItem.objects.filter(id__in=deleted_ids).delete()
        for pid, quantity in product_quantities.items():
            if quantity:
                updated = Product.objects.filter(id=pid, quantity__gte=quantity
                                                 ).update(quantity=F('quantity') - quantity)
                if not updated:
                    raise serializers.ValidationError(
                        {'order_item': {'product': ["Not enough quantity. #{}".format(pid)]}})
        order.total_quantity = total_quantity
        order.total_price = total_price

    @transaction.atomic()
    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items', None) or []
        order = super(OrderSerializer, self).create(validated_data)
        self.save_order_items(order, order_items_data)
        order.save()
        return order

    @transaction.atomic()
    def update(self, instance, validated_data):
        order_items_data = validated_data.pop('order_items') or []
        self.save_order_items(instance, order_items_data, created=False)
        return super(OrderSerializer, self).update(instance, validated_data)
