import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface CredentialDetailsViewerProps {
  open: boolean;
  onClose: () => void;
  credential: any;
}

function formatJson(obj: any) {
  return JSON.stringify(obj, null, 2);
}

// Utility: Detect if object is an ACDC credential (basic heuristic)
function isACDC(cred: any) {
  return cred && (cred.sad || cred.schema || cred.edges || cred.rules);
}

// Utility: Collapsible section for large/nested fields
const CollapsibleSection: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-2">
      <button
        className="text-xs font-semibold text-blue-700 hover:underline focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? "▼" : "▶"} {label}
      </button>
      {open && <div className="mt-1 ml-4">{children}</div>}
    </div>
  );
};

export const CredentialDetailsViewer: React.FC<
  CredentialDetailsViewerProps
> = ({ open, onClose, credential }) => {
  if (!credential) return null;

  // Extract common fields
  const status =
    credential.status || credential.status?.et || credential?.status?.et;
  const sad = credential.sad || credential?.sad;
  const schema = credential.schema || credential?.schema;
  const edges = credential.edges || credential?.edges;
  const rules = credential.rules || credential?.rules;

  // Helper to render a field as pretty JSON (with wrapping)
  function renderWrappedJson(json: any) {
    if (!json) return <span className="text-slate-400">-</span>;
    const jsonStr = formatJson(json);
    return (
      <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto break-words max-h-80 whitespace-pre-wrap">
        {jsonStr}
      </pre>
    );
  }

  // Render ACDC/vLEI details dynamically
  function renderACDCDetails() {
    return (
      <>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Status:</span>
            <Badge variant="default">{String(status)}</Badge>
          </div>
        </div>
        <div className="mb-4">
          <span className="font-semibold">Schema:</span>
          <div className="text-xs text-slate-600 break-all">
            {schema?.title
              ? `${schema.title} (${schema.$id || schema.s || ""})`
              : schema?.$id || schema?.s || "-"}
          </div>
        </div>
        {sad && (
          <CollapsibleSection label="Credential SAD (Self-Addressing Data)">
            {renderWrappedJson(sad)}
          </CollapsibleSection>
        )}
        {edges && (
          <CollapsibleSection label="Edges (Credential Links)">
            {renderWrappedJson(edges)}
          </CollapsibleSection>
        )}
        {rules && (
          <CollapsibleSection label="Rules (Embedded/Legal)">
            {renderWrappedJson(rules)}
          </CollapsibleSection>
        )}
        <CollapsibleSection label="Full Credential Object">
          {renderWrappedJson(credential)}
        </CollapsibleSection>
      </>
    );
  }

  // Fallback: generic JSON view
  function renderGenericDetails() {
    return (
      <>
        <div className="mb-4">
          <span className="font-semibold">Credential Object:</span>
          {renderWrappedJson(credential)}
        </div>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-screen-md w-full">
        <DialogHeader>
          <DialogTitle>Credential Details</DialogTitle>
          <DialogDescription>
            Below are the details for this credential. Fields are shown
            dynamically for ACDC/vLEI credentials. Expand sections for more
            details.
          </DialogDescription>
        </DialogHeader>
        {isACDC(credential) ? renderACDCDetails() : renderGenericDetails()}
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
