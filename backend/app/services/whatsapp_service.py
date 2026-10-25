import logging
from httpx import AsyncClient
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_whatsapp_message(to_phone: str, text_body: str) -> bool:
    """
    Sends an outbound WhatsApp message via Meta Cloud Graph API.
    """
    if not settings.META_ACCESS_TOKEN:
        logger.warning("META_ACCESS_TOKEN not set; skipping Meta API call.")
        return False
        
    phone_id = settings.WHATSAPP_PHONE_ID or "1118016721403625"
    url = f"https://graph.facebook.com/v25.0/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {settings.META_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": text_body}
    }
    try:
        async with AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.error(f"Meta API error {resp.status_code}: {resp.text}")
                return False
            logger.info(f"Meta WhatsApp message sent successfully to {to_phone}")
            return True
    except Exception as e:
        logger.error(f"Exception sending WhatsApp message: {str(e)}")
        return False
