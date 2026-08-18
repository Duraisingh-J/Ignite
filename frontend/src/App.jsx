import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ClipboardList, FileText, Sun } from "lucide-react";
import { api, EMPLOYEE_ID } from "./api.js";
import ApplyLeave from "./screens/ApplyLeave.jsx";
import MyRequests from "./screens/MyRequests.jsx";

const NAV = [
  { id: "apply", label: "Apply Leave", icon: FileText },
  { id: "requests", label: "My Requests", icon: ClipboardList },
];

export default function App() {
  const [screen, setScreen] = useState("apply");
  const [employee, setEmployee] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [fatal, setFatal] = useState(null);

  const loadRequests = useCallback(async () => {
    setRequests(await api.getMyRequests(EMPLOYEE_ID));
  }, []);

  // If the first call takes unusually long, say so rather than spinning silently.
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const emp = await api.getEmployee(EMPLOYEE_ID);
        setEmployee(emp);
        // Both leave types and holidays are scoped to the employee's region.
        const [types, hols] = await Promise.all([
          api.getLeaveTypes(emp.regionId),
          api.getHolidays(EMPLOYEE_ID),
        ]);
        setLeaveTypes(types);
        setHolidays(hols);
        await loadRequests();
      } catch (e) {
        setFatal(
          e.code === "DATABASE_UNAVAILABLE"
            ? {
                title: "The API is up, but it can't reach PostgreSQL.",
                message: e.message,
                reason: e.details?.reason,
              }
            : {
                title: "Couldn't reach the API.",
                message: e.message,
                reason: "Is the FastAPI server running on port 4000? (python run.py)",
              }
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRequests]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-paper">
        <p className="text-sm text-ink-soft">Loading…</p>
        {slow && (
          <p className="max-w-sm text-center text-xs text-ink-soft/70">
            Still waiting on the API — if this persists, the backend probably can't reach
            PostgreSQL.
          </p>
        )}
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="flex max-w-lg items-start gap-2.5 rounded-xl bg-clay-soft p-4 text-sm text-clay">
          <AlertCircle size={18} className="mt-px shrink-0" />
          <div>
            <strong>{fatal.title}</strong>
            <p className="mt-1.5">{fatal.message}</p>
            {fatal.reason && (
              <pre className="mt-2 overflow-x-auto rounded bg-white/50 p-2 font-mono text-[11px] leading-relaxed">
                {fatal.reason}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-navy-deep px-3.5 py-6">
        <div className="mb-7 flex items-center gap-2 px-2.5">
          <span className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-gold p-1">
            <Sun size={15} className="text-navy-deep" strokeWidth={2.5} />
          </span>
          <span className="font-display text-[17px] font-semibold text-white">Meridian</span>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = screen === id;
            return (
              <button
                key={id}
                onClick={() => setScreen(id)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition ${
                  active
                    ? "bg-white/10 font-semibold text-white"
                    : "font-medium text-white/55 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-white px-8 py-4">
          <p className="text-sm text-ink-soft">
            {employee.name} · {employee.regionCountry}
          </p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-soft font-display text-sm font-semibold text-gold">
            {employee.name[0]}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {screen === "apply" && (
            <ApplyLeave
              employee={employee}
              leaveTypes={leaveTypes}
              holidays={holidays}
              onSubmitted={loadRequests}
            />
          )}
          {screen === "requests" && <MyRequests requests={requests} />}
        </main>
      </div>
    </div>
  );
}
