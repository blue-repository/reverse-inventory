import sys
import os

# Path absoluto al directorio donde está extract_pdf.py
api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'api'))
print(f"Buscando extract_pdf en: {api_dir}")  # para verificar
sys.path.insert(0, api_dir)

from extract_pdf import handler
from http.server import HTTPServer

if __name__ == "__main__":
    server = HTTPServer(("localhost", 5001), handler)
    print("PDF server corriendo en http://localhost:5001")
    server.serve_forever()