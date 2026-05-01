"""
PulseML — HTTPS local server
Serves public/ over HTTPS so geolocation works on phone browsers.
Generates a self-signed cert automatically (no openssl binary needed).

Usage:  python serve_https.py
Then open:  https://<your-pc-ip>:8443
(Accept the browser's security warning once — it's safe on your local network.)
"""

import os, ssl, socket, datetime, ipaddress, sys
from datetime import timezone
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT      = 8443
PUBLIC    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
CERT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "selfsigned.crt")
KEY_FILE  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "selfsigned.key")


# ── 1. Generate cert using Python cryptography (no openssl binary needed) ────
def generate_cert(local_ip):
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    print("[*] Generating self-signed certificate...")
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME,             "IN"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME,        "PulseML"),
        x509.NameAttribute(NameOID.COMMON_NAME,              "pulseml.local"),
    ])

    san = x509.SubjectAlternativeName([
        x509.DNSName("localhost"),
        x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
        x509.IPAddress(ipaddress.IPv4Address(local_ip)),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(timezone.utc))
        .not_valid_after(datetime.datetime.now(timezone.utc) + datetime.timedelta(days=365))
        .add_extension(san, critical=False)
        .sign(key, hashes.SHA256())
    )

    with open(KEY_FILE, "wb") as f:
        f.write(key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        ))
    with open(CERT_FILE, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    print(f"[OK] Certificate written -> {CERT_FILE}")


# ── 2. Handler that serves from public/ ─────────────────────────────────────
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC, **kwargs)

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()}  {fmt % args}")


# ── 3. Detect local IP ───────────────────────────────────────────────────────
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    local_ip = s.getsockname()[0]
    s.close()
except Exception:
    local_ip = "127.0.0.1"

# Regenerate cert if missing or IP might have changed
if not (os.path.exists(CERT_FILE) and os.path.exists(KEY_FILE)):
    generate_cert(local_ip)

# ── 4. Wrap with SSL ─────────────────────────────────────────────────────────
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(certfile=CERT_FILE, keyfile=KEY_FILE)

server = HTTPServer(("0.0.0.0", PORT), Handler)
server.socket = ctx.wrap_socket(server.socket, server_side=True)

# ── 5. Print access URLs ─────────────────────────────────────────────────────
print("\n" + "=" * 56)
print("  PulseML -- HTTPS Server  (geolocation enabled)")
print("=" * 56)
print(f"  PC browser  ->  https://localhost:{PORT}")
print(f"  Phone       ->  https://{local_ip}:{PORT}")
print("-" * 56)
print("  [!] First visit on phone: tap  Advanced -> Proceed")
print("      to accept the self-signed cert (local only, safe).")
print("=" * 56 + "\n")

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\n[*] Server stopped.")
