from django.conf import settings
from twilio.rest import Client as TwilioRestClient

from chills_pos.redis_mem import RedisMem


def get_twilio_client():
    return TwilioRestClient(settings.TWILIO_ACCOUNT_SID,
                            settings.TWILIO_AUTH_TOKEN)


def get_redis_mem(workspace):
    return RedisMem(host=settings.REDIS_MEM_HOST,
                    port=settings.REDIS_MEM_PORT,
                    db=settings.REDIS_MEM_DB,
                    prefix=settings.REDIS_MEM_PREFIX,
                    workspace=workspace)
