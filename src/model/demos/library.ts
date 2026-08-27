import type { Project } from "../document";
import {
  letter,
  contract,
  invoice,
  advancedInvoice,
  decisionNotice,
  memo,
  shippingLabel,
} from "./business";
import {
  email,
  paper,
  newspaper,
  landscapeSlide,
  a5Handout,
} from "./mass-publication";
import { welcome, resume } from "./personal";
import { buildYassinResume } from "../../projects/yassinResume";
import {
  resumeCreative,
  resumeSidebar,
  transformsDemo,
} from "./personal/resumes";
import { advertisement } from "./ads";
import { weddingInvite } from "./personal/wedding";
import { RESUME_PROFILES_CSV } from "./personal/resumeData";
import type { DemoEntry } from "./types";

export type { DemoEntry, DemoBucket } from "./types";
export { DEMO_BUCKET_LABEL, DEMO_BUCKET_ORDER } from "./types";


export const DEMO_LIBRARY: DemoEntry[] = [
  {
    id: "welcome",
    title: "Welcome",
    category: "Starter",
    bucket: "personal",
    blurb:
      "EN/FR/NL × Screen/PDF/Email/SMS/Print — switch Preview row + output kind.",
    sampleCsv: `name,company,role,language,event_date,qty,price
Ada Lovelace,Analytical Engines,Mathematician,en,2026-09-15,12,49.5
Alan Turing,Bletchley Park,Cryptanalyst,en,2026-10-01,3,120
Grace Hopper,US Navy,Rear Admiral,en,2026-08-20,8,75
Camille Moreau,Banque du Canal,Analyste,fr,2026-11-05,5,99
Léa Martin,Fjord Analytics,Chercheuse,fr,2026-07-18,2,210
Omar Haddad,Dispatchly,Engineer,en,2026-12-01,20,35
Sanne de Vries,Kanaal Bank,Analist,nl,2026-09-30,7,88
Pieter Bakker,Wolke Systems,Ontwikkelaar,nl,2026-06-12,1,450
Edsger Dijkstra,Texas Instruments,Computer Scientist,en,2026-05-01,4,60`,
    build: welcome,
  },
  {
    id: "letter",
    title: "Business letter",
    category: "Correspondence",
    bucket: "business",
    blurb: "Two-page US Letter with Northline styles and EN/FR body.",
    artboard: "letter",
    sampleCsv: `date,title,name,company,address,subject,topic,signer,role,ref,language
21 Aug 2026,Ms,Marcus Chen,Harbor Mutual,"12 Quay St, Rotterdam",Renewal of coverage,cyber liability,Jordan Hale,Account Executive,NL-4482,en
21 Aug 2026,Mr,Tom Ikeda,Brightline Co,"88 Market Ave, Lisbon",Onboarding pack,API access,Jordan Hale,Account Executive,NL-4483,en
22 Aug 2026,Dr,Priya Nair,Kanaal Bank,"5 Stationsplein, Rotterdam",Audit follow-up,data residency,Rowan Ellis,Client Success,NL-4484,en
25 Aug 2026,Mx,Sam Duval,Estudio Norte,"17 Rua Nova, Porto",Workshop invitation,design systems,Jordan Hale,Account Executive,NL-4485,en
28 Aug 2026,Mme,Camille Moreau,Banque du Canal,"12 Quai des Charbonnages, Brussels",Renouvellement de couverture,responsabilité cyber,Jordan Hale,Account Executive,NL-4490,fr
01 Sep 2026,M,Omar Haddad,Dispatchly,"22 Quai des Charbonnages, Brussels",Statement of account,freight billing,Petra Vos,Finance Lead,NL-4487,en
03 Sep 2026,Dr,Aiko Tanaka,Clara Health,"8 Kalverstraat, Amsterdam",Partnership draft,patient portal API,Petra Vos,Partnerships,NL-4488,en
08 Sep 2026,Mme,Léa Martin,Fjord Analytics,"3 Bryggen, Bergen",Dossier d'intégration,entrepôt,Jordan Hale,Account Executive,NL-4491,fr`,
    build: letter,
  },
  {
    id: "resume",
    title: "Resume — 9 profiles",
    category: "Career",
    bucket: "personal",
    blurb:
      "Two-page CV + cover letter; every field merges from Data. Flip the preview row to switch candidates.",
    sampleCsv: RESUME_PROFILES_CSV,
    build: resume,
  },
  {
    id: "yassin-bousaadi-resume",
    title: "Yassin Bousâadi — Resume",
    category: "Career",
    bucket: "personal",
    blurb: "Two-page static CV — no data rows required. Export as PDF from Render.",
    artboard: "a4",
    sampleCsv: "[{}]",
    build: buildYassinResume,
  },
  {
    id: "resume-sidebar",
    title: "Resume — sidebar",
    category: "Career",
    bucket: "personal",
    blurb: "Two-page CV — dark rail + projects page. Flip Data rows to switch candidates.",
    sampleCsv: RESUME_PROFILES_CSV,
    build: resumeSidebar,
  },
  {
    id: "resume-creative",
    title: "Resume — creative",
    category: "Career",
    bucket: "personal",
    blurb: "Two-page editorial CV with transforms, watermark, and case notes.",
    sampleCsv: RESUME_PROFILES_CSV,
    build: resumeCreative,
  },
  {
    id: "transforms",
    title: "Transforms studio",
    category: "Starter",
    bucket: "personal",
    blurb: "Three pages: stamps, mirrored surface, mobile artboard tips.",
    sampleCsv: RESUME_PROFILES_CSV,
    build: transformsDemo,
  },
  {
    id: "contract",
    title: "Service agreement",
    category: "Legal",
    bucket: "business",
    blurb: "MSA clauses, fee schedule, signatures.",
    sampleCsv: `contract_id,start_date,provider,client,net_days,term_years,jurisdiction,notice_days,approved,signer_name,signer_role,signed_at,line1,qty1,unit1,amt1,line2,qty2,unit2,amt2,total
MSA-2026-18,2026-09-01,Northline Systems BV,Acme Retail NV,30,3,Belgium,30,yes,Jordan Hale,Managing Director,2026-08-20,Platform license,1,yr,"€24,000",Support hours,40,hr,"€6,000","€30,000"
MSA-2026-19,2026-09-15,Northline Systems BV,Orbit Labs,45,2,Netherlands,60,no,Jordan Hale,Managing Director,2026-08-22,Implementation,1,proj,"€12,500",Training seats,8,seat,"€3,200","€15,700"
MSA-2026-20,2026-10-01,Northline Systems BV,Kanaal Bank,30,2,Belgium,45,pending,Rowan Ellis,Legal Counsel,2026-08-25,Data pipeline retainer,12,mo,"€9,600",On-call coverage,90,day,"€4,500","€14,100"
MSA-2026-21,2026-10-15,Northline Systems BV,Fleetwise BV,60,3,Netherlands,30,yes,Jordan Hale,Managing Director,2026-09-01,Telematics integration,1,proj,"€28,000",Managed hosting,12,mo,"€7,200","€35,200"
MSA-2026-22,2026-11-01,Northline Systems BV,Clara Health,45,4,Belgium,60,pending,Petra Vos,VP Partnerships,2026-09-05,Compliance review,1,proj,"€16,000",Security audits,4,qtr,"€5,600","€21,600"
MSA-2026-23,2026-11-15,Northline Systems BV,Wolke Systems,30,1,Belgium,30,yes,Jordan Hale,Managing Director,2026-09-10,Migration assessment,1,proj,"€8,400",Enablement workshops,6,day,"€2,700","€11,100"`,
    build: contract,
  },
  {
    id: "advertisement",
    title: "Print advertisement",
    category: "Marketing",
    bucket: "ads",
    blurb: "Hero + logo, dynamic promo amount, skus[] + stockists.",
    sampleCsv: `[
  {
    "eyebrow": "LIMITED RELEASE",
    "headline": "Carry less. Arrive ready.",
    "offer_copy": "Save 20% on Atlas Pack with code SPRING26. Designed for daily commute and weekend travel — one pack that replaces a suitcase of half-empty bags.",
    "valid_until": "2026-09-30",
    "promo_code": "SPRING26",
    "promo_label": "SAVE",
    "promo_amount": "20%",
    "cta": "Shop now",
    "store_url": "northline.example/atlas",
    "lot": "LOT-8821",
    "stockist_summary": "Northline Flagship, Brightline Co., and Kanaal Goods",
    "skus": [
      {"sku": "AP-41", "color": "Slate", "price": 189},
      {"sku": "AP-42", "color": "Sand", "price": 189}
    ]
  },
  {
    "eyebrow": "BUNDLE OFFER",
    "headline": "Built for the long commute.",
    "offer_copy": "Bundle Atlas Pack with the Day Sling and save €40 this month. Quiet zippers, padded harness, weatherproof shell.",
    "valid_until": "2026-09-30",
    "promo_code": "COMMUTE40",
    "promo_label": "SAVE",
    "promo_amount": "€40",
    "cta": "Pre-order",
    "store_url": "northline.example/atlas",
    "lot": "LOT-8821",
    "stockist_summary": "Northline Flagship and online",
    "skus": [
      {"sku": "AP-41", "color": "Slate", "price": 189},
      {"sku": "SL-07", "color": "Moss", "price": 89}
    ]
  },
  {
    "eyebrow": "NEW COLOURWAYS",
    "headline": "Rain-ready. City-proof.",
    "offer_copy": "Free dry-bag insert with every Atlas Pack this month. Storm Blue and Graphite ship first.",
    "valid_until": "2026-10-15",
    "promo_code": "DRYBAG",
    "promo_label": "FREE",
    "promo_amount": "INSERT",
    "cta": "Find a store",
    "store_url": "northline.example/atlas",
    "lot": "LOT-8904",
    "stockist_summary": "Kanaal Goods and Brightline Co.",
    "skus": [
      {"sku": "AP-43", "color": "Storm Blue", "price": 199},
      {"sku": "AP-44", "color": "Graphite", "price": 199},
      {"sku": "AP-41", "color": "Slate", "price": 189}
    ]
  },
  {
    "eyebrow": "WEEKENDER",
    "headline": "Pack for the weekend.",
    "offer_copy": "Weekender bundle: Atlas Pack 35L plus packing cubes at a single launch price.",
    "valid_until": "2026-10-31",
    "promo_code": "WEEKEND",
    "promo_label": "BUNDLE",
    "promo_amount": "−€30",
    "cta": "Reserve yours",
    "store_url": "northline.example/weekender",
    "lot": "LOT-9001",
    "stockist_summary": "Northline Flagship",
    "skus": [
      {"sku": "AW-12", "color": "Olive", "price": 219},
      {"sku": "AP-41", "color": "Slate", "price": 189}
    ]
  }
]`,
    build: advertisement,
  },
  {
    id: "email",
    title: "Email newsletter",
    category: "Email",
    bucket: "mass-publication",
    blurb: "Preheader, modules, unsubscribe footer.",
    sampleCsv: `preheader,title,first_name,intro,mod1_title,mod1_body,mod2_title,mod2_body,cta_label,cta_url,sender_name,sender_role,email,unsub_url,year,language
Your August digest is ready,Product updates for August,Maya,"Here is what shipped this month for your workspace.",Automations,Conditional emit to webhooks,Editor,Faster block resize on dense pages,Read the notes,https://northline.example/notes,Sam Ortega,Product,maya@client.example,https://northline.example/unsub,2026,en
Votre digest d'août,Mises à jour produit — août,Camille,"Voici ce qui a été livré ce mois-ci.",Automatisations,Émission conditionnelle vers webhooks,Éditeur,Redimensionnement plus rapide,Lire les notes,https://northline.example/notes,Sam Ortega,Product,camille@client.example,https://northline.example/unsub,2026,fr
September release notes,Autumn refresh is live,Noah,"Smaller fixes with outsized impact — the full changelog is one click away.",Templates,Saved templates sync across devices,Data view,Csv paste now maps columns automatically,See what changed,https://northline.example/changelog,Sam Ortega,Product,noah@client.example,https://northline.example/unsub,2026,en
You are on the early list,Beta: batch PDF export,Ivy,"As an early-access workspace you can now queue hundred-page exports.",Batch export,Queue up to 500 pages per job,Webhooks,Retry policy now configurable,Join the beta,https://northline.example/beta,Priya Anand,Engineering,ivy@client.example,https://northline.example/unsub,2026,en
A faster Data view landed,Performance update,Omar,"Large datasets scroll smoothly again after this week's tuning.",Virtual lists,Hundred-thousand-row sheets stay at 60fps,Filters,Column search now matches type aliases,Open the app,https://northline.example/login,Priya Anand,Engineering,omar@client.example,https://northline.example/unsub,2026,en
Invitation: templating meetup October,Talks and workshops,Elif,"Northline hosts a community evening on document automation in Antwerp.",Program,Three talks plus open clinic time,Venue,Harbor Lane studio doors at 18:30,RSVP here,https://northline.example/meetup,Dana Willems,Community,elif@client.example,https://northline.example/unsub,2026,en
Your invoice is ready (no action needed),Receipt for September billing,Lucas,"This is a courtesy copy of your automated monthly receipt.",Billing,Plan: Studio — €29.00 incl VAT,Usage,4,120 documents rendered in September,View billing,https://northline.example/billing,Northline Billing,Finance,lucas@client.example,https://northline.example/unsub,2026,en
Welcome week: getting started,Onboarding track for new workspaces,Amir,"Five short lessons to get your first merged PDF out the door.",Lesson 1,Load data from csv or json,Lesson 2,Compose blocks and bind fields,Start lesson 1,https://northline.example/start,Dana Willems,Community,amir@client.example,https://northline.example/unsub,2026,en`,
    build: email,
  },
  {
    id: "invoice",
    title: "Commercial invoice",
    category: "Finance",
    bucket: "business",
    blurb: "Bill-to, SKU line_items, tax, bank lookup, product file pack per SKU.",
    sampleCsv: `[
  {
    "invoice_no": "INV-1042",
    "invoice_date": "2026-08-01",
    "due_date": "2026-08-31",
    "bill_name": "Finance Desk",
    "bill_company": "Acme Retail",
    "bill_address": "12 Quay St",
    "ship_name": "Warehouse 3",
    "ship_address": "Dock 4, Port",
    "subtotal": 2555,
    "tax_pct": 21,
    "tax": 536.55,
    "shipping": 0,
    "currency": "EUR",
    "total": 3091.55,
    "terms": "Net 30",
    "status": "open",
    "signer_name": "Jordan Hale",
    "signer_role": "Accounts receivable",
    "pack_file_count": 9,
    "line_items": [
      {"sku": "PLT-ENT", "hs_code": "8523.49", "description": "Platform fee — Enterprise tier", "qty": 1, "rate": 2000, "amount": 2000, "file_count": 3, "files_label": "Master agreement · SLA · SOC 2 letter"},
      {"sku": "SEA-001", "hs_code": "8523.49", "description": "Named seats (12)", "qty": 12, "rate": 40, "amount": 480, "file_count": 2, "files_label": "Seat schedule · Access provisioning"},
      {"sku": "OVG-MTR", "hs_code": "8523.49", "description": "Document overage (Aug)", "qty": 3, "rate": 25, "amount": 75, "file_count": 1, "files_label": "Usage meter export"}
    ],
    "product_files": [
      {"sku": "PLT-ENT", "document": "master-agreement-v3.pdf", "doc_type": "Contract", "size_kb": 890},
      {"sku": "PLT-ENT", "document": "sla-enterprise.pdf", "doc_type": "SLA", "size_kb": 420},
      {"sku": "PLT-ENT", "document": "soc2-type2-letter.pdf", "doc_type": "Compliance", "size_kb": 156},
      {"sku": "SEA-001", "document": "seat-allocation-aug.xlsx", "doc_type": "Schedule", "size_kb": 48},
      {"sku": "SEA-001", "document": "provisioning-checklist.pdf", "doc_type": "Delivery", "size_kb": 92},
      {"sku": "OVG-MTR", "document": "usage-meter-aug.csv", "doc_type": "Metering", "size_kb": 24},
      {"sku": "PLT-ENT", "document": "dpa-amendment.pdf", "doc_type": "Legal", "size_kb": 210},
      {"sku": "SEA-001", "document": "onboarding-signoff.pdf", "doc_type": "Delivery", "size_kb": 64},
      {"sku": "OVG-MTR", "document": "overage-calc-workpaper.pdf", "doc_type": "Finance", "size_kb": 38}
    ]
  },
  {
    "invoice_no": "INV-0991",
    "invoice_date": "2026-07-01",
    "due_date": "2026-07-15",
    "bill_name": "AP Team",
    "bill_company": "Orbit Labs",
    "bill_address": "1 Orbit Way",
    "ship_name": "Same",
    "ship_address": "",
    "subtotal": 1200,
    "tax_pct": 21,
    "tax": 252,
    "shipping": 15,
    "currency": "EUR",
    "total": 1467,
    "terms": "Net 15",
    "status": "past_due",
    "pack_file_count": 4,
    "line_items": [
      {"sku": "RET-QTR", "hs_code": "8523.49", "description": "Quarterly retainer", "qty": 1, "rate": 1200, "amount": 1200, "file_count": 4, "files_label": "SOW · Milestone plan · Signed PO · Insurance cert"}
    ],
    "product_files": [
      {"sku": "RET-QTR", "document": "sow-q3.pdf", "doc_type": "Contract", "size_kb": 520},
      {"sku": "RET-QTR", "document": "milestone-plan.xlsx", "doc_type": "Schedule", "size_kb": 76},
      {"sku": "RET-QTR", "document": "po-orbit-8841.pdf", "doc_type": "PO", "size_kb": 134},
      {"sku": "RET-QTR", "document": "insurance-certificate.pdf", "doc_type": "Compliance", "size_kb": 188}
    ]
  },
  {
    "invoice_no": "INV-1043",
    "invoice_date": "2026-08-03",
    "due_date": "2026-09-02",
    "bill_name": "Billing",
    "bill_company": "Kanaal Bank",
    "bill_address": "5 Stationsplein, Rotterdam",
    "ship_name": "Ops",
    "ship_address": "Floor 2",
    "subtotal": 1310,
    "tax_pct": 21,
    "tax": 275.1,
    "shipping": 0,
    "currency": "EUR",
    "total": 1585.1,
    "terms": "Net 30",
    "status": "open",
    "pack_file_count": 8,
    "line_items": [
      {"sku": "DAT-PIPE", "hs_code": "8471.50", "description": "Data pipeline subscription", "qty": 1, "rate": 800, "amount": 800, "file_count": 3, "files_label": "Architecture brief · Uptime report · DPA"},
      {"sku": "CON-API", "hs_code": "8471.50", "description": "API connectors (6)", "qty": 6, "rate": 60, "amount": 360, "file_count": 2, "files_label": "Connector matrix · OAuth scopes"},
      {"sku": "SUP-STD", "hs_code": "8471.50", "description": "Standard support", "qty": 1, "rate": 150, "amount": 150, "file_count": 1, "files_label": "Support entitlement"}
    ],
    "product_files": [
      {"sku": "DAT-PIPE", "document": "pipeline-architecture.pdf", "doc_type": "Spec", "size_kb": 640},
      {"sku": "DAT-PIPE", "document": "uptime-july.pdf", "doc_type": "Report", "size_kb": 112},
      {"sku": "DAT-PIPE", "document": "dpa-banking.pdf", "doc_type": "Legal", "size_kb": 240},
      {"sku": "CON-API", "document": "connector-catalog.xlsx", "doc_type": "Matrix", "size_kb": 88},
      {"sku": "CON-API", "document": "oauth-scope-sheet.pdf", "doc_type": "Security", "size_kb": 54},
      {"sku": "SUP-STD", "document": "support-entitlement.pdf", "doc_type": "Delivery", "size_kb": 36},
      {"sku": "CON-API", "document": "sandbox-test-results.pdf", "doc_type": "QA", "size_kb": 142},
      {"sku": "DAT-PIPE", "document": "dr-runbook.pdf", "doc_type": "Ops", "size_kb": 198}
    ]
  },
  {
    "invoice_no": "INV-1046",
    "invoice_date": "2026-08-12",
    "due_date": "2026-09-11",
    "bill_name": "Procurement",
    "bill_company": "Wolke Systems",
    "bill_address": "Torstraße 84, Berlin",
    "ship_name": "DC West",
    "ship_address": "Rack 12",
    "subtotal": 9040,
    "tax_pct": 19,
    "tax": 1717.6,
    "shipping": 120,
    "currency": "EUR",
    "total": 10877.6,
    "terms": "Net 30",
    "status": "pending",
    "pack_file_count": 11,
    "line_items": [
      {"sku": "MIG-ASM", "hs_code": "8471.50", "description": "Migration assessment", "qty": 1, "rate": 7000, "amount": 7000, "file_count": 4, "files_label": "Discovery report · Cutover plan · Risk register · Sign-off"},
      {"sku": "WS-DAY", "hs_code": "8471.50", "description": "Workshop days", "qty": 3, "rate": 600, "amount": 1800, "file_count": 3, "files_label": "Agenda · Attendance · Action log"},
      {"sku": "TRV-EU", "hs_code": "9999.00", "description": "Travel — Berlin onsite", "qty": 1, "rate": 240, "amount": 240, "file_count": 2, "files_label": "Receipts · Expense policy waiver"}
    ],
    "product_files": [
      {"sku": "MIG-ASM", "document": "discovery-report.pdf", "doc_type": "Assessment", "size_kb": 1240},
      {"sku": "MIG-ASM", "document": "cutover-plan-v2.pdf", "doc_type": "Plan", "size_kb": 680},
      {"sku": "MIG-ASM", "document": "risk-register.xlsx", "doc_type": "Risk", "size_kb": 96},
      {"sku": "MIG-ASM", "document": "steering-signoff.pdf", "doc_type": "Approval", "size_kb": 142},
      {"sku": "WS-DAY", "document": "workshop-agenda.pdf", "doc_type": "Agenda", "size_kb": 58},
      {"sku": "WS-DAY", "document": "attendance-sheet.pdf", "doc_type": "Delivery", "size_kb": 44},
      {"sku": "WS-DAY", "document": "action-log.xlsx", "doc_type": "Follow-up", "size_kb": 52},
      {"sku": "TRV-EU", "document": "travel-receipts.pdf", "doc_type": "Expense", "size_kb": 320},
      {"sku": "TRV-EU", "document": "policy-waiver.pdf", "doc_type": "Finance", "size_kb": 28},
      {"sku": "MIG-ASM", "document": "data-residency-map.pdf", "doc_type": "Compliance", "size_kb": 176},
      {"sku": "WS-DAY", "document": "workshop-deck.pdf", "doc_type": "Training", "size_kb": 890}
    ]
  }
]`,
    build: invoice,
  },
  {
    id: "paper",
    title: "Research paper",
    category: "Publishing",
    bucket: "mass-publication",
    blurb: "Cover, multi-page article body, figures & references.",
    sampleCsv: `journal,volume,year,paper_title,authors,affiliation,abstract,keywords,figure_caption
Journal of Applied Templates,14,2026,"Adaptive document composition under sparse data regimes","A. Ng · M. Costa · L. Berg",Northline Research Institute,"We study how conditional blocks and output-aware workflows improve bulk document fidelity when source rows are incomplete. Experiments on letter and invoice corpora show reduced manual correction with sandboxed expressions.","templating, conditional rendering, bulk PDF",Revenue trajectory under three merge strategies
Journal of Applied Templates,13,2025,"Sandboxed expressions for print pipelines","R. Osei · T. Lindqvist",Nordic Doc Lab,"Print pipelines increasingly evaluate user-authored expressions at render time. We characterise the attack surface and propose a capability-based sandbox with measurable overhead under two milliseconds per page.","security, expressions, print pipeline",Overhead distribution across 10k synthetic pages
Proc. DocEng Workshop,9,2025,"Merge-field semantics: a field study of 40 templates","J. Ferreira",University of Porto,"Interviews with template authors reveal recurring ambiguity around missing values and defaults. We distil eight semantic rules adopted by practitioners and formalise them as a type system.","merge fields, semantics, practitioner studies",Ambiguity classes observed across the corpus
Journal of Applied Templates,12,2024,"Trust boundaries in templating runtimes","D. Okafor",Lagos Systems Group,"We formalise trust boundaries between data providers, template authors and output sinks, and show how boundary violations map to real incidents reported by bulk-mail operators.","runtime security, bulk documents, incident analysis",Incident timeline clustered by boundary crossed
Intl. Journal of Document Automation,7,2024,"Layout constraints from natural-language briefs","H. Yamada · P. Costa",Kyoto Media Lab,"Marketing briefs arrive as prose; layouts arrive as grids. We train a constraint extractor that maps brief sentences to alignment and density constraints with 91% agreement on our annotated set.","layout inference, nlp, advertising",Agreement by constraint category
Bulletin of the NLP Society,31,2023,"Row-level evaluation for conditional text","K. Berg · A. Ng",Northline Research Institute,"Conditional prose blocks are typically evaluated per document; we define row-level evaluation semantics that preserve coherence across multi-row merges and reduce reviewer load in letter campaigns.","conditionals, evaluation semantics, letters",Reviewer minutes saved per thousand letters`,
    build: paper,
  },
  {
    id: "newspaper",
    title: "City newspaper",
    category: "Publishing",
    bucket: "mass-publication",
    blurb: "Landscape broadsheet: masthead, columns, EN/FR, email slim.",
    artboard: "landscape",
    sampleCsv: `edition,city,volume,headline,headline_fr,lede,lede_fr,byline,language,pull_quote,body_col1,body_col2
Canal,Brussels,42,"City rolls out personalized municipal letters","La ville déploie des courriers municipaux personnalisés","Officials say merge templates will replace generic flyers for tax and permit notices starting next quarter.","Les autorités indiquent que les modèles de fusion remplaceront les flyers génériques dès le prochain trimestre.",Maya Chen,en,"One master page. Many languages.","City officials confirmed overnight that the new document pipeline will cut print turnaround for municipal notices. Residents will see personalized letters instead of generic flyers starting next quarter.","Editors praised the merge-field approach for keeping French and Dutch editions in sync without duplicating layouts. A slim email edition strips side columns for inbox reading."
Harbor,Rotterdam,42,"Port authority digitizes boarding passes","L'autorité portuaire numérise les cartes d'embarquement","Crew manifests now drive same-day print runs with QR codes and language variants for inland crews.","Les manifests d'équipage alimentent désormais des tirages le jour même avec QR et variantes linguistiques.",Tom Ikeda,en,"Scan once. Board anywhere.","Harbor ops linked passenger rows to a landscape boarding layout with folio and byline chrome for crew briefings.","French crews receive the same page with headline and lede variants — no forked InDesign files."
Meuse,Liège,41,"Schools pilot bilingual report cards","Les écoles testent des bulletins bilingues","Parents receive EN or FR from one template; email preview drops the pull-quote rail.","Les parents reçoivent EN ou FR depuis un seul modèle ; l'aperçu email retire la colonne citation.",Camille Moreau,fr,"Un modèle. Deux langues.","Les établissements du bassin de la Meuse testent des bulletins générés par fusion avec date d'édition automatique.","La variante email conserve le chapeau et le corps en une colonne pour la lecture sur téléphone."`,
    build: newspaper,
  },
  {
    id: "label",
    title: "Shipping label",
    category: "Logistics",
    bucket: "business",
    blurb: "Thermal label, barcode, device hints.",
    sampleCsv: `carrier,service,tracking,from_name,from_address,to_name,to_address,weight,dims,zone,ship_date
Northline Parcel,Express,NL9 4482 0199 3,Northline DC,"14 Harbor Lane",Marcus Chen,"12 Quay St, Rotterdam",2.4kg,30x20x10,B,2026-08-21
Northline Parcel,Standard,NL9 4482 0201 8,Northline DC,"14 Harbor Lane",Tom Ikeda,"88 Market Ave, Lisbon",1.1kg,20x15x8,C,2026-08-22
Northline Parcel,Express,NL9 4483 0117 5,Northline DC,"14 Harbor Lane",Priya Nair,"5 Stationsplein, Rotterdam",0.8kg,25x18x6,B,2026-08-22
Northline Freight,Pallet,NL9 5511 0088 2,Northline DC,"14 Harbor Lane",Wolke Systems,"Torstraße 84, Berlin",84kg,120x80x90,D,2026-08-23
Northline Parcel,Standard,NL9 4483 0121 9,Northline DC,"14 Harbor Lane",Sofia Reyes,"C/ Mallorca 21, Barcelona",1.6kg,30x20x10,E,2026-08-24
Northline Parcel,Express,NL9 4484 0004 1,Northline DC,"14 Harbor Lane",Omar Haddad,"22 Quai des Charbonnages, Brussels",3.2kg,40x30x15,B,2026-08-25
Northline Parcel,Economy,NL9 4484 0019 6,Northline DC,"14 Harbor Lane",Ivy Chen,"12 Rue Haute, Brussels",0.5kg,20x15x8,A,2026-08-26
Northline Freight,Pallet,NL9 5512 0340 7,Northline DC,"14 Harbor Lane",Kanaal Bank,"5 Stationsplein, Rotterdam",210kg,120x100x110,D,2026-08-27`,
    build: shippingLabel,
  },
  {
    id: "memo",
    title: "Internal memo",
    category: "Office",
    bucket: "business",
    blurb: "Memo header, agenda table from JSON array, actions.",
    sampleCsv: `[
  {
    "to": "All managers",
    "from": "PMO Office",
    "date": "2026-08-21",
    "subject": "Q3 planning checkpoint",
    "subject_fr": "Point de planification T3",
    "language": "en",
    "body": "Please review the agenda below ahead of Thursday's session. Bring capacity notes for your squads.",
    "action1": "Publish capacity sheet",
    "action2": "Confirm room booking",
    "decision_date": "2026-08-28",
    "agenda": [
      {"time": "09:00", "topic": "Goals recap", "owner": "Alex"},
      {"time": "09:25", "topic": "Risk register", "owner": "Sam"},
      {"time": "09:50", "topic": "Staffing asks", "owner": "Jordan"}
    ]
  },
  {
    "to": "Engineering chapter leads",
    "from": "Platform Group",
    "date": "2026-08-28",
    "subject": "Migration wave 4 retro",
    "subject_fr": "Rétro vague 4 de migration",
    "language": "en",
    "body": "Retro pack is attached as pre-read. Come with one thing that worked and one to change.",
    "action1": "Fold learnings into wave 5 plan",
    "action2": "Nominate retro scribe",
    "decision_date": "2026-09-04",
    "agenda": [
      {"time": "10:00", "topic": "Timeline review", "owner": "Priya"},
      {"time": "10:20", "topic": "Cost drift", "owner": "Noah"},
      {"time": "10:45", "topic": "Runbook gaps", "owner": "Ivy"}
    ]
  },
  {
    "to": "Support guild",
    "from": "Operations",
    "date": "2026-09-02",
    "subject": "Holiday coverage & escalation",
    "subject_fr": "Couverture congés et escalade",
    "language": "fr",
    "body": "Draft rota attached; we will walk the escalation ladder end to end.",
    "action1": "Publish final rota",
    "action2": "Update on-call handbook",
    "decision_date": "2026-09-09",
    "agenda": [
      {"time": "09:15", "topic": "Rota walkthrough", "owner": "Lena"},
      {"time": "09:35", "topic": "Escalation ladder", "owner": "Omar"},
      {"time": "10:00", "topic": "SLA exceptions", "owner": "Sofia"}
    ]
  }
]`,
    build: memo,
  },
  {
    id: "advanced-invoice",
    title: "Advanced invoice (repeat)",
    category: "Finance",
    bucket: "business",
    blurb:
      "Status condition axis + repeater — Preview chips flip overdue/open/paid on Page.",
    sampleCsv: `[
  {
    "invoice_no": "INV-2201",
    "invoice_date": "2026-08-01",
    "due_date": "2026-08-31",
    "bill_name": "Finance Desk",
    "bill_company": "Acme Retail",
    "bill_address": "12 Quay St",
    "status": "open",
    "total": 3091.55,
    "line_items": [
      {"description": "Platform fee", "qty": 1, "amount": 2000},
      {"description": "Seats", "qty": 12, "amount": 480},
      {"description": "Overage", "qty": 3, "amount": 75}
    ]
  },
  {
    "invoice_no": "INV-2188",
    "invoice_date": "2026-07-01",
    "due_date": "2026-07-15",
    "bill_name": "AP Team",
    "bill_company": "Orbit Labs",
    "bill_address": "1 Orbit Way",
    "status": "past_due",
    "total": 1467,
    "line_items": [
      {"description": "Retainer", "qty": 1, "amount": 1200},
      {"description": "Priority support", "qty": 1, "amount": 267}
    ]
  },
  {
    "invoice_no": "INV-2214",
    "invoice_date": "2026-08-04",
    "due_date": "2026-09-03",
    "bill_name": "Billing",
    "bill_company": "Kanaal Bank",
    "bill_address": "5 Stationsplein, Rotterdam",
    "status": "open",
    "total": 1585.1,
    "line_items": [
      {"description": "Data pipeline fee", "qty": 1, "amount": 800},
      {"description": "Connectors", "qty": 6, "amount": 360},
      {"description": "Support", "qty": 1, "amount": 150}
    ]
  },
  {
    "invoice_no": "INV-2150",
    "invoice_date": "2026-06-01",
    "due_date": "2026-06-30",
    "bill_name": "Procurement",
    "bill_company": "Fleetwise BV",
    "bill_address": "9 Havenweg, Antwerp",
    "status": "paid",
    "total": 1828.54,
    "line_items": [
      {"description": "Telematics licence", "qty": 14, "amount": 490},
      {"description": "Install days", "qty": 2, "amount": 900},
      {"description": "SIM plans", "qty": 14, "amount": 84}
    ]
  },
  {
    "invoice_no": "INV-2230",
    "invoice_date": "2026-08-18",
    "due_date": "2026-09-17",
    "bill_name": "IT",
    "bill_company": "Clara Health",
    "bill_address": "40 Meir, Antwerp",
    "status": "open",
    "total": 6679.2,
    "line_items": [
      {"description": "Compliance audit", "qty": 1, "amount": 4000},
      {"description": "Remediation hours", "qty": 16, "amount": 1520}
    ]
  }
]`,
    build: advancedInvoice,
  },
  {
    id: "decision-notice",
    title: "Decision notice",
    category: "Legal",
    bucket: "business",
    blurb:
      "Declare a decision axis; Preview chips flip approved/pending/revoked on the same Page.",
    sampleCsv: `name,case_id,decision,decision_date,reason
Marcus Chen,CASE-4412,approved,2026-08-20,Your access request for the Harbor Mutual workspace is approved.
Priya Nair,CASE-4418,pending,2026-08-22,Compliance is reviewing the data residency addendum.
Omar Haddad,CASE-4421,revoked,2026-08-25,Prior approval is withdrawn after the scope change on 24 Aug.
Camille Moreau,CASE-4425,approved,2026-08-26,Partnership pilot for Banque du Canal is cleared to start.
Léa Martin,CASE-4429,revoked,2026-08-27,Temporary credentials are invalidated; return badges to Security.
`,
    build: decisionNotice,
  },
  {
    id: "landscape-slide",
    title: "Landscape slide",
    category: "Presentation",
    bucket: "mass-publication",
    blurb: "960×540 artboard with Screen / Page / Email conditional blocks.",
    artboard: "landscape",
    sampleCsv: `title,body,company
Q3 roadmap,"Ship bulk merge, then landscape templates, then multi-dataset lookup.",Northline
Hire kit,"Welcome packet for {{company}} engineering onboarding.",Harbor Mutual
`,
    build: landscapeSlide,
  },
  {
    id: "a5-handout",
    title: "A5 handout",
    category: "Print",
    bucket: "mass-publication",
    blurb: "505×714 one-pager with highlights and output-specific footer.",
    artboard: "a5",
    sampleCsv: `date,title,body,company,contact,highlight_1,highlight_2,highlight_3
25 Aug 2026,Workshop invite,"Join us for a half-day session on bulk merge and template design. Bring your CSV samples — we will wire conditions live.",Northline Systems,ops@northline.example,Live merge demo,Landscape + A5 artboards,Output-kind conditions
01 Sep 2026,Product brief,"Compact flyer for desk distribution. Fields bind from Data; switch preview row for alternate campaigns.",Harbor Mutual,hello@harbor.example,Multi-dataset lookup,Print-safe margins,Pinned header/footer
`,
    build: a5Handout,
  },
  {
    id: "wedding",
    title: "Wedding invitation",
    category: "Celebration",
    bucket: "personal",
    blurb: "Bilingual Northline invite — EN/FR guest lines and invitation document style.",
    artboard: "a5",
    sampleCsv: `guest_name,partner_name,date,venue,city,rsvp_by,language
Amélie Dupont,Thomas Renard,2027-06-14,Orangerie Harbor Lane,Antwerp,2027-05-01,fr
Marcus Chen,Priya Nair,2027-06-14,Orangerie Harbor Lane,Antwerp,2027-05-01,en
Sofia Reyes,,2027-06-14,Orangerie Harbor Lane,Antwerp,2027-05-01,en
Léa Martin,Noah Berg,2027-06-14,Orangerie Harbor Lane,Antwerp,2027-05-01,fr`,
    build: weddingInvite,
  },

];

export function getDemo(id: string): DemoEntry | undefined {
  return DEMO_LIBRARY.find((d) => d.id === id);
}

export function createDemoProject(): Project {
  return welcome();
}
