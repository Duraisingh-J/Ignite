import { Umbrella, Stethoscope, Coffee } from "lucide-react";
import { COLORS } from "../theme/colors";

export const EMPLOYEE = {
  name: "Ravi",
  role: "SDE-1",
  team: "Payments",
  region: "India",
  manager: "Priya",
  joinDate: "2025-03-10",
};

export const LEAVE_TYPES = [
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

export const HOLIDAYS_2026 = [
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-08-27", name: "Regional Holiday" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
];

export const INITIAL_REQUESTS = [
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

export const TEAM = [
  { name: "Ravi", role: "SDE-1", onLeave: false },
  { name: "Ananya", role: "SDE-2", onLeave: true },
  { name: "Karthik", role: "SDE-1", onLeave: false },
  { name: "Divya", role: "QA", onLeave: true },
  { name: "Mohit", role: "SDE-3", onLeave: false },
];

export const PENDING_APPROVALS = [
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
