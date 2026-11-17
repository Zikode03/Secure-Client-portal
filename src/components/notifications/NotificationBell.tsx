import { useEffect, useRef, useState } from "react";
import { Bell, ChevronRight, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../app/auth";
import { apiGetJson, apiPostJson, hasApiBaseUrl } from "../../services/apiClient";
import "./notificationBell.css";

interface Alert { id: string; title: string; message: string; isRead: boolean; createdAtUtc: string; linkUrl?: string | null }
function notificationCopy(item: Alert) {
  // Only rewrite the known reminder format; preserve other server-authored messages.
  const missing = item.message.match(/^(.+?) is still missing(?: \(due (\d{4}-\d{2}-\d{2})\))?\.$/);
  if (missing && ["Overdue document", "Missing document reminder"].includes(item.title)) {
    const due = missing[2] ? new Date(`${missing[2]}T12:00:00Z`) : null;
    return {
      title: `${missing[1]} missing`,
      message: due && !Number.isNaN(due.getTime())
        ? `Due ${new Intl.DateTimeFormat("en-GB", {day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg"}).format(due)}`
        : "Please upload this document.",
    };
  }
  return {title: item.title, message: item.message};
}
function notificationTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg",
  }).format(date);
}

export const notificationsChanged = () => window.dispatchEvent(new Event("portal:notifications-changed"));
export function NotificationBell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Alert[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const home = user?.role === "client" ? "/client/notifications" : "/firm/notifications";
  const unread = items.filter(item => !item.isRead).length;

  useEffect(() => {
    setItems([]);
    if (!user || !hasApiBaseUrl()) { setLoading(false); return; }
    const controller = new AbortController();
    let pending = false;
    const load = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const result = await apiGetJson("/api/notifications", {signal: controller.signal});
        if (!Array.isArray(result)) throw new Error("Invalid notification response");
        if (!controller.signal.aborted) { setItems(result); setError(""); }
      } catch { if (!controller.signal.aborted) setError("Notifications could not be loaded. Please try again."); }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    const refresh = () => { void load(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    window.addEventListener("portal:notifications-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort(); window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("portal:notifications-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user?.id, revision]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, [open]);

  async function markAll() {
    setBusy(true);
    try {
      await apiPostJson("/api/notifications/mark-all-read", {});
      setItems(current => current.map(item => ({...item, isRead: true})));
      notificationsChanged();
    } catch { setError("Could not mark notifications as read. Please try again."); }
    finally { setBusy(false); }
  }
  async function view(item: Alert) {
    setBusy(true);
    try {
      if (!item.isRead) await apiPostJson(`/api/notifications/${encodeURIComponent(item.id)}/mark-read`, {});
      setItems(current => current.map(row => row.id === item.id ? {...row, isRead: true} : row));
      notificationsChanged();
      // Only navigate to internal routes. External URLs are never trusted from alert data.
      const prefix = user?.role === "client" ? "/client" : "/firm";
      const link = item.linkUrl ?? "";
      const target = link.startsWith("/requests/") ? `${prefix}/inbox`
        : link.startsWith("/documents/") ? `${prefix}/${user?.role === "client" ? "documents" : "review"}`
        : link.startsWith("/compliance") ? `${prefix}/compliance`
        : link.startsWith(`${prefix}/`) && !link.includes("\\") ? link : home;
      navigate(target); setOpen(false);
    } catch { setError("Could not open this notification. Please try again."); }
    finally { setBusy(false); }
  }
  if (!user || user.role === "admin") return null;
  return <div ref={root} className="notification-bell">
    <button ref={trigger} type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open}
      aria-controls="notification-preview" onClick={() => { setOpen(value => !value); }}
      className="notification-bell-trigger">
      <Bell aria-hidden="true" size={20} />
      {unread > 0 ? <span className="notification-bell-count">{unread > 99 ? "99+" : unread}</span> : null}
      {error ? <span className="notification-bell-warning"><span className="sr-only">Notifications unavailable</span></span> : null}
    </button>
    {open ? <section id="notification-preview" aria-label="Recent notifications" className="notification-preview">
      <div className="notification-preview-header">
        <h2>Notifications</h2>
        <button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="notification-preview-close"><X size={16} aria-hidden="true" /></button>
      </div>
      {error ? <div role="alert" className="notification-preview-error">{error}<button type="button" onClick={() => setRevision(value => value + 1)}>Try again</button></div> : null}
      <div className="notification-preview-list">
        {loading ? <p role="status" className="notification-preview-empty">Loading notifications…</p> : !error && !items.length ? <p className="notification-preview-empty">You’re all caught up. New updates will appear here.</p> : null}
        {[...items].sort((a,b) => Date.parse(b.createdAtUtc)-Date.parse(a.createdAtUtc)).slice(0,3).map(item => {
          const copy = notificationCopy(item);
          return <button key={item.id} type="button" disabled={busy} onClick={() => void view(item)} className="notification-preview-item" data-unread={!item.isRead}>
            <span className="notification-preview-dot" aria-hidden="true" />
            <span className="notification-preview-copy">
              <span className="notification-preview-title">{copy.title}</span>
              <span className="notification-preview-message">{copy.message}</span>
              <span className="notification-preview-meta"><time dateTime={item.createdAtUtc}>{notificationTime(item.createdAtUtc)}</time><span aria-hidden="true">·</span><span>{item.isRead ? "Read" : "Unread"}</span></span>
            </span>
            <ChevronRight size={14} className="notification-preview-arrow" aria-hidden="true" />
          </button>;
        })}
      </div>
      <div className="notification-preview-footer">
        <Link to={home} onClick={() => setOpen(false)}>View all notifications <ChevronRight size={14} aria-hidden="true" /></Link>
        {unread > 0 ? <button type="button" disabled={busy} onClick={() => void markAll()}>Mark all as read</button> : null}
      </div>
    </section> : null}
  </div>;
}
