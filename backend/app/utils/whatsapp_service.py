import os
import re
import logging
import urllib.parse
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import requests

logger = logging.getLogger(__name__)

def get_whatsapp_env_config() -> Dict[str, Any]:
    """Retrieves all WhatsApp Cloud API configuration settings from environment variables."""
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
    api_version = os.getenv("WHATSAPP_API_VERSION", "v20.0").strip()
    template_name = os.getenv("WHATSAPP_TEMPLATE_NAME", "pg_rent_due_reminder").strip()
    business_account_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "").strip()
    webhook_verify_token = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "sri_lakshmi_pg_webhook_token_2026").strip()
    simulate_unconfigured = os.getenv("WHATSAPP_SIMULATE_IF_UNCONFIGURED", "false").lower() in ("true", "1", "yes")

    is_configured = bool(access_token and phone_number_id)

    return {
        "is_configured": is_configured,
        "access_token": access_token,
        "phone_number_id": phone_number_id,
        "api_version": api_version,
        "template_name": template_name,
        "business_account_id": business_account_id,
        "webhook_verify_token": webhook_verify_token,
        "simulate_unconfigured": simulate_unconfigured,
    }

def get_whatsapp_setup_status(admin_whatsapp_number: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns public setup diagnostics for the admin dashboard.
    Never exposes raw tokens or secret keys.
    Indicates whether Regular WhatsApp Click-to-Chat or Meta Cloud API is active.
    """
    cfg = get_whatsapp_env_config()
    is_conf = cfg["is_configured"]
    phone_id = cfg["phone_number_id"]
    masked_phone_id = f"***{phone_id[-4:]}" if len(phone_id) >= 4 else ("Not Configured" if not phone_id else "***")
    has_token = bool(cfg["access_token"])

    admin_phone = admin_whatsapp_number or "7893744206"
    clean_admin = re.sub(r"\D", "", str(admin_phone))
    if len(clean_admin) == 12 and clean_admin.startswith("91"):
        clean_admin = clean_admin[2:]
    if len(clean_admin) == 11 and clean_admin.startswith("0"):
        clean_admin = clean_admin[1:]
    display_admin = clean_admin if clean_admin else "7893744206"

    if is_conf:
        status_code = "CONFIGURED"
        status_label = "Meta Cloud API Configured"
        status_description = "Official WhatsApp Business Cloud API is active for automated delivery."
        mode = "BUSINESS_API"
    elif cfg["simulate_unconfigured"]:
        status_code = "SIMULATION_MODE"
        status_label = "Developer Sandbox Mode"
        status_description = "Running in simulated sandbox mode. Messages are logged for testing without calling external Meta APIs."
        mode = "SIMULATION"
    else:
        status_code = "REGULAR_WHATSAPP_ACTIVE"
        status_label = "Regular WhatsApp Active"
        status_description = f"Regular WhatsApp Click-to-Chat is active. Reminders open directly in regular WhatsApp (Admin: +91 {display_admin})."
        mode = "REGULAR_WHATSAPP"

    return {
        "status_code": status_code,
        "status_label": status_label,
        "status_description": status_description,
        "mode": mode,
        "is_configured": is_conf,
        "regular_whatsapp_active": True,
        "admin_whatsapp_number": display_admin,
        "has_access_token": has_token,
        "phone_number_id_configured": bool(phone_id),
        "phone_number_id_masked": masked_phone_id,
        "api_version": cfg["api_version"],
        "template_name": cfg["template_name"],
        "provider": "Regular WhatsApp Click-to-Chat (wa.me)" if not is_conf else "Meta WhatsApp Business Platform Cloud API"
    }

def normalize_whatsapp_phone(phone_raw: str) -> str:
    """
    Normalizes phone number to international WhatsApp standard E.164 without '+' or spaces.
    For Indian numbers: 10 digits (e.g. '9876543210') becomes '919876543210'.
    """
    if not phone_raw:
        return ""
    # Extract all digits
    digits = re.sub(r"\D", "", str(phone_raw))
    if len(digits) == 10:
        return f"91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    if len(digits) == 11 and digits.startswith("0"):
        return f"91{digits[1:]}"
    return digits

def build_whatsapp_chat_url(recipient_phone: str, message_text: str) -> str:
    """
    Constructs the standard regular WhatsApp click-to-chat URL:
    https://wa.me/91<RESIDENT_PHONE>?text=<URL_ENCODED_MESSAGE>
    Ensures safe percent-encoding for emojis, line breaks, and currency symbols.
    """
    clean_phone = normalize_whatsapp_phone(recipient_phone)
    encoded_message = urllib.parse.quote(message_text)
    return f"https://wa.me/{clean_phone}?text={encoded_message}"

def generate_rent_reminder_text(
    resident_name: str,
    room_number: str = "PG",
    rent_month: str = "",
    monthly_rent: Optional[float] = None,
    amount_paid: float = 0.0,
    balance_due: Optional[float] = None,
    due_date_formatted: str = "",
    admin_whatsapp_number: Optional[str] = "7893744206",
    **kwargs
) -> str:
    """
    Generates exact dynamic WhatsApp rent reminder message matching the PG requirements:
    Hello [Resident Name],
    This is a friendly reminder from Sri Lakshmi Srinivasa Gents PG.
    Your monthly rent details:
    - Room Number: [Room Number]
    - Rent Month: [Month and Year]
    - Monthly Rent: ₹[Monthly Rent]
    - Amount Paid: ₹[Amount Paid]
    - Outstanding Balance: ₹[Balance]
    - Due Date: [Due Date]

    Please pay your pending rent at your earliest convenience.
    For payment confirmation or assistance, contact the PG administrator at +91 [Admin WhatsApp Number].
    Thank you,
    Sri Lakshmi Srinivasa Gents PG Management
    Velachery, Chennai.
    """
    if monthly_rent is None:
        monthly_rent = float(kwargs.get("rent_amount", 0.0) or 0.0)
    if balance_due is None:
        balance_due = float(kwargs.get("balance_due", max(0.0, monthly_rent - amount_paid)) or 0.0)

    admin_phone = admin_whatsapp_number or "7893744206"
    # Ensure clean 10-digit format for display
    clean_admin = re.sub(r"\D", "", str(admin_phone))
    if len(clean_admin) == 12 and clean_admin.startswith("91"):
        clean_admin = clean_admin[2:]
    if len(clean_admin) == 11 and clean_admin.startswith("0"):
        clean_admin = clean_admin[1:]
    display_admin = clean_admin if clean_admin else "7893744206"

    rent_str = f"{int(monthly_rent):,}" if float(monthly_rent).is_integer() else f"{float(monthly_rent):,.2f}"
    paid_str = f"{int(amount_paid):,}" if float(amount_paid).is_integer() else f"{float(amount_paid):,.2f}"
    bal_str = f"{int(balance_due):,}" if float(balance_due).is_integer() else f"{float(balance_due):,.2f}"

    return (
        f"Hello {resident_name},\n\n"
        f"This is a friendly reminder from Sri Lakshmi Srinivasa Gents PG.\n\n"
        f"Your monthly rent details:\n\n"
        f"- Room Number: {room_number}\n"
        f"- Rent Month: {rent_month}\n"
        f"- Monthly Rent: ₹{rent_str}\n"
        f"- Amount Paid: ₹{paid_str}\n"
        f"- Outstanding Balance: ₹{bal_str}\n"
        f"- Due Date: {due_date_formatted}\n\n"
        f"Please pay your pending rent at your earliest convenience.\n\n"
        f"For payment confirmation or assistance, contact the PG administrator at +91 {display_admin}.\n\n"
        f"Thank you,\n"
        f"Sri Lakshmi Srinivasa Gents PG Management\n"
        f"Velachery, Chennai."
    )


def send_whatsapp_message(
    phone_number: str,
    message_text: str,
    template_name: Optional[str] = None,
    template_params: Optional[list] = None
) -> Dict[str, Any]:
    """
    Sends WhatsApp message using Meta WhatsApp Business Cloud API.
    Requirements:
      - If credentials are NOT configured:
        Does NOT falsely report as sent. Returns status 'FAILED' with clear reason.
      - If credentials ARE configured:
        Invokes Meta Cloud API. Returns message ID and delivery status.
      - If simulation mode is explicitly enabled:
        Returns simulation status with clear simulation marker.
    """
    cfg = get_whatsapp_env_config()
    clean_phone = normalize_whatsapp_phone(phone_number)

    if not clean_phone or len(clean_phone) < 10:
        return {
            "success": False,
            "delivery_status": "FAILED",
            "provider_message_id": None,
            "error_details": f"Invalid recipient phone number format: '{phone_number}'. Must be a valid 10-digit mobile number.",
            "response_data": None
        }

    # If credentials are not set
    if not cfg["is_configured"]:
        if cfg["simulate_unconfigured"]:
            sim_id = f"wamid.SIMULATED_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{clean_phone[-4:]}"
            return {
                "success": True,
                "delivery_status": "SENT",
                "provider_message_id": sim_id,
                "error_details": None,
                "response_data": {"simulation": True, "message": "Dispatched in developer sandbox simulation mode."}
            }
        else:
            return {
                "success": False,
                "delivery_status": "FAILED",
                "provider_message_id": None,
                "error_details": "WhatsApp Business Cloud API credentials not configured in environment (WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are missing). Please configure them in backend/.env.",
                "response_data": None
            }

    # Live Meta WhatsApp Cloud API call
    url = f"https://graph.facebook.com/{cfg['api_version']}/{cfg['phone_number_id']}/messages"
    headers = {
        "Authorization": f"Bearer {cfg['access_token']}",
        "Content-Type": "application/json"
    }

    # Decide payload: Template message if template params provided, otherwise direct text
    use_template = bool(template_name or cfg["template_name"])
    actual_template = template_name or cfg["template_name"]

    if use_template and template_params:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": actual_template,
                "language": {"code": "en"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": str(p)} for p in template_params]
                    }
                ]
            }
        }
    else:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {"preview_url": False, "body": message_text}
        }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        res_data = response.json()

        if response.status_code in (200, 201) and "messages" in res_data:
            msg_id = res_data["messages"][0]["id"]
            return {
                "success": True,
                "delivery_status": "SENT",
                "provider_message_id": msg_id,
                "error_details": None,
                "response_data": res_data
            }
        else:
            err_msg = res_data.get("error", {}).get("message", f"HTTP {response.status_code}: {response.text}")
            logger.error(f"WhatsApp API Error: {err_msg}")
            return {
                "success": False,
                "delivery_status": "FAILED",
                "provider_message_id": None,
                "error_details": f"Meta WhatsApp API error: {err_msg}",
                "response_data": res_data
            }
    except requests.exceptions.RequestException as exc:
        logger.error(f"WhatsApp network error: {str(exc)}")
        return {
            "success": False,
            "delivery_status": "FAILED",
            "provider_message_id": None,
            "error_details": f"Network error connecting to WhatsApp API: {str(exc)}",
            "response_data": None
        }
