import sys, json
from dkim_verifier_core import verify_dkim_from_file

if __name__ == "__main__":
    email_path = sys.argv[1]
    public_key = sys.argv[2] if len(sys.argv) > 2 else None
    result = verify_dkim_from_file(email_path, public_key)
    print(json.dumps(result))
