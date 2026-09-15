import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Moon, Pencil, Sun, UserRound } from "lucide-react";
import { useAuth } from "../../app/auth";
import { useTheme } from "../../app/theme";

export function WorkspaceAccountMenu() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const profilePath = user?.role === "client" ? "/client/profile" : "/firm/profile";

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div className="workspace-header-actions">
    <div className="workspace-theme-switch" role="group" aria-label="Appearance">
      <button type="button" aria-label="Light mode" title="Light mode" aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun size={18} aria-hidden="true" /></button>
      <button type="button" aria-label="Dark mode" title="Dark mode" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon size={18} aria-hidden="true" /></button>
    </div>
    <div className="workspace-account" ref={root} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <button ref={trigger} type="button" className="workspace-profile-trigger" aria-label="Open profile menu" aria-expanded={open} aria-controls="workspace-profile-menu" onClick={() => setOpen(value => !value)}>
        <span className="workspace-avatar" aria-hidden="true">{user?.initials || "U"}</span>
        <span className="workspace-profile-label"><strong>{user?.fullName || user?.name}</strong><small>{user?.role === "admin" ? "Administrator" : user?.role === "accountant" ? "Accountant" : "Client"}</small></span>
        <ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} />
      </button>
      {open && <div id="workspace-profile-menu" className="workspace-profile-menu">
        <div className="workspace-profile-menu-heading"><strong>{user?.fullName}</strong><span>{user?.email}</span></div>
        <Link to={profilePath} onClick={() => setOpen(false)}><UserRound size={17} aria-hidden="true" />View profile</Link>
        <Link to={`${profilePath}?edit=true`} onClick={() => setOpen(false)}><Pencil size={17} aria-hidden="true" />Edit profile</Link>
      </div>}
    </div>
  </div>;
}
