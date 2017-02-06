from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Sum, F, FloatField


class Product(models.Model):
    name = models.CharField("Name", max_length=512, unique=True)
    description = models.TextField("Description", null=True, blank=True)
    quantity = models.PositiveIntegerField('Quantity', default=0)
    upc = models.CharField('UPC', max_length=128, null=True, blank=True, unique=True)
    part_number = models.CharField('Part Number', max_length=128, null=True, blank=True, unique=True)
    reorder_limit = models.PositiveIntegerField('Re-order Limit', default=0)
    price = models.DecimalField("Price", max_digits=8, decimal_places=2)
    purchase_price = models.DecimalField("Purchase Price", max_digits=8, decimal_places=2)
    active = models.BooleanField("Active", default=True)

    def __str__(self):
        return self.name


class Customer(models.Model):
    first_name = models.CharField("First Name", max_length=256)
    last_name = models.CharField("Last Name", max_length=256)
    uid = models.CharField('Id Number', max_length=256, null=True, blank=True, unique=True)
    points = models.PositiveIntegerField('Points', default=0)

    def __str__(self):
        return '{} {}'.format(self.first_name, self.last_name)


# class Cart(models.Model):
#     customer = models.ForeignKey(Customer, related_name="cart", on_delete=models.CASCADE)
#     clerk = models.ForeignKey(User, related_name="cart", on_delete=models.CASCADE)
#     product = models.ForeignKey(Product, related_name='cart', on_delete=models.CASCADE)
#     create_datetime = models.DateTimeField("Create Datetime", auto_now_add=True)
#     quantity = models.IntegerField("Quantity", default=0)
#
#     def __str__(self):
#         return '{}'.format(self.product)
#
#     class Meta:
#         unique_together = (('customer', 'clerk', 'product'),)
#

class Order(models.Model):
    STATUS_NEW = 'new'
    STATUS_PROCESSING = 'processing'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELED = 'canceled'
    STATUS_DRAFT = 'draft'
    STATUS_CHOICES = (
        (STATUS_NEW, 'New'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELED, 'Canceled'),
        (STATUS_DRAFT, 'Draft'),
    )

    customer = models.ForeignKey(Customer, related_name="order", on_delete=models.CASCADE)
    clerk = models.ForeignKey(User, related_name="order", on_delete=models.SET_NULL, null=True)
    status = models.CharField("Status", max_length=32, choices=STATUS_CHOICES, default=STATUS_NEW)
    total_quantity = models.PositiveIntegerField("Quantity", default=0)
    total_price = models.DecimalField("Price", max_digits=8, decimal_places=2, default=0)

    create_datetime = models.DateTimeField("Create Datetime", auto_now_add=True)
    update_datetime = models.DateTimeField("Update Datetime", auto_now=True)

    @property
    def status_display(self):
        return dict(self.STATUS_CHOICES).get(self.status, self.STATUS_PENDING)

    @property
    def total_items(self):
        return self.order_items.count() or 0

    # @property
    # def total_quantity(self):
    #     return self.order_items.aggregate(total_quantity=Sum('quantity'))['total_quantity'] or 0
    #
    # @property
    # def total_price(self):
    #     return self.order_items.aggregate(
    #         total_price=Sum(F('quantity') * F('product__price'), output_field=FloatField()))['total_price'] or 0

    def __str__(self):
        return '{}'.format(self.customer)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='order_items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, related_name='order_items', on_delete=models.SET_NULL, null=True)
    quantity = models.PositiveIntegerField("Quantity", default=1, validators=[MinValueValidator(1)])
    price = models.DecimalField("Price", max_digits=8, decimal_places=2, default=0)

    def __str__(self):
        return '{}'.format(self.product)

    class Meta:
        unique_together = (('order', 'product'),)
