import os
import uuid

from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from phonenumber_field.modelfields import PhoneNumberField

from chills_pos.helpers.utils import random_id


def get_random_upload_path(upload_dir, filename):
    ext = filename.split('.')[-1]
    randid = random_id(n=16)
    filename = "{0}-{1}.{2}".format(uuid.uuid4(), randid, ext)
    return os.path.join(upload_dir, filename)


def avatar_file_path_func(instance, filename):
    return get_random_upload_path(os.path.join('uploads', 'profile_avatar'), filename)


def customer_photo_file_path_func(instance, filename):
    return get_random_upload_path(os.path.join('uploads', 'customer_photo'), filename)


class UserProfile(models.Model):
    GENDER_UNKNOWN = 'u'
    GENDER_MALE = 'm'
    GENDER_FEMALE = 'f'
    GENDER_CHOICES = (
        (GENDER_UNKNOWN, 'Unknown'),
        (GENDER_MALE, 'Male'),
        (GENDER_FEMALE, 'Female'),
    )

    user = models.OneToOneField(User, primary_key=True, related_name='profile', on_delete=models.CASCADE)
    birth_date = models.DateField('Date of birth', blank=True, null=True)
    phone_number = PhoneNumberField('Phone number', blank=True, null=True)
    gender = models.CharField('Gender', max_length=1, choices=GENDER_CHOICES, default=GENDER_UNKNOWN)
    avatar = models.ImageField('Avatar', blank=True, null=True, upload_to=avatar_file_path_func)


class Product(models.Model):
    TYPE_NEEDS = 'needs'
    TYPE_WANT = 'want'
    TYPE_CHOICES = (
        (TYPE_NEEDS, 'Needs'),
        (TYPE_WANT, 'Want'),
    )

    name = models.CharField("Name", max_length=512, unique=True)
    description = models.TextField("Description", null=True, blank=True)
    quantity = models.PositiveIntegerField('Quantity', default=0)
    upc = models.CharField('UPC', max_length=128, null=True, blank=True, unique=True)
    part_number = models.CharField('Part Number', max_length=128, null=True, blank=True, unique=True)
    reorder_limit = models.PositiveIntegerField('Re-order Limit', default=0)
    price = models.DecimalField("Price", max_digits=8, decimal_places=2)
    purchase_price = models.DecimalField("Purchase Price", max_digits=8, decimal_places=2)
    type = models.CharField("Type", max_length=8, choices=TYPE_CHOICES, default=TYPE_NEEDS)
    active = models.BooleanField("Active", default=True)

    def __str__(self):
        return self.name


class Unit(models.Model):
    name = models.CharField("Name", max_length=256)
    description = models.TextField("Description", max_length=1024, null=True, blank=True)

    def __str__(self):
        return self.name


class Customer(models.Model):
    first_name = models.CharField("First Name", max_length=256)
    last_name = models.CharField("Last Name", max_length=256)
    uid = models.CharField('Id Number', max_length=256, null=True, blank=True, unique=True)
    needs_balance = models.DecimalField("Needs Account Balance", max_digits=8, decimal_places=2, default=0)
    want_balance = models.DecimalField("Want Account Balance", max_digits=8, decimal_places=2, default=0)
    unit = models.ForeignKey(Unit, null=True, related_name='customer', on_delete=models.SET_NULL)
    photo = models.ImageField('Photo', blank=True, null=True, upload_to=customer_photo_file_path_func)

    def __str__(self):
        return '{} {}'.format(self.first_name, self.last_name)


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
    needs_total_quantity = models.PositiveIntegerField("Quantity(Needs)", default=0)
    needs_total_price = models.DecimalField("Price(Needs)", max_digits=8, decimal_places=2, default=0)
    want_total_quantity = models.PositiveIntegerField("Quantity(Want)", default=0)
    want_total_price = models.DecimalField("Price(Want)", max_digits=8, decimal_places=2, default=0)

    create_datetime = models.DateTimeField("Create Datetime", auto_now_add=True)
    update_datetime = models.DateTimeField("Update Datetime", auto_now=True)

    @property
    def status_display(self):
        return dict(self.STATUS_CHOICES).get(self.status, self.STATUS_NEW)

    @property
    def total_items(self):
        return self.order_items.count() or 0

    @property
    def needs_total_items(self):
        return self.order_items.filter(product__type=Product.TYPE_NEEDS).count() or 0

    @property
    def want_total_items(self):
        return self.order_items.filter(product__type=Product.TYPE_WANT).count() or 0

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


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
