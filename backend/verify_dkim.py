import sys
import json
import dkim

try:
    # Read JSON input from Node.js
    data = json.loads(sys.stdin.read())
    raw_email = data["email"].encode()
    public_key = data["public_key"]

    # ✅ Correct fake DNS resolver
    def fake_dns_lookup(domain, timeout=None):
        record = f"v=DKIM1; p={public_key}"
        return record.encode()  # return bytes, not list

    # Verify DKIM signature
    valid = dkim.verify(raw_email, dnsfunc=fake_dns_lookup)

    # Respond with clear text
    if valid:
        print("DKIM verification PASSED — message is authentic.", flush=True)
    else:
        print("DKIM verification FAILED — message was altered or not properly signed.", flush=True)

except Exception as e:
    print(f"Error during verification: {str(e)}", flush=True)
