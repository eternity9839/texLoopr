/**
 * Personal project — Yassin Bousâadi CV.
 * Print-friendly A4 engineering résumé composed in texLooper.
 * Open: http://localhost:1420/?load=yassin-resume
 */
import type { Project } from "../model/document";
import { b, page, shell } from "../model/demos/helpers";
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
const CONTENT_X = X + 16;

function accentBar() {
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

function section(label: string, y: number) {
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
) {
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

function contactSep(name: string, x: number, y: number) {
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

function job(
  y: number,
  opts: {
    company: string;
    title: string;
    place: string;
    dates: string;
    bullets: string[];
    listH: number;
  },
) {
  const key = `${opts.company} · ${opts.title}`;
  const railH = 38 + opts.listH;
  const pillW = 148;
  const contentW = W - 16;
  const titleW = contentW - pillW - 12;
  return [
    b("shape", {
      name: `${key} rail`,
      x: X,
      y,
      w: 3,
      h: railH,
      content: { shape: "rect", filled: true },
      style: { background: GREEN_MID, borderRadius: 2 },
      zIndex: 0,
    }),
    b("shape", {
      name: `${key} date pill`,
      x: X + W - pillW,
      y: y - 1,
      w: pillW,
      h: 20,
      content: { shape: "rect", variant: "rounded", filled: true },
      style: { background: GREEN_PILL, borderRadius: 10 },
      zIndex: 1,
    }),
    b("text", {
      name: `${key} title`,
      x: CONTENT_X,
      y,
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
      name: `${key} dates`,
      x: X + W - pillW,
      y,
      w: pillW,
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
      name: `${key} place`,
      x: CONTENT_X,
      y: y + 18,
      w: contentW,
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
      name: `${key} bullets`,
      x: CONTENT_X,
      y: y + 38,
      w: contentW,
      h: opts.listH,
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

function skillRow(
  y: number,
  label: string,
  details: string,
  opts?: { h?: number },
) {
  const h = opts?.h ?? 30;
  const labelW = 158;
  const wrap = h > 30;
  return [
    b("shape", {
      name: `${label} skill wash`,
      x: X,
      y,
      w: W,
      h,
      content: { shape: "rect", filled: true },
      style: {
        background: GREEN_WASH,
        borderWidth: 1,
        borderColor: GREEN_PILL,
      },
      zIndex: 0,
    }),
    b("text", {
      name: `${label} label`,
      x: X + 10,
      y: y + 4,
      w: labelW,
      h: h - 8,
      content: { text: label },
      style: {
        fontFamily: "ui",
        fontSize: 10,
        fontWeight: 700,
        color: GREEN_DEEP,
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      },
      zIndex: 1,
    }),
    b("text", {
      name: `${label} details`,
      x: X + labelW + 12,
      y: y + 4,
      w: W - labelW - 26,
      h: h - 8,
      content: { text: details },
      style: {
        fontFamily: "doc",
        fontSize: 10,
        color: INK,
        verticalAlign: "middle",
        whiteSpace: wrap ? "normal" : "nowrap",
        lineHeight: wrap ? 1.35 : 1.2,
      },
      zIndex: 1,
    }),
  ];
}

function footer(label: string) {
  return [
    b("shape", {
      name: `${label} footer rule`,
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

/** Build Yassin's resume as a normal studio project (literal copy). */
export function buildYassinResume(): Project {
  const skills: { label: string; details: string; h?: number }[] = [
    {
      label: "Programming",
      details:
        "Python (advanced); JavaScript, Node.js, Java, Groovy (proficient); Rust, Go (working)",
      h: 34,
    },
    {
      label: "Shell & scripting",
      details: "Bash, Fish, Zsh, PowerShell, KornShell",
    },
    {
      label: "DevOps",
      details: "Terraform, OpenTofu, Ansible · Packer, Vagrant, Rundeck",
    },
    {
      label: "CI/CD",
      details: "GitHub Actions, GitLab CI, Azure DevOps, Jenkins",
    },
    {
      label: "Cloud",
      details:
        "AWS (EC2, IAM, VPC, S3, EKS); Azure (Entra ID, ARM, Graph); Oracle Cloud, Linode, DigitalOcean",
      h: 34,
    },
    {
      label: "Containers",
      details: "Docker, Podman, Kubernetes",
    },
    {
      label: "Databases",
      details: "MariaDB, MySQL, PostgreSQL, SQLite, Aurora",
    },
    {
      label: "Virtualization",
      details: "Proxmox, Xen, ESXi",
    },
    {
      label: "SSO / IAM / Auth",
      details: "Okta, IAM, Auth0, Keycloak, SSSD",
    },
    {
      label: "Observability",
      details: "Datadog, Prometheus, Grafana, ELK, Zabbix, Wazuh",
    },
    {
      label: "Operating systems",
      details: "Linux (Debian, RHEL, Fedora, NixOS), Solaris, FreeBSD",
    },
    {
      label: "AI tooling",
      details: "OpenCode, Cursor, Anthropic, Mistral",
    },
  ];

  return shell(
    {
      name: "Yassin Bousâadi — Resume",
      author: "Yassin Bousâadi",
      subject: "DevOps & Cloud Engineer CV",
      description:
        "Personal résumé composed in texLooper — engineering layout with live contact links.",
    },
    [
      page("Resume", [
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
        // One contact line: green text links + middots (no chip chrome).
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

        ...job(252, {
          company: "Paynovate",
          title: "Infrastructure Engineer",
          place: "Brussels, Belgium",
          dates: "Dec 2024 – Present",
          listH: 132,
          bullets: [
            "Collaborated with security teams to audit, harden, and enforce compliance (PCI-DSS, ISO-27001, DORA, GDPR); supported external payment audits.",
            "Designed infrastructure decoupling for legacy systems; implemented Terraform and Ansible for reproducible IaC.",
            "Standardized CI/CD with development teams; led incident, change, and problem management (ITIL / GuardDuty).",
            "Centralized monitoring with Datadog; hardened legacy databases with backup enforcement.",
            "AWS multi-account org structures (landing zones, IAM guardrails); Xen/Proxmox → AWS migrations; coached teams on cloud practices.",
          ],
        }),

        ...job(436, {
          company: "Sword Group",
          title: "Production Engineer – CACEIS Bank",
          place: "Luxembourg",
          dates: "Aug 2024 – Dec 2024",
          listH: 58,
          bullets: [
            "Automated build, versioning, and deployment pipelines with Jenkins.",
            "Bash, KornShell, and Python automation for sensitive migrations; introduced TNR and unit testing.",
            "Improved technical documentation across infrastructure components in Agile multi-team delivery.",
          ],
        }),

        ...job(546, {
          company: "Sword Group",
          title: "Junior Production Engineer – Lalux Assurances",
          place: "Luxembourg",
          dates: "Mar 2023 – Jun 2024",
          listH: 58,
          bullets: [
            "Automated business workflows with Groovy and JavaScript (Quadient).",
            "Deployed server estates with Ansible, Terraform, and Azure DevOps.",
            "Docker / Podman services; Linux production monitoring; API testing (Jira, Postman, SoapUI).",
          ],
        }),

        ...job(656, {
          company: "Devoteam",
          title: "DevOps & Cloud Consultant (Internship)",
          place: "Luxembourg",
          dates: "Nov 2023 – Jan 2024",
          listH: 44,
          bullets: [
            "Built automated Azure tenant provisioning and Microsoft 365 automation via Graph API.",
            "Implemented IaC with Ansible; automation in Python and PowerShell.",
          ],
        }),

        ...section("Education", 748),
        b("shape", {
          name: "Edu wash",
          x: X,
          y: 776,
          w: W,
          h: 100,
          content: { shape: "rect", filled: true },
          style: {
            background: "#ffffff",
            borderWidth: 1.5,
            borderColor: GREEN_MID,
          },
          zIndex: 0,
        }),
        b("text", {
          name: "Edu compact",
          x: X + 16,
          y: 788,
          w: W - 32,
          h: 80,
          content: {
            text:
              "Bootcamp — BeCode  ·  SysAdmin & DevOps  ·  Nov 2023 – Jan 2024\n" +
              "Master — Université Libre de Bruxelles  ·  Clinical Psychology  ·  Dec 2022\n" +
              "Bachelor — Université Libre de Bruxelles  ·  Psychological and Educational Sciences  ·  Jun 2020",
          },
          style: {
            fontFamily: "doc",
            fontSize: 10.5,
            lineHeight: 1.7,
            color: INK,
            whiteSpace: "pre-wrap",
          },
          zIndex: 1,
        }),

        ...footer("Yassin Bousâadi  ·  1 / 2"),
      ]),

      page("Skills & certifications", [
        ...accentBar(),

        ...section("Certifications", 36),
        b("shape", {
          name: "Certs wash",
          x: X,
          y: 64,
          w: W,
          h: 120,
          content: { shape: "rect", filled: true },
          style: {
            background: GREEN_WASH,
            borderWidth: 1,
            borderColor: GREEN_PILL,
          },
          zIndex: 0,
        }),
        b("list", {
          name: "Certs",
          x: X + 16,
          y: 76,
          w: W - 32,
          h: 100,
          content: {
            items: [
              "HashiCorp Certified: Terraform Associate (2024)",
              "Microsoft Azure Fundamentals (2024)",
              "IBM Cloud Pak for Business Automation – Tech Jam (2023)",
              "PCEP – Certified Entry-Level Python Programmer (2023)",
              "AWS re/Start Graduate (2022)",
            ],
            markerColor: GREEN,
          },
          style: {
            fontFamily: "doc",
            fontSize: 10.5,
            lineHeight: 1.5,
            color: INK,
            listStyle: "disc",
          },
          zIndex: 1,
        }),

        ...section("Skills", 204),
        ...(() => {
          let y = 232;
          const rows: ReturnType<typeof skillRow> = [];
          for (const s of skills) {
            const h = s.h ?? 30;
            rows.push(...skillRow(y, s.label, s.details, { h }));
            y += h + 6;
          }
          return rows;
        })(),

        ...section("Open source", 680),
        b("paragraph", {
          name: "OSS",
          x: X,
          y: 708,
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

        ...footer("Yassin Bousâadi  ·  2 / 2"),
      ]),
    ],
    {
      language: "en",
      outputs: defaultOutputs(),
      artboard: "a4",
    },
  );
}
