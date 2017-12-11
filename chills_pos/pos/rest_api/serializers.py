from django.contrib.auth.models import User, Permission, Group
from django.db import IntegrityError
from django.db import transaction
from django.db.models import F
from django.conf import settings
from phonenumber_field.formfields import PhoneNumberField
from rest_framework import serializers

from chills_pos.helpers.utils import DynamicFieldsSerializerMixin, Base64ImageField
from pos.models import Product, Customer, Order, OrderItem, UserProfile, Unit


class AvatarSerializer(serializers.ModelSerializer):
    avatar = Base64ImageField()
    class Meta:
        model = UserProfile
        fields = ('avatar',)


class NestedProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('birth_date', 'phone_number', 'gender', 'avatar')
        read_only_fields = ('avatar', )


class NestedPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ('id', 'codename')


class NestedGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ('id', 'name')


class UserSerializer(serializers.ModelSerializer):
    profile = NestedProfileSerializer()
    groups = NestedGroupSerializer(many=True)
    user_permissions = NestedPermissionSerializer(many=True)

    class Meta:
        model = User
        fields = ("id", "last_login", "is_superuser", "username", "first_name", "last_name", "email", "is_staff",
                  "is_active", "date_joined", "groups", "user_permissions", "profile")


class UserProfileSerializer(serializers.ModelSerializer):
    profile = NestedProfileSerializer()
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'profile', )

    def update(self, instance, validated_data):
        profile = validated_data.pop('profile', {}) or {}
        for k, v in profile.items():
            setattr(instance.profile, k, v)
        return super(UserProfileSerializer, self).update(instance, validated_data)


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


class UnitSerializer(DynamicFieldsSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'


class NestedUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ('id', 'name',)


class CustomerSerializer(DynamicFieldsSerializerMixin, serializers.ModelSerializer):
    _unit = NestedUnitSerializer(read_only=True, source='unit')
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('photo',)


class CustomerPhotoSerializer(serializers.ModelSerializer):
    photo = Base64ImageField()
    class Meta:
        model = Customer
        fields = ('photo',)


class NestedCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ('id', 'first_name', 'last_name')


class OrderItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(required=True, queryset=Product.objects.all())
    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'quantity', 'price')
        read_only_fields = ('price',)


class OrderSerializer(DynamicFieldsSerializerMixin, serializers.ModelSerializer):
    order_items = OrderItemSerializer(required=True, allow_null=False, allow_empty=False, many=True)
    _customer = NestedCustomerSerializer(read_only=True, source='customer')

    class Meta:
        model = Order
        fields = ('id', 'customer', 'clerk', 'order_items', 'status', 'create_datetime', 'update_datetime',
                  'needs_total_items', 'needs_total_quantity', 'needs_total_price',
                  'want_total_items', 'want_total_quantity', 'want_total_price',
                  '_customer')
        read_only_fields = ('status', 'needs_total_items', 'needs_total_quantity', 'needs_total_price',
                            'want_total_items', 'want_total_quantity', 'want_total_price', 'clerk')

    def save_order_items(self, order, order_items_data, created=True):
        product_items = {}
        product_quantities = {}
        old_total_price = {Product.TYPE_WANT: 0, Product.TYPE_NEEDS: 0}
        if not created:
            old_total_price = {Product.TYPE_WANT: order.want_total_price, Product.TYPE_NEEDS: order.needs_total_price}
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

        total_quantity = {Product.TYPE_WANT: 0, Product.TYPE_NEEDS: 0}
        total_price = {Product.TYPE_WANT: 0, Product.TYPE_NEEDS: 0}
        for order_item in order_items_records:
            try:
                order_item.save()
            except IntegrityError:
                raise serializers.ValidationError({'order_item': {'product': ["Duplicated product."]}})
            total_quantity[order_item.product.type] += order_item.quantity
            total_price[order_item.product.type] += (order_item.price * order_item.quantity)

        needs_new_balance = total_price[Product.TYPE_NEEDS] - old_total_price[Product.TYPE_NEEDS]
        if needs_new_balance:
            updated = Customer.objects.filter(id=order.customer_id, needs_balance__gte=needs_new_balance
                                             ).update(needs_balance=F('needs_balance') - needs_new_balance)
            if not updated:
                raise serializers.ValidationError(
                    {'order': {'customer': ["Not enough Needs Balance for customer [{}]".format(order.customer)]}})

        want_new_balance = total_price[Product.TYPE_WANT] - old_total_price[Product.TYPE_WANT]
        if want_new_balance:
            updated = Customer.objects.filter(id=order.customer_id, want_balance__gte=want_new_balance
                                             ).update(want_balance=F('want_balance') - want_new_balance)
            if not updated:
                raise serializers.ValidationError(
                    {'order': {'customer': ["Not enough Want Balance for customer [{}]".format(order.customer)]}})

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
        order.needs_total_quantity = total_quantity[Product.TYPE_NEEDS]
        order.want_total_quantity = total_quantity[Product.TYPE_WANT]
        order.needs_total_price = total_price[Product.TYPE_NEEDS]
        order.want_total_price = total_price[Product.TYPE_WANT]

    @transaction.atomic()
    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items', None) or []
        order = super(OrderSerializer, self).create(validated_data)
        order.clerk = self.context['request'].user
        self.save_order_items(order, order_items_data)
        order.save()
        return order

    @transaction.atomic()
    def update(self, instance, validated_data):
        order_items_data = validated_data.pop('order_items') or []
        instance.clerk = self.context['request'].user
        self.save_order_items(instance, order_items_data, created=False)
        return super(OrderSerializer, self).update(instance, validated_data)


class SalesReportSerializer(serializers.Serializer):
    pass
