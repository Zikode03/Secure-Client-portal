import { lazy, Suspense, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { ClientComplianceCentreWorkspace } from "../../components/compliance/ClientComplianceCentreWorkspace";

const ClientComplianceVerificationPanel = lazy(() => import("../../components/compliance/ClientComplianceVerificationPanel").then(module => ({default: module.ClientComplianceVerificationPanel})));

export function ClientComplianceCentrePage() {
  const [showChecks, setShowChecks] = useState(false);
  return <>
    <ClientComplianceCentreWorkspace />
    <section className="rounded-xl border border-slate-200 bg-white">
      <button type="button" className="flex w-full items-center gap-3 px-5 py-4 text-left" aria-expanded={showChecks} aria-controls="client-business-checks" onClick={() => setShowChecks(value => !value)}>
        <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-700" />
        <span className="flex-1"><span className="block text-sm font-semibold text-slate-900">Business verification checks</span><span className="mt-1 block text-xs text-slate-500">Registration and tax checks recorded by your accountant.</span></span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 text-slate-500 transition ${showChecks ? "rotate-180" : ""}`} />
      </button>
      <div id="client-business-checks" hidden={!showChecks}>
        {showChecks ? <Suspense fallback={<p role="status" className="px-5 py-4 text-sm text-slate-500">Loading business checks…</p>}><ClientComplianceVerificationPanel /></Suspense> : null}
      </div>
    </section>
  </>;
}
