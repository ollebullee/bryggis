"""Gör registreringskoden dist/signup-qr.png för Bryggis-demon.

Användning:
    pip install "qrcode[pil]"
    python3 tools/make_qr.py                      # standardadressen nedan
    python3 tools/make_qr.py https://ny-adress/#bli-medlem
"""
import sys
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_M

DEFAULT_URL = "https://ollebullee.github.io/bryggis/dist/#bli-medlem"
OUT = Path(__file__).resolve().parent.parent / "dist" / "signup-qr.png"


def main() -> None:
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=12, border=3)
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#2d241f", back_color="white").convert("RGB")
    image.save(OUT)
    print(f"Sparade {OUT.name} ({image.size[0]}x{image.size[1]}) -> {url}")


if __name__ == "__main__":
    main()
