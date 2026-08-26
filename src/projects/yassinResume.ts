/**
 * Personal project — Yassin Bousâadi CV.
 * Classic single-column engineering layout (print-friendly).
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
const INK = "#14231c";
const MUTED = "#5c7468";
const RULE = "#c5d4cb";
const X = 52;
const W = 616;
const JOB_INSET = 14;

function accentBar() {
  return b("shape", {
    name: "Accent bar",
    x: 0,
    y: 0,
    w: 8,
    h: 960,
    content: { shape: "rect", filled: true },
    style: { background: GREEN },
    zIndex: 0,
    pin: { left: true, top: true, bottom: true },
  });
}

function section(label: string, y: number) {
  return [
    b("shape", {
      name: `Accent ${label}`,
      x: X,
      y: y + 3,
      w: 8,
      h: 8,
      content: { shape: "rect", filled: true },
      style: { background: GREEN, borderRadius: 1 },
    }),
    b("text", {
      name: `H ${label}`,
      x: X + 14,
      y,
      w: W - 14,
      h: 16,
      content: { text: label },
      style: {
        fontFamily: "ui",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 1.6,
        color: GREEN,
      },
    }),
    b("shape", {
      name: `Rule ${label}`,
      x: X,
      y: y + 17,
      w: W,
      h: 1.5,
      content: { shape: "rect", filled: true },
      style: { background: GREEN },
    }),
  ];
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
  const railH = 38 + opts.listH;
  const pillW = 132;
  const contentX = X + JOB_INSET;
  const contentW = W - JOB_INSET;
  return [
    b("shape", {
      name: `${opts.company} rail`,
      x: X,
      y,
      w: 3,
      h: railH,
      content: { shape: "rect", filled: true },
      style: { background: GREEN_MID, borderRadius: 1 },
    }),
    b("shape", {
      name: `${opts.company} date pill`,
      x: X + W - pillW,
      y: y - 1,
      w: pillW,
      h: 20,
      content: { shape: "rounded", filled: true },
      style: { background: GREEN_PILL, borderRadius: 10 },
    }),
    b("text", {
      name: `${opts.company} title`,
      x: contentX,
      y,
      w: contentW - pillW - 8,
      h: 18,
      content: { text: `${opts.title}` },
      style: {
        fontFamily: "ui",
        fontSize: 12,
        fontWeight: 700,
        color: INK,
      },
    }),
    b("text", {
      name: `${opts.company} dates`,
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
    }),
    b("text", {
      name: `${opts.company} place`,
      x: contentX,
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
    }),
    b("list", {
      name: `${opts.company} bullets`,
      x: contentX,
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
    }),
  ];
}

function linkChip(
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
    h: 20,
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
      background: GREEN_SOFT,
      borderRadius: 10,
      padding: 4,
      textAlign: "center",
      verticalAlign: "middle",
    },
  });
}

function footer(label: string) {
  return [
    b("shape", {
      name: `${label} footer rule`,
      x: X,
      y: 938,
      w: W,
      h: 1,
      content: { shape: "rect", filled: true },
      style: { background: RULE },
      pin: { bottom: true, left: true, right: true },
    }),
    b("text", {
      name: `${label} credit`,
      x: X,
      y: 948,
      w: 360,
      h: 16,
      content: { text: "Composed with texLooper" },
      style: {
        fontFamily: "ui",
        fontSize: 8.5,
        fontWeight: 600,
        letterSpacing: 0.3,
        color: GREEN,
      },
      pin: { bottom: true, left: true },
    }),
    b("text", {
      name: `${label} folio`,
      x: X + 360,
      y: 948,
      w: 256,
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
  return shell(
    {
      name: "Yassin Bousâadi — Resume",
      author: "Yassin Bousâadi",
      subject: "DevOps & Cloud Engineer CV",
      description:
        "Personal resume composed in texLooper from markdown-resume. Classic engineering layout.",
    },
    [
      page("Resume", [
        accentBar(),

        /* Decorative chrome */
        b("shape", {
          name: "Header wash",
          x: 8,
          y: 0,
          w: 712,
          h: 196,
          content: { shape: "rect", filled: true },
          style: { background: GREEN_SOFT, opacity: 0.85 },
          zIndex: 0,
          pin: { top: true, left: true, right: true },
        }),
        b("shape", {
          name: "Header orb",
          x: 560,
          y: -40,
          w: 220,
          h: 220,
          content: { shape: "ellipse", filled: true },
          style: { background: GREEN_MID, opacity: 0.35 },
          zIndex: 0,
        }),

        /* Header */
        b("text", {
          name: "Name",
          x: X,
          y: 36,
          w: W,
          h: 40,
          content: { text: "Yassin Bousâadi" },
          style: {
            fontFamily: "display",
            fontSize: 34,
            fontWeight: 700,
            color: GREEN_DEEP,
          },
          zIndex: 1,
        }),
        b("text", {
          name: "Role",
          x: X,
          y: 78,
          w: W,
          h: 18,
          content: { text: "DevOps & Cloud Engineer" },
          style: {
            fontFamily: "ui",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: GREEN,
          },
          zIndex: 1,
        }),
        b("paragraph", {
          name: "Headline",
          x: X,
          y: 102,
          w: W,
          h: 52,
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
          y: 158,
          w: 118,
          h: 20,
          content: { text: "Brussels, Belgium" },
          style: {
            fontFamily: "ui",
            fontSize: 10,
            color: MUTED,
            verticalAlign: "middle",
          },
          zIndex: 1,
        }),
        linkChip("Email", X + 122, 158, 188, {
          hook: "mailto",
          target: "yassin.bousaadi@gmail.com",
          label: "yassin.bousaadi@gmail.com",
        }),
        linkChip("Phone", X + 318, 158, 112, {
          hook: "tel",
          target: "+32483037677",
          label: "+32 483 037 677",
        }),
        linkChip("GitHub", X + 438, 158, 72, {
          hook: "url",
          target: "https://github.com/BSD-Yassin",
          label: "GitHub",
        }),
        linkChip("LinkedIn", X + 518, 158, 98, {
          hook: "url",
          target: "https://www.linkedin.com/in/yassin-bsd/?skipRedirect=true",
          label: "LinkedIn",
        }),
        b("shape", {
          name: "Header rule",
          x: X,
          y: 186,
          w: W,
          h: 2,
          content: { shape: "rect", filled: true },
          style: { background: GREEN },
          zIndex: 1,
        }),

        ...section("Experience", 204),

        ...job(234, {
          company: "Paynovate",
          title: "Infrastructure Engineer",
          place: "Brussels, Belgium",
          dates: "Dec 2024 – Present",
          listH: 140,
          bullets: [
            "Collaborated with security teams to audit, harden, and enforce compliance (PCI-DSS, ISO-27001, DORA, GDPR); supported external payment audits.",
            "Designed infrastructure decoupling for legacy systems; implemented Terraform and Ansible for reproducible IaC.",
            "Standardized CI/CD with development teams; led incident, change, and problem management (ITIL / GuardDuty).",
            "Centralized monitoring with Datadog; hardened legacy databases with backup enforcement.",
            "AWS multi-account org structures (landing zones, IAM guardrails); Xen/Proxmox → AWS migrations; coached teams on cloud practices.",
          ],
        }),

        ...job(426, {
          company: "Sword Group",
          title: "Production Engineer – CACEIS Bank",
          place: "Luxembourg",
          dates: "Aug 2024 – Dec 2024",
          listH: 64,
          bullets: [
            "Automated build, versioning, and deployment pipelines with Jenkins.",
            "Bash, KornShell, and Python automation for sensitive migrations; introduced TNR and unit testing.",
            "Improved technical documentation across infrastructure components in Agile multi-team delivery.",
          ],
        }),

        ...job(544, {
          company: "Sword Group",
          title: "Junior Production Engineer – Lalux Assurances",
          place: "Luxembourg",
          dates: "Mar 2023 – Jun 2024",
          listH: 64,
          bullets: [
            "Automated business workflows with Groovy and JavaScript (Quadient).",
            "Deployed Windows Server estates with Ansible, Terraform, and Azure DevOps.",
            "Docker / Podman services; Linux & Windows production monitoring; API testing (Jira, Postman, SoapUI).",
          ],
        }),

        ...job(662, {
          company: "Devoteam",
          title: "DevOps & Cloud Consultant (Internship)",
          place: "Luxembourg",
          dates: "Nov 2023 – Jan 2024",
          listH: 48,
          bullets: [
            "Built automated Azure tenant provisioning and Microsoft 365 automation via Graph API.",
            "Implemented IaC with Ansible; automation in Python and PowerShell.",
          ],
        }),

        ...section("Education", 746),
        b("shape", {
          name: "Edu wash",
          x: X,
          y: 768,
          w: W,
          h: 84,
          content: { shape: "rounded", filled: true },
          style: {
            background: GREEN_SOFT,
            borderRadius: 8,
            opacity: 0.9,
          },
        }),
        b("text", {
          name: "Edu compact",
          x: X + 12,
          y: 776,
          w: W - 24,
          h: 72,
          content: {
            text:
              "Bootcamp — BeCode  ·  SysAdmin & DevOps  ·  Nov 2023 – Jan 2024\n" +
              "Master — Université Libre de Bruxelles  ·  Clinical Psychology  ·  Dec 2022\n" +
              "Bachelor — Université Libre de Bruxelles  ·  Psychological and Educational Sciences  ·  Jun 2020",
          },
          style: {
            fontFamily: "doc",
            fontSize: 10.5,
            lineHeight: 1.55,
            color: INK,
            whiteSpace: "pre-wrap",
          },
        }),

        ...footer("Yassin Bousâadi  ·  1 / 2"),
      ]),

      page("Skills & certifications", [
        accentBar(),

        b("shape", {
          name: "Page 2 orb",
          x: -60,
          y: 720,
          w: 260,
          h: 260,
          content: { shape: "ellipse", filled: true },
          style: { background: GREEN_SOFT, opacity: 0.7 },
          zIndex: 0,
        }),

        ...section("Certifications", 40),
        b("shape", {
          name: "Certs wash",
          x: X,
          y: 62,
          w: W,
          h: 112,
          content: { shape: "rounded", filled: true },
          style: {
            background: GREEN_SOFT,
            borderRadius: 8,
            opacity: 0.9,
          },
        }),
        b("list", {
          name: "Certs",
          x: X + 12,
          y: 72,
          w: W - 24,
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
            lineHeight: 1.45,
            color: INK,
            listStyle: "disc",
          },
        }),

        ...section("Skills", 188),
        b("paragraph", {
          name: "Skills",
          x: X,
          y: 216,
          w: W,
          h: 340,
          content: {
            text:
              "Programming — Python, JavaScript, Node.js, Java, Groovy, Rust, Golang\n\n" +
              "Databases — MariaDB, PostgreSQL, MySQL, SQLite, Aurora\n\n" +
              "Shell & scripting — Bash, PowerShell, KornShell, Zsh, Fish\n\n" +
              "SSO / IAM / Auth — Okta, IAM, Auth0, Keycloak, SSSD\n\n" +
              "Cloud — AWS, Azure, Oracle Cloud, UpCloud, Linode, DigitalOcean\n\n" +
              "Virtualization — Proxmox, Xen, ESXi\n\n" +
              "DevOps & automation — Terraform, OpenTofu, Ansible, Packer, Vagrant, Rundeck\n\n" +
              "CI/CD — GitHub Actions, GitLab CI, Azure DevOps, Jenkins\n\n" +
              "Containers — Docker, Podman, Kubernetes\n\n" +
              "Monitoring & security — Datadog, Prometheus, Grafana, ELK, Zabbix, Wazuh\n\n" +
              "Operating systems — Linux (Debian, RHEL, Fedora, NixOS), Windows Server, Solaris, FreeBSD\n\n" +
              "AI tooling — OpenCode, Cursor, Anthropic, Mistral",
          },
          style: {
            fontFamily: "doc",
            fontSize: 10.5,
            lineHeight: 1.35,
            color: INK,
            whiteSpace: "pre-wrap",
          },
        }),

        ...section("Open source", 580),
        b("paragraph", {
          name: "OSS",
          x: X,
          y: 608,
          w: 430,
          h: 48,
          content: {
            text: "Avid NixOS, Tailscale, Fish, and OpenTofu user. Also Rust and Golang.",
          },
          style: {
            fontFamily: "doc",
            fontSize: 10.5,
            lineHeight: 1.45,
            color: INK,
          },
        }),
        linkChip("OSS GitHub", X + 440, 612, 176, {
          hook: "url",
          target: "https://github.com/BSD-Yassin",
          label: "github.com/BSD-Yassin",
        }),

        b("shape", {
          name: "Credit band",
          x: X,
          y: 680,
          w: W,
          h: 52,
          content: { shape: "rect", filled: true },
          style: {
            background: GREEN_SOFT,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: GREEN_MID,
          },
        }),
        b("text", {
          name: "Credit band text",
          x: X + 16,
          y: 692,
          w: W - 32,
          h: 28,
          content: {
            text: "This résumé was designed and composed in texLooper",
          },
          style: {
            fontFamily: "ui",
            fontSize: 11,
            fontWeight: 600,
            color: GREEN_DEEP,
            textAlign: "center",
            verticalAlign: "middle",
          },
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
