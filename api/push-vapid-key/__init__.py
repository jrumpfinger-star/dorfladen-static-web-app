import azure.functions as func
import json
import os


def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json; charset=utf-8"
    }


def main(req: func.HttpRequest) -> func.HttpResponse:
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=200, headers=get_cors_headers())

    vapid_public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
    if not vapid_public_key:
        return func.HttpResponse(
            json.dumps({"error": "VAPID key not configured"}),
            status_code=500, mimetype="application/json", headers=get_cors_headers()
        )

    # Debug: verify key pair matches
    vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY", "")
    key_match = "unknown"
    derived_pub = ""
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        import base64
        # Decode private key from URL-safe base64
        priv_bytes = base64.urlsafe_b64decode(vapid_private_key + '==')
        priv_key = ec.derive_private_key(int.from_bytes(priv_bytes, 'big'), ec.SECP256R1())
        pub_bytes = priv_key.public_key().public_bytes(
            serialization.Encoding.X962,
            serialization.PublicFormat.UncompressedPoint
        )
        derived_pub = base64.urlsafe_b64encode(pub_bytes).rstrip(b'=').decode()
        key_match = (derived_pub == vapid_public_key)
    except Exception as e:
        key_match = f"error: {str(e)[:100]}"

    return func.HttpResponse(
        json.dumps({
            "publicKey": vapid_public_key,
            "privateKeyLen": len(vapid_private_key),
            "keyPairMatch": key_match,
            "derivedPublicKey": derived_pub[:20] + "..." if derived_pub else ""
        }),
        status_code=200, mimetype="application/json", headers=get_cors_headers()
    )
