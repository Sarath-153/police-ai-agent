#!/usr/bin/env python3
import sys
import os
import json
import re
from datetime import datetime

def parse_pdf(file_path):
    import pdfplumber
    complaints = []
    pages_data = []
    full_text_list = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_dict = {}
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if row and len(row) >= 2 and row[0] is not None and row[1] is not None:
                        k = str(row[0]).strip()
                        v = str(row[1]).strip()
                        if k.lower() != "field" and k:
                            page_dict[k] = v
            
            # Fallback line-by-line colon parsing only if no tables were on the page
            text = page.extract_text() or ""
            full_text_list.append(text)
            if not page_dict:
                for line in text.split("\n"):
                    if ":" in line and not line.strip().lower().startswith("complaint type"):
                        parts = line.split(":", 1)
                        k = parts[0].strip()
                        v = parts[1].strip()
                        if k and v and k not in page_dict:
                            page_dict[k] = v
            
            pages_data.append(page_dict)

    all_text = "\n".join(full_text_list)

    # Group pages by acknowledgement number or complaint ID
    complaint_groups = []
    current_group = {}
    current_ack = None

    for pdata in pages_data:
        p_ack = (
            pdata.get("Acknowledgement Number") or 
            pdata.get("Acknowledgement No") or 
            pdata.get("Complaint ID") or
            pdata.get("ComplaintId")
        )
        if p_ack:
            if current_ack is None:
                current_ack = p_ack
                current_group.update(pdata)
            elif p_ack == current_ack:
                current_group.update(pdata)
            else:
                complaint_groups.append(current_group)
                current_group = dict(pdata)
                current_ack = p_ack
        else:
            current_group.update(pdata)

    if current_group:
        complaint_groups.append(current_group)

    # Check for Description of Incident in the document text
    desc_match = re.search(
        r"(?:Description\s+of\s+Incident|Incident\s+Description|Description)\s*[:\n]\s*(.*?)(?:[—–-]+\s*End|\Z)",
        all_text,
        re.IGNORECASE | re.DOTALL
    )
    if desc_match:
        extracted_desc = desc_match.group(1).strip()
        if extracted_desc:
            for g in complaint_groups:
                if "Description of Incident" not in g and "Description" not in g:
                    g["Description of Incident"] = extracted_desc

    for cdict in complaint_groups:
        complaints.append(normalize_complaint(cdict))

    return complaints

def parse_excel_or_csv(file_path):
    import pandas as pd
    complaints = []
    
    if file_path.lower().endswith(('.xlsx', '.xls')):
        df = pd.read_excel(file_path)
    else:
        df = pd.read_csv(file_path)
        
    df = df.fillna('')
    for _, row in df.iterrows():
        d = {str(k).strip(): str(v).strip() for k, v in row.items()}
        complaints.append(normalize_complaint(d))
        
    return complaints

def normalize_complaint(d):
    # Find acknowledgment number or ID
    ack = (
        d.get("Acknowledgement Number") or 
        d.get("Acknowledgement No") or 
        d.get("Complaint ID") or 
        d.get("id") or 
        d.get("ComplaintId") or
        f"NCRP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    )

    # Name
    name = (
        d.get("Name") or 
        d.get("Complainant") or 
        d.get("Complainant Name") or 
        d.get("complainant") or 
        d.get("complainantName") or 
        "Unknown Complainant"
    )

    # Mobile / Phone
    phone = (
        d.get("Mobile") or 
        d.get("Phone") or 
        d.get("Mobile Number") or 
        d.get("complainantPhone") or 
        ""
    )

    # Email / User ID
    email = (
        d.get("Email") or 
        d.get("UserId") or 
        d.get("User ID") or 
        d.get("complainantEmail") or 
        ""
    )

    # Category / Sub category
    category = (
        d.get("Category of Complaint") or 
        d.get("Category") or 
        d.get("Crime Type") or 
        d.get("category") or 
        d.get("crimeType") or 
        "Financial Fraud"
    )

    sub_category = (
        d.get("Sub Category of Complaint") or 
        d.get("Sub Category") or 
        d.get("subCategory") or 
        ""
    )

    # Date parsing
    raw_date = (
        d.get("Complaint Date") or 
        d.get("Incident Date/Time") or 
        d.get("Date") or 
        d.get("date")
    )

    iso_date = None
    if raw_date:
        cleaned_date = str(raw_date).strip()
        date_part = cleaned_date.split()[0] if " " in cleaned_date else cleaned_date
        date_part = date_part.rstrip(",")
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
            try:
                dt = datetime.strptime(date_part, fmt)
                iso_date = dt.strftime("%Y-%m-%dT00:00:00.000Z")
                break
            except Exception:
                pass

    if not iso_date:
        iso_date = datetime.utcnow().strftime("%Y-%m-%dT00:00:00.000Z")

    # Crime type categorization
    combined_text = f"{category} {sub_category}".lower()
    if any(k in combined_text for k in ["identity", "impersonat", "forgery"]):
        crime_type = "Identity Theft"
    elif any(k in combined_text for k in ["stalk", "harass", "blackmail"]):
        crime_type = "Cyber Stalking"
    elif any(k in combined_text for k in ["breach", "leak", "data theft"]):
        crime_type = "Data Breach"
    elif any(k in combined_text for k in ["hack", "ransomware", "trojan", "malware"]):
        crime_type = "Hacking"
    elif any(k in combined_text for k in ["social media", "instagram", "facebook", "telegram", "whatsapp scam"]):
        crime_type = "Social Media Scam"
    else:
        crime_type = "Financial Fraud"

    # Platform detection
    explicit_platform = d.get("Platform") or d.get("platform")
    if explicit_platform:
        platform = explicit_platform
    elif "whatsapp" in combined_text:
        platform = "WhatsApp"
    elif "facebook" in combined_text:
        platform = "Facebook"
    elif "telegram" in combined_text:
        platform = "Telegram"
    elif "instagram" in combined_text:
        platform = "Instagram"
    elif any(k in combined_text for k in ["upi", "bank", "paytm", "gpay", "phonepe", "credit", "debit", "card", "financial", "net banking"]):
        platform = "Banking"
    elif any(k in combined_text for k in ["flipkart", "amazon", "shopping", "e-commerce", "ecommerce", "olx"]):
        platform = "E-commerce"
    else:
        platform = "Other"

    # Amount extraction
    amount = 0.0
    raw_amount = None
    for k, v in d.items():
        kl = k.lower().replace(" ", "").replace("_", "")
        if any(term in kl for term in ["amountloss", "amountlost", "lossamount", "amount", "loss", "fraudamount"]):
            raw_amount = v
            break

    if raw_amount:
        clean_str = re.sub(r"[^\d.,]", "", str(raw_amount))
        m = re.search(r"\d[\d,]*(?:\.\d+)?", clean_str)
        if m:
            try:
                amount = float(m.group(0).replace(",", ""))
            except Exception:
                amount = 0.0

    # Address / extra fields (only if present in d)
    house_no = d.get("House No", "")
    street = d.get("Street Name", "")
    colony = d.get("Colony", "")
    village = d.get("Village/Town", "")
    tehsil = d.get("Tehsil", "")
    district = d.get("District", "") or d.get("district", "")
    state = d.get("State", "") or d.get("state", "")
    pincode = d.get("Pincode", "") or d.get("pincode", "")
    police_station = d.get("Police Station", "") or d.get("policeStation", "")
    father_spouse = d.get("Father/Mother/Spouse Name", "") or d.get("fatherOrSpouseName", "")
    incident_time = d.get("Incident Date/Time", "") or d.get("incidentDateTime", "")

    addr_elements = [house_no, street, colony, village, tehsil, district, state, pincode]
    address = ", ".join([str(x).strip() for x in addr_elements if x and str(x).strip()])

    # Description (prioritize Description of Incident from PDF if present)
    desc = (
        d.get("Description of Incident") or 
        d.get("Incident Description") or 
        d.get("Description") or 
        d.get("description") or
        ""
    )

    # Status mapping
    status = "registered"
    raw_status = (d.get("Status") or d.get("status") or "").lower()
    if "investigat" in raw_status or "enquiry" in raw_status or "review" in raw_status:
        status = "under_investigation"
    elif "fir" in raw_status:
        status = "fir_filed"
    elif "resolv" in raw_status or "close" in raw_status:
        status = "resolved"

    return {
        "id": f"complaint-{ack}",
        "complaintId": str(ack),
        "date": iso_date,
        "complainantName": str(name),
        "complainantEmail": str(email),
        "complainantPhone": str(phone),
        "crimeType": crime_type,
        "platform": platform,
        "amountLost": int(amount),
        "status": status,
        "description": desc,
        "category": category,
        "subCategory": sub_category,
        "fatherOrSpouseName": str(father_spouse),
        "policeStation": str(police_station),
        "district": str(district),
        "state": str(state),
        "pincode": str(pincode),
        "address": address,
        "incidentDateTime": str(incident_time),
        "rawFields": d,
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File not found: {file_path}"}))
        sys.exit(1)

    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".pdf":
            records = parse_pdf(file_path)
        elif ext in [".xlsx", ".xls", ".csv"]:
            records = parse_excel_or_csv(file_path)
        else:
            print(json.dumps({"error": f"Unsupported file type: {ext}"}))
            sys.exit(1)

        print(json.dumps({"success": True, "count": len(records), "complaints": records}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
