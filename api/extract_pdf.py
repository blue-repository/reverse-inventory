from http.server import BaseHTTPRequestHandler
import json, io, re
import pdfplumber


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            pdf_bytes = self.rfile.read(length)
            result = extract_egreso(pdf_bytes)
            body = json.dumps(result, ensure_ascii=False).encode("utf-8")
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}).encode())

    # ── helpers ──────────────────────────────────────────────────────────────

    def send_response(self, code, message=None):
        super().send_response(code, message)

    def _cors(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, *_):
        pass


# ── lógica de extracción ──────────────────────────────────────────────────────

def extract_egreso(pdf_bytes: bytes) -> dict:
    result = {
        "egressNumber": "",
        "egressDate": "",
        "recipientName": "",
        "recipientId": "",
        "originEntity": "",
        "originWarehouse": "",
        "destinationEntity": "",
        "total": 0.0,
        "medicaments": [],
    }

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        full_text = "\n".join(
            page.extract_text() or "" for page in pdf.pages
        )
        result.update(_parse_header(full_text))

        all_rows = []
        for page in pdf.pages:
            for table in page.extract_tables():
                all_rows.extend(table)

        result["medicaments"] = _parse_rows(all_rows)

        m = re.search(r"TOTAL\s*\(\$\)\s*[:\-]?\s*([\d.,]+)", full_text)
        if m:
            result["total"] = _num(m.group(1))

    return result


def _parse_header(text: str) -> dict:

    # egressNumber: siempre tiene EGR en el medio
    egr_m = re.search(r"(\d{6}-\d{4}-EGR-[\w-]+)", text)

    # egressDate: primera fecha YYYY-MM-DD del documento
    date_m = re.search(r"(\d{4}-\d{2}-\d{2})", text)

    # recipientId: número de cédula (10 dígitos seguidos)
    rid_m = re.search(r"\b(\d{10})\b", text)

    # recipientName: línea que contiene el ID, extraer solo la parte de nombre
    recipient_name = ""
    if rid_m:
        line_with_id = ""
        for line in text.splitlines():
            if rid_m.group(1) in line:
                line_with_id = line
                break
        # El nombre es todo lo que está antes del ID en esa línea
        recipient_name = line_with_id.replace(rid_m.group(1), "").strip()

    # originEntity: patrón NNN-DESCRIPCION (empieza con 6 dígitos y guión)
    origin_m = re.search(r"(\d{6}-[A-Z\s]+\d+[A-Z\s\d]+?)(?=\s+BODEGA|\n|$)", text)

    # originWarehouse: empieza con BODEGA
    warehouse_m = re.search(r"(BODEGA[\w\s]+?)(?=\n|$)", text)

    # destinationEntity: patrón NNN-NOMBRE (6 dígitos guión texto)
    dest_m = re.search(r"Entidad Destino[^\n]*\n.*?(\d{6}-\w+)", text, re.DOTALL)
    if not dest_m:
        # fallback: buscar el patrón directamente
        dest_m = re.search(r"\b(\d{6}-[A-Z]+)\b", text)

    return {
        "egressNumber":      egr_m.group(1)      if egr_m      else "",
        "egressDate":        date_m.group(1)     if date_m     else "",
        "recipientName":     recipient_name,
        "recipientId":       rid_m.group(1)      if rid_m      else "",
        "originEntity":      origin_m.group(1).strip()   if origin_m   else "",
        "originWarehouse":   warehouse_m.group(1).strip() if warehouse_m else "",
        "destinationEntity": dest_m.group(1)     if dest_m     else "",
    }


def _parse_rows(rows: list) -> list:
    items = []
    for row in rows:
        if not row:
            continue
        cells = [str(c or "").replace("\n", " ").strip() for c in row]

        if not re.match(r"^\d{1,2}$", cells[0]):
            continue
        if len(cells) < 9:
            continue

        items.append({
            "sku":          cells[1],
            "name":         cells[2],
            "quantity":     _num(cells[6]),
            "total":        _num(cells[8]),
            # campos extra por si los necesitas después
            "lote":         cells[4],
            "expiration":   cells[5],
            "unitCost":     _num(cells[7]),
        })
    return items


def _num(s: str) -> float:
    try:
        return float(s.replace(",", "."))
    except (ValueError, AttributeError):
        return 0.0