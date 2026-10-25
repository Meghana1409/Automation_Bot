import logging
from fastapi import APIRouter, Request, Response, HTTPException, status
from app.core.config import settings
from app.services.bot_agent import process_patient_message
from app.services.whatsapp_service import send_whatsapp_message
from app.schemas.appointment import BotSimulateRequest, BotSimulateResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("", summary="Verify Meta WhatsApp webhook")
async def verify_webhook(request: Request):
    """
    Webhook verification endpoint required by Meta Cloud API.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == settings.MY_WEBHOOK_VERIFY_TOKEN:
        logger.info("Webhook verified successfully with Meta")
        return Response(content=challenge, media_type="text/plain")
    
    logger.warning("Webhook verification token mismatch")
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")

@router.post("", summary="Handle incoming Meta WhatsApp messages")
async def handle_whatsapp_message(request: Request):
    """
    Receives incoming WhatsApp message updates from Meta.
    """
    body = await request.json()
    logger.info(f"Received raw data from Meta: {body}")

    # Ignore delivery status updates
    entry = body.get("entry", [{}])[0]
    changes = entry.get("changes", [{}])[0]
    val = changes.get("value", {})

    if "statuses" in val:
        return {"status": "ignored_status_update"}

    try:
        messages = val.get("messages", [])
        if messages:
            msg_data = messages[0]
            patient_phone = msg_data.get("from")
            patient_text = msg_data.get("text", {}).get("body", "")

            logger.info(f"Message from {patient_phone}: {patient_text}")
            ai_reply = process_patient_message(patient_phone, patient_text)
            logger.info(f"Bot reply: {ai_reply}")

            # Send outbound reply back through Meta
            await send_whatsapp_message(patient_phone, ai_reply)
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}", exc_info=True)
        return {"status": "error", "message": str(e)}

    return {"status": "success"}

@router.post("/simulate", response_model=BotSimulateResponse, summary="Simulate WhatsApp conversation locally")
async def simulate_chat(sim_req: BotSimulateRequest):
    """
    Simulates a patient sending a message to the bot.
    Used by the frontend dashboard to test the receptionist AI and DB tools.
    """
    reply = process_patient_message(sim_req.sender_phone, sim_req.message)
    return BotSimulateResponse(
        reply=reply,
        sender_phone=sim_req.sender_phone,
        status="success"
    )
