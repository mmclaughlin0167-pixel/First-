#!/usr/bin/env python3
"""
Generates synthetic financial-services security + business data for the
Executive Security KPI Dashboard (CEO / CFO / COO / CIO).

Deterministic (fixed seed) so the CSVs in ../data can be regenerated
identically. Output: 8 CSV files consumed by the Splunk dashboards as
lookups (`| inputlookup <file>.csv`).

Usage: python3 generate_sample_data.py
"""
import csv
import random
from datetime import datetime, timedelta

random.seed(42)

OUT_DIR = "../data"

# ---------------------------------------------------------------------------
# Shared dimensions
# ---------------------------------------------------------------------------

START_DATE = datetime(2024, 8, 1)
END_DATE = datetime(2026, 7, 31)
TOTAL_DAYS = (END_DATE - START_DATE).days

BU_SYSTEMS = {
    "Retail Banking": ["Core Banking System", "Teller Platform", "ATM Network"],
    "Commercial Banking": ["Commercial Loan Platform", "Treasury Management System"],
    "Wealth Management": ["Wealth Management Platform", "Trading Platform"],
    "Payments & Cards": ["Payment Gateway", "Card Issuance System", "Wire Transfer System"],
    "Mortgage & Lending": ["Loan Origination System", "Document Management System"],
    "Digital Banking": ["Online Banking Portal", "Mobile Banking App", "Customer API Gateway"],
    "Corporate IT & Infrastructure": [
        "Active Directory", "Cloud Workloads (AWS)", "Data Warehouse",
        "Email & Collaboration (O365)", "Endpoint Fleet",
    ],
}
BU_LIST = list(BU_SYSTEMS.keys())
BU_WEIGHTS = [0.16, 0.11, 0.08, 0.16, 0.09, 0.20, 0.20]  # Digital & Corp IT skew higher (attack surface)

def pick_bu():
    return random.choices(BU_LIST, weights=BU_WEIGHTS, k=1)[0]

def pick_system(bu):
    return random.choice(BU_SYSTEMS[bu])

def rand_date(start=START_DATE, end=END_DATE):
    delta_days = (end - start).days
    return start + timedelta(days=random.randint(0, delta_days), seconds=random.randint(0, 86399))

MITRE_TACTICS = [
    "Initial Access", "Execution", "Persistence", "Privilege Escalation",
    "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement",
    "Collection", "Command and Control", "Exfiltration", "Impact",
]

REGULATORS = ["OCC", "FDIC", "Federal Reserve", "SEC", "FINRA", "NYDFS", "State AG", "CFPB"]
FRAMEWORKS = ["SOX", "GLBA", "PCI-DSS", "FFIEC", "NYDFS-23-NYCRR-500", "GDPR", "CCPA"]

def money(lo, hi):
    return round(random.uniform(lo, hi), 2)


# ---------------------------------------------------------------------------
# 1. security_incidents.csv  (CEO / COO core fact table)
# ---------------------------------------------------------------------------

INCIDENT_CATEGORIES = [
    "Phishing", "Ransomware", "Data Breach", "Insider Threat", "DDoS",
    "Unauthorized Access", "Third-Party/Vendor Breach", "Malware",
    "Business Email Compromise", "Account Takeover",
]
SEVERITY_WEIGHTS = {"Critical": 0.07, "High": 0.23, "Medium": 0.42, "Low": 0.28}

SEV_IMPACT_RANGE = {
    "Critical": (500_000, 15_000_000),
    "High": (100_000, 2_000_000),
    "Medium": (10_000, 300_000),
    "Low": (1_000, 50_000),
}
SEV_RECORDS_RANGE = {
    "Critical": (50_000, 2_000_000),
    "High": (5_000, 200_000),
    "Medium": (100, 20_000),
    "Low": (0, 500),
}
SEV_MTTD_RANGE = {"Critical": (0.5, 12), "High": (2, 36), "Medium": (6, 96), "Low": (12, 240)}
SEV_MTTR_RANGE = {"Critical": (4, 72), "High": (12, 168), "Medium": (24, 336), "Low": (48, 480)}

def gen_incidents(n=320):
    rows = []
    for i in range(n):
        d = rand_date()
        sev = random.choices(list(SEVERITY_WEIGHTS), weights=list(SEVERITY_WEIGHTS.values()), k=1)[0]
        bu = pick_bu()
        system = pick_system(bu)
        category = random.choice(INCIDENT_CATEGORIES)
        records_exposed = random.randint(*SEV_RECORDS_RANGE[sev]) if category in (
            "Data Breach", "Third-Party/Vendor Breach", "Insider Threat", "Unauthorized Access") else random.randint(0, 200)
        impact = money(*SEV_IMPACT_RANGE[sev])
        mttd = round(random.uniform(*SEV_MTTD_RANGE[sev]), 1)
        mttr = round(random.uniform(*SEV_MTTR_RANGE[sev]), 1)
        detected = d
        resolved = d + timedelta(hours=mttd + mttr)
        age_days = max((END_DATE - d).days, 0)
        if age_days < 14:
            status = random.choice(["Open", "Contained", "Monitoring"])
        elif age_days < 45:
            status = random.choice(["Contained", "Monitoring", "Resolved"])
        else:
            status = "Resolved"
        reg_required = "Y" if (sev in ("Critical", "High") and records_exposed > 500) or category in (
            "Data Breach", "Third-Party/Vendor Breach") and records_exposed > 500 else "N"
        rows.append({
            "incident_id": f"INC-{10000+i}",
            "date": d.strftime("%Y-%m-%d %H:%M:%S"),
            "detected_time": detected.strftime("%Y-%m-%d %H:%M:%S"),
            "resolved_time": resolved.strftime("%Y-%m-%d %H:%M:%S") if status == "Resolved" else "",
            "severity": sev,
            "category": category,
            "business_unit": bu,
            "system": system,
            "mitre_tactic": random.choice(MITRE_TACTICS),
            "records_exposed": records_exposed,
            "customers_affected": int(records_exposed * random.uniform(0.6, 1.0)),
            "financial_impact_usd": impact,
            "regulatory_notification_required": reg_required,
            "status": status,
            "mttd_hours": mttd,
            "mttr_hours": mttr,
            "root_cause": random.choice([
                "Unpatched vulnerability", "Phishing / credential theft", "Misconfiguration",
                "Third-party compromise", "Insider misuse", "Weak access control",
                "Social engineering", "Malicious code", "Lost/stolen device",
            ]),
        })
    rows.sort(key=lambda r: r["date"])
    return rows


# ---------------------------------------------------------------------------
# 2. fraud_transactions.csv (CFO / COO)
# ---------------------------------------------------------------------------

CHANNEL_FRAUD_TYPES = {
    "Card": ["Card Not Present", "Card Skimming", "Synthetic Identity"],
    "Wire": ["Wire Fraud", "Business Email Compromise"],
    "ACH": ["Synthetic Identity", "Account Takeover"],
    "Mobile": ["Account Takeover", "Synthetic Identity"],
    "Online": ["Account Takeover", "Card Not Present"],
    "ATM": ["Card Skimming", "Card Not Present"],
}
CHANNELS = list(CHANNEL_FRAUD_TYPES.keys())
CHANNEL_WEIGHTS = [0.32, 0.10, 0.12, 0.16, 0.20, 0.10]
DETECTION_METHODS = ["Rule Engine", "ML Model", "Manual Review", "Customer Reported"]

def gen_fraud(n=2600):
    rows = []
    for i in range(n):
        d = rand_date()
        channel = random.choices(CHANNELS, weights=CHANNEL_WEIGHTS, k=1)[0]
        bu = {"Card": "Payments & Cards", "Wire": "Payments & Cards", "ACH": "Commercial Banking",
              "Mobile": "Digital Banking", "Online": "Digital Banking", "ATM": "Retail Banking"}[channel]
        amount = money(20, 45000) if channel != "Wire" else money(500, 250000)
        is_fraud = random.random() < 0.42  # this table = flagged/reviewed transactions
        loss = 0.0
        recovered = 0.0
        fraud_type = ""
        if is_fraud:
            fraud_type = random.choice(CHANNEL_FRAUD_TYPES[channel])
            loss = money(amount * 0.3, amount)
            recovered = money(0, loss * random.uniform(0, 0.6))
        rows.append({
            "transaction_id": f"TXN-{500000+i}",
            "date": d.strftime("%Y-%m-%d %H:%M:%S"),
            "channel": channel,
            "business_unit": bu,
            "amount_usd": round(amount, 2),
            "is_fraud": "Y" if is_fraud else "N",
            "fraud_type": fraud_type,
            "detection_method": random.choice(DETECTION_METHODS) if is_fraud else "",
            "loss_amount_usd": round(loss, 2),
            "recovered_amount_usd": round(recovered, 2),
            "status": random.choice(["Confirmed Fraud", "Charged Off", "Recovered", "Under Review"]) if is_fraud else "Cleared - False Positive",
        })
    rows.sort(key=lambda r: r["date"])
    return rows


# ---------------------------------------------------------------------------
# 3. vulnerability_scans.csv (CIO)
# ---------------------------------------------------------------------------

def gen_vulns(n=850):
    rows = []
    for i in range(n):
        d = rand_date()
        sev = random.choices(["Critical", "High", "Medium", "Low"], weights=[0.06, 0.22, 0.4, 0.32], k=1)[0]
        cvss = {"Critical": random.uniform(9.0, 10.0), "High": random.uniform(7.0, 8.9),
                "Medium": random.uniform(4.0, 6.9), "Low": random.uniform(0.1, 3.9)}[sev]
        bu = pick_bu()
        system = pick_system(bu)
        age_days = max((END_DATE - d).days, 0)
        if sev in ("Critical", "High"):
            patch_status = random.choices(["Patched", "In Progress", "Open", "Risk Accepted"], weights=[0.55, 0.2, 0.2, 0.05])[0]
        else:
            patch_status = random.choices(["Patched", "In Progress", "Open", "Risk Accepted"], weights=[0.45, 0.15, 0.3, 0.1])[0]
        days_open = min(age_days, random.randint(1, 400)) if patch_status != "Patched" else random.randint(1, min(age_days, 60) or 1)
        rows.append({
            "scan_id": f"VULN-{20000+i}",
            "date": d.strftime("%Y-%m-%d"),
            "asset": f"{system}-{random.randint(1,40):02d}",
            "business_unit": bu,
            "system": system,
            "cve_id": f"CVE-{d.year}-{random.randint(10000,99999)}",
            "cvss_score": round(cvss, 1),
            "severity": sev,
            "patch_status": patch_status,
            "days_open": days_open,
            "asset_owner": random.choice(["Infrastructure Team", "App Security Team", "Cloud Platform Team", "Network Team", "Endpoint Team"]),
            "exploit_available": "Y" if (sev in ("Critical", "High") and random.random() < 0.35) else "N",
        })
    rows.sort(key=lambda r: r["date"])
    return rows


# ---------------------------------------------------------------------------
# 4. soc_alerts.csv (CIO SOC operations)
# ---------------------------------------------------------------------------

def gen_soc_alerts(n=4200):
    rows = []
    for i in range(n):
        d = rand_date()
        sev = random.choices(["Critical", "High", "Medium", "Low"], weights=[0.03, 0.12, 0.35, 0.5], k=1)[0]
        bu = pick_bu()
        system = pick_system(bu)
        if sev == "Critical":
            disposition = random.choices(["True Positive", "False Positive", "Benign"], weights=[0.6, 0.25, 0.15])[0]
        elif sev == "High":
            disposition = random.choices(["True Positive", "False Positive", "Benign"], weights=[0.35, 0.35, 0.3])[0]
        else:
            disposition = random.choices(["True Positive", "False Positive", "Benign"], weights=[0.1, 0.4, 0.5])[0]
        triage = {"Critical": (2, 30), "High": (5, 60), "Medium": (10, 180), "Low": (15, 360)}[sev]
        rows.append({
            "alert_id": f"ALT-{900000+i}",
            "timestamp": d.strftime("%Y-%m-%d %H:%M:%S"),
            "severity": sev,
            "source_system": system,
            "business_unit": bu,
            "mitre_tactic": random.choice(MITRE_TACTICS),
            "analyst": random.choice(["A. Ramirez", "T. Chen", "S. Okafor", "M. Patel", "J. Kowalski", "L. Novak", "Unassigned"]),
            "disposition": disposition,
            "triage_time_minutes": random.randint(*triage),
            "status": "Closed" if (END_DATE - d).days > 3 else random.choice(["Closed", "In Progress", "New"]),
        })
    rows.sort(key=lambda r: r["timestamp"])
    return rows


# ---------------------------------------------------------------------------
# 5. uptime_availability.csv (COO) - weekly per system
# ---------------------------------------------------------------------------

SLA_TARGET = {
    "Core Banking System": 99.95, "Payment Gateway": 99.95, "Wire Transfer System": 99.9,
    "Online Banking Portal": 99.9, "Mobile Banking App": 99.9, "ATM Network": 99.9,
    "Customer API Gateway": 99.9,
}
OUTAGE_CAUSES = ["Hardware Failure", "DDoS Attack", "Software Bug / Deployment Issue",
                 "Third-Party Outage", "Security Incident - Containment", "Maintenance Overrun", "Network Failure"]
CUSTOMER_FACING = {"Core Banking System", "Online Banking Portal", "Mobile Banking App", "ATM Network",
                    "Payment Gateway", "Customer API Gateway", "Wire Transfer System"}

def gen_uptime():
    rows = []
    week = START_DATE
    all_systems = [(bu, s) for bu, systems in BU_SYSTEMS.items() for s in systems]
    while week <= END_DATE:
        for bu, system in all_systems:
            sla = SLA_TARGET.get(system, 99.5)
            dip = random.random() < 0.08
            if dip:
                uptime = round(random.uniform(96.5, 99.4), 3)
                cause = random.choice(OUTAGE_CAUSES)
            else:
                uptime = round(random.uniform(99.6, 100.0), 3)
                cause = ""
            downtime_min = round((1 - uptime / 100) * 7 * 24 * 60, 1)
            rows.append({
                "week_start": week.strftime("%Y-%m-%d"),
                "business_unit": bu,
                "system": system,
                "uptime_pct": uptime,
                "downtime_minutes": downtime_min,
                "sla_target_pct": sla,
                "outage_cause": cause,
                "customer_impact": "Y" if (dip and system in CUSTOMER_FACING) else "N",
            })
        week += timedelta(days=7)
    return rows


# ---------------------------------------------------------------------------
# 6. compliance_findings.csv (CEO / regulatory)
# ---------------------------------------------------------------------------

CONTROL_AREAS = ["Access Control", "Encryption", "Vendor Management", "Incident Response",
                  "Logging & Monitoring", "Data Retention", "Change Management", "Business Continuity"]

def gen_compliance(n=130):
    rows = []
    for i in range(n):
        d = rand_date()
        sev = random.choices(["Critical", "High", "Medium", "Low"], weights=[0.05, 0.25, 0.45, 0.25])[0]
        age_days = max((END_DATE - d).days, 0)
        if age_days < 30:
            status = random.choice(["Open", "In Remediation"])
        elif age_days < 90:
            status = random.choice(["Open", "In Remediation", "Remediated"])
        else:
            status = random.choices(["Remediated", "Overdue", "Open"], weights=[0.7, 0.15, 0.15])[0]
        rows.append({
            "finding_id": f"CF-{3000+i}",
            "date": d.strftime("%Y-%m-%d"),
            "framework": random.choice(FRAMEWORKS),
            "business_unit": pick_bu(),
            "control_area": random.choice(CONTROL_AREAS),
            "severity": sev,
            "status": status,
            "regulator": random.choice(REGULATORS),
            "finding_description": f"{random.choice(CONTROL_AREAS)} gap identified during {random.choice(['scheduled exam','targeted review','self-assessment','external audit'])}",
        })
    rows.sort(key=lambda r: r["date"])
    return rows


# ---------------------------------------------------------------------------
# 7. vendor_risk.csv (COO / CEO third-party risk)
# ---------------------------------------------------------------------------

VENDOR_NAMES = [
    "Core Processing Solutions Inc.", "CloudCompute Partners", "PaySecure Gateway Corp",
    "IdentityVerify Systems", "DataVault Storage Co.", "TransactCore Systems",
    "NetShield Managed Security", "DocuFlow Technologies", "CardNet Processing",
    "WireLink Global", "CreditBureau Data Services", "MarketFeed Analytics",
    "HR Outsourcing Partners", "PrintMail Statement Services", "CollectionsPro Servicing",
    "FraudGuard Analytics", "CloudBackup Solutions", "CallCenter Direct",
    "KYC Verification Services", "ATM Fleet Services",
]

def gen_vendors():
    rows = []
    for i, name in enumerate(VENDOR_NAMES):
        criticality = random.choices(["Critical", "High", "Medium", "Low"], weights=[0.2, 0.3, 0.3, 0.2])[0]
        risk_score = {
            "Critical": random.randint(55, 95), "High": random.randint(40, 80),
            "Medium": random.randint(20, 60), "Low": random.randint(5, 35),
        }[criticality]
        rows.append({
            "vendor_id": f"VEN-{100+i}",
            "vendor_name": name,
            "business_unit": pick_bu(),
            "criticality": criticality,
            "risk_score": risk_score,
            "last_assessment_date": rand_date(START_DATE, END_DATE).strftime("%Y-%m-%d"),
            "open_findings": random.randint(0, 12),
            "sla_breach_count": random.randint(0, 6),
            "incident_count": random.randint(0, 4),
        })
    return rows


# ---------------------------------------------------------------------------
# 8. security_spend.csv (CFO)
# ---------------------------------------------------------------------------

SPEND_CATEGORIES = ["Prevention", "Detection & Monitoring", "Incident Response", "Compliance & Audit", "Cyber Insurance"]

def quarters():
    qs = []
    y, q = 2024, 3
    while (y, q) <= (2026, 2):
        qs.append(f"{y}Q{q}")
        q += 1
        if q > 4:
            q = 1
            y += 1
    return qs

def gen_spend():
    rows = []
    for qtr in quarters():
        for bu in BU_LIST:
            for cat in SPEND_CATEGORIES:
                budget = money(50_000, 900_000)
                actual = money(budget * 0.85, budget * 1.1)
                loss_avoided = money(actual * 1.5, actual * 6) if cat in ("Prevention", "Detection & Monitoring") else money(0, actual * 0.5)
                rows.append({
                    "quarter": qtr,
                    "business_unit": bu,
                    "category": cat,
                    "budget_usd": round(budget, 2),
                    "actual_spend_usd": round(actual, 2),
                    "estimated_loss_avoided_usd": round(loss_avoided, 2),
                })
    return rows


# ---------------------------------------------------------------------------
# Write CSVs
# ---------------------------------------------------------------------------

def write_csv(filename, rows):
    if not rows:
        return
    path = f"{OUT_DIR}/{filename}"
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {path} ({len(rows)} rows)")


if __name__ == "__main__":
    write_csv("security_incidents.csv", gen_incidents())
    write_csv("fraud_transactions.csv", gen_fraud())
    write_csv("vulnerability_scans.csv", gen_vulns())
    write_csv("soc_alerts.csv", gen_soc_alerts())
    write_csv("uptime_availability.csv", gen_uptime())
    write_csv("compliance_findings.csv", gen_compliance())
    write_csv("vendor_risk.csv", gen_vendors())
    write_csv("security_spend.csv", gen_spend())
