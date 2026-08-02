# Executive Security KPI Dashboard (Splunk / SPL)

A set of four Splunk dashboards — **CEO, CFO, COO, CIO** — that connect a
financial-services company's cyber security posture to the KPIs each
executive is actually held to, with a drill-down path that goes all the way
from a board-level number down to the single raw event that produced it.

Sample data is synthetic but modeled on real financial-services risk data:
security incidents, fraud transactions, vulnerability scans, SOC alerts,
system uptime, regulatory findings, third-party/vendor risk, and security
spend.

## Contents

```
splunk-exec-security-dashboard/
├── data/                        # 8 sample CSV datasets (Splunk lookups)
├── scripts/generate_sample_data.py  # regenerates the CSVs deterministically
├── dashboards/                  # 4 persona dashboards + 1 landing page (Simple XML)
└── README.md
```

## 1. The data model

All 8 datasets share two dimensions — `business_unit` and `system` — which
is what makes cross-dashboard drill-down possible. Business units and their
systems:

| Business Unit | Systems |
|---|---|
| Retail Banking | Core Banking System, Teller Platform, ATM Network |
| Commercial Banking | Commercial Loan Platform, Treasury Management System |
| Wealth Management | Wealth Management Platform, Trading Platform |
| Payments & Cards | Payment Gateway, Card Issuance System, Wire Transfer System |
| Mortgage & Lending | Loan Origination System, Document Management System |
| Digital Banking | Online Banking Portal, Mobile Banking App, Customer API Gateway |
| Corporate IT & Infrastructure | Active Directory, Cloud Workloads (AWS), Data Warehouse, Email & Collaboration (O365), Endpoint Fleet |

| File | Rows | Grain | Used by |
|---|---|---|---|
| `security_incidents.csv` | 320 | 1 row per security incident | CEO, COO |
| `fraud_transactions.csv` | 2,600 | 1 row per flagged/reviewed transaction | CFO, COO |
| `vulnerability_scans.csv` | 850 | 1 row per vulnerability finding on an asset | CIO |
| `soc_alerts.csv` | 4,200 | 1 row per SOC-triaged alert | CIO |
| `uptime_availability.csv` | 2,100 | 1 row per system per week | COO |
| `compliance_findings.csv` | 130 | 1 row per regulatory/audit finding | CEO, CFO |
| `vendor_risk.csv` | 20 | 1 row per third-party vendor | CEO, COO |
| `security_spend.csv` | 280 | 1 row per BU × spend category × quarter | CFO |

Regenerate with fresh randomization (same shape, different values) by
editing the seed in `scripts/generate_sample_data.py` and re-running:

```bash
cd scripts && python3 generate_sample_data.py
```

## 2. Loading the data into Splunk

These are designed to run entirely as **lookups** — no indexing pipeline
required, so they work in Splunk Free, a personal instance, or a sandboxed
Splunk Cloud app.

1. In Splunk Web: **Settings → Lookups → Lookup table files → New Lookup
   Table File**. Upload each of the 8 CSVs from `data/`, keeping the exact
   filename (e.g. `security_incidents.csv`). Set the destination app to
   wherever you'll install the dashboards.
2. Splunk auto-creates a matching lookup *definition* with the same name
   the first time it's referenced by `| inputlookup <file>.csv`, so no
   further configuration is required — the SPL in every dashboard already
   calls `inputlookup` directly.
3. (Optional, more "real") If you'd rather have actual indexed events:
   point the Splunk **Add Data → Upload** wizard at each CSV, index them
   into a dedicated index (e.g. `fsi_security`), and swap each
   `| inputlookup X.csv` for `index=fsi_security sourcetype=X` in the
   dashboard XML. The field names are already flat and CSV-header-friendly,
   so this is a drop-in swap.

## 3. Installing the dashboards

Simplest path: **Settings → User Interface → Views → New View**, switch to
the XML/source editor, and paste the contents of the desired file from
`dashboards/`. Do this for all five:

- `security_kpi_overview.xml` — landing page, links to the other four
- `ceo_dashboard.xml`
- `cfo_dashboard.xml`
- `coo_dashboard.xml`
- `cio_dashboard.xml`

Make sure the dashboard's URL/view **name** matches what the overview
page links to (`ceo_dashboard`, `cfo_dashboard`, `coo_dashboard`,
`cio_dashboard`) — Splunk Web will prompt for this name when you save a new
view.

## 4. KPI → technical event mapping

This is the core idea of the program: every executive-level number has a
direct, traceable path down to a technical log record.

| Executive | Board-level KPI | Business/financial framing | Technical ground truth |
|---|---|---|---|
| **CEO** | Enterprise Cyber Risk Score | Severity-weighted composite of all incidents — the number the board asks about | `security_incidents.csv` severity + category |
| **CEO** | Material (Critical/High) incidents | Board/SEC-disclosure-worthy events | `security_incidents.csv` filtered on severity |
| **CEO** | Customers impacted | Brand/reputational exposure | `security_incidents.csv.customers_affected` |
| **CEO** | Regulatory standing | Exam/audit risk, consent-order exposure | `compliance_findings.csv` by framework (SOX, GLBA, PCI-DSS, FFIEC, NYDFS-500) |
| **CFO** | Net fraud loss / loss rate (bps) | Direct P&L hit, classic banking fraud metric | `fraud_transactions.csv` loss vs. recovered, by channel |
| **CFO** | Security spend vs. estimated loss avoided (ROI) | Justifies the security budget line to the board | `security_spend.csv` by category |
| **CFO** | Regulatory fine exposure | Contingent liability | `compliance_findings.csv` open findings |
| **COO** | System availability vs. SLA | Customer experience, operational continuity | `uptime_availability.csv` uptime_pct vs. sla_target_pct |
| **COO** | MTTD / MTTR | How fast the org detects and contains a problem | `security_incidents.csv` mttd_hours / mttr_hours |
| **COO** | Incident backlog | Operational capacity/staffing signal | `security_incidents.csv` status != Resolved |
| **COO** | Vendor operational risk | Third-party concentration risk | `vendor_risk.csv` sla_breach_count, incident_count |
| **CIO** | Open Critical/High vulnerabilities, patch compliance % | Attack surface and remediation discipline | `vulnerability_scans.csv` |
| **CIO** | SOC alert volume, true-positive rate, triage time | SOC efficiency and signal-to-noise | `soc_alerts.csv` |
| **CIO** | MITRE ATT&CK tactic distribution | What kind of attacks are actually happening | `soc_alerts.csv.mitre_tactic` |

## 5. The drill-down pattern (all four dashboards use the same shape)

Each dashboard is a 5-layer progressive drill-down implemented with Simple
XML tokens — click a chart, and dependent panels below it appear, filtered
to your click:

1. **KPI tiles** (top row) — the number the executive actually reports upward.
2. **Trend** — the same KPI over time, to show trajectory.
3. **Business Unit breakdown** — a bar/pie chart. Clicking a bar sets a
   token (`sel_bu`) and reveals layer 4.
4. **System/Channel/Asset breakdown within that Business Unit** — clicking
   sets `sel_sys` (or `sel_channel` / `sel_fraud_type` on the CFO
   dashboard) and reveals layer 5.
5. **Raw event table** — the individual incident, transaction, vulnerability
   scan, or SOC alert record, filtered by everything selected above.

This is implemented with Splunk's `depends="$token$"` panel visibility and
`<drilldown><set token="...">` — no external scripting required. For
example, in `ceo_dashboard.xml`:

```xml
<chart>
  ...
  <drilldown>
    <set token="sel_bu">$click.value2$</set>
    <unset token="sel_sys"></unset>
  </drilldown>
</chart>
```

```xml
<panel depends="$sel_bu$">
  <title>Systems in "$sel_bu$" Ranked by Risk</title>
  ...
</panel>
```

### Cross-dashboard drill-down

Because `business_unit` and `system` are shared keys, the same incident
that shows up as one line in the CEO's enterprise risk score also:

- appears in the COO's incident backlog and MTTD/MTTR averages,
- can be traced to the CIO's SOC alert (`soc_alerts.csv`, matched on
  `business_unit` + `source_system` + approximate timestamp) and the
  vulnerability that was likely exploited (`vulnerability_scans.csv`,
  matched on `system`),
- and, if it involved fraud, the CFO's `fraud_transactions.csv` records
  for that same `business_unit`/date range show the dollar impact.

In a production deployment you'd add a shared `incident_id` or
`correlation_id` across all fact tables (via a lookup-based join table) to
make this a one-click join instead of a business-unit/time correlation —
noted here as the natural next step if you wire this up to real data.

## 6. Extending to a live environment

- Replace `| inputlookup` with real index searches once you have actual
  SIEM/EDR/ticketing data flowing in (CrowdStrike, Splunk ES notables,
  ServiceNow incidents, core banking fraud engine exports, etc.).
- Add `savedsearches.conf` scheduled searches to pre-compute the heavier
  aggregations (e.g. enterprise risk score) on a schedule and store to a
  summary index, so dashboards load instantly at board-meeting time.
- Swap Simple XML for Dashboard Studio if you want richer visual layout —
  the SPL in each `<query>` block is portable as-is.
