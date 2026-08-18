import React, { useState, useMemo } from "react";
import {
  Home, FileText, ClipboardList, CalendarDays, User, CheckSquare,
  Users, Calendar, Layers, Settings, Shuffle, Bell, ChevronRight,
  Plus, X, Check, Clock, TrendingUp, Briefcase, MapPin, ArrowRight,
  AlertCircle, Sun, Umbrella, Stethoscope, Coffee
} from "lucide-react";

/* ---------------------------------------------------------------
   DESIGN TOKENS
   Palette: paper (#FAF9F6), ink (#1B2430), dial navy (#22314F),
   sundial gold (#C68A2E), leaf teal (#2E6E62), clay (#B5533C)
   Display face: "Fraunces" (character, editorial)
   Body/UI face: "Inter"
   Numerals face: "JetBrains Mono" (balances, day counts)
   Signature element: the circular "leave dial" — a sundial-style
   ring that stands in for each leave type's balance, echoing the
   whole app's subject (time, accrual, days) instead of a generic
   progress bar.
----------------------------------------------------------------*/

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
`;

const COLORS = {
  paper: "#FAF9F6",
  paperDim: "#F1EFE9",
  ink: "#1B2430",
  inkSoft: "#5B6472",
  navy: "#22314F",
  navyDeep: "#16213A",
  gold: "#C68A2E",
  goldSoft: "#F3E3C4",
  teal: "#2E6E62",
  tealSoft: "#DFEDE9",
  clay: "#B5533C",
  claySoft: "#F3E0DA",
  line: "#E4E1D8",
  card: "#FFFFFF",
};

/* ---------------------------------------------------------------
   MOCK DATA
----------------------------------------------------------------*/

const EMPLOYEE = {
  name: "Ravi",
  role: "SDE-1",
  team: "Payments",
  region: "India",
  manager: "Priya",
  joinDate: "2025-03-10",
};

const LEAVE_TYPES = [
  {
    id: "annual",
    label: "Annual Leave",
    icon: Umbrella,
    color: COLORS.navy,
    soft: "#E4E9F2",
    balance: 8,
    accrual: 1.5,
    approval: "Manager → HR",
    desc: "Paid leave for personal or vacation purposes.",
  },
  {
    id: "sick",
    label: "Sick Leave",
    icon: Stethoscope,
    color: COLORS.clay,
    soft: COLORS.claySoft,
    balance: 5,
    accrual: 1,
    approval: "Manager",
    desc: "Leave for health-related reasons.",
  },
  {
    id: "casual",
    label: "Casual Leave",
    icon: Coffee,
    color: COLORS.teal,
    soft: COLORS.tealSoft,
    balance: 3,
    accrual: 1,
    approval: "Manager",
    desc: "Short-notice leave for personal matters.",
  },
];

const HOLIDAYS_2026 = [
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-08-27", name: "Regional Holiday" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
];

const INITIAL_REQUESTS = [
  {
    id: "LR-1021",
    type: "Annual Leave",
    start: "2026-08-24",
    end: "2026-08-26",
    days: 3,
    status: "Pending",
    reason: "Personal work",
    balanceBefore: 8,
    balanceAfter: 5,
    steps: [
      { label: "Request Submitted", done: true },
      { label: "Priya · Manager Approval", done: false },
      { label: "HR Approval", done: false },
    ],
  },
  {
    id: "LR-1014",
    type: "Sick Leave",
    start: "2026-08-10",
    end: "2026-08-10",
    days: 1,
    status: "Approved",
    reason: "Fever",
    balanceBefore: 6,
    balanceAfter: 5,
    steps: [
      { label: "Request Submitted", done: true },
      { label: "Priya · Manager Approved", done: true, comment: "Approved from my side." },
    ],
  },
  {
    id: "LR-1008",
    type: "Casual Leave",
    start: "2026-07-28",
    end: "2026-07-28",
    days: 1,
    status: "Rejected",
    reason: "Family function",
    balanceBefore: 4,
    balanceAfter: 4,
    steps: [
      { label: "Request Submitted", done: true },
      { label: "Priya · Manager Rejected", done: true, comment: "Clashes with release week." },
    ],
  },
];

const TEAM = [
  { name: "Ravi", role: "SDE-1", onLeave: false },
  { name: "Ananya", role: "SDE-2", onLeave: true },
  { name: "Karthik", role: "SDE-1", onLeave: false },
  { name: "Divya", role: "QA", onLeave: true },
  { name: "Mohit", role: "SDE-3", onLeave: false },
];

const PENDING_APPROVALS = [
  {
    id: "LR-1021",
    employee: "Ravi",
    role: "SDE-1",
    team: "Payments",
    region: "India",
    type: "Annual Leave",
    start: "2026-08-24",
    end: "2026-08-26",
    days: 3,
    balance: 8,
    reason: "Personal work",
  },
  {
    id: "LR-1022",
    employee: "Karthik",
    role: "SDE-1",
    team: "Payments",
    region: "India",
    type: "Sick Leave",
    start: "2026-08-20",
    end: "2026-08-20",
    days: 1,
    balance: 5,
    reason: "Not feeling well",
  },
];

/* ---------------------------------------------------------------
   HELPERS
----------------------------------------------------------------*/

function dateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const days = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

function calcLeaveBreakdown(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const days = dateRange(startStr, endStr);
  if (days.length === 0) return null;
  const holidaySet = new Set(HOLIDAYS_2026.map((h) => h.date));
  let weekend = 0;
  let holiday = 0;
  days.forEach((d) => {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) weekend++;
    else if (holidaySet.has(iso)) holiday++;
  });
  const chargeable = days.length - weekend - holiday;
  return { calendarDays: days.length, weekend, holiday, chargeable };
}

function fmtDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function fmtDateFull(str) {
  const d = new Date(str);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------------------------------------------------------------
   PRIMITIVES
----------------------------------------------------------------*/

function Badge({ status }) {
  const map = {
    Pending: { bg: COLORS.goldSoft, fg: "#8A5E10" },
    Approved: { bg: COLORS.tealSoft, fg: COLORS.teal },
    Rejected: { bg: COLORS.claySoft, fg: COLORS.clay },
    Cancelled: { bg: "#EDEDED", fg: "#6B6B6B" },
  };
  const c = map[status] || map.Cancelled;
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        fontSize: 12,
        padding: "3px 10px",
        borderRadius: 999,
        letterSpacing: 0.2,
      }}
    >
      {status}
    </span>
  );
}

// Signature element: the sundial leave-balance ring
function LeaveDial({ leaveType, size = 96 }) {
  const total = leaveType.balance + 6; // arbitrary "typical allotment" headroom for visual
  const pct = Math.min(leaveType.balance / total, 1);
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const Icon = leaveType.icon;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.line} strokeWidth={6} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={leaveType.color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={leaveType.color} strokeWidth={2} />
        <div
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 700,
            fontSize: 20,
            color: COLORS.ink,
            marginTop: 2,
          }}
        >
          {leaveType.balance}
        </div>
      </div>
    </div>
  );
}

function Stepper({ steps }) {
  return (
    <div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: s.done ? COLORS.teal : COLORS.paperDim,
                border: s.done ? "none" : `2px solid ${COLORS.line}`,
                flexShrink: 0,
              }}
            >
              {s.done && <Check size={12} color="#fff" strokeWidth={3} />}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 2, flex: 1, minHeight: 24, background: s.done ? COLORS.teal : COLORS.line }} />
            )}
          </div>
          <div style={{ paddingBottom: 20 }}>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: s.done ? 600 : 500,
                fontSize: 14,
                color: s.done ? COLORS.ink : COLORS.inkSoft,
              }}
            >
              {s.label}
            </div>
            {s.comment && (
              <div
                style={{
                  fontFamily: "Fraunces, serif",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: COLORS.inkSoft,
                  marginTop: 4,
                }}
              >
                "{s.comment}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 14,
        padding: 20,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.boxShadow = "0 4px 16px rgba(27,36,48,0.08)";
      }}
      onMouseLeave={(e) => {
        if (onClick) e.currentTarget.style.boxShadow = "none";
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children, eyebrow }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {eyebrow && (
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: COLORS.gold,
            marginBottom: 4,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 22, color: COLORS.ink }}>
        {children}
      </div>
    </div>
  );
}

function Button({ children, onClick, variant = "primary", style, disabled }) {
  const variants = {
    primary: { background: COLORS.navy, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: COLORS.navy, border: `1px solid ${COLORS.line}` },
    success: { background: COLORS.teal, color: "#fff", border: "none" },
    danger: { background: "transparent", color: COLORS.clay, border: `1px solid ${COLORS.claySoft}` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        fontSize: 14,
        padding: "10px 18px",
        borderRadius: 9,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------
   NAV CONFIG
----------------------------------------------------------------*/

const NAV = {
  employee: [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "apply", label: "Apply Leave", icon: FileText },
    { id: "requests", label: "My Requests", icon: ClipboardList },
    { id: "holidays", label: "Holidays", icon: CalendarDays },
    { id: "profile", label: "Profile", icon: User },
  ],
  manager: [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "approvals", label: "Approvals", icon: CheckSquare },
    { id: "team", label: "Team", icon: Users },
    { id: "calendar", label: "Team Calendar", icon: Calendar },
  ],
  admin: [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "employees", label: "Employees", icon: Users },
    { id: "types", label: "Leave Types", icon: Layers },
    { id: "policies", label: "Policies", icon: Settings },
    { id: "holidays", label: "Holidays", icon: CalendarDays },
  ],
};

const ROLE_META = {
  employee: { title: "Employee", subtitle: EMPLOYEE.name },
  manager: { title: "Manager", subtitle: "Priya" },
  admin: { title: "Admin", subtitle: "System" },
};

/* ---------------------------------------------------------------
   EMPLOYEE SCREENS
----------------------------------------------------------------*/

function EmployeeDashboard({ requests, goTo }) {
  const summary = {
    available: LEAVE_TYPES.reduce((a, l) => a + l.balance, 0),
    used: 5,
    pending: requests.filter((r) => r.status === "Pending").length,
    approved: requests.filter((r) => r.status === "Approved").length,
  };
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 600, color: COLORS.ink }}>
          Hi {EMPLOYEE.name} 👋
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", color: COLORS.inkSoft, fontSize: 14, marginTop: 2 }}>
          Good afternoon — here's where things stand.
        </div>
      </div>

      <SectionLabel eyebrow="Balance">Available leave</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        {LEAVE_TYPES.map((lt) => (
          <Card key={lt.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LeaveDial leaveType={lt} />
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: COLORS.ink }}>
                {lt.label}
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: COLORS.inkSoft, marginTop: 4 }}>
                {lt.accrual} days / month accrued
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ marginBottom: 32 }}>
        <Button onClick={() => goTo("apply")}>
          <Plus size={16} /> Apply Leave
        </Button>
      </div>

      <SectionLabel eyebrow="This period">Leave summary</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {[
          ["Available", summary.available, COLORS.navy],
          ["Used", summary.used, COLORS.inkSoft],
          ["Pending", summary.pending, COLORS.gold],
          ["Approved", summary.approved, COLORS.teal],
        ].map(([label, val, color]) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: 26, color }}>
              {val}
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>
              {label}
            </div>
          </Card>
        ))}
      </div>

      <SectionLabel eyebrow="Activity">Recent requests</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
        <RequestsTable requests={requests.slice(0, 3)} onSelect={() => goTo("requests")} />
      </Card>

      <SectionLabel eyebrow="Coming up">Upcoming holidays</SectionLabel>
      <Card>
        {HOLIDAYS_2026.map((h, i) => (
          <div
            key={h.date}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: i < HOLIDAYS_2026.length - 1 ? `1px solid ${COLORS.line}` : "none",
              fontFamily: "Inter, sans-serif",
              fontSize: 14,
            }}
          >
            <span style={{ color: COLORS.inkSoft, fontFamily: "JetBrains Mono, monospace" }}>{fmtDate(h.date)}</span>
            <span style={{ color: COLORS.ink }}>{h.name}</span>
          </div>
        ))}
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.inkSoft, marginTop: 8 }}>
          <MapPin size={11} style={{ display: "inline", marginRight: 4, verticalAlign: -1 }} />
          Region: {EMPLOYEE.region}
        </div>
      </Card>
    </div>
  );
}

function RequestsTable({ requests, onSelect }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
      <thead>
        <tr style={{ background: COLORS.paperDim }}>
          {["Type", "Dates", "Days", "Status"].map((h) => (
            <th
              key={h}
              style={{
                textAlign: "left",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: COLORS.inkSoft,
                padding: "10px 16px",
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => (
          <tr
            key={r.id}
            onClick={() => onSelect(r)}
            style={{ cursor: "pointer", borderTop: `1px solid ${COLORS.line}` }}
            onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.paperDim)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.ink, fontWeight: 500 }}>{r.type}</td>
            <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.inkSoft }}>
              {r.start === r.end ? fmtDate(r.start) : `${fmtDate(r.start)} – ${fmtDate(r.end)}`}
            </td>
            <td style={{ padding: "12px 16px", fontSize: 14, fontFamily: "JetBrains Mono, monospace", color: COLORS.ink }}>
              {r.days}
            </td>
            <td style={{ padding: "12px 16px" }}>
              <Badge status={r.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EligibleLeaveTypes({ goTo, setPreselect }) {
  return (
    <div>
      <SectionLabel eyebrow="Configured for you">Eligible leave types</SectionLabel>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.inkSoft, marginBottom: 20 }}>
        Based on your employee type, region, and tenure — {EMPLOYEE.role}, {EMPLOYEE.region}, joined {fmtDateFull(EMPLOYEE.joinDate)}.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {LEAVE_TYPES.map((lt) => {
          const Icon = lt.icon;
          return (
            <Card key={lt.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ background: lt.soft, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={17} color={lt.color} />
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15 }}>{lt.label}</div>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.inkSoft, marginBottom: 12 }}>
                {lt.desc}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.ink, marginBottom: 4 }}>
                Available: <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>{lt.balance} days</span>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.inkSoft, marginBottom: 14 }}>
                Approval: {lt.approval}
              </div>
              <Button
                onClick={() => {
                  setPreselect(lt.id);
                  goTo("apply");
                }}
              >
                Apply
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ApplyLeave({ preselect, onSubmitted }) {
  const [typeId, setTypeId] = useState(preselect || LEAVE_TYPES[0].id);
  const [start, setStart] = useState("2026-08-24");
  const [end, setEnd] = useState("2026-08-26");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState("");

  const leaveType = LEAVE_TYPES.find((l) => l.id === typeId);
  const breakdown = useMemo(() => calcLeaveBreakdown(start, end), [start, end]);
  const balanceAfter = breakdown ? leaveType.balance - breakdown.chargeable : leaveType.balance;

  function handleSubmit() {
    setError("");
    if (!start || !end) {
      setError("Pick both a start and end date.");
      return;
    }
    if (new Date(end) < new Date(start)) {
      setError("End date can't be before the start date.");
      return;
    }
    if (!reason.trim()) {
      setError("Add a short reason before submitting.");
      return;
    }
    if (breakdown.chargeable <= 0) {
      setError("This range has no working days to charge — check your dates.");
      return;
    }
    if (breakdown.chargeable > leaveType.balance) {
      setError(`Not enough balance. You have ${leaveType.balance} days of ${leaveType.label}.`);
      return;
    }
    const newReq = {
      id: `LR-${Math.floor(1030 + Math.random() * 90)}`,
      type: leaveType.label,
      start,
      end,
      days: breakdown.chargeable,
      status: "Pending",
      reason,
      balanceBefore: leaveType.balance,
      balanceAfter,
      steps: [
        { label: "Request Submitted", done: true },
        { label: `${EMPLOYEE.manager} · Manager Approval`, done: false },
        { label: "HR Approval", done: false },
      ],
    };
    setSubmitted(newReq);
    onSubmitted(newReq);
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ background: COLORS.tealSoft, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={16} color={COLORS.teal} strokeWidth={3} />
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 20, color: COLORS.ink }}>
            Leave request submitted
          </div>
        </div>
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            {submitted.type}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.inkSoft }}>
            {fmtDateFull(submitted.start)} – {fmtDateFull(submitted.end)} · {submitted.days} working day{submitted.days !== 1 ? "s" : ""}
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: COLORS.inkSoft, marginTop: 10 }}>
            Request ID: {submitted.id}
          </div>
        </Card>
        <SectionLabel eyebrow="Status">Approval progress</SectionLabel>
        <Card>
          <Stepper steps={submitted.steps} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <SectionLabel eyebrow="New request">Apply for leave</SectionLabel>

      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Leave type</FieldLabel>
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          style={inputStyle}
        >
          {LEAVE_TYPES.map((lt) => (
            <option key={lt.id} value={lt.id}>{lt.label}</option>
          ))}
        </select>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: COLORS.inkSoft, marginTop: 6 }}>
          Available balance: {leaveType.balance} days
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <FieldLabel>Start date</FieldLabel>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <FieldLabel>End date</FieldLabel>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Reason</FieldLabel>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What's this leave for?"
          rows={3}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "Inter, sans-serif" }}
        />
      </div>

      {breakdown && (
        <Card style={{ background: COLORS.paperDim, border: "none", marginBottom: 20 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 12 }}>
            System calculation
          </div>
          {[
            ["Selected days", breakdown.calendarDays],
            ["Weekend days", breakdown.weekend],
            ["Holidays", breakdown.holiday],
            ["Chargeable leave", breakdown.chargeable],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, padding: "4px 0" }}>
              <span style={{ color: COLORS.inkSoft }}>{label}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600, color: COLORS.ink }}>{val}</span>
            </div>
          ))}
          <div style={{ height: 1, background: COLORS.line, margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: COLORS.ink }}>Balance after leave</span>
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                color: balanceAfter < 0 ? COLORS.clay : COLORS.navy,
              }}
            >
              {balanceAfter}
            </span>
          </div>
        </Card>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 10 }}>
          Approval flow
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.ink, flexWrap: "wrap" }}>
          <span>You</span>
          <ArrowRight size={13} color={COLORS.inkSoft} />
          <span>{EMPLOYEE.manager} · Manager</span>
          <ArrowRight size={13} color={COLORS.inkSoft} />
          <span>HR</span>
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.clay }}>{error}</span>
        </div>
      )}

      <Button onClick={handleSubmit} style={{ width: "100%", justifyContent: "center" }}>
        Submit Request
      </Button>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, marginBottom: 6 }}>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${COLORS.line}`,
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  color: COLORS.ink,
  background: "#fff",
  boxSizing: "border-box",
};

function MyRequests({ requests }) {
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const filtered = filter === "All" ? requests : requests.filter((r) => r.status === filter);

  if (selected) {
    return (
      <div style={{ maxWidth: 480 }}>
        <button
          onClick={() => setSelected(null)}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
        >
          ← Back to requests
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 22, color: COLORS.ink }}>
            {selected.type}
          </div>
          <Badge status={selected.status} />
        </div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.inkSoft, marginBottom: 20 }}>
          {fmtDateFull(selected.start)} – {fmtDateFull(selected.end)}
        </div>

        <Card style={{ marginBottom: 20 }}>
          {[
            ["Requested", `${selected.days} day${selected.days !== 1 ? "s" : ""}`],
            ["Balance before", selected.balanceBefore],
            ["Balance after approval", selected.balanceAfter],
            ["Reason", selected.reason],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, padding: "6px 0" }}>
              <span style={{ color: COLORS.inkSoft }}>{label}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", color: COLORS.ink, fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </Card>

        <SectionLabel eyebrow="Timeline">Approval flow</SectionLabel>
        <Card>
          <Stepper steps={selected.steps} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel eyebrow="History">My leave requests</SectionLabel>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["All", "Pending", "Approved", "Rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: 999,
              border: `1px solid ${filter === f ? COLORS.navy : COLORS.line}`,
              background: filter === f ? COLORS.navy : "transparent",
              color: filter === f ? "#fff" : COLORS.inkSoft,
              cursor: "pointer",
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", fontFamily: "Inter, sans-serif", color: COLORS.inkSoft, fontSize: 14 }}>
            No {filter.toLowerCase()} requests yet.
          </div>
        ) : (
          <RequestsTable requests={filtered} onSelect={setSelected} />
        )}
      </Card>
    </div>
  );
}

function HolidaysScreen() {
  return (
    <div>
      <SectionLabel eyebrow={`Region: ${EMPLOYEE.region}`}>Holiday calendar</SectionLabel>
      <Card>
        {HOLIDAYS_2026.map((h, i) => (
          <div
            key={h.date}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 0",
              borderBottom: i < HOLIDAYS_2026.length - 1 ? `1px solid ${COLORS.line}` : "none",
            }}
          >
            <div style={{ background: COLORS.goldSoft, borderRadius: 8, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sun size={18} color={COLORS.gold} />
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{h.name}</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: COLORS.inkSoft }}>{fmtDateFull(h.date)}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ProfileScreen() {
  return (
    <div style={{ maxWidth: 420 }}>
      <SectionLabel eyebrow="You">Profile</SectionLabel>
      <Card>
        {[
          ["Name", EMPLOYEE.name],
          ["Designation", EMPLOYEE.role],
          ["Team", EMPLOYEE.team],
          ["Region", EMPLOYEE.region],
          ["Manager", EMPLOYEE.manager],
          ["Joined", fmtDateFull(EMPLOYEE.joinDate)],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 14, padding: "9px 0", borderBottom: `1px solid ${COLORS.line}` }}>
            <span style={{ color: COLORS.inkSoft }}>{label}</span>
            <span style={{ color: COLORS.ink, fontWeight: 500 }}>{val}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------
   MANAGER SCREENS
----------------------------------------------------------------*/

function ManagerDashboard({ approvals, goTo }) {
  const onLeaveCount = TEAM.filter((t) => t.onLeave).length;
  return (
    <div>
      <SectionLabel eyebrow="Priya · Manager">Manager dashboard</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          ["Pending approvals", approvals.length, COLORS.gold],
          ["Team members", TEAM.length, COLORS.navy],
          ["On leave today", onLeaveCount, COLORS.teal],
        ].map(([label, val, color]) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: 28, color }}>{val}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
          </Card>
        ))}
      </div>

      <SectionLabel eyebrow="Needs you">Pending leave requests</SectionLabel>
      {approvals.length === 0 ? (
        <Card style={{ textAlign: "center", color: COLORS.inkSoft, fontFamily: "Inter, sans-serif" }}>
          Nothing pending — you're all caught up.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {approvals.slice(0, 2).map((a) => (
            <ApprovalCard key={a.id} a={a} onOpen={() => goTo("approvals")} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ a, onOpen, onApprove, onReject, compact }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.ink }}>{a.employee}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>{a.type}</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: COLORS.inkSoft, marginTop: 4 }}>
            {fmtDate(a.start)} – {fmtDate(a.end)} · {a.days} days
          </div>
        </div>
        <Badge status="Pending" />
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.ink, marginTop: 10 }}>
        Balance: <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{a.balance} days</span>
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>
        Reason: {a.reason}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {compact ? (
          <Button variant="ghost" onClick={onOpen} style={{ fontSize: 13, padding: "7px 14px" }}>
            View Details <ChevronRight size={13} />
          </Button>
        ) : (
          <>
            <Button variant="success" onClick={onApprove}>
              <Check size={14} /> Approve
            </Button>
            <Button variant="danger" onClick={onReject}>
              <X size={14} /> Reject
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function ManagerApprovals({ approvals, onDecide }) {
  const [opened, setOpened] = useState(null);

  if (opened) {
    const a = approvals.find((x) => x.id === opened) || opened;
    const teamOnLeave = TEAM.filter((t) => t.onLeave).length;
    return (
      <div style={{ maxWidth: 480 }}>
        <button
          onClick={() => setOpened(null)}
          style={{ background: "none", border: "none", color: COLORS.inkSoft, fontFamily: "Inter, sans-serif", fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}
        >
          ← Back to approvals
        </button>
        <SectionLabel>{a.employee}'s request</SectionLabel>
        <Card style={{ marginBottom: 16 }}>
          {[
            ["Employee", a.employee],
            ["Role", a.role],
            ["Team", a.team],
            ["Region", a.region],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, padding: "6px 0" }}>
              <span style={{ color: COLORS.inkSoft }}>{label}</span>
              <span style={{ color: COLORS.ink, fontWeight: 500 }}>{val}</span>
            </div>
          ))}
          <div style={{ height: 1, background: COLORS.line, margin: "8px 0" }} />
          {[
            ["Requested", `${a.days} days`],
            ["Available balance", a.balance],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, padding: "6px 0" }}>
              <span style={{ color: COLORS.inkSoft }}>{label}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", color: COLORS.ink, fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom: 16, background: COLORS.paperDim, border: "none" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 8 }}>
            Team availability
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.ink }}>
            {teamOnLeave} / {TEAM.length} members already on leave this week
          </div>
        </Card>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.ink, marginBottom: 20 }}>
          <span>You</span>
          <ArrowRight size={13} color={COLORS.inkSoft} />
          <span>HR</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="success" onClick={() => { onDecide(a.id, "Approved"); setOpened(null); }}>
            <Check size={14} /> Approve
          </Button>
          <Button variant="danger" onClick={() => { onDecide(a.id, "Rejected"); setOpened(null); }}>
            <X size={14} /> Reject
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel eyebrow={`${approvals.length} waiting`}>Pending approvals</SectionLabel>
      {approvals.length === 0 ? (
        <Card style={{ textAlign: "center", color: COLORS.inkSoft, fontFamily: "Inter, sans-serif" }}>
          Nothing pending — you're all caught up.
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {approvals.map((a) => (
            <ApprovalCard
              key={a.id}
              a={a}
              onApprove={() => onDecide(a.id, "Approved")}
              onReject={() => onDecide(a.id, "Rejected")}
              onOpen={() => setOpened(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ManagerTeam() {
  return (
    <div>
      <SectionLabel eyebrow="Payments">Team</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {TEAM.map((m, i) => (
          <div
            key={m.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              borderBottom: i < TEAM.length - 1 ? `1px solid ${COLORS.line}` : "none",
            }}
          >
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{m.name}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.inkSoft }}>{m.role}</div>
            </div>
            {m.onLeave ? <Badge status="Approved" /> : <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.inkSoft }}>In office</span>}
          </div>
        ))}
      </Card>
    </div>
  );
}

function ManagerCalendar() {
  return (
    <div>
      <SectionLabel eyebrow="This month">Team calendar</SectionLabel>
      <Card>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.inkSoft, marginBottom: 12 }}>
          Who's out, at a glance.
        </div>
        {TEAM.filter((t) => t.onLeave).map((m) => (
          <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.teal }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.ink }}>{m.name}</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.inkSoft }}>— on leave this week</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------
   ADMIN SCREENS
----------------------------------------------------------------*/

function AdminDashboard() {
  return (
    <div>
      <SectionLabel eyebrow="System">Admin dashboard</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          ["Total employees", 120],
          ["Pending requests", 18],
          ["Employees on leave", 9],
          ["Leave policies", 6],
        ].map(([label, val]) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: 26, color: COLORS.navy }}>{val}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>{label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AdminEmployees() {
  const [form, setForm] = useState({ name: "", email: "", type: "Full-Time", region: "India", manager: "Priya", team: "Payments", designation: "", joinDate: "" });
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");

  function handleCreate() {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setError("");
    setCreated(true);
  }

  if (created) {
    return (
      <div style={{ maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ background: COLORS.tealSoft, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={16} color={COLORS.teal} strokeWidth={3} />
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 20 }}>Employee created</div>
        </div>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 10 }}>
            Applicable policies detected
          </div>
          {LEAVE_TYPES.map((lt) => (
            <div key={lt.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 13, padding: "5px 0" }}>
              <span style={{ color: COLORS.ink }}>{lt.label}</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", color: COLORS.inkSoft }}>{lt.accrual} days/month</span>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, marginBottom: 8 }}>
            Workflow assigned
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: COLORS.ink }}>Manager → HR</div>
        </Card>
        <Button onClick={() => setCreated(false)} style={{ marginTop: 20 }}>Add another</Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <SectionLabel eyebrow="New hire">Add employee</SectionLabel>
      {[
        ["name", "Name", "text"],
        ["email", "Email", "email"],
        ["designation", "Designation", "text"],
        ["joinDate", "Join date", "date"],
      ].map(([key, label, type]) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <FieldLabel>{label}</FieldLabel>
          <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
        </div>
      ))}
      {[
        ["type", "Employee type", ["Full-Time", "Contract", "Intern"]],
        ["region", "Region", ["India", "US", "EU"]],
        ["manager", "Manager", ["Priya", "Arjun", "Meera"]],
        ["team", "Team", ["Payments", "Platform", "Growth"]],
      ].map(([key, label, opts]) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <FieldLabel>{label}</FieldLabel>
          <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} style={inputStyle}>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}
      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: COLORS.claySoft, borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
          <AlertCircle size={15} color={COLORS.clay} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.clay }}>{error}</span>
        </div>
      )}
      <Button onClick={handleCreate} style={{ width: "100%", justifyContent: "center" }}>Create Employee</Button>
    </div>
  );
}

function AdminLeaveTypes() {
  return (
    <div>
      <SectionLabel eyebrow="Configured">Leave types</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {LEAVE_TYPES.map((lt) => {
          const Icon = lt.icon;
          return (
            <Card key={lt.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ background: lt.soft, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={17} color={lt.color} />
                </div>
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15 }}>{lt.label}</div>
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.inkSoft }}>{lt.accrual} days accrued / month</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.inkSoft }}>Approval: {lt.approval}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AdminPolicies() {
  return (
    <div>
      <SectionLabel eyebrow="Rules engine">Accrual policies</SectionLabel>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
          <thead>
            <tr style={{ background: COLORS.paperDim }}>
              {["Leave Type", "Accrual", "Applies To"].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: COLORS.inkSoft, padding: "10px 16px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEAVE_TYPES.map((lt) => (
              <tr key={lt.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <td style={{ padding: "12px 16px", fontSize: 14 }}>{lt.label}</td>
                <td style={{ padding: "12px 16px", fontSize: 14, fontFamily: "JetBrains Mono, monospace" }}>{lt.accrual}/month</td>
                <td style={{ padding: "12px 16px", fontSize: 14, color: COLORS.inkSoft }}>Full-Time · All regions</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------
   SHELL
----------------------------------------------------------------*/

export default function LeaveApp() {
  const [role, setRole] = useState("employee");
  const [screen, setScreen] = useState("dashboard");
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [approvals, setApprovals] = useState(PENDING_APPROVALS);
  const [preselect, setPreselect] = useState(null);

  function switchRole(r) {
    setRole(r);
    setScreen("dashboard");
  }

  function handleSubmitted(newReq) {
    setRequests([newReq, ...requests]);
  }

  function handleDecide(id, status) {
    setApprovals(approvals.filter((a) => a.id !== id));
  }

  const nav = NAV[role];
  const meta = ROLE_META[role];

  let body;
  if (role === "employee") {
    if (screen === "dashboard") body = <EmployeeDashboard requests={requests} goTo={setScreen} />;
    else if (screen === "apply") body = <ApplyLeave preselect={preselect} onSubmitted={handleSubmitted} />;
    else if (screen === "requests") body = <MyRequests requests={requests} />;
    else if (screen === "holidays") body = <HolidaysScreen />;
    else if (screen === "profile") body = <ProfileScreen />;
    else if (screen === "eligible") body = <EligibleLeaveTypes goTo={setScreen} setPreselect={setPreselect} />;
  } else if (role === "manager") {
    if (screen === "dashboard") body = <ManagerDashboard approvals={approvals} goTo={setScreen} />;
    else if (screen === "approvals") body = <ManagerApprovals approvals={approvals} onDecide={handleDecide} />;
    else if (screen === "team") body = <ManagerTeam />;
    else if (screen === "calendar") body = <ManagerCalendar />;
  } else if (role === "admin") {
    if (screen === "dashboard") body = <AdminDashboard />;
    else if (screen === "employees") body = <AdminEmployees />;
    else if (screen === "types") body = <AdminLeaveTypes />;
    else if (screen === "policies") body = <AdminPolicies />;
    else if (screen === "holidays") body = <HolidaysScreen />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.paper, fontFamily: "Inter, sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: COLORS.navyDeep, display: "flex", flexDirection: "column", padding: "24px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", marginBottom: 30 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: COLORS.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sun size={15} color={COLORS.navyDeep} strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 17, color: "#fff" }}>Meridian</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.55)",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "auto" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", padding: "0 10px", marginBottom: 8 }}>
            Demo · switch role
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {["employee", "manager", "admin"].map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: role === r ? COLORS.gold : "transparent",
                  color: role === r ? COLORS.navyDeep : "rgba(255,255,255,0.55)",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  textAlign: "left",
                }}
              >
                <Shuffle size={12} />
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 32px",
            borderBottom: `1px solid ${COLORS.line}`,
            background: COLORS.card,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 13, color: COLORS.inkSoft }}>
            <Briefcase size={14} />
            {meta.title}
            {role === "employee" && (
              <>
                <span style={{ color: COLORS.line }}>·</span>
                <button
                  onClick={() => setScreen("eligible")}
                  style={{ background: "none", border: "none", color: COLORS.navy, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Eligible Leave Types
                </button>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Bell size={17} color={COLORS.inkSoft} />
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: COLORS.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 13, color: COLORS.gold }}>
              {meta.subtitle[0]}
            </div>
          </div>
        </div>
        <div style={{ padding: 32, flex: 1, overflowY: "auto" }}>{body}</div>
      </div>
    </div>
  );
}
