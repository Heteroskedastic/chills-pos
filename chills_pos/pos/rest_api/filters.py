import django_filters
from datetime import timedelta

from pos.models import OrderItem


class SalesReportFilter(django_filters.rest_framework.FilterSet):
    create_date = django_filters.DateFilter(name="order__create_datetime")
    min_create_date = django_filters.DateFilter(name="order__create_datetime", lookup_expr='gte')
    max_create_date = django_filters.DateFilter(method='filter_max_create_date')
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

    def filter_max_create_date(self, queryset, name, value):
        return queryset.filter(
            order__create_datetime__lt=value+timedelta(days=1)
        )
