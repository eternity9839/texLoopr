/**
 * Personal project — local CV (not shipped in the app sample catalog).
 * Print-friendly A4 engineering résumé composed in texLooper.
 * Regenerate JSON: nix develop -c npx --yes tsx scripts/write-yassin-resume.ts
 * Open locally: texLooper menu → Open JSON → projects/yassin-bousaadi-resume.json
 */
import type { Block, CustomObject, Project } from "../model/document";
import { b, id, page, shell } from "../model/demos/helpers";
import { customObjectFromGroup } from "../model/groups";
import { defaultOutputs } from "../model/workflow";

const GREEN = "#006e46";
const GREEN_DEEP = "#004d32";
const GREEN_SOFT = "#e8f3ed";
const GREEN_MID = "#b7d4c4";
const GREEN_PILL = "#d7ebe0";
const GREEN_WASH = "#f3f8f5";
const INK = "#14231c";
const MUTED = "#5c7468";
const RULE = "#c5d4cb";
const X = 48;
const W = 618;
const PAGE_H = 1010;
/** Shared left edge for section titles, jobs, and body copy. */
const CONTENT_X = 16;
const PILL_W = 148;

export type ExperienceEntry = {
  company: string;
  title: string;
  place: string;
  dates: string;
  bullets: string[];
};

export type EducationEntry = {
  kind: string;
  field: string;
  school: string;
  dates: string;
};

export type CertificationEntry = {
  name: string;
  year: string;
};

export type SkillTier = "expert" | "proficient" | "working";

export type SkillItem = { name: string; tier: SkillTier };

export type SkillCategory = {
  label: string;
  items: SkillItem[];
};

const TIER_CHIP: Record<
  SkillTier,
  { bg: string; color: string; border: string; weight: number; borderWidth: number }
> = {
  expert: {
    bg: GREEN,
    color: "#ffffff",
    border: GREEN,
    weight: 700,
    borderWidth: 0,
  },
  proficient: {
    bg: GREEN_PILL,
    color: GREEN_DEEP,
    border: GREEN_MID,
    weight: 600,
    borderWidth: 0,
  },
  working: {
    bg: "#ffffff",
    color: MUTED,
    border: RULE,
    weight: 500,
    borderWidth: 1,
  },
};

function accentBar(): Block[] {
  return [
    b("shape", {
      name: "Accent bar",
      x: 0,
      y: 0,
      w: 12,
      h: PAGE_H,
      content: { shape: "rect", filled: true },
      style: { background: GREEN },
      zIndex: 0,
      pin: { left: true, top: true, bottom: true },
    }),
    b("shape", {
      name: "Accent soft",
      x: 12,
      y: 0,
      w: 4,
      h: PAGE_H,
      content: { shape: "rect", filled: true },
      style: { background: GREEN_MID, opacity: 0.55 },
      zIndex: 0,
      pin: { left: true, top: true, bottom: true },
    }),
  ];
}

function section(label: string, y: number): Block[] {
  return [
    b("shape", {
      name: `Accent ${label}`,
      x: X,
      y: y + 3,
      w: 9,
      h: 9,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: { background: GREEN, borderRadius: 2 },
    }),
    b("text", {
      name: `H ${label}`,
      x: X + 16,
      y,
      w: W - 16,
      h: 16,
      content: { text: label },
      style: {
        fontFamily: "ui",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1.8,
        color: GREEN,
      },
    }),
    b("shape", {
      name: `Rule ${label}`,
      x: X,
      y: y + 18,
      w: W,
      h: 2,
      content: { shape: "rect", filled: true },
      style: { background: GREEN },
    }),
  ];
}

function contactLink(
  name: string,
  x: number,
  y: number,
  w: number,
  opts: { hook: "mailto" | "tel" | "url"; target: string; label: string },
): Block {
  return b("link", {
    name,
    x,
    y,
    w,
    h: 16,
    content: {
      hook: opts.hook,
      target: opts.target,
      label: opts.label,
    },
    style: {
      fontFamily: "ui",
      fontSize: 9.5,
      fontWeight: 600,
      color: GREEN_DEEP,
      background: "transparent",
      textDecoration: "none",
      verticalAlign: "middle",
      whiteSpace: "nowrap",
    },
    zIndex: 1,
  });
}

function contactSep(name: string, x: number, y: number): Block {
  return b("text", {
    name,
    x,
    y,
    w: 10,
    h: 16,
    content: { text: "·" },
    style: {
      fontFamily: "ui",
      fontSize: 9.5,
      fontWeight: 600,
      color: GREEN_MID,
      textAlign: "center",
      verticalAlign: "middle",
    },
    zIndex: 1,
  });
}

/** Relative blocks inside an experience group (origin 0,0). */
export function experienceGroupChildren(opts: ExperienceEntry): Block[] {
  const listH = Math.max(44, opts.bullets.length * 22 + 8);
  const groupH = 38 + listH;
  const contentW = W;
  const titleW = contentW - PILL_W - 12 - CONTENT_X;

  return [
    b("shape", {
      name: "Job stripe",
      x: 0,
      y: 0,
      w: 3,
      h: groupH,
      content: { shape: "rect", filled: true },
      style: { background: GREEN_MID, borderRadius: 2 },
      zIndex: 0,
    }),
    b("shape", {
      name: "Date pill",
      x: W - PILL_W,
      y: -1,
      w: PILL_W,
      h: 20,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: { background: GREEN_PILL, borderRadius: 10 },
      zIndex: 1,
    }),
    b("text", {
      name: "Job title",
      x: CONTENT_X,
      y: 0,
      w: titleW,
      h: 18,
      content: { text: opts.title },
      style: {
        fontFamily: "ui",
        fontSize: 12,
        fontWeight: 700,
        color: INK,
      },
      zIndex: 2,
    }),
    b("text", {
      name: "Job dates",
      x: W - PILL_W,
      y: 0,
      w: PILL_W,
      h: 18,
      content: { text: opts.dates },
      style: {
        fontFamily: "ui",
        fontSize: 9.5,
        fontWeight: 600,
        color: GREEN_DEEP,
        textAlign: "center",
        verticalAlign: "middle",
      },
      zIndex: 2,
    }),
    b("text", {
      name: "Job place",
      x: CONTENT_X,
      y: 18,
      w: contentW - CONTENT_X,
      h: 16,
      content: { text: `${opts.company}  ·  ${opts.place}` },
      style: {
        fontFamily: "ui",
        fontSize: 10.5,
        fontStyle: "italic",
        color: MUTED,
      },
      zIndex: 2,
    }),
    b("list", {
      name: "Job bullets",
      x: CONTENT_X,
      y: 38,
      w: contentW - CONTENT_X,
      h: listH,
      content: { items: opts.bullets, markerColor: GREEN },
      style: {
        fontFamily: "doc",
        fontSize: 10.5,
        lineHeight: 1.38,
        color: INK,
        listStyle: "disc",
      },
      zIndex: 2,
    }),
  ];
}

export function experienceGroupHeight(opts: ExperienceEntry): number {
  const listH = Math.max(44, opts.bullets.length * 22 + 8);
  return 38 + listH;
}

/** Page-level experience group — duplicate in the editor or from custom objects. */
export function experienceGroup(y: number, opts: ExperienceEntry): Block {
  const h = experienceGroupHeight(opts);
  return {
    id: id(),
    type: "group",
    name: `${opts.company} · ${opts.title}`,
    x: X,
    y,
    w: W,
    h,
    content: { blocks: experienceGroupChildren(opts) },
    style: {},
    zIndex: 1,
  };
}

/** Saved component for toolbox → duplicate new experience rows. */
export function experienceEntryTemplate(): CustomObject {
  return customObjectFromGroup(
    experienceGroup(0, {
      company: "Company",
      title: "Role title",
      place: "City, Country",
      dates: "Mon YYYY – Present",
      bullets: [
        "Lead with impact — compliance, automation, or reliability outcome.",
        "Tools and practices: Terraform, Ansible, CI/CD, observability…",
        "Collaboration across security, dev, and ops in Agile delivery.",
      ],
    }),
    "Experience entry",
  );
}

function educationEntryRow(y: number, entry: EducationEntry, index: number): Block[] {
  const dateW = 118;
  const blocks: Block[] = [];

  if (index > 0) {
    blocks.push(
      b("shape", {
        name: `Edu rule ${index}`,
        x: 12,
        y,
        w: W - 24,
        h: 1,
        content: { shape: "rect", filled: true },
        style: { background: GREEN_PILL },
        zIndex: 0,
      }),
    );
  }

  blocks.push(
    b("shape", {
      name: `Edu dot ${index}`,
      x: 8,
      y: y + 14,
      w: 6,
      h: 6,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: { background: GREEN, borderRadius: 3 },
      zIndex: 1,
    }),
    b("text", {
      name: `Edu kind ${index}`,
      x: 22,
      y: y + 4,
      w: 100,
      h: 12,
      content: { text: entry.kind },
      style: {
        fontFamily: "ui",
        fontSize: 8.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1.2,
        color: GREEN,
      },
      zIndex: 1,
    }),
    b("text", {
      name: `Edu field ${index}`,
      x: 22,
      y: y + 16,
      w: W - dateW - 36,
      h: 16,
      content: { text: entry.field },
      style: {
        fontFamily: "ui",
        fontSize: 11,
        fontWeight: 700,
        color: INK,
      },
      zIndex: 1,
    }),
    b("text", {
      name: `Edu school ${index}`,
      x: 22,
      y: y + 30,
      w: W - dateW - 36,
      h: 12,
      content: { text: entry.school },
      style: {
        fontFamily: "doc",
        fontSize: 9.5,
        fontStyle: "italic",
        color: MUTED,
      },
      zIndex: 1,
    }),
    b("shape", {
      name: `Edu date pill ${index}`,
      x: W - dateW,
      y: y + 10,
      w: dateW,
      h: 18,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: { background: GREEN_PILL, borderRadius: 9 },
      zIndex: 1,
    }),
    b("text", {
      name: `Edu dates ${index}`,
      x: W - dateW,
      y: y + 10,
      w: dateW,
      h: 18,
      content: { text: entry.dates },
      style: {
        fontFamily: "ui",
        fontSize: 9,
        fontWeight: 600,
        color: GREEN_DEEP,
        textAlign: "center",
        verticalAlign: "middle",
      },
      zIndex: 2,
    }),
  );

  return blocks;
}

function educationSection(y: number, entries: EducationEntry[]): Block[] {
  const rowH = 44;
  const cardH = entries.length * rowH + 16;
  const blocks: Block[] = [
    b("shape", {
      name: "Education card",
      x: 0,
      y: 0,
      w: W,
      h: cardH,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: {
        background: "#ffffff",
        borderWidth: 1.5,
        borderColor: GREEN_MID,
        borderRadius: 6,
      },
      zIndex: 0,
    }),
    b("shape", {
      name: "Education card accent",
      x: 0,
      y: 0,
      w: 4,
      h: cardH,
      content: { shape: "rect", filled: true },
      style: { background: GREEN, borderRadius: 6 },
      zIndex: 1,
    }),
  ];

  entries.forEach((entry, i) => {
    blocks.push(...educationEntryRow(10 + i * rowH, entry, i));
  });

  return [
    {
      id: id(),
      type: "group",
      name: "Education",
      x: X,
      y,
      w: W,
      h: cardH,
      content: { blocks },
      style: {},
      zIndex: 1,
    },
  ];
}

function certificationRow(y: number, entry: CertificationEntry, index: number): Block[] {
  const dateW = 52;
  const blocks: Block[] = [];

  if (index > 0) {
    blocks.push(
      b("shape", {
        name: `Cert rule ${index}`,
        x: 8,
        y,
        w: W - 16,
        h: 1,
        content: { shape: "rect", filled: true },
        style: { background: GREEN_PILL },
        zIndex: 0,
      }),
    );
  }

  blocks.push(
    b("shape", {
      name: `Cert mark ${index}`,
      x: 8,
      y: y + 6,
      w: 8,
      h: 8,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: { background: GREEN, borderRadius: 2 },
      zIndex: 1,
    }),
    b("text", {
      name: `Cert name ${index}`,
      x: 24,
      y: y + 2,
      w: W - dateW - 32,
      h: 18,
      content: { text: entry.name },
      style: {
        fontFamily: "doc",
        fontSize: 10.5,
        fontWeight: 600,
        color: INK,
        verticalAlign: "middle",
      },
      zIndex: 1,
    }),
    b("shape", {
      name: `Cert year pill ${index}`,
      x: W - dateW,
      y: y + 3,
      w: dateW,
      h: 16,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: { background: GREEN, borderRadius: 8 },
      zIndex: 1,
    }),
    b("text", {
      name: `Cert year ${index}`,
      x: W - dateW,
      y: y + 3,
      w: dateW,
      h: 16,
      content: { text: entry.year },
      style: {
        fontFamily: "ui",
        fontSize: 8.5,
        fontWeight: 700,
        color: "#ffffff",
        textAlign: "center",
        verticalAlign: "middle",
      },
      zIndex: 2,
    }),
  );

  return blocks;
}

function certificationsSection(y: number, entries: CertificationEntry[]): Block[] {
  const rowH = 26;
  const cardH = entries.length * rowH + 16;
  const inner: Block[] = [
    b("shape", {
      name: "Certs card",
      x: 0,
      y: 0,
      w: W,
      h: cardH,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: {
        background: GREEN_WASH,
        borderWidth: 1,
        borderColor: GREEN_PILL,
        borderRadius: 6,
      },
      zIndex: 0,
    }),
  ];

  entries.forEach((entry, i) => {
    inner.push(...certificationRow(10 + i * rowH, entry, i));
  });

  return [
    {
      id: id(),
      type: "group",
      name: "Certifications",
      x: X,
      y,
      w: W,
      h: cardH,
      content: { blocks: inner },
      style: {},
      zIndex: 1,
    },
  ];
}

function chipWidth(label: string): number {
  return Math.max(44, Math.round(label.length * 6.4 + 18));
}

function skillChip(x: number, y: number, item: SkillItem): Block[] {
  const tier = TIER_CHIP[item.tier];
  const w = chipWidth(item.name);
  return [
    b("shape", {
      name: `Skill chip ${item.name}`,
      x,
      y,
      w,
      h: 22,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: {
        background: tier.bg,
        borderWidth: tier.borderWidth,
        borderColor: tier.border,
        borderRadius: 11,
      },
      zIndex: 1,
    }),
    b("text", {
      name: `Skill chip label ${item.name}`,
      x,
      y,
      w,
      h: 22,
      content: { text: item.name },
      style: {
        fontFamily: "ui",
        fontSize: 9,
        fontWeight: tier.weight,
        color: tier.color,
        textAlign: "center",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      },
      zIndex: 2,
    }),
  ];
}

function skillLegend(y: number): Block[] {
  const tiers: { tier: SkillTier; label: string }[] = [
    { tier: "expert", label: "Expert" },
    { tier: "proficient", label: "Proficient" },
    { tier: "working", label: "Exposure" },
  ];
  const blocks: Block[] = [];
  let x = X + W - 280;
  for (const { tier, label } of tiers) {
    blocks.push(...skillChip(x, y, { name: label, tier }));
    x += chipWidth(label) + 8;
  }
  return blocks;
}

function skillCategoryRow(y: number, category: SkillCategory): { blocks: Block[]; h: number } {
  const labelW = 118;
  const chipGap = 6;
  const rowGap = 6;
  const chipAreaX = labelW + 10;
  const chipAreaW = W - chipAreaX - 8;
  let cx = chipAreaX;
  let cy = 6;
  let rowMaxH = 22;
  const chips: Block[] = [];

  for (const item of category.items) {
    const w = chipWidth(item.name);
    if (cx + w > chipAreaX + chipAreaW && cx > chipAreaX) {
      cx = chipAreaX;
      cy += rowMaxH + rowGap;
      rowMaxH = 22;
    }
    chips.push(...skillChip(cx, cy, item));
    cx += w + chipGap;
    rowMaxH = Math.max(rowMaxH, 22);
  }

  const innerH = Math.max(34, cy + rowMaxH + 6);
  const blocks: Block[] = [
    b("shape", {
      name: `${category.label} skill wash`,
      x: 0,
      y: 0,
      w: W,
      h: innerH,
      content: { shape: "rect", filled: true },
      style: {
        background: GREEN_WASH,
        borderWidth: 1,
        borderColor: GREEN_PILL,
        borderRadius: 4,
      },
      zIndex: 0,
    }),
    b("text", {
      name: `${category.label} label`,
      x: 10,
      y: 0,
      w: labelW,
      h: innerH,
      content: { text: category.label },
      style: {
        fontFamily: "ui",
        fontSize: 10,
        fontWeight: 700,
        color: GREEN_DEEP,
        verticalAlign: "middle",
      },
      zIndex: 1,
    }),
    ...chips,
  ];

  return {
    blocks: [
      {
        id: id(),
        type: "group",
        name: `Skills · ${category.label}`,
        x: X,
        y,
        w: W,
        h: innerH,
        content: { blocks },
        style: {},
        zIndex: 1,
      },
    ],
    h: innerH,
  };
}

function footer(label: string): Block[] {
  return [
    b("shape", {
      name: `${label} page rule`,
      x: X,
      y: 968,
      w: W,
      h: 1,
      content: { shape: "rect", filled: true },
      style: { background: RULE },
      pin: { bottom: true, left: true, right: true },
    }),
    b("text", {
      name: `${label} folio`,
      x: X,
      y: 978,
      w: W,
      h: 16,
      content: { text: label },
      style: {
        fontFamily: "ui",
        fontSize: 8.5,
        color: MUTED,
        textAlign: "right",
      },
      pin: { bottom: true, right: true },
    }),
  ];
}

const EXPERIENCES: ExperienceEntry[] = [
  {
    company: "Paynovate",
    title: "Infrastructure Engineer",
    place: "Brussels, Belgium",
    dates: "Dec 2024 – Present",
    bullets: [
      "Collaborated with security teams to audit, harden, and enforce compliance (PCI-DSS, ISO-27001, DORA, GDPR); supported external payment audits.",
      "Deployed scalable, robust environments for new and existing finance and business projects.",
      "Migrated legacy applications and infrastructure using several migration strategies; designed decoupling with Terraform and Ansible for reproducible IaC.",
      "AWS multi-account org structures (landing zones, IAM guardrails); Xen/Proxmox → AWS migrations.",
      "Standardized CI/CD with development teams; implemented incident management and led incident and change management across the company (ITIL / GuardDuty).",
      "Partnered with developers and project managers to promote better practices, ownership, and long-term product maintenance; coached teams on cloud practices.",
      "Supported external partners on network and application maintenance and security hardening.",
      "Centralized monitoring with Datadog; hardened legacy databases with backup enforcement.",
    ],
  },
  {
    company: "Sword Group",
    title: "Production Engineer – CACEIS Bank",
    place: "Luxembourg",
    dates: "Aug 2024 – Dec 2024",
    bullets: [
      "Automated build, versioning, and deployment pipelines with Jenkins.",
      "Bash, KornShell, and Python automation for sensitive migrations; introduced TNR and unit testing.",
      "Improved technical documentation across infrastructure components in Agile multi-team delivery.",
    ],
  },
  {
    company: "Sword Group",
    title: "Junior Production Engineer – Lalux Assurances",
    place: "Luxembourg",
    dates: "Mar 2023 – Jun 2024",
    bullets: [
      "Automated business workflows with Groovy and JavaScript (Quadient).",
      "Deployed server estates with Ansible, Terraform, and Azure DevOps.",
      "Docker / Podman services; Linux production monitoring; API testing (Jira, Postman, SoapUI).",
    ],
  },
  {
    company: "Devoteam",
    title: "DevOps & Cloud Consultant (Internship)",
    place: "Luxembourg",
    dates: "Nov 2023 – Jan 2024",
    bullets: [
      "Built automated Azure tenant provisioning and Microsoft 365 automation via Graph API.",
      "Implemented IaC with Ansible; automation in Python and PowerShell.",
    ],
  },
];

const EDUCATION: EducationEntry[] = [
  {
    kind: "Bootcamp",
    field: "SysAdmin & DevOps",
    school: "BeCode",
    dates: "Nov 2023 – Jan 2024",
  },
  {
    kind: "Master",
    field: "Clinical Psychology",
    school: "Université Libre de Bruxelles",
    dates: "Dec 2022",
  },
  {
    kind: "Bachelor",
    field: "Psychological and Educational Sciences",
    school: "Université Libre de Bruxelles",
    dates: "Jun 2020",
  },
];

const CERTIFICATIONS: CertificationEntry[] = [
  { name: "HashiCorp Certified: Terraform Associate", year: "2024" },
  { name: "Microsoft Azure Fundamentals", year: "2024" },
  { name: "IBM Cloud Pak for Business Automation – Tech Jam", year: "2023" },
  { name: "PCEP – Certified Entry-Level Python Programmer", year: "2023" },
  { name: "AWS re/Start Graduate", year: "2022" },
];

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    label: "Programming",
    items: [
      { name: "Python", tier: "expert" },
      { name: "JavaScript", tier: "proficient" },
      { name: "Node.js", tier: "proficient" },
      { name: "Rust", tier: "proficient" },
      { name: "Go", tier: "proficient" },
      { name: "Groovy", tier: "proficient" },
      { name: "Java", tier: "working" },
    ],
  },
  {
    label: "Shell",
    items: [
      { name: "Bash", tier: "expert" },
      { name: "Fish", tier: "expert" },
      { name: "Zsh", tier: "proficient" },
      { name: "PowerShell", tier: "proficient" },
      { name: "KornShell", tier: "proficient" },
    ],
  },
  {
    label: "Provisioning",
    items: [
      { name: "Terraform", tier: "expert" },
      { name: "OpenTofu", tier: "expert" },
      { name: "Ansible", tier: "expert" },
      { name: "Packer", tier: "proficient" },
      { name: "Vagrant", tier: "proficient" },
      { name: "Puppet", tier: "proficient" },
      { name: "Rundeck", tier: "working" },
    ],
  },
  {
    label: "CI/CD",
    items: [
      { name: "GitHub Actions", tier: "expert" },
      { name: "GitLab CI", tier: "proficient" },
      { name: "Azure DevOps", tier: "proficient" },
      { name: "Jenkins", tier: "working" },
    ],
  },
  {
    label: "Cloud",
    items: [
      { name: "AWS", tier: "expert" },
      { name: "Azure", tier: "proficient" },
      { name: "DigitalOcean", tier: "proficient" },
      { name: "Linode", tier: "proficient" },
      { name: "UpCloud", tier: "proficient" },
      { name: "Oracle Cloud", tier: "working" },
    ],
  },
  {
    label: "Containers",
    items: [
      { name: "Docker", tier: "expert" },
      { name: "Podman", tier: "expert" },
      { name: "Kubernetes", tier: "proficient" },
    ],
  },
  {
    label: "Databases",
    items: [
      { name: "MariaDB", tier: "expert" },
      { name: "PostgreSQL", tier: "proficient" },
      { name: "MySQL", tier: "proficient" },
      { name: "SQLite", tier: "proficient" },
    ],
  },
  {
    label: "Observability",
    items: [
      { name: "Datadog", tier: "expert" },
      { name: "Prometheus", tier: "proficient" },
      { name: "Grafana", tier: "proficient" },
      { name: "ELK", tier: "working" },
      { name: "Wazuh", tier: "working" },
    ],
  },
  {
    label: "Platforms",
    items: [
      { name: "Linux", tier: "expert" },
      { name: "NixOS", tier: "expert" },
      { name: "Red Hat", tier: "proficient" },
      { name: "Rocky Linux", tier: "proficient" },
      { name: "Alma Linux", tier: "proficient" },
      { name: "Proxmox", tier: "proficient" },
      { name: "FreeBSD", tier: "working" },
      { name: "Windows Server", tier: "working" },
    ],
  },
  {
    label: "IAM / SSO",
    items: [
      { name: "IAM", tier: "proficient" },
      { name: "Okta", tier: "proficient" },
      { name: "Keycloak", tier: "working" },
      { name: "Auth0", tier: "working" },
    ],
  },
  {
    label: "AI tooling",
    items: [
      { name: "Cursor", tier: "expert" },
      { name: "OpenCode", tier: "proficient" },
      { name: "Anthropic", tier: "working" },
    ],
  },
];

function layoutExperienceGroups(startY: number, gap = 12): Block[] {
  const blocks: Block[] = [];
  let y = startY;
  for (const exp of EXPERIENCES) {
    blocks.push(experienceGroup(y, exp));
    y += experienceGroupHeight(exp) + gap;
  }
  return blocks;
}

function experienceSectionEndY(startY: number, gap = 12): number {
  let y = startY;
  for (const exp of EXPERIENCES) {
    y += experienceGroupHeight(exp) + gap;
  }
  return y - gap;
}

function layoutSkillCategories(startY: number, gap = 8): Block[] {
  const blocks: Block[] = [];
  let y = startY;
  for (const cat of SKILL_CATEGORIES) {
    const row = skillCategoryRow(y, cat);
    blocks.push(...row.blocks);
    y += row.h + gap;
  }
  return blocks;
}

/** Build Yassin's resume as a normal studio project (literal copy). */
export function buildYassinResume(): Project {
  const expStartY = 252;
  const ossSectionY = experienceSectionEndY(expStartY) + 20;
  const eduSectionY = 224;
  const skillsSectionY = 456;

  return shell(
    {
      name: "Yassin Bousâadi — Resume",
      author: "Yassin Bousâadi",
      subject: "DevOps & Cloud Engineer CV",
      description:
        "Personal résumé composed in texLooper — engineering layout with live contact links.",
    },
    [
      page(
        "Resume",
        [
          ...accentBar(),

          b("shape", {
            name: "Header wash",
            x: 16,
            y: 0,
            w: 698,
            h: 212,
            content: { shape: "rect", filled: true },
            style: { background: GREEN_SOFT },
            zIndex: 0,
            pin: { top: true, left: true, right: true },
          }),

          b("text", {
            name: "Name",
            x: X,
            y: 28,
            w: W,
            h: 42,
            content: { text: "Yassin Bousâadi" },
            style: {
              fontFamily: "display",
              fontSize: 36,
              fontWeight: 700,
              color: GREEN_DEEP,
            },
            zIndex: 1,
          }),
          b("shape", {
            name: "Role badge",
            x: X,
            y: 74,
            w: 214,
            h: 24,
            content: { shape: "rect", variant: "rounded", filled: true },
            style: { background: GREEN, borderRadius: 12 },
            zIndex: 1,
          }),
          b("text", {
            name: "Role",
            x: X,
            y: 74,
            w: 214,
            h: 24,
            content: { text: "DevOps & Cloud Engineer" },
            style: {
              fontFamily: "ui",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: "#ffffff",
              textAlign: "center",
              verticalAlign: "middle",
            },
            zIndex: 2,
          }),
          b("paragraph", {
            name: "Headline",
            x: X,
            y: 108,
            w: W,
            h: 48,
            content: {
              text: "Experience in banking and insurance (Luxembourg / Belgium). Infrastructure automation, cloud migration, containerization, and security-hardened architectures. Collaborates across multidisciplinary teams to advance projects. Passionate about open source, Linux, and reliable systems.",
            },
            style: {
              fontFamily: "doc",
              fontSize: 10.5,
              lineHeight: 1.4,
              color: INK,
            },
            zIndex: 1,
          }),

          b("text", {
            name: "Location",
            x: X,
            y: 160,
            w: W,
            h: 16,
            content: { text: "Brussels, Belgium" },
            style: {
              fontFamily: "ui",
              fontSize: 10,
              fontWeight: 600,
              color: MUTED,
              verticalAlign: "middle",
            },
            zIndex: 1,
          }),
          contactLink("Email", X, 180, 168, {
            hook: "mailto",
            target: "yassin.bousaadi@gmail.com",
            label: "yassin.bousaadi@gmail.com",
          }),
          contactSep("Sep 1", X + 168, 180),
          contactLink("Phone", X + 178, 180, 102, {
            hook: "tel",
            target: "+32483037677",
            label: "+32 483 037 677",
          }),
          contactSep("Sep 2", X + 280, 180),
          contactLink("LinkedIn", X + 290, 180, 58, {
            hook: "url",
            target: "https://www.linkedin.com/in/yassin-bsd/?skipRedirect=true",
            label: "LinkedIn",
          }),
          contactSep("Sep 3", X + 348, 180),
          contactLink("GitHub", X + 358, 180, 118, {
            hook: "url",
            target: "https://github.com/BSD-Yassin",
            label: "github.com/BSD-Yassin",
          }),
          contactSep("Sep 4", X + 476, 180),
          contactLink("Blog", X + 486, 180, 132, {
            hook: "url",
            target: "https://blog.devmess.tech",
            label: "blog.devmess.tech",
          }),

          b("shape", {
            name: "Header rule",
            x: X,
            y: 208,
            w: W,
            h: 2.5,
            content: { shape: "rect", filled: true },
            style: { background: GREEN },
            zIndex: 1,
          }),

          ...section("Experience", 224),
          ...layoutExperienceGroups(expStartY),

          ...section("Open source", ossSectionY),
          b("paragraph", {
            name: "OSS",
            x: X,
            y: ossSectionY + 28,
            w: W,
            h: 40,
            content: {
              text: "Avid NixOS, Tailscale, Fish, and OpenTofu user. Also Rust and Go — side projects on GitHub; occasional notes on the blog.",
            },
            style: {
              fontFamily: "doc",
              fontSize: 10.5,
              lineHeight: 1.45,
              color: INK,
            },
            zIndex: 1,
          }),

          ...footer("Yassin Bousâadi  ·  1 / 2"),
        ],
        { spread: false },
      ),

      page(
        "Education, skills & certifications",
        [
          ...accentBar(),

          ...section("Certifications", 36),
          ...certificationsSection(64, CERTIFICATIONS),

          ...section("Education", eduSectionY),
          ...educationSection(eduSectionY + 28, EDUCATION),

          ...section("Skills", skillsSectionY),
          ...skillLegend(skillsSectionY + 24),
          ...layoutSkillCategories(skillsSectionY + 48, 6),

          ...footer("Yassin Bousâadi  ·  2 / 2"),
        ],
        { spread: false },
      ),
    ],
    {
      language: "en",
      outputs: defaultOutputs(),
      artboard: "a4",
      customObjects: [experienceEntryTemplate()],
    },
  );
}
