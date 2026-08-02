#!/usr/bin/env python3
"""
Precomputes aggregated data (mirroring the SPL in build_studio_dashboards.py)
for the standalone mobile HTML preview. Reads the 9 CSVs in ../data and
writes a single JSON blob that the preview page embeds inline — no server,
no Splunk required, just the same numbers the real dashboards would show.
"""
import csv
import json
from collections import defaultdict
from datetime import datetime, timedelta

DATA_DIR = "../data"
OUT_FILE = "../dashboards/preview_data.json"

SEV_WEIGHT = {"Critical": 40, "High": 15, "Medium": 4, "Low": 1}
STATUS_ORDER = ["Critical", "High", "Medium", "Low"]


def read_csv(name):
    with open(f"{DATA_DIR}/{name}") as f:
        return list(csv.DictReader(f))


def parse_dt(s, fmt="%Y-%m-%d %H:%M:%S"):
    return datetime.strptime(s, fmt)


def quarter_of(dt):
    return f"{dt.year}Q{(dt.month - 1) // 3 + 1}"


def round2(x, n=2):
    return round(x, n)


def topn(rows, key, n, reverse=True):
    return sorted(rows, key=key, reverse=reverse)[:n]


incidents = read_csv("security_incidents.csv")
fraud = read_csv("fraud_transactions.csv")
vulns = read_csv("vulnerability_scans.csv")
alerts = read_csv("soc_alerts.csv")
uptime = read_csv("uptime_availability.csv")
compliance = read_csv("compliance_findings.csv")
vendors = read_csv("vendor_risk.csv")
spend = read_csv("security_spend.csv")
financials = read_csv("company_financials.csv")

for r in incidents:
    r["_dt"] = parse_dt(r["date"])
    r["_month"] = r["_dt"].strftime("%Y-%m")
    r["financial_impact_usd"] = float(r["financial_impact_usd"])
    r["records_exposed"] = int(r["records_exposed"])
    r["customers_affected"] = int(r["customers_affected"])
    r["mttd_hours"] = float(r["mttd_hours"])
    r["mttr_hours"] = float(r["mttr_hours"])

for r in fraud:
    r["_dt"] = parse_dt(r["date"])
    r["_month"] = r["_dt"].strftime("%Y-%m")
    r["amount_usd"] = float(r["amount_usd"])
    r["loss_amount_usd"] = float(r["loss_amount_usd"])
    r["recovered_amount_usd"] = float(r["recovered_amount_usd"])
    r["_net_loss"] = r["loss_amount_usd"] - r["recovered_amount_usd"] if r["is_fraud"] == "Y" else 0.0

for r in vulns:
    r["cvss_score"] = float(r["cvss_score"])
    r["days_open"] = int(r["days_open"])

for r in alerts:
    r["_dt"] = parse_dt(r["timestamp"])
    r["_month"] = r["_dt"].strftime("%Y-%m")
    r["triage_time_minutes"] = int(r["triage_time_minutes"])

for r in uptime:
    r["uptime_pct"] = float(r["uptime_pct"])
    r["downtime_minutes"] = float(r["downtime_minutes"])
    r["sla_target_pct"] = float(r["sla_target_pct"])

for r in financials:
    for k in ("revenue_usd", "net_income_usd", "it_budget_usd", "cyber_insurance_premium_usd", "market_cap_usd"):
        r[k] = float(r[k])

MAX_DATE = max(r["_dt"] for r in incidents)
CUTOFF_12MO = MAX_DATE - timedelta(days=365)
TRAILING_QUARTERS = sorted({r["quarter"] for r in financials})[-4:]

trailing_fin = [r for r in financials if r["quarter"] in TRAILING_QUARTERS]
TRAILING_REVENUE = sum(r["revenue_usd"] for r in trailing_fin)
TRAILING_IT_BUDGET = sum(r["it_budget_usd"] for r in trailing_fin)

out = {}

# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------
inc_12mo = [r for r in incidents if r["_dt"] >= CUTOFF_12MO]
fraud_12mo = [r for r in fraud if r["_dt"] >= CUTOFF_12MO and r["is_fraud"] == "Y"]
impact_12mo = sum(r["financial_impact_usd"] for r in inc_12mo)
fraud_loss_12mo = sum(r["_net_loss"] for r in fraud_12mo)
total_cyber_cost = impact_12mo + fraud_loss_12mo

out["overview"] = {
    "financial_impact_12mo": round2(impact_12mo, 0),
    "net_fraud_loss_12mo": round2(fraud_loss_12mo, 0),
    "avg_uptime": round2(sum(r["uptime_pct"] for r in uptime) / len(uptime), 3),
    "open_critical_high_vulns": sum(1 for r in vulns if r["severity"] in ("Critical", "High") and r["patch_status"] != "Patched"),
    "total_cyber_cost": round2(total_cyber_cost, 0),
    "total_cyber_cost_pct_revenue": round2((total_cyber_cost / TRAILING_REVENUE) * 100, 2),
}

# ---------------------------------------------------------------------------
# CEO
# ---------------------------------------------------------------------------
sev_weight_sum = sum(SEV_WEIGHT[r["severity"]] for r in inc_12mo)
risk_score = round2(min(100, sev_weight_sum / 25), 1)
material = sum(1 for r in inc_12mo if r["severity"] in ("Critical", "High"))
customers = sum(r["customers_affected"] for r in inc_12mo)
overdue = sum(1 for r in compliance if r["status"] == "Overdue")

trend_impact = defaultdict(lambda: {"impact": 0.0, "incidents": 0})
for r in incidents:
    t = trend_impact[r["_month"]]
    t["impact"] += r["financial_impact_usd"]
    if r["severity"] in ("Critical", "High"):
        t["incidents"] += 1
ceo_trend = [{"period": m, "impact": round2(v["impact"], 0), "incidents": v["incidents"]} for m, v in sorted(trend_impact.items())]

fin_trend = []
for r in sorted(financials, key=lambda r: r["quarter"]):
    q_impact = sum(x["financial_impact_usd"] for x in incidents if quarter_of(x["_dt"]) == r["quarter"])
    pct = round2((q_impact / r["revenue_usd"]) * 100, 3)
    fin_trend.append({"quarter": r["quarter"], "revenue": r["revenue_usd"], "cyber_cost": round2(q_impact, 0), "pct": pct})

compliance_open = [c for c in compliance if c["status"] != "Remediated"]
by_framework = defaultdict(int)
for c in compliance_open:
    by_framework[c["framework"]] += 1
compliance_chart = sorted([{"framework": k, "open_findings": v} for k, v in by_framework.items()], key=lambda r: -r["open_findings"])

bu_risk = defaultdict(lambda: {"risk_weight": 0, "financial_impact": 0.0, "incidents": 0})
for r in inc_12mo:
    b = bu_risk[r["business_unit"]]
    b["risk_weight"] += SEV_WEIGHT[r["severity"]]
    b["financial_impact"] += r["financial_impact_usd"]
    b["incidents"] += 1
ceo_bu = sorted([{"business_unit": k, **v, "financial_impact": round2(v["financial_impact"], 0)} for k, v in bu_risk.items()],
                key=lambda r: -r["risk_weight"])

ceo_sys = {}
ceo_raw = {}
for bu in bu_risk:
    sys_risk = defaultdict(lambda: {"risk_weight": 0, "financial_impact": 0.0, "incidents": 0})
    for r in inc_12mo:
        if r["business_unit"] != bu:
            continue
        s = sys_risk[r["system"]]
        s["risk_weight"] += SEV_WEIGHT[r["severity"]]
        s["financial_impact"] += r["financial_impact_usd"]
        s["incidents"] += 1
    ceo_sys[bu] = sorted([{"system": k, **v, "financial_impact": round2(v["financial_impact"], 0)} for k, v in sys_risk.items()],
                         key=lambda r: -r["risk_weight"])
    bu_rows = [r for r in inc_12mo if r["business_unit"] == bu]
    ceo_raw[f"{bu}|"] = [
        {"incident_id": r["incident_id"], "date": r["date"][:10], "severity": r["severity"], "category": r["category"],
         "system": r["system"], "mitre_tactic": r["mitre_tactic"], "financial_impact_usd": round2(r["financial_impact_usd"], 0),
         "records_exposed": r["records_exposed"], "status": r["status"], "root_cause": r["root_cause"]}
        for r in topn(bu_rows, lambda r: r["_dt"], 15)
    ]
    for sys_name in {r["system"] for r in bu_rows}:
        sys_rows = [r for r in bu_rows if r["system"] == sys_name]
        ceo_raw[f"{bu}|{sys_name}"] = [
            {"incident_id": r["incident_id"], "date": r["date"][:10], "severity": r["severity"], "category": r["category"],
             "system": r["system"], "mitre_tactic": r["mitre_tactic"], "financial_impact_usd": round2(r["financial_impact_usd"], 0),
             "records_exposed": r["records_exposed"], "status": r["status"], "root_cause": r["root_cause"]}
            for r in topn(sys_rows, lambda r: r["_dt"], 15)
        ]

out["ceo"] = {
    "kpis": {
        "risk_score": risk_score, "material_incidents": material, "customers_impacted": customers,
        "financial_impact": round2(impact_12mo, 0), "cyber_cost_pct_revenue": round2((impact_12mo / TRAILING_REVENUE) * 100, 3),
        "overdue_findings": overdue,
    },
    "trend": ceo_trend,
    "financial_trend": fin_trend,
    "compliance_chart": compliance_chart,
    "bu_breakdown": ceo_bu,
    "sys_breakdown": ceo_sys,
    "raw": ceo_raw,
}

# ---------------------------------------------------------------------------
# CFO
# ---------------------------------------------------------------------------
fraud_all_flagged = fraud
fraud_positive_12mo = fraud_12mo
net_loss = fraud_loss_12mo
volume_12mo = sum(r["amount_usd"] for r in fraud if r["_dt"] >= CUTOFF_12MO)
loss_bps = round2((net_loss / volume_12mo) * 10000, 1)
fraud_pct_rev = round2((net_loss / TRAILING_REVENUE) * 100, 3)
reg_open = sum(1 for c in compliance if c["status"] != "Remediated")
spend_trailing = [r for r in spend if r["quarter"] in TRAILING_QUARTERS]
spend_period = sum(float(r["actual_spend_usd"]) for r in spend_trailing)
avoided_period = sum(float(r["estimated_loss_avoided_usd"]) for r in spend_trailing)
roi_x = round2(avoided_period / spend_period, 1)

loss_trend = defaultdict(lambda: {"gross_loss": 0.0, "recovered": 0.0})
for r in fraud:
    if r["is_fraud"] != "Y":
        continue
    t = loss_trend[r["_month"]]
    t["gross_loss"] += r["loss_amount_usd"]
    t["recovered"] += r["recovered_amount_usd"]
cfo_loss_trend = [{"period": m, "gross_loss": round2(v["gross_loss"], 0), "recovered": round2(v["recovered"], 0),
                    "net_loss": round2(v["gross_loss"] - v["recovered"], 0)} for m, v in sorted(loss_trend.items())]

fin_baseline = [{"quarter": r["quarter"], "revenue": round2(r["revenue_usd"], 0), "net_income": round2(r["net_income_usd"], 0),
                  "it_budget": round2(r["it_budget_usd"], 0)} for r in sorted(financials, key=lambda r: r["quarter"])]

spend_by_cat = defaultdict(lambda: {"actual_spend": 0.0, "loss_avoided": 0.0})
for r in spend_trailing:
    c = spend_by_cat[r["category"]]
    c["actual_spend"] += float(r["actual_spend_usd"])
    c["loss_avoided"] += float(r["estimated_loss_avoided_usd"])
spend_chart = sorted([{"category": k, "actual_spend": round2(v["actual_spend"], 0), "loss_avoided": round2(v["loss_avoided"], 0)}
                      for k, v in spend_by_cat.items()], key=lambda r: -r["loss_avoided"])

channel_loss = defaultdict(lambda: {"net_loss": 0.0, "fraud_cases": 0})
for r in fraud_positive_12mo:
    c = channel_loss[r["channel"]]
    c["net_loss"] += r["_net_loss"]
    c["fraud_cases"] += 1
cfo_channel = sorted([{"channel": k, "net_loss": round2(v["net_loss"], 0), "fraud_cases": v["fraud_cases"]} for k, v in channel_loss.items()],
                     key=lambda r: -r["net_loss"])

cfo_fraud_type = {}
cfo_raw = {}
for ch in channel_loss:
    ft = defaultdict(lambda: {"net_loss": 0.0, "fraud_cases": 0})
    ch_rows = [r for r in fraud_positive_12mo if r["channel"] == ch]
    for r in ch_rows:
        f = ft[r["fraud_type"]]
        f["net_loss"] += r["_net_loss"]
        f["fraud_cases"] += 1
    cfo_fraud_type[ch] = sorted([{"fraud_type": k, "net_loss": round2(v["net_loss"], 0), "fraud_cases": v["fraud_cases"]}
                                 for k, v in ft.items()], key=lambda r: -r["net_loss"])
    cfo_raw[f"{ch}|"] = [
        {"transaction_id": r["transaction_id"], "date": r["date"][:10], "business_unit": r["business_unit"], "channel": r["channel"],
         "fraud_type": r["fraud_type"], "detection_method": r["detection_method"], "amount_usd": round2(r["amount_usd"], 0),
         "loss_amount_usd": round2(r["loss_amount_usd"], 0), "recovered_amount_usd": round2(r["recovered_amount_usd"], 0), "status": r["status"]}
        for r in topn(ch_rows, lambda r: r["_dt"], 15)
    ]
    for ftype in {r["fraud_type"] for r in ch_rows}:
        ftype_rows = [r for r in ch_rows if r["fraud_type"] == ftype]
        cfo_raw[f"{ch}|{ftype}"] = [
            {"transaction_id": r["transaction_id"], "date": r["date"][:10], "business_unit": r["business_unit"], "channel": r["channel"],
             "fraud_type": r["fraud_type"], "detection_method": r["detection_method"], "amount_usd": round2(r["amount_usd"], 0),
             "loss_amount_usd": round2(r["loss_amount_usd"], 0), "recovered_amount_usd": round2(r["recovered_amount_usd"], 0), "status": r["status"]}
            for r in topn(ftype_rows, lambda r: r["_dt"], 15)
        ]

out["cfo"] = {
    "kpis": {
        "net_fraud_loss": round2(net_loss, 0), "loss_bps": loss_bps, "fraud_pct_revenue": fraud_pct_rev,
        "open_findings": reg_open, "security_spend": round2(spend_period, 0), "roi_x": roi_x,
    },
    "loss_trend": cfo_loss_trend,
    "financial_baseline": fin_baseline,
    "spend_chart": spend_chart,
    "channel_breakdown": cfo_channel,
    "fraud_type_breakdown": cfo_fraud_type,
    "raw": cfo_raw,
}

# ---------------------------------------------------------------------------
# COO
# ---------------------------------------------------------------------------
avg_uptime = round2(sum(r["uptime_pct"] for r in uptime) / len(uptime), 3)
cust_outages = sum(1 for r in uptime if r["customer_impact"] == "Y")
mttd = round2(sum(r["mttd_hours"] for r in inc_12mo) / len(inc_12mo), 1)
mttr = round2(sum(r["mttr_hours"] for r in inc_12mo) / len(inc_12mo), 1)
backlog = sum(1 for r in inc_12mo if r["status"] != "Resolved")
downtime_cust_impact = sum(r["downtime_minutes"] for r in uptime if r["customer_impact"] == "Y")
revenue_at_risk = round2(downtime_cust_impact * 1850, 0)

uptime_trend = defaultdict(lambda: {"uptime": [], "sla": []})
for r in uptime:
    t = uptime_trend[r["week_start"]]
    t["uptime"].append(r["uptime_pct"])
    t["sla"].append(r["sla_target_pct"])
coo_uptime_trend = [{"period": w, "avg_uptime": round2(sum(v["uptime"]) / len(v["uptime"]), 3),
                      "sla_target": round2(sum(v["sla"]) / len(v["sla"]), 2)} for w, v in sorted(uptime_trend.items())]

backlog_trend = defaultdict(lambda: {s: 0 for s in STATUS_ORDER})
for r in incidents:
    backlog_trend[r["_month"]][r["severity"]] += 1
coo_backlog_trend = [{"period": m, **v} for m, v in sorted(backlog_trend.items())]

downtime_bu = defaultdict(lambda: {"downtime_minutes": 0.0, "customer_impacting_events": 0})
for r in uptime:
    b = downtime_bu[r["business_unit"]]
    b["downtime_minutes"] += r["downtime_minutes"]
    if r["customer_impact"] == "Y":
        b["customer_impacting_events"] += 1
coo_bu = sorted([{"business_unit": k, "downtime_minutes": round2(v["downtime_minutes"], 0),
                  "customer_impacting_events": v["customer_impacting_events"]} for k, v in downtime_bu.items()],
                key=lambda r: -r["downtime_minutes"])

coo_sys = {}
coo_raw_outages = {}
coo_raw_incidents = {}
for bu in downtime_bu:
    sys_downtime = defaultdict(lambda: {"downtime_minutes": 0.0, "avg_uptime_sum": 0.0, "n": 0})
    bu_uptime_rows = [r for r in uptime if r["business_unit"] == bu]
    for r in bu_uptime_rows:
        s = sys_downtime[r["system"]]
        s["downtime_minutes"] += r["downtime_minutes"]
        s["avg_uptime_sum"] += r["uptime_pct"]
        s["n"] += 1
    coo_sys[bu] = sorted([{"system": k, "downtime_minutes": round2(v["downtime_minutes"], 0),
                           "avg_uptime": round2(v["avg_uptime_sum"] / v["n"], 3)} for k, v in sys_downtime.items()],
                         key=lambda r: -r["downtime_minutes"])
    outage_rows = [r for r in bu_uptime_rows if r["outage_cause"]]
    coo_raw_outages[f"{bu}|"] = [
        {"week_start": r["week_start"], "system": r["system"], "uptime_pct": r["uptime_pct"], "sla_target_pct": r["sla_target_pct"],
         "downtime_minutes": r["downtime_minutes"], "outage_cause": r["outage_cause"], "customer_impact": r["customer_impact"]}
        for r in topn(outage_rows, lambda r: r["week_start"], 15)
    ]
    bu_inc_rows = [r for r in inc_12mo if r["business_unit"] == bu]
    coo_raw_incidents[f"{bu}|"] = [
        {"incident_id": r["incident_id"], "date": r["date"][:10], "severity": r["severity"], "category": r["category"],
         "mttd_hours": r["mttd_hours"], "mttr_hours": r["mttr_hours"], "status": r["status"], "root_cause": r["root_cause"]}
        for r in topn(bu_inc_rows, lambda r: r["_dt"], 15)
    ]
    for sys_name in {r["system"] for r in bu_uptime_rows}:
        outage_sys_rows = [r for r in outage_rows if r["system"] == sys_name]
        coo_raw_outages[f"{bu}|{sys_name}"] = [
            {"week_start": r["week_start"], "system": r["system"], "uptime_pct": r["uptime_pct"], "sla_target_pct": r["sla_target_pct"],
             "downtime_minutes": r["downtime_minutes"], "outage_cause": r["outage_cause"], "customer_impact": r["customer_impact"]}
            for r in topn(outage_sys_rows, lambda r: r["week_start"], 15)
        ]
        inc_sys_rows = [r for r in bu_inc_rows if r["system"] == sys_name]
        coo_raw_incidents[f"{bu}|{sys_name}"] = [
            {"incident_id": r["incident_id"], "date": r["date"][:10], "severity": r["severity"], "category": r["category"],
             "mttd_hours": r["mttd_hours"], "mttr_hours": r["mttr_hours"], "status": r["status"], "root_cause": r["root_cause"]}
            for r in topn(inc_sys_rows, lambda r: r["_dt"], 15)
        ]

coo_vendor = sorted([{"vendor_name": v["vendor_name"], "business_unit": v["business_unit"], "criticality": v["criticality"],
                      "sla_breach_count": int(v["sla_breach_count"]), "incident_count": int(v["incident_count"]),
                      "risk_score": int(v["risk_score"])} for v in vendors], key=lambda r: -r["sla_breach_count"])[:8]

out["coo"] = {
    "kpis": {
        "avg_uptime": avg_uptime, "customer_impacting_outages": cust_outages, "mttd": mttd, "mttr": mttr,
        "backlog": backlog, "revenue_at_risk": revenue_at_risk,
    },
    "uptime_trend": coo_uptime_trend,
    "backlog_trend": coo_backlog_trend,
    "bu_breakdown": coo_bu,
    "sys_breakdown": coo_sys,
    "vendor_ops": coo_vendor,
    "raw_outages": coo_raw_outages,
    "raw_incidents": coo_raw_incidents,
}

# ---------------------------------------------------------------------------
# CIO
# ---------------------------------------------------------------------------
open_vulns = sum(1 for r in vulns if r["severity"] in ("Critical", "High") and r["patch_status"] != "Patched")
crit_high_vulns = [r for r in vulns if r["severity"] in ("Critical", "High")]
patched = sum(1 for r in crit_high_vulns if r["patch_status"] == "Patched")
patch_rate = round2((patched / len(crit_high_vulns)) * 100, 1)
alerts_12mo = [r for r in alerts if r["_dt"] >= CUTOFF_12MO]
tp = sum(1 for r in alerts_12mo if r["disposition"] == "True Positive")
tp_rate = round2((tp / len(alerts_12mo)) * 100, 1)
avg_triage = round2(sum(r["triage_time_minutes"] for r in alerts_12mo) / len(alerts_12mo), 1)
spend_pct_it_budget = round2((spend_period / TRAILING_IT_BUDGET) * 100, 1)

alert_trend = defaultdict(lambda: {s: 0 for s in STATUS_ORDER})
for r in alerts:
    alert_trend[r["_month"]][r["severity"]] += 1
cio_alert_trend = [{"period": m, **v} for m, v in sorted(alert_trend.items())]

mitre_tp = defaultdict(int)
for r in alerts_12mo:
    if r["disposition"] == "True Positive":
        mitre_tp[r["mitre_tactic"]] += 1
cio_mitre = sorted([{"mitre_tactic": k, "count": v} for k, v in mitre_tp.items()], key=lambda r: -r["count"])

vulns_bu = defaultdict(lambda: {"open_vulns": 0, "critical_high": 0})
for r in vulns:
    if r["patch_status"] == "Patched":
        continue
    b = vulns_bu[r["business_unit"]]
    b["open_vulns"] += 1
    if r["severity"] in ("Critical", "High"):
        b["critical_high"] += 1
cio_bu = sorted([{"business_unit": k, **v} for k, v in vulns_bu.items()], key=lambda r: -r["open_vulns"])

cio_sys = {}
cio_raw_vulns = {}
cio_raw_alerts = {}
for bu in vulns_bu:
    open_bu_vulns = [r for r in vulns if r["business_unit"] == bu and r["patch_status"] != "Patched"]
    sys_vulns = defaultdict(lambda: {"open_vulns": 0, "cvss_sum": 0.0, "n": 0})
    for r in open_bu_vulns:
        s = sys_vulns[r["system"]]
        s["open_vulns"] += 1
        s["cvss_sum"] += r["cvss_score"]
        s["n"] += 1
    cio_sys[bu] = sorted([{"system": k, "open_vulns": v["open_vulns"], "avg_cvss": round2(v["cvss_sum"] / v["n"], 1)}
                          for k, v in sys_vulns.items()], key=lambda r: -r["open_vulns"])
    cio_raw_vulns[f"{bu}|"] = [
        {"scan_id": r["scan_id"], "date": r["date"], "asset": r["asset"], "system": r["system"], "cve_id": r["cve_id"],
         "cvss_score": r["cvss_score"], "severity": r["severity"], "patch_status": r["patch_status"], "days_open": r["days_open"],
         "exploit_available": r["exploit_available"], "asset_owner": r["asset_owner"]}
        for r in topn(open_bu_vulns, lambda r: r["cvss_score"], 15)
    ]
    bu_alert_rows = [r for r in alerts_12mo if r["business_unit"] == bu]
    cio_raw_alerts[f"{bu}|"] = [
        {"alert_id": r["alert_id"], "timestamp": r["timestamp"], "severity": r["severity"], "source_system": r["source_system"],
         "mitre_tactic": r["mitre_tactic"], "analyst": r["analyst"], "disposition": r["disposition"],
         "triage_time_minutes": r["triage_time_minutes"], "status": r["status"]}
        for r in topn(bu_alert_rows, lambda r: r["_dt"], 15)
    ]
    for sys_name in {r["system"] for r in open_bu_vulns} | {r["source_system"] for r in bu_alert_rows}:
        sv = [r for r in open_bu_vulns if r["system"] == sys_name]
        if sv:
            cio_raw_vulns[f"{bu}|{sys_name}"] = [
                {"scan_id": r["scan_id"], "date": r["date"], "asset": r["asset"], "system": r["system"], "cve_id": r["cve_id"],
                 "cvss_score": r["cvss_score"], "severity": r["severity"], "patch_status": r["patch_status"], "days_open": r["days_open"],
                 "exploit_available": r["exploit_available"], "asset_owner": r["asset_owner"]}
                for r in topn(sv, lambda r: r["cvss_score"], 15)
            ]
        sa = [r for r in bu_alert_rows if r["source_system"] == sys_name]
        if sa:
            cio_raw_alerts[f"{bu}|{sys_name}"] = [
                {"alert_id": r["alert_id"], "timestamp": r["timestamp"], "severity": r["severity"], "source_system": r["source_system"],
                 "mitre_tactic": r["mitre_tactic"], "analyst": r["analyst"], "disposition": r["disposition"],
                 "triage_time_minutes": r["triage_time_minutes"], "status": r["status"]}
                for r in topn(sa, lambda r: r["_dt"], 15)
            ]

out["cio"] = {
    "kpis": {
        "open_vulns": open_vulns, "patch_rate": patch_rate, "alerts_total": len(alerts_12mo), "tp_rate": tp_rate,
        "avg_triage": avg_triage, "spend_pct_it_budget": spend_pct_it_budget,
    },
    "alert_trend": cio_alert_trend,
    "mitre_chart": cio_mitre,
    "bu_breakdown": cio_bu,
    "sys_breakdown": cio_sys,
    "raw_vulns": cio_raw_vulns,
    "raw_alerts": cio_raw_alerts,
}

out["meta"] = {
    "max_date": MAX_DATE.strftime("%Y-%m-%d"),
    "trailing_quarters": TRAILING_QUARTERS,
    "trailing_revenue": round2(TRAILING_REVENUE, 0),
    "business_units": sorted({r["business_unit"] for r in incidents}),
}

with open(OUT_FILE, "w") as f:
    json.dump(out, f, separators=(",", ":"))

print(f"wrote {OUT_FILE}")
import os
print("size:", os.path.getsize(OUT_FILE), "bytes")
