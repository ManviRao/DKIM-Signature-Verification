import email
import dkim
import dns.resolver

def get_public_key_from_dns(selector, domain):
    try:
        record_name = f"{selector}._domainkey.{domain}"
        txt_records = dns.resolver.resolve(record_name, "TXT")
        for record in txt_records:
            txt = "".join(record.strings[0].decode() for record in record.strings)
            if txt.startswith("v=DKIM1"):
                key_data = txt.split("p=")[1].split(";")[0]
                return "-----BEGIN PUBLIC KEY-----\n" + key_data + "\n-----END PUBLIC KEY-----"
    except Exception as e:
        return None

def verify_dkim_from_file(file_path, public_key=None):
    with open(file_path, "rb") as f:
        raw_email = f.read()

    msg = email.message_from_bytes(raw_email)
    headers = msg.items()
    dkim_header = dict(headers).get("DKIM-Signature", None)

    if not dkim_header:
        return {"ok": False, "reason": "No DKIM-Signature header found."}

    # Extract domain and selector
    domain = ""
    selector = ""
    for field in dkim_header.split(";"):
        if field.strip().startswith("d="):
            domain = field.strip().split("=")[1]
        if field.strip().startswith("s="):
            selector = field.strip().split("=")[1]

    if not public_key:
        public_key = get_public_key_from_dns(selector, domain)

    if not public_key:
        return {"ok": False, "reason": "Public key not provided and could not be retrieved from DNS."}

    try:
        is_valid = dkim.verify(raw_email, dnsfunc=lambda _: public_key.encode())
        return {
            "ok": bool(is_valid),
            "reason": "DKIM signature verified successfully." if is_valid else "DKIM verification failed.",
            "domain": domain,
            "selector": selector,
        }
    except Exception as e:
        return {"ok": False, "reason": f"Verification error: {str(e)}"}
