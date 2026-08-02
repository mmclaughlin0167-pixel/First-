#!/usr/bin/env python3
"""
Builds the 5 Splunk Dashboard Studio JSON files (../dashboards/*.json) from
Python data structures, so the JSON is guaranteed well-formed and the
5-layer drill-down pattern (KPI -> Business Unit -> System -> raw event)
stays consistent across all four persona dashboards.

Usage: python3 build_studio_dashboards.py
"""
import json

OUT_DIR = "../dashboards"

BUSINESS_UNITS = [
    "Retail Banking", "Commercial Banking", "Wealth Management",
    "Payments & Cards", "Mortgage & Lending", "Digital Banking",
    "Corporate IT & Infrastructure",
]

GREEN, AMBER, RED = "#53a051", "#f8be34", "#dc4e41"

# ---------------------------------------------------------------------------
# Shared builder helpers
# ---------------------------------------------------------------------------

def input_time(default="-12mon@mon,now"):
    return {
        "type": "input.timerange",
        "title": "Time Range",
        "options": {"token": "tok_time", "defaultValue": default},
    }


def input_bu_dropdown():
    items = [{"label": "All Business Units", "value": "*"}]
    items += [{"label": b, "value": b} for b in BUSINESS_UNITS]
    return {
        "type": "input.dropdown",
        "title": "Business Unit",
        "options": {"token": "tok_bu", "defaultValue": "*", "items": items},
    }


def ds_search(query, name, use_time=True):
    d = {"type": "ds.search", "options": {"query": query}, "name": name}
    if use_time:
        d["options"]["queryParameters"] = {
            "earliest": "$tok_time.earliest$",
            "latest": "$tok_time.latest$",
        }
    return d


def viz_singlevalue(title, ds_id, unit=None, unit_position="after",
                     range_values=None, range_colors=None, precision="0"):
    options = {"numberPrecision": precision}
    if unit:
        options["unit"] = unit
        options["unitPosition"] = unit_position
    if range_values:
        options["useColors"] = True
        options["colorMode"] = "block"
        options["rangeValues"] = range_values
        options["rangeColors"] = range_colors or [GREEN, AMBER, RED]
    return {
        "type": "splunk.singlevalue",
        "title": title,
        "dataSources": {"primary": ds_id},
        "options": options,
    }


def drill_bu_token(field="business_unit", also_clear=("sel_sys",)):
    tokens = [{"token": "sel_bu", "key": f"row.{field}"}]
    for t in also_clear:
        tokens.append({"token": t, "value": ""})
    return [{"type": "drilldown.setToken", "options": {"tokens": tokens}}]


def drill_token(token_name, field):
    return [{"type": "drilldown.setToken", "options": {"tokens": [{"token": token_name, "key": f"row.{field}"}]}}]


def viz_chart(chart_type, title, ds_id, event_handlers=None, stacked=False):
    options = {}
    if stacked:
        options["stackMode"] = "stacked"
    v = {"type": f"splunk.{chart_type}", "title": title, "dataSources": {"primary": ds_id}, "options": options}
    if event_handlers:
        v["eventHandlers"] = event_handlers
    return v


def viz_table(title, ds_id, event_handlers=None):
    v = {"type": "splunk.table", "title": title, "dataSources": {"primary": ds_id}, "options": {}}
    if event_handlers:
        v["eventHandlers"] = event_handlers
    return v


def viz_markdown(markdown):
    return {"type": "splunk.markdown", "options": {"markdown": markdown}}


def pos(x, y, w, h):
    return {"x": x, "y": y, "w": w, "h": h}


def block(item_id, x, y, w, h, visibility=None):
    d = {"item": item_id, "type": "block", "position": pos(x, y, w, h)}
    if visibility:
        d["visibility"] = visibility
    return d


class DashboardBuilder:
    def __init__(self, title, description):
        self.title = title
        self.description = description
        self.visualizations = {}
        self.dataSources = {}
        self.inputs = {}
        self.structure = []
        self.y = 0

    def add_input(self, input_id, definition):
        self.inputs[input_id] = definition

    def add_ds(self, ds_id, definition):
        self.dataSources[ds_id] = definition

    def add_viz(self, viz_id, definition, x, y, w, h, visibility=None):
        self.visualizations[viz_id] = definition
        self.structure.append(block(viz_id, x, y, w, h, visibility))

    def row_of(self, items, y, h, total_w=1440, gap=12):
        """items: list of (viz_id_prefix_unused) -> just returns evenly spaced x positions"""
        n = len(items)
        w = (total_w - gap * (n - 1)) // n
        x = 0
        out = []
        for _ in items:
            out.append((x, w))
            x += w + gap
        return out

    def build(self):
        return {
            "title": self.title,
            "description": self.description,
            "visualizations": self.visualizations,
            "dataSources": self.dataSources,
            "inputs": self.inputs,
            "layout": {
                "type": "grid",
                "options": {"width": 1440, "height": self.y + 40},
                "structure": self.structure,
                "globalInputs": list(self.inputs.keys()),
            },
        }

    def write(self, filename):
        with open(f"{OUT_DIR}/{filename}", "w") as f:
            json.dump(self.build(), f, indent=2)
        print(f"wrote {OUT_DIR}/{filename}")


# ---------------------------------------------------------------------------
# CEO Dashboard
# ---------------------------------------------------------------------------

def build_ceo():
    d = DashboardBuilder(
        "CEO — Enterprise Cyber Risk & Resilience",
        "Board-level view linking cyber risk posture to enterprise strategy and financial "
        "performance: risk score, material incidents, customer trust, regulatory standing, "
        "and cyber cost as a share of revenue. Drill down: KPI -> Business Unit -> System -> Event.",
    )
    d.add_input("input_time", input_time())
    d.add_input("input_bu", input_bu_dropdown())

    bu_filter = 'where business_unit=$tok_bu$ OR "$tok_bu$"="*"'

    d.add_ds("ds_risk_score", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} "
        "| eval sev_weight=case(severity=\"Critical\",40, severity=\"High\",15, severity=\"Medium\",4, severity=\"Low\",1) "
        "| stats sum(sev_weight) as raw_score | eval risk_score=round(min(100, raw_score/25), 1) | table risk_score",
        "Enterprise Cyber Risk Score"))
    d.add_ds("ds_material", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} AND (severity=\"Critical\" OR severity=\"High\") "
        "| stats count as material_incidents", "Material Incidents"))
    d.add_ds("ds_customers", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} | stats sum(customers_affected) as customers_affected",
        "Customers Impacted"))
    d.add_ds("ds_impact", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} | stats sum(financial_impact_usd) as total_impact",
        "Financial Impact"))
    d.add_ds("ds_cost_pct_revenue", ds_search(
        "| inputlookup security_incidents.csv "
        "| eval quarter=strftime(strptime(date,\"%Y-%m-%d %H:%M:%S\"),\"%Y\")+\"Q\"+"
        "tostring(ceil(tonumber(strftime(strptime(date,\"%Y-%m-%d %H:%M:%S\"),\"%m\"))/3)) "
        f"| {bu_filter} | stats sum(financial_impact_usd) as impact "
        "| appendcols [ | inputlookup company_financials.csv | stats sum(revenue_usd) as revenue ] "
        "| eval pct_of_revenue=round((impact/revenue)*100,3) | table pct_of_revenue",
        "Cyber Incident Cost as % of Revenue", use_time=False))
    d.add_ds("ds_overdue", ds_search(
        f"| inputlookup compliance_findings.csv | {bu_filter} AND status=\"Overdue\" | stats count as overdue_findings",
        "Overdue Regulatory Findings"))

    row1 = [("ds_risk_score", "Enterprise Cyber Risk Score (0-100)", None, [35, 65], "0.0"),
            ("ds_material", "Material Incidents (Critical+High)", None, [5, 15], "0"),
            ("ds_customers", "Customers Impacted", None, None, "0"),
            ("ds_impact", "Total Financial Impact", "$", None, "0"),
            ("ds_cost_pct_revenue", "Cyber Cost as % of Revenue", "%", [1, 3], "0.00"),
            ("ds_overdue", "Overdue Regulatory Findings", None, [1, 5], "0")]
    xs = d.row_of(row1, 0, 150)
    for (ds_id, title, unit, rng, prec), (x, w) in zip(row1, xs):
        viz_id = f"viz_{ds_id}"
        d.add_viz(viz_id, viz_singlevalue(title, ds_id, unit=unit, unit_position="before" if unit == "$" else "after",
                                           range_values=rng, precision=prec), x, 0, w, 150)
    d.y = 160

    d.add_ds("ds_trend", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} "
        "| eval month=strftime(strptime(date,\"%Y-%m-%d %H:%M:%S\"),\"%Y-%m\") "
        "| stats sum(financial_impact_usd) as financial_impact "
        "count(eval(severity=\"Critical\" OR severity=\"High\")) as material_incidents by month | sort month",
        "Risk Trend"))
    d.add_ds("ds_revenue_trend", ds_search(
        "| inputlookup company_financials.csv "
        "| join type=left quarter [ | inputlookup security_incidents.csv "
        "| eval quarter=strftime(strptime(date,\"%Y-%m-%d %H:%M:%S\"),\"%Y\")+\"Q\"+"
        "tostring(ceil(tonumber(strftime(strptime(date,\"%Y-%m-%d %H:%M:%S\"),\"%m\"))/3)) "
        "| stats sum(financial_impact_usd) as cyber_cost by quarter ] "
        "| eval cyber_cost=coalesce(cyber_cost,0), pct_of_revenue=round((cyber_cost/revenue_usd)*100,3) "
        "| table quarter, revenue_usd, cyber_cost, pct_of_revenue | sort quarter",
        "Cyber Cost vs. Revenue by Quarter", use_time=False))
    d.add_ds("ds_regfindings", ds_search(
        f"| inputlookup compliance_findings.csv | {bu_filter} AND status!=\"Remediated\" | chart count by framework, severity",
        "Regulatory Findings by Framework"))

    d.add_viz("viz_trend", viz_chart("column", "Financial Impact & Material Incidents by Month", "ds_trend"), 0, d.y, 710, 280)
    d.add_viz("viz_revenue_trend", viz_chart("line", "Cyber Cost as % of Revenue by Quarter (financial-KPI linkage)", "ds_revenue_trend"), 722, d.y, 718, 280)
    d.y += 292

    d.add_viz("viz_regfindings", viz_chart("bar", "Regulatory Standing by Framework (Open Findings)", "ds_regfindings", stacked=True), 0, d.y, 1440, 280)
    d.y += 292

    d.add_ds("ds_bu_heatmap", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} "
        "| eval sev_weight=case(severity=\"Critical\",40, severity=\"High\",15, severity=\"Medium\",4, severity=\"Low\",1) "
        "| stats sum(sev_weight) as risk_weight sum(financial_impact_usd) as financial_impact count as incidents by business_unit "
        "| sort -risk_weight",
        "Risk Heatmap by Business Unit"))
    d.add_ds("ds_vendor_top", ds_search(
        f"| inputlookup vendor_risk.csv | {bu_filter} "
        "| sort -risk_score | table vendor_name, business_unit, criticality, risk_score, open_findings, incident_count | head 8",
        "Top Vendor Risk", use_time=False))

    d.add_viz("viz_bu_heatmap", viz_chart("bar", "Risk Heatmap by Business Unit (click a bar to drill in)", "ds_bu_heatmap",
                                           event_handlers=drill_bu_token()), 0, d.y, 710, 300)
    d.add_viz("viz_vendor_top", viz_table("Top Third-Party / Vendor Risk Exposure", "ds_vendor_top",
                                           event_handlers=drill_token("sel_bu", "business_unit")), 722, d.y, 718, 300)
    d.y += 312

    d.add_ds("ds_bu_systems", ds_search(
        "| inputlookup security_incidents.csv | where business_unit=\"$sel_bu$\" "
        "| eval sev_weight=case(severity=\"Critical\",40, severity=\"High\",15, severity=\"Medium\",4, severity=\"Low\",1) "
        "| stats sum(sev_weight) as risk_weight sum(financial_impact_usd) as financial_impact count as incidents by system "
        "| sort -risk_weight",
        "Systems in Selected Business Unit"))
    d.add_viz("viz_bu_systems", viz_chart("bar", "Systems in $sel_bu$ Ranked by Risk (click a bar to drill in)", "ds_bu_systems",
                                           event_handlers=drill_token("sel_sys", "system")),
               0, d.y, 1440, 300, visibility="$sel_bu$")
    d.y += 312

    d.add_ds("ds_raw_incidents", ds_search(
        "| inputlookup security_incidents.csv | where business_unit=\"$sel_bu$\" AND (system=\"$sel_sys$\" OR \"$sel_sys$\"=\"\") "
        "| sort -date | table incident_id, date, severity, category, system, mitre_tactic, financial_impact_usd, "
        "records_exposed, regulatory_notification_required, status, root_cause",
        "Raw Incident Records"))
    d.add_viz("viz_raw_incidents", viz_table("Underlying Security Events for $sel_bu$ $sel_sys$ (deepest drill)", "ds_raw_incidents"),
               0, d.y, 1440, 320, visibility="$sel_bu$")
    d.y += 332

    d.add_viz("viz_note", viz_markdown(
        "**Drill-down path:** Enterprise Risk Score / Cyber Cost % of Revenue (top row) -> Business Unit heatmap "
        "(click a bar) -> System within that unit (click a bar) -> individual incident record (bottom table). "
        "The same `incident_id` traces directly to the SOC alert and vulnerability that caused it on the CIO "
        "dashboard, and to the fraud loss it produced on the CFO dashboard."
    ), 0, d.y, 1440, 110)
    d.y += 110

    d.write("ceo_dashboard.json")


# ---------------------------------------------------------------------------
# CFO Dashboard
# ---------------------------------------------------------------------------

def build_cfo():
    d = DashboardBuilder(
        "CFO — Cyber Financial Exposure & Security ROI",
        "Links security posture directly to the P&L: fraud loss as a share of revenue, security "
        "spend vs. estimated loss avoided (ROI), regulatory fine exposure, and cyber insurance cost. "
        "Drill down: KPI -> Channel/Business Unit -> Flagged Transaction -> Raw Record.",
    )
    d.add_input("input_time", input_time())
    d.add_input("input_bu", input_bu_dropdown())
    bu_filter = 'where business_unit=$tok_bu$ OR "$tok_bu$"="*"'

    d.add_ds("ds_net_loss", ds_search(
        f"| inputlookup fraud_transactions.csv | {bu_filter} AND is_fraud=\"Y\" "
        "| eval net_loss=loss_amount_usd-recovered_amount_usd | stats sum(net_loss) as net_loss",
        "Net Fraud Loss"))
    d.add_ds("ds_loss_bps", ds_search(
        f"| inputlookup fraud_transactions.csv | {bu_filter} "
        "| eval net_loss=if(is_fraud=\"Y\", loss_amount_usd-recovered_amount_usd, 0) "
        "| stats sum(net_loss) as loss sum(amount_usd) as volume | eval bps=round((loss/volume)*10000,1) | table bps",
        "Fraud Loss Rate (bps)"))
    d.add_ds("ds_fraud_pct_revenue", ds_search(
        "| inputlookup fraud_transactions.csv | where is_fraud=\"Y\" "
        "| eval net_loss=loss_amount_usd-recovered_amount_usd | stats sum(net_loss) as loss "
        "| appendcols [ | inputlookup company_financials.csv | stats sum(revenue_usd) as revenue ] "
        "| eval pct_of_revenue=round((loss/revenue)*100,3) | table pct_of_revenue",
        "Fraud Loss as % of Revenue", use_time=False))
    d.add_ds("ds_open_findings", ds_search(
        "| inputlookup compliance_findings.csv | where status!=\"Remediated\" | stats count as open_findings",
        "Open Regulatory Findings"))
    d.add_ds("ds_spend", ds_search(
        f"| inputlookup security_spend.csv | {bu_filter} | stats sum(actual_spend_usd) as actual_spend",
        "Security Spend", use_time=False))
    d.add_ds("ds_roi", ds_search(
        f"| inputlookup security_spend.csv | {bu_filter} "
        "| stats sum(actual_spend_usd) as spend sum(estimated_loss_avoided_usd) as avoided "
        "| eval roi_x=round(avoided/spend,1) | table roi_x",
        "Security ROI", use_time=False))

    row1 = [("ds_net_loss", "Net Fraud Loss", "$", None, "0"),
            ("ds_loss_bps", "Fraud Loss Rate", "bps", None, "0.0"),
            ("ds_fraud_pct_revenue", "Fraud Loss as % of Revenue", "%", [0.1, 0.3], "0.00"),
            ("ds_open_findings", "Regulatory Fine Exposure (Open Findings)", None, None, "0"),
            ("ds_spend", "Security Spend (period)", "$", None, "0"),
            ("ds_roi", "Security ROI (loss avoided / spend)", "x", [1, 2], "0.0")]
    xs = d.row_of(row1, 0, 150)
    for (ds_id, title, unit, rng, prec), (x, w) in zip(row1, xs):
        colors = [RED, AMBER, GREEN] if ds_id == "ds_roi" else None
        d.add_viz(f"viz_{ds_id}", viz_singlevalue(title, ds_id, unit=unit, unit_position="before" if unit == "$" else "after",
                                                    range_values=rng, range_colors=colors, precision=prec), x, 0, w, 150)
    d.y = 160

    d.add_ds("ds_loss_trend", ds_search(
        f"| inputlookup fraud_transactions.csv | {bu_filter} AND is_fraud=\"Y\" "
        "| eval month=strftime(strptime(date,\"%Y-%m-%d %H:%M:%S\"),\"%Y-%m\") "
        "| stats sum(loss_amount_usd) as gross_loss sum(recovered_amount_usd) as recovered by month | sort month",
        "Fraud Loss Trend"))
    d.add_ds("ds_spend_roi_cat", ds_search(
        f"| inputlookup security_spend.csv | {bu_filter} "
        "| stats sum(actual_spend_usd) as actual_spend sum(estimated_loss_avoided_usd) as loss_avoided by category "
        "| sort -loss_avoided",
        "Spend vs. Loss Avoided by Category", use_time=False))

    d.add_viz("viz_loss_trend", viz_chart("column", "Fraud Loss vs. Recoveries by Month", "ds_loss_trend", stacked=True), 0, d.y, 710, 280)
    d.add_viz("viz_spend_roi_cat", viz_chart("bar", "Security Spend vs. Estimated Loss Avoided by Category", "ds_spend_roi_cat"), 722, d.y, 718, 280)
    d.y += 292

    d.add_ds("ds_financial_trend", ds_search(
        "| inputlookup company_financials.csv "
        "| table quarter, revenue_usd, net_income_usd, it_budget_usd, cyber_insurance_premium_usd | sort quarter",
        "Revenue / Net Income / IT Budget Trend", use_time=False))
    d.add_viz("viz_financial_trend", viz_chart("line", "Revenue, Net Income & IT Budget by Quarter (financial-KPI baseline)", "ds_financial_trend"),
               0, d.y, 1440, 280)
    d.y += 292

    d.add_ds("ds_channel", ds_search(
        f"| inputlookup fraud_transactions.csv | {bu_filter} AND is_fraud=\"Y\" "
        "| eval net_loss=loss_amount_usd-recovered_amount_usd | stats sum(net_loss) as net_loss count as fraud_cases by channel "
        "| sort -net_loss",
        "Fraud Loss by Channel"))
    d.add_ds("ds_fraud_type", ds_search(
        f"| inputlookup fraud_transactions.csv | {bu_filter} AND is_fraud=\"Y\" "
        "| eval net_loss=loss_amount_usd-recovered_amount_usd | stats sum(net_loss) as net_loss count as fraud_cases by fraud_type "
        "| sort -net_loss",
        "Fraud Loss by Fraud Type"))
    d.add_viz("viz_channel", viz_chart("pie", "Fraud Loss by Channel (click a slice to drill in)", "ds_channel",
                                        event_handlers=[{"type": "drilldown.setToken", "options": {"tokens": [
                                            {"token": "sel_channel", "key": "row.channel"}]}}]), 0, d.y, 710, 300)
    d.add_viz("viz_fraud_type", viz_chart("bar", "Fraud Loss by Fraud Type (click a bar to drill in)", "ds_fraud_type",
                                           event_handlers=[{"type": "drilldown.setToken", "options": {"tokens": [
                                               {"token": "sel_fraud_type", "key": "row.fraud_type"}]}}]), 722, d.y, 718, 300)
    d.y += 312

    d.add_ds("ds_raw_txn", ds_search(
        "| inputlookup fraud_transactions.csv | where is_fraud=\"Y\" AND channel=\"$sel_channel$\" "
        "AND (fraud_type=\"$sel_fraud_type$\" OR \"$sel_fraud_type$\"=\"\") "
        "| sort -date | table transaction_id, date, business_unit, channel, fraud_type, detection_method, "
        "amount_usd, loss_amount_usd, recovered_amount_usd, status",
        "Raw Flagged Transactions"))
    d.add_viz("viz_raw_txn", viz_table("Flagged Transactions — Channel: $sel_channel$ $sel_fraud_type$ (deepest drill)", "ds_raw_txn"),
               0, d.y, 1440, 320, visibility="$sel_channel$")
    d.y += 332

    d.add_viz("viz_note", viz_markdown(
        "**Drill-down path:** Fraud Loss / ROI tiles (top row) -> Channel or Fraud Type breakdown (click a "
        "slice/bar) -> individual flagged transaction (bottom table). Each `transaction_id` corresponds to the "
        "SOC alert / incident record that first flagged it (cross-reference via `business_unit` and `date` on "
        "the CIO dashboard)."
    ), 0, d.y, 1440, 110)
    d.y += 110

    d.write("cfo_dashboard.json")


# ---------------------------------------------------------------------------
# COO Dashboard
# ---------------------------------------------------------------------------

def build_coo():
    d = DashboardBuilder(
        "COO — Operational Resilience & Incident Response",
        "Links security operations to business continuity and cost: system availability vs. SLA, "
        "detection/response speed, incident backlog, and third-party operational risk. Drill down: "
        "KPI -> Business Unit -> System -> Outage/Incident Event.",
    )
    d.add_input("input_time", input_time())
    d.add_input("input_bu", input_bu_dropdown())
    bu_filter = 'where business_unit=$tok_bu$ OR "$tok_bu$"="*"'

    d.add_ds("ds_avg_uptime", ds_search(
        f"| inputlookup uptime_availability.csv | {bu_filter} | stats avg(uptime_pct) as avg_uptime "
        "| eval avg_uptime=round(avg_uptime,3)", "Average Availability"))
    d.add_ds("ds_cust_outages", ds_search(
        f"| inputlookup uptime_availability.csv | {bu_filter} AND customer_impact=\"Y\" | stats count as outages",
        "Customer-Impacting Outages"))
    d.add_ds("ds_mttd", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} | stats avg(mttd_hours) as mttd | eval mttd=round(mttd,1)",
        "Mean Time to Detect"))
    d.add_ds("ds_mttr", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} | stats avg(mttr_hours) as mttr | eval mttr=round(mttr,1)",
        "Mean Time to Respond"))
    d.add_ds("ds_backlog", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} AND status!=\"Resolved\" | stats count as backlog",
        "Open Incident Backlog"))
    d.add_ds("ds_outage_cost", ds_search(
        "| inputlookup uptime_availability.csv | where customer_impact=\"Y\" "
        "| stats sum(downtime_minutes) as downtime_minutes "
        "| eval estimated_revenue_at_risk=round(downtime_minutes*1850,0) | table estimated_revenue_at_risk",
        "Estimated Revenue at Risk from Downtime"))

    row1 = [("ds_avg_uptime", "Avg. Availability vs. SLA", "%", [99, 99.8], "0.000"),
            ("ds_cust_outages", "Customer-Impacting Outages", None, [5, 15], "0"),
            ("ds_mttd", "Mean Time to Detect (hrs)", "hrs", None, "0.0"),
            ("ds_mttr", "Mean Time to Respond (hrs)", "hrs", None, "0.0"),
            ("ds_backlog", "Open Incident Backlog", None, [10, 25], "0"),
            ("ds_outage_cost", "Est. Revenue at Risk from Downtime", "$", None, "0")]
    xs = d.row_of(row1, 0, 150)
    for (ds_id, title, unit, rng, prec), (x, w) in zip(row1, xs):
        colors = [RED, AMBER, GREEN] if ds_id == "ds_avg_uptime" else None
        d.add_viz(f"viz_{ds_id}", viz_singlevalue(title, ds_id, unit=unit, unit_position="before" if unit == "$" else "after",
                                                    range_values=rng, range_colors=colors, precision=prec), x, 0, w, 150)
    d.y = 160

    d.add_ds("ds_uptime_trend", ds_search(
        f"| inputlookup uptime_availability.csv | {bu_filter} "
        "| stats avg(uptime_pct) as avg_uptime avg(sla_target_pct) as sla_target by week_start | sort week_start",
        "Weekly Availability Trend"))
    d.add_ds("ds_backlog_trend", ds_search(
        f"| inputlookup security_incidents.csv | {bu_filter} "
        "| eval month=strftime(strptime(date,\"%Y-%m-%d %H:%M:%S\"),\"%Y-%m\") | stats count by month, severity",
        "Incident Backlog Trend"))
    d.add_viz("viz_uptime_trend", viz_chart("line", "Weekly Availability vs. SLA Target", "ds_uptime_trend"), 0, d.y, 710, 280)
    d.add_viz("viz_backlog_trend", viz_chart("column", "Incident Backlog by Severity Over Time", "ds_backlog_trend", stacked=True), 722, d.y, 718, 280)
    d.y += 292

    d.add_ds("ds_downtime_bu", ds_search(
        f"| inputlookup uptime_availability.csv | {bu_filter} "
        "| stats sum(downtime_minutes) as downtime_minutes count(eval(customer_impact=\"Y\")) as customer_impacting_events by business_unit "
        "| sort -downtime_minutes",
        "Downtime by Business Unit"))
    d.add_ds("ds_vendor_ops", ds_search(
        f"| inputlookup vendor_risk.csv | {bu_filter} "
        "| sort -sla_breach_count | table vendor_name, business_unit, criticality, sla_breach_count, incident_count, risk_score | head 8",
        "Vendor Operational Risk", use_time=False))
    d.add_viz("viz_downtime_bu", viz_chart("bar", "Downtime Minutes by Business Unit (click a bar to drill in)", "ds_downtime_bu",
                                            event_handlers=drill_bu_token()), 0, d.y, 710, 300)
    d.add_viz("viz_vendor_ops", viz_table("Third-Party / Vendor Operational Risk", "ds_vendor_ops",
                                           event_handlers=drill_token("sel_bu", "business_unit")), 722, d.y, 718, 300)
    d.y += 312

    d.add_ds("ds_sys_downtime", ds_search(
        "| inputlookup uptime_availability.csv | where business_unit=\"$sel_bu$\" "
        "| stats sum(downtime_minutes) as downtime_minutes avg(uptime_pct) as avg_uptime by system | sort -downtime_minutes",
        "Systems by Downtime"))
    d.add_viz("viz_sys_downtime", viz_chart("bar", "Systems in $sel_bu$ by Downtime (click a bar to drill in)", "ds_sys_downtime",
                                             event_handlers=drill_token("sel_sys", "system")),
               0, d.y, 1440, 300, visibility="$sel_bu$")
    d.y += 312

    d.add_ds("ds_outage_weeks", ds_search(
        "| inputlookup uptime_availability.csv | where business_unit=\"$sel_bu$\" AND (system=\"$sel_sys$\" OR \"$sel_sys$\"=\"\") "
        "AND outage_cause!=\"\" | sort -week_start | table week_start, system, uptime_pct, sla_target_pct, "
        "downtime_minutes, outage_cause, customer_impact",
        "Raw Outage Weeks"))
    d.add_ds("ds_related_incidents", ds_search(
        "| inputlookup security_incidents.csv | where business_unit=\"$sel_bu$\" AND (system=\"$sel_sys$\" OR \"$sel_sys$\"=\"\") "
        "| sort -date | table incident_id, date, severity, category, mttd_hours, mttr_hours, status, root_cause",
        "Related Security Incidents"))
    d.add_viz("viz_outage_weeks", viz_table("Outage Weeks — $sel_bu$ $sel_sys$", "ds_outage_weeks"), 0, d.y, 710, 320, visibility="$sel_bu$")
    d.add_viz("viz_related_incidents", viz_table("Related Security Incidents — $sel_bu$ $sel_sys$ (deepest drill)", "ds_related_incidents"),
               722, d.y, 718, 320, visibility="$sel_bu$")
    d.y += 332

    d.add_viz("viz_note", viz_markdown(
        "**Drill-down path:** Availability / MTTD-MTTR tiles (top row) -> Business Unit downtime (click a bar) "
        "-> System within that unit (click a bar) -> raw outage weeks and the incident records that caused them "
        "(bottom tables). `system` and `business_unit` join directly to the CIO dashboard's SOC alert and "
        "vulnerability data for full technical root-cause detail."
    ), 0, d.y, 1440, 110)
    d.y += 110

    d.write("coo_dashboard.json")


# ---------------------------------------------------------------------------
# CIO Dashboard
# ---------------------------------------------------------------------------

def build_cio():
    d = DashboardBuilder(
        "CIO — Security Operations & Technical Risk Posture",
        "The technical foundation beneath the CEO/CFO/COO KPIs: vulnerability management, SOC alert "
        "triage, patch compliance, and MITRE ATT&CK activity, sized against the IT budget the CIO owns. "
        "Drill down: KPI -> Business Unit -> System/Asset -> Raw Alert or Scan Record.",
    )
    d.add_input("input_time", input_time())
    d.add_input("input_bu", input_bu_dropdown())
    bu_filter = 'where business_unit=$tok_bu$ OR "$tok_bu$"="*"'

    d.add_ds("ds_open_vulns", ds_search(
        f"| inputlookup vulnerability_scans.csv | {bu_filter} AND (severity=\"Critical\" OR severity=\"High\") "
        "AND patch_status!=\"Patched\" | stats count as open_vulns", "Open Critical/High Vulns"))
    d.add_ds("ds_patch_rate", ds_search(
        f"| inputlookup vulnerability_scans.csv | {bu_filter} AND (severity=\"Critical\" OR severity=\"High\") "
        "| stats count(eval(patch_status=\"Patched\")) as patched count as total "
        "| eval pct=round((patched/total)*100,1) | table pct", "Patch Compliance Rate"))
    d.add_ds("ds_alerts_total", ds_search(
        f"| inputlookup soc_alerts.csv | {bu_filter} | stats count as total_alerts", "SOC Alerts Triaged"))
    d.add_ds("ds_tp_rate", ds_search(
        f"| inputlookup soc_alerts.csv | {bu_filter} | stats count(eval(disposition=\"True Positive\")) as tp count as total "
        "| eval pct=round((tp/total)*100,1) | table pct", "True Positive Rate"))
    d.add_ds("ds_triage_time", ds_search(
        f"| inputlookup soc_alerts.csv | {bu_filter} | stats avg(triage_time_minutes) as avg_triage "
        "| eval avg_triage=round(avg_triage,1)", "Avg Triage Time"))
    d.add_ds("ds_spend_pct_itbudget", ds_search(
        "| inputlookup security_spend.csv | stats sum(actual_spend_usd) as spend "
        "| appendcols [ | inputlookup company_financials.csv | stats sum(it_budget_usd) as it_budget ] "
        "| eval pct=round((spend/it_budget)*100,1) | table pct",
        "Security Spend as % of IT Budget", use_time=False))

    row1 = [("ds_open_vulns", "Open Critical/High Vulnerabilities", None, [40, 100], "0"),
            ("ds_patch_rate", "Patch Compliance Rate", "%", [60, 80], "0.0"),
            ("ds_alerts_total", "SOC Alerts Triaged", None, None, "0"),
            ("ds_tp_rate", "True Positive Rate", "%", None, "0.0"),
            ("ds_triage_time", "Avg Alert Triage Time (min)", "min", None, "0.0"),
            ("ds_spend_pct_itbudget", "Security Spend as % of IT Budget", "%", None, "0.0")]
    xs = d.row_of(row1, 0, 150)
    for (ds_id, title, unit, rng, prec), (x, w) in zip(row1, xs):
        colors = [RED, AMBER, GREEN] if ds_id == "ds_patch_rate" else None
        d.add_viz(f"viz_{ds_id}", viz_singlevalue(title, ds_id, unit=unit, range_values=rng, range_colors=colors, precision=prec), x, 0, w, 150)
    d.y = 160

    d.add_ds("ds_alert_trend", ds_search(
        f"| inputlookup soc_alerts.csv | {bu_filter} "
        "| eval month=strftime(strptime(timestamp,\"%Y-%m-%d %H:%M:%S\"),\"%Y-%m\") | stats count by month, severity | sort month",
        "SOC Alert Volume Trend"))
    d.add_ds("ds_mitre", ds_search(
        f"| inputlookup soc_alerts.csv | {bu_filter} AND disposition=\"True Positive\" | stats count by mitre_tactic | sort -count",
        "True Positives by MITRE Tactic"))
    d.add_viz("viz_alert_trend", viz_chart("column", "SOC Alert Volume by Severity Over Time", "ds_alert_trend", stacked=True), 0, d.y, 710, 280)
    d.add_viz("viz_mitre", viz_chart("bar", "True-Positive Alerts by MITRE ATT&CK Tactic", "ds_mitre"), 722, d.y, 718, 280)
    d.y += 292

    d.add_ds("ds_vulns_bu", ds_search(
        f"| inputlookup vulnerability_scans.csv | {bu_filter} AND patch_status!=\"Patched\" "
        "| stats count as open_vulns count(eval(severity=\"Critical\" OR severity=\"High\")) as critical_high by business_unit "
        "| sort -open_vulns",
        "Open Vulnerabilities by Business Unit"))
    d.add_ds("ds_alerts_bu", ds_search(
        f"| inputlookup soc_alerts.csv | {bu_filter} "
        "| stats count as alerts count(eval(disposition=\"True Positive\")) as true_positives by business_unit | sort -alerts",
        "SOC Alerts by Business Unit"))
    d.add_viz("viz_vulns_bu", viz_chart("bar", "Open Vulnerabilities by Business Unit (click a bar to drill in)", "ds_vulns_bu",
                                         event_handlers=drill_bu_token()), 0, d.y, 710, 300)
    d.add_viz("viz_alerts_bu", viz_chart("bar", "SOC Alerts by Business Unit (click a bar to drill in)", "ds_alerts_bu",
                                          event_handlers=drill_bu_token()), 722, d.y, 718, 300)
    d.y += 312

    d.add_ds("ds_vulns_sys", ds_search(
        "| inputlookup vulnerability_scans.csv | where business_unit=\"$sel_bu$\" AND patch_status!=\"Patched\" "
        "| stats count as open_vulns avg(cvss_score) as avg_cvss by system | sort -open_vulns",
        "Systems by Open Vulnerabilities"))
    d.add_viz("viz_vulns_sys", viz_chart("bar", "Systems in $sel_bu$ by Open Vulnerabilities (click a bar to drill in)", "ds_vulns_sys",
                                          event_handlers=drill_token("sel_sys", "system")),
               0, d.y, 1440, 300, visibility="$sel_bu$")
    d.y += 312

    d.add_ds("ds_raw_vulns", ds_search(
        "| inputlookup vulnerability_scans.csv | where business_unit=\"$sel_bu$\" AND (system=\"$sel_sys$\" OR \"$sel_sys$\"=\"\") "
        "AND patch_status!=\"Patched\" | sort -cvss_score | table scan_id, date, asset, system, cve_id, cvss_score, "
        "severity, patch_status, days_open, exploit_available, asset_owner",
        "Raw Vulnerability Records"))
    d.add_ds("ds_raw_alerts", ds_search(
        "| inputlookup soc_alerts.csv | where business_unit=\"$sel_bu$\" AND (source_system=\"$sel_sys$\" OR \"$sel_sys$\"=\"\") "
        "| sort -timestamp | table alert_id, timestamp, severity, source_system, mitre_tactic, analyst, disposition, "
        "triage_time_minutes, status",
        "Raw SOC Alert Records"))
    d.add_viz("viz_raw_vulns", viz_table("Open Vulnerabilities — $sel_bu$ $sel_sys$ (deepest drill)", "ds_raw_vulns"),
               0, d.y, 710, 320, visibility="$sel_bu$")
    d.add_viz("viz_raw_alerts", viz_table("SOC Alerts — $sel_bu$ $sel_sys$ (deepest drill)", "ds_raw_alerts"),
               722, d.y, 718, 320, visibility="$sel_bu$")
    d.y += 332

    d.add_viz("viz_note", viz_markdown(
        "**Drill-down path:** Vulnerability / SOC KPI tiles (top row) -> Business Unit breakdown (click a bar) "
        "-> System/asset within that unit (click a bar) -> the individual CVE scan record or SOC alert (bottom "
        "tables) — the ground-truth technical events that ultimately roll up into the COO's MTTD/MTTR, the "
        "CFO's fraud/spend ROI, and the CEO's enterprise risk score and cost-of-revenue metric."
    ), 0, d.y, 1440, 110)
    d.y += 110

    d.write("cio_dashboard.json")


# ---------------------------------------------------------------------------
# Overview / landing dashboard
# ---------------------------------------------------------------------------

def build_overview():
    d = DashboardBuilder(
        "Executive Security KPI Program — Overview",
        "Landing page for the executive security KPI program. Every persona dashboard is built on the "
        "same 8-table data model, so a KPI on any one of them can be traced down to the same raw event, "
        "and every dashboard ties cyber posture back to revenue, net income, or IT budget.",
    )
    d.add_ds("ds_impact_12mo", ds_search(
        "| inputlookup security_incidents.csv | stats sum(financial_impact_usd) as total_impact",
        "Financial Impact (12mo)"))
    d.add_ds("ds_fraud_12mo", ds_search(
        "| inputlookup fraud_transactions.csv | where is_fraud=\"Y\" "
        "| eval net_loss=loss_amount_usd-recovered_amount_usd | stats sum(net_loss) as net_loss",
        "Net Fraud Loss (12mo)"))
    d.add_ds("ds_uptime_12mo", ds_search(
        "| inputlookup uptime_availability.csv | stats avg(uptime_pct) as avg_uptime | eval avg_uptime=round(avg_uptime,3)",
        "Avg Availability (12mo)"))
    d.add_ds("ds_vulns_12mo", ds_search(
        "| inputlookup vulnerability_scans.csv | where (severity=\"Critical\" OR severity=\"High\") AND patch_status!=\"Patched\" "
        "| stats count as open_vulns", "Open Critical/High Vulns", use_time=False))
    d.add_ds("ds_cyber_cost_pct_rev", ds_search(
        "| inputlookup security_incidents.csv | stats sum(financial_impact_usd) as impact "
        "| appendcols [ | inputlookup fraud_transactions.csv | where is_fraud=\"Y\" "
        "| eval net_loss=loss_amount_usd-recovered_amount_usd | stats sum(net_loss) as fraud_loss ] "
        "| appendcols [ | inputlookup company_financials.csv | stats sum(revenue_usd) as revenue ] "
        "| eval total_cyber_cost=impact+fraud_loss, pct_of_revenue=round((total_cyber_cost/revenue)*100,2) "
        "| table total_cyber_cost, pct_of_revenue", "Total Cyber Cost as % of Revenue", use_time=False))

    row1 = [("ds_impact_12mo", "Financial Impact of Security Incidents (12mo)", "$"),
            ("ds_fraud_12mo", "Net Fraud Loss (12mo)", "$"),
            ("ds_uptime_12mo", "Avg. Customer-Facing System Availability", "%"),
            ("ds_vulns_12mo", "Open Critical/High Vulnerabilities", None)]
    xs = d.row_of(row1, 0, 150)
    for (ds_id, title, unit), (x, w) in zip(row1, xs):
        d.add_viz(f"viz_{ds_id}", viz_singlevalue(title, ds_id, unit=unit, unit_position="before" if unit == "$" else "after"), x, 0, w, 150)
    d.y = 160

    d.add_viz("viz_cyber_cost_pct_rev", viz_table("Total Cyber Cost (incidents + fraud) as % of Annual Revenue — "
                                                    "the single number that ties this whole program to the P&L",
                                                    "ds_cyber_cost_pct_rev"), 0, d.y, 1440, 150)
    d.y += 162

    d.add_viz("viz_personas", viz_markdown(
        "## Persona Dashboards\n\n"
        "| CEO | CFO | COO | CIO |\n"
        "|---|---|---|---|\n"
        "| Enterprise Cyber Risk & Resilience | Cyber Financial Exposure & Security ROI | Operational Resilience & Incident Response | Security Operations & Technical Risk Posture |\n"
        "| Risk score, material incidents, customer trust, regulatory standing, cyber cost as % of revenue | "
        "Fraud loss, spend vs. loss avoided, regulatory fine exposure, revenue/net-income baseline | "
        "Availability vs. SLA, MTTD/MTTR, incident backlog, vendor ops risk, revenue at risk from downtime | "
        "Vulnerability management, SOC triage, patch compliance, MITRE ATT&CK, spend as % of IT budget |\n"
        "| [Open CEO Dashboard](ceo_dashboard) | [Open CFO Dashboard](cfo_dashboard) | [Open COO Dashboard](coo_dashboard) | [Open CIO Dashboard](cio_dashboard) |\n"
    ), 0, d.y, 1440, 260)
    d.y += 272

    d.add_viz("viz_howto", viz_markdown(
        "### How the drill-down works across all four dashboards\n\n"
        "1. **Board KPI** — a single aggregated number (risk score, fraud loss, availability %, open vulnerabilities), "
        "several of which are already expressed as a share of revenue, net income, or IT budget.\n"
        "2. **Business Unit** — click the KPI's breakdown chart to filter to one of 7 business units.\n"
        "3. **System / Channel / Asset** — click again to narrow to the specific application, channel, or vendor.\n"
        "4. **Event record** — the underlying incident, flagged transaction, vulnerability scan, or SOC alert row.\n"
        "5. **Cross-dashboard join** — `business_unit` and `system` are shared keys across all 9 datasets, so a "
        "CEO-level incident can be traced to the CIO's SOC alert and vulnerability scan that caused it, or the "
        "CFO's fraud loss it produced — and `company_financials.csv` ties the whole chain back to revenue, net "
        "income, and IT budget."
    ), 0, d.y, 1440, 260)
    d.y += 260

    d.write("security_kpi_overview.json")


if __name__ == "__main__":
    build_ceo()
    build_cfo()
    build_coo()
    build_cio()
    build_overview()
