export function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SectionLabel({ children, eyebrow }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gold">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-[22px] font-semibold text-ink">{children}</h2>
    </div>
  );
}

export function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink-soft">
      {children}
    </label>
  );
}

const FIELD =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink " +
  "outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15";

export function Input(props) {
  return <input {...props} className={`${FIELD} ${props.className ?? ""}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${FIELD} ${props.className ?? ""}`}>
      {children}
    </select>
  );
}

export function Textarea(props) {
  return <textarea {...props} className={`${FIELD} resize-y ${props.className ?? ""}`} />;
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-navy text-white hover:bg-navy-deep border border-transparent",
    ghost: "bg-transparent text-navy border border-line hover:bg-paper-dim",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5
        text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50
        ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

const STATUS = {
  PENDING: ["bg-gold-soft text-gold-ink", "Pending"],
  APPROVED: ["bg-teal-soft text-teal", "Approved"],
  REJECTED: ["bg-clay-soft text-clay", "Rejected"],
  CANCELLED: ["bg-neutral-200 text-neutral-600", "Cancelled"],
};

export function Badge({ status }) {
  const [classes, label] = STATUS[status] ?? STATUS.CANCELLED;
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}
    >
      {label}
    </span>
  );
}

export function Alert({ children }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-clay-soft px-3 py-2.5 text-sm text-clay">
      {children}
    </div>
  );
}
