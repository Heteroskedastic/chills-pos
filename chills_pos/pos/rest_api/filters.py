import django_filters
from datetime import timedelta

from pos.models import OrderItem


class SalesReportFilter(django_filters.rest_framework.FilterSet):
    min_create_datetime = django_filters.IsoDateTimeFilter(name="order__create_datetime", lookup_expr='gte')
    max_create_datetime = django_filters.IsoDateTimeFilter(name="order__create_datetime", lookup_expr='lt')
    clerk = django_filters.NumberFilter(name="order__clerk")
    customer = django_filters.NumberFilter(name="order__customer")
    unit = django_filters.NumberFilter(name="order__customer__unit")
    product = django_filters.NumberFilter(name="product")
    product_upc = django_filters.NumberFilter(name="product__upc")
    # ordering = django_filters.OrderingFilter(
    #     fields=['id', 'price', 'quantity', 'product']
    # )
    class Meta:
        model = OrderItem
        fields = '__all__'

