import uuid
import base64
import random
import string
import datetime
import decimal
from django.contrib import messages
from django.shortcuts import render
from django.http import JsonResponse
from django.utils import six
from django.core.urlresolvers import reverse
from django.utils.safestring import mark_safe
from django.utils.dateparse import parse_datetime
from django.utils.timezone import is_aware, make_aware
from django.conf import settings
from django.contrib.auth.views import redirect_to_login
from django.core.exceptions import PermissionDenied
from django.contrib.auth.mixins import PermissionRequiredMixin as \
    DjangoPermissionRequiredMixin
from rest_framework.pagination import PageNumberPagination, _positive_int
from rest_framework.views import exception_handler
from rest_framework import exceptions
from rest_framework.response import Response
from django.core.files.base import ContentFile
from rest_framework import serializers

from chills_pos.helpers.shortcuts import get_twilio_client


def random_id(n=8, no_upper=False, no_lower=False, no_digit=False):
    rand = random.SystemRandom()
    chars = ''
    if no_upper is False:
        chars += string.ascii_uppercase
    if no_lower is False:
        chars += string.ascii_lowercase
    if no_digit is False:
        chars += string.digits
    if not chars:
        raise Exception('chars is empty! change function args!')
    return ''.join([rand.choice(chars) for _ in range(n)])


def success_message(message, request):
    return messages.success(request, mark_safe(message))


def error_message(message, request):
    return messages.error(request, mark_safe(message), extra_tags='danger')


def info_message(message, request):
    return messages.info(request, mark_safe(message))


def warning_message(message, request):
    return messages.warning(request, mark_safe(message))

TAG_LEVEL = 100


def add_tag_message(message, tag, request):
    return messages.add_message(request, TAG_LEVEL, message, extra_tags=tag)


def get_tag_messages(tag, request):
    return [m.message for m in messages.get_messages(request)
            if (tag in m.tags) and m.level == TAG_LEVEL]


def send_form_errors(form, request):
    msgs = []
    for k, v in form.errors.items():
        msg = '' if k.startswith('__') else '{0}: '.format(k)
        msgs.append('<li>{0}{1}</li>'.format(msg, ', '.join(v)))

    if msgs:
        return error_message(''.join(msgs), request)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_aware_datetime(date_str):
    ret = parse_datetime(date_str)
    if not is_aware(ret):
        ret = make_aware(ret)
    return ret


def get_current_page_size(request, default=None):
    default = default or settings.PAGINATION_DEFAULT_PAGINATION
    page_size = default
    try:
        page_size = int(request.GET.get('page_size'))
    except:
        pass

    if page_size <= 0:
        page_size = default

    return min(page_size, settings.PAGINATION_MAX_PAGE_SIZE)


def send_sms(message, to, from_=None):
    from_ = from_ or settings.TWILIO_DEFAULT_CALLERID
    if settings.SMS_MOCK_SENDING:
        print("Sending sms from {} to {}: {}".format(from_, to, message))
        return
    twilio_client = get_twilio_client()
    return twilio_client.messages.create(to=to, from_=from_,
                                         body=message)


def ex_reverse(viewname, **kwargs):
    if viewname.startswith('http://') or viewname.startswith('https://'):
        return viewname

    host = kwargs.pop('hostname', None)
    request = kwargs.pop('request', None)
    scheme = kwargs.pop('scheme', None)
    if not host:
        host = request.get_host() if request else settings.HOSTNAME

    if not viewname:
        rel_path = ''
    elif viewname.startswith('/'):
        rel_path = viewname
    else:
        rel_path = reverse(viewname, **kwargs)

    scheme = '{}://'.format(scheme) if scheme else ''

    return '{0}{1}{2}'.format(scheme, host, rel_path)


class PermissionRequiredMixin(DjangoPermissionRequiredMixin):

    def get_permission_required(self):
        perms = self.permission_required or ()
        if isinstance(perms, dict):
            perms = perms.get(self.request.method.lower(), ()) or ()

        if isinstance(perms, six.string_types):
            perms = (perms, )

        return perms

    def handle_no_authenticated(self):
        if self.request.is_ajax():
            return JsonResponse({'error': 'Not Authorized'}, status=401)
        return redirect_to_login(self.request.get_full_path(),
                                 self.get_login_url(),
                                 self.get_redirect_field_name())

    def handle_no_permission(self):
        if self.request.is_ajax():
            return JsonResponse({'error': 'Permission Denied'}, status=403)
        if self.raise_exception:
            raise PermissionDenied(self.get_permission_denied_message())
        return render(self.request, "no-permission.html", status=403)

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated():
            return self.handle_no_authenticated()
        if not self.has_permission():
            return self.handle_no_permission()
        return super(PermissionRequiredMixin, self
                     ).dispatch(request, *args, **kwargs)


def to_dict(obj, fields=None, fields_map={}, extra_fields=None):
    '''
    convert a model object to a python dict.
    @param fields: list of fields which we want to show in return value.
        if fields=None, we show all fields of model object
    @type fields: list
    @param fields_map: a map converter to show fields as a favorite.
        every field can bind to a lambda function in fields_map.
        if a field was bind to a None value in fields_map, we ignore this field
        to show in result
    @type fields_map: dict
    '''
    data = {}

    if fields is None:
        fields = [f.name for f in obj.__class__._meta.fields]
    fields.extend(extra_fields or [])
    for field in fields:
        if field in fields_map:
            if fields_map[field] is None:
                continue
            v = fields_map.get(field)()
        else:
            v = getattr(obj, field, None)
        if isinstance(v, datetime.datetime):
            data[field] = v.isoformat() + 'Z'
        elif isinstance(v, datetime.date):
            data[field] = v.isoformat()
        elif isinstance(v, decimal.Decimal):
            data[field] = float(v)
        else:
            data[field] = v

    return data


class SafeFormat(object):
    def __init__(self, **kw):
        self.__dict = kw

    def __getitem__(self, name):
        return self.__dict.get(name, '{%s}' % name)


class CustomPagination(PageNumberPagination):
    ''' Custom Pagination to be used in rest api'''

    page_size_query_param = 'page_size'
    max_page_size = 20

    def get_page_size(self, request):
        '''
        this is overrided to allow 0 as a page_size.
        if page_size=0, we will set page_size as max_page_size.
        '''
        page_size = self.page_size
        if self.page_size_query_param:
            try:
                page_size = _positive_int(
                    request.query_params[self.page_size_query_param],
                    strict=False,
                    cutoff=self.max_page_size
                )
            except (KeyError, ValueError):
                pass
        if page_size == 0:
            page_size = self.max_page_size
        return page_size

    def get_paginated_response(self, data):
        ''' override pagination structure in list rest api '''

        next_page = self.page.next_page_number() if \
            self.page.has_next() else None
        previous_page = self.page.previous_page_number() if \
            self.page.has_previous() else None
        return Response({
            'pagination': {
                'next_url': self.get_next_link(),
                'previous_url': self.get_previous_link(),
                'current_page': self.page.number,
                'next_page': next_page,
                'previous_page': previous_page,
                'first_page': 1,
                'last_page': self.page.paginator.num_pages,
                'page_size': self.get_page_size(self.request),
                'count': self.page.paginator.count,
            },
            'results': data
        })


def custom_rest_exception_handler(exc, context):
    ''' Custom rest api exception handler '''
    response = exception_handler(exc, context)
    if isinstance(exc, exceptions.NotAuthenticated):
        response.status_code = 401
    if isinstance(exc, exceptions.ValidationError) and \
            ('already exists' in str(exc) or
             'must make a unique set' in str(exc)):
        response.status_code = 409

    return response


class PaginationPageSizeMixin(object):
    '''
    a mixin class to be used in rest viewset.
    by extending this class you can customize page_size by setting
    'max_page_size' property in class.
    if max_page_size = 0, this mean this support infinite page_size.
    then user can have a query on list rest api by page_size=0.
    '''
    BIG_PAGE_SIZE = 10000000

    @property
    def paginator(self):
        """
        The paginator instance associated with the view, or `None`.
        """
        paginator = super(PaginationPageSizeMixin, self).paginator
        max_page_size = getattr(self, 'max_page_size', paginator.max_page_size)

        paginator.max_page_size = max_page_size or self.BIG_PAGE_SIZE
        return paginator


class DynamicFieldsSerializerMixin(object):
    '''
    This class allow you to have dynamic fields in get rest api.
    user can pass "fields" and "xfields" as a get query parameter.
    "fields" specify list of fields you want to be shown as a result.
    "xfields" specify list of fields you want to be excluded in result.
    i.e:
    fields=id,name
    or
    xfields=name1,name2
    '''
    def __init__(self, *args, **kwargs):
        super(DynamicFieldsSerializerMixin, self).__init__(*args, **kwargs)
        if not self.context:
            return

        params = self.context['request'].query_params
        fields = params.get('fields')
        xfields = params.get('xfields')
        if fields:
            fields = fields.split(',')
            allowed = set(fields)
            existing = set(self.fields.keys())
            for field_name in existing - allowed:
                self.fields.pop(field_name)
        elif xfields:
            xfields = xfields.split(',')
            for field_name in xfields:
                self.fields.pop(field_name, None)


class Base64ImageField(serializers.ImageField):
    def to_internal_value(self, data):
        data = data.read().decode()
        if data.startswith('data:image'):
            format, imgstr = data.split(';base64,') # format ~= data:image/X,
            ext = format.split('/')[-1] # guess file extension
            id = uuid.uuid4()
            data = ContentFile(base64.b64decode(imgstr), name = id.urn[9:] + '.' + ext)
        return super(Base64ImageField, self).to_internal_value(data)