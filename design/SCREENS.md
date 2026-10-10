# EMPULSE: Screen Index (45 screens)

Source: Figma file `sowTLuN4SOe7KBHfnkBFAm` ("Final design"). The design is the source of truth for look and layout. Use `design/png/<ID>.png` if it exists; otherwise open the Figma file with your browsing access and go to the node id below.
- Design: https://www.figma.com/design/sowTLuN4SOe7KBHfnkBFAm/Final-design?node-id=0-1&t=J2BMjRY7CI0ljF3B-1
- Prototype: https://www.figma.com/proto/sowTLuN4SOe7KBHfnkBFAm/Final-design?node-id=54-1384&p=f&t=8eBViAhCFoY9huNl-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=54%3A1384
This file tells you what each screen is, its role, route and Figma node.

Demo people used in the design (use these exact names in seed data):
- Employee: **Layla Haddad**, Senior Data Analyst, Customer Insights. Score 87, Silver. Reports to Omar Saeed.
- Manager: **Yasmin Hadi**, Engineering Manager, Platform Reliability, 9 direct reports.
- HR/Exec: **Rana Aziz**, Chief People Officer, Horizon Group (1,240 people, 6 departments, 31 teams).
- Team members (Platform Reliability): Khalid Mansour (Platform Engineer, burnout 72%, Gold 91), Tariq Zaki (SRE, 66%), Huda Nasser (SRE, 63%), Sami Youssef (52%), Rami Khoury (DevOps, 47%), Dana Farouk (44%), Noura Al-Saud (41%), Faisal Rahman (38%), Maha Al-Otaibi (Staff Engineer, 35%).
- HRBP: Lina Farhat. Layla's manager: Omar Saeed.

Roles: `employee`, `manager`, `hr` (HR business partner), `executive` (sees HR screens, aggregated only), `admin` (People Analytics admin).

## Access (2)
| ID | Screen | Node | Route | Notes |
|---|---|---|---|---|
| A01 | Login | 54:1384 | /login | Login card |
| A02 | Role Routing | 3:26461 | /role | Role cards + summary, then Continue |

## Employee, "MY SPACE" (11)
Sidebar: My Overview, My Performance, My Digital Twin, My Innovation DNA, Innovation Lab, Innovation Marketplace, My Growth Path, Recognition, PulseAI, My Reports. Footer: privacy note + profile (Layla Haddad). Settings via profile.

| ID | Screen | Node | Route |
|---|---|---|---|
| E01 | My Overview | 3:26531 | /employee/overview |
| E02 | My Performance (Professional Tier) | 3:26833 | /employee/performance |
| E03 | My Digital Twin | 3:27035 | /employee/twin |
| E04 | My Innovation DNA | 3:27333 | /employee/innovation-dna |
| E05 | Innovation Lab | 3:27545 | /employee/innovation-lab |
| E06 | Innovation Marketplace | 3:27752 | /employee/marketplace |
| E07 | My Growth Path | 72:6 | /employee/growth |
| E08 | Recognition, Wall of Impact | 212:2 | /employee/recognition |
| E09 | PulseAI, Personal | 209:2 | /employee/pulseai |
| E10 | My Reports | 205:2 | /employee/reports |
| E11 | Settings, Employee | 204:2 | /employee/settings |

## Manager, "MY TEAM" (14)
Sidebar: Team Overview, Team Performance, Team Pulse, Team Members, Performance-Wellbeing, Burnout Early Warning (badge 3), Team Morale, Recognition, Innovation, Interventions (badge 2), Team Reports, PulseAI. Footer: Help, Settings, profile (Yasmin Hadi).

| ID | Screen | Node | Route |
|---|---|---|---|
| M01 | Team Overview, Team Pulse Map | 207:2 | /manager/overview |
| M02 | Team Performance | 206:2 | /manager/performance |
| M03 | Team Pulse | 210:2 | /manager/pulse |
| M04 | Team Members | 211:2 | /manager/members |
| M04b | Team Member Profile (twin) | 208:2 | /manager/members/:id |
| M05 | Performance-Wellbeing, Team | 237:3 | /manager/matrix |
| M06 | Burnout Early Warning | 237:239 | /manager/burnout |
| M07 | Team Morale | 237:680 | /manager/morale |
| M08 | Recognition, Manager | 237:892 | /manager/recognition |
| M09 | Team Innovation | 237:1200 | /manager/innovation |
| M10 | Interventions, Manager | 237:1450 | /manager/interventions |
| M11 | Team Reports | 237:1808 | /manager/reports |
| M12 | PulseAI, Team | 237:2053 | /manager/pulseai |
| M13 | Settings, Manager | 237:2429 | /manager/settings |

## HR & Executive (18)
Sidebar: Executive Pulse, Organization, Employees, Teams & Departments, Performance Intelligence, Burnout Intelligence, Organization Morale, Innovation Intelligence, Recognition Analytics, AI Intervention Center, Performance-Wellbeing Matrix, Economic Impact, What-if Simulator, Reports, Governance. Footer: PulseAI, Settings, profile (Rana Aziz). Frames H01-H07 are 1920 wide, the rest 1440.

| ID | Screen | Node | Route |
|---|---|---|---|
| H01 | Executive Pulse | 253:888 | /hr/executive |
| H02 | Organization | 253:1639 | /hr/organization |
| H02b | Professional Capability Distribution | 253:2158 | /hr/organization/capability |
| H03 | Employees | 253:4244 | /hr/employees |
| H03b | Employee Profile, Digital Twin | 253:4937 | /hr/employees/:id |
| H04 | Teams & Departments, Drill-down | 253:5980 | /hr/teams |
| H05 | Performance Intelligence | 253:6405 | /hr/performance |
| H06 | Burnout Intelligence | 253:7231 | /hr/burnout |
| H07 | Organization Morale | 253:7805 | /hr/morale |
| H08 | Innovation Intelligence | 191:874 | /hr/innovation |
| H09 | Recognition Analytics | 241:2 | /hr/recognition |
| H10 | AI Intervention Center | 241:3 | /hr/interventions |
| H11 | Performance-Wellbeing Matrix | 241:4 | /hr/matrix |
| H12 | Economic Impact | 241:5 | /hr/economic |
| H13 | What-if Simulator | 241:6 | /hr/simulator |
| H14 | Executive Reports | 241:7 | /hr/reports |
| H15 | Governance | 241:8 | /hr/governance |
| H16 | PulseAI, Organization | 241:9 | /hr/pulseai |

## Build order
- **Slice 1 (first vertical slice):** A01, A02, M06, M04b. Everything else copies the pattern.
- **Batch 1, Manager:** M01 to M13 (M04, M05, M10 first).
- **Batch 2, Employee:** E01 to E11.
- **Batch 3, HR/Exec:** H01 to H16.

## Known design quirks (do not copy blindly)
- The design is English, left-to-right. Build LTR first; keep text in i18n files so Arabic can be added later.
- Some small numbers differ between screens (all fixed in Figma already: Khalid wellbeing = 30 everywhere, Fairness Under 30 / 30-45 = 1.06).
- Design shows 1,240 people / 6 departments. The seed data must match this (not the 1,000 / 7 of the raw dataset).
