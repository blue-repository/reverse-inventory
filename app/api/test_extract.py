# scripts/test_extract.py
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app', 'api'))

from extract_pdf import extract_egreso
import json

# Lee el PDF que le pases como argumento
pdf_path = sys.argv[1]

with open(pdf_path, "rb") as f:
    pdf_bytes = f.read()

result = extract_egreso(pdf_bytes)
print(json.dumps(result, ensure_ascii=False, indent=2))