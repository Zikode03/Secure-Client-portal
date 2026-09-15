import { BookOpen, MessageCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/auth";

export function HelpSupportPage() {
  const { user } = useAuth();
  const audience = user?.role === "client" ? "your accountant" : "your portal administrator";

  return <section className="workspace-support-page">
    <div>
      <p className="workspace-eyebrow">SUPPORT</p>
      <h1>Help &amp; support</h1>
      <p>Find the right next step when you need help with your workspace.</p>
    </div>
    <div className="workspace-support-grid">
      <article><BookOpen size={22} aria-hidden="true" /><h2>Using the portal</h2><p>Use the sidebar to move between work areas. Your dashboard shows the most important work first.</p></article>
      <article><ShieldCheck size={22} aria-hidden="true" /><h2>Account security</h2><p>Use your profile to update your personal details. Contact {audience} if you need help with access or your sign-in email.</p></article>
      <article><MessageCircle size={22} aria-hidden="true" /><h2>Need a hand?</h2><p>Use your inbox to keep questions about documents and tasks attached to the right record.</p></article>
    </div>
  </section>;
}
