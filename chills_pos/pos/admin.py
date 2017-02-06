from django.contrib import admin
from .models import Order, Customer, OrderItem, Product


class OrderItemInline(admin.TabularInline):
    model = OrderItem

class OrderAdmin(admin.ModelAdmin):
    # exclude = ()
    inlines = [
        OrderItemInline,
    ]

admin.site.register(Product)
admin.site.register(Customer)
admin.site.register(Order, OrderAdmin)


