"""
RoxyMail — Email Parser
Parse raw MIME emails and detect OTPs.
"""

import re
import email
from email import policy
from email.parser import BytesParser
from typing import Optional, Dict, Any, Tuple

import bleach


# Allowed HTML tags for sanitized email bodies
ALLOWED_TAGS = list(bleach.ALLOWED_TAGS) + [
    "div", "span", "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "thead", "tbody", "tr", "td", "th", "img", "a",
    "ul", "ol", "li", "strong", "em", "b", "i", "u",
    "font", "center", "blockquote", "pre", "code",
    "style", "header", "footer", "section", "article", "nav", "main",
]

ALLOWED_ATTRIBUTES = {
    "*": ["style", "class", "id", "align", "valign", "width", "height"],
    "a": ["href", "target", "rel"],
    "img": ["src", "alt", "width", "height"],
    "td": ["colspan", "rowspan"],
    "th": ["colspan", "rowspan"],
    "font": ["color", "size", "face"],
}

# OTP detection patterns (ordered by specificity)
OTP_PATTERNS = [
    # Pattern A: keyword followed by code
    re.compile(
        r"(?:kode|code|otp|pin|token|verif(?:ication|ikasi)|sandi)[:\s]+(\d{4,8})",
        re.IGNORECASE,
    ),
    # Pattern D: spaced digits like "123 456" or "123-456"
    re.compile(r"(\d{3})[.\-\s](\d{3})"),
    # Pattern B: standalone 6-digit (most common for OTP)
    re.compile(r"\b(\d{6})\b"),
    # Pattern C: 4-digit fallback
    re.compile(r"\b(\d{4})\b"),
]


def parse_raw_email(raw_email: str) -> Dict[str, Any]:
    """
    Parse a raw MIME email string into components.
    Returns dict with: body_html, body_text, headers, from_name, from_address
    """
    try:
        msg = email.message_from_string(raw_email, policy=policy.default)
    except Exception:
        # Fallback: treat entire content as plain text
        return {
            "body_html": None,
            "body_text": raw_email,
            "headers": {},
            "from_name": "",
            "from_address": "",
        }

    # Extract headers
    headers = {}
    for key in msg.keys():
        headers[key.lower()] = str(msg[key])

    # Extract from name and address
    from_name = ""
    from_address = ""
    from_header = msg.get("From", "")
    if "<" in from_header and ">" in from_header:
        from_name = from_header.split("<")[0].strip().strip('"')
        from_address = from_header.split("<")[1].split(">")[0].strip()
    else:
        from_address = from_header.strip()

    # Extract body
    body_html = None
    body_text = None

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            try:
                payload = part.get_content()
            except Exception:
                continue

            if content_type == "text/html" and not body_html:
                body_html = str(payload)
            elif content_type == "text/plain" and not body_text:
                body_text = str(payload)
    else:
        content_type = msg.get_content_type()
        try:
            payload = msg.get_content()
        except Exception:
            payload = raw_email

        if content_type == "text/html":
            body_html = str(payload)
        else:
            body_text = str(payload)

    # Sanitize HTML
    if body_html:
        body_html = bleach.clean(
            body_html,
            tags=ALLOWED_TAGS,
            attributes=ALLOWED_ATTRIBUTES,
            strip=True,
        )

    return {
        "body_html": body_html,
        "body_text": body_text,
        "headers": headers,
        "from_name": from_name,
        "from_address": from_address,
    }


def detect_otp(text: str) -> Optional[str]:
    """
    Detect OTP/verification code in email text.
    Returns the detected code or None.
    """
    if not text:
        return None

    for pattern in OTP_PATTERNS:
        match = pattern.search(text)
        if match:
            groups = match.groups()
            if len(groups) == 2:
                # Spaced pattern: combine "123" + "456" → "123456"
                return groups[0] + groups[1]
            code = groups[0]
            # Only return 4-digit codes if they look like OTPs
            # (avoid matching years like 2024)
            if len(code) == 4:
                # Check if it could be a year (2020-2030)
                if 2020 <= int(code) <= 2035:
                    continue
            return code.strip()

    return None
