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
  viewerType?: "issuer" | "holder"; // Optional, for context-specific view
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
> = ({ open, onClose, credential, viewerType }) => {
  if (!credential) return null;

  // Extract fields
  // Status: prefer status.et if present, else fallback
  const status =
    credential.status?.et || credential.status || credential?.status?.et;
  const sad = credential.sad || credential?.sad;
  const schema = credential.schema || credential?.schema;
  const edges = credential.edges || credential?.edges;
  const rules = credential.rules || credential?.rules;
  const claims = credential.claims || credential?.claims;
  const issuer =
    credential.issuer || credential?.sad?.i || credential?.sad?.issuer;
  const issuee =
    credential.issuee || credential?.sad?.a || credential?.sad?.issuee;
  const type =
    schema?.title ||
    credential.type ||
    credential?.sad?.type ||
    credential?.type;
  const said = credential.said || credential?.sad?.d || credential?.sad?.said;
  const issuedDate = credential.issuedDate || credential?.issuedDate;
  const receivedDate = credential.receivedDate || credential?.receivedDate;

  // Status badge color
  // Only allowed: "default" | "destructive" | "secondary" | "outline"
  function statusBadgeColor(
    status: string
  ): "default" | "destructive" | "secondary" | "outline" {
    if (!status) return "default";
    if (typeof status === "string" && status.toLowerCase().startsWith("rev"))
      return "destructive";
    if (typeof status === "string" && status.toLowerCase().startsWith("iss"))
      return "secondary"; // Use secondary for issued
    return "default";
  }

  // Human-friendly type label
  function friendlyTypeLabel(type: string) {
    if (!type) return "Unknown";
    const t = type.toLowerCase();
    if (t.includes("gleif")) return "GLEIF vLEI";
    if (t.includes("qvi")) return "Qualified vLEI Issuer (QVI)";
    if (t.includes("ecr")) return "Engagement Context Role (ECR)";
    if (t.includes("oor")) return "Official Organizational Role (OOR)";
    return type;
  }

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
        <div className="mb-2 flex flex-wrap gap-4 items-center">
          <div>
            <span className="font-semibold">Type:</span>{" "}
            {friendlyTypeLabel(type)}
          </div>
          <div>
            <span className="font-semibold">Status:</span>{" "}
            <Badge variant={statusBadgeColor(status)}>
              {status ? String(status) : "-"}
            </Badge>
          </div>
        </div>
        {said && (
          <div className="mb-2">
            <span className="font-semibold">SAID:</span>
            <div className="font-mono text-xs break-all max-w-full bg-slate-50 rounded p-1 mt-1">
              {said}
            </div>
          </div>
        )}
        <div className="mb-2 flex flex-wrap gap-4 items-center">
          {issuer && (
            <div>
              <span className="font-semibold">Issuer:</span>{" "}
              <span className="font-mono text-xs">{issuer}</span>
            </div>
          )}
          {issuee && (
            <div>
              <span className="font-semibold">Issuee:</span>{" "}
              <span className="font-mono text-xs">
                {typeof issuee === "string" ? issuee : JSON.stringify(issuee)}
              </span>
            </div>
          )}
          {issuedDate && (
            <div>
              <span className="font-semibold">Issued:</span>{" "}
              {new Date(issuedDate).toLocaleString()}
            </div>
          )}
          {receivedDate && (
            <div>
              <span className="font-semibold">Received:</span>{" "}
              {new Date(receivedDate).toLocaleString()}
            </div>
          )}
        </div>
        <div className="mb-2">
          <span className="font-semibold">Schema:</span>
          <span className="text-xs text-slate-600 break-all ml-1">
            {schema?.title
              ? `${schema.title} (${schema.$id || schema.s || ""})`
              : schema?.$id || schema?.s || "-"}
          </span>
        </div>
        {claims && (
          <CollapsibleSection label="Claims">
            {renderWrappedJson(claims)}
          </CollapsibleSection>
        )}
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

  // Issuer-specific summary
  function renderIssuerSummary() {
    return (
      <div className="mb-2 flex flex-wrap gap-4 items-center">
        <div>
          <span className="font-semibold">Issued To:</span>{" "}
          <span className="font-mono text-xs">{issuee || "-"}</span>
        </div>
        <div>
          <span className="font-semibold">Type:</span> {friendlyTypeLabel(type)}
        </div>
        <div>
          <span className="font-semibold">Status:</span>{" "}
          <Badge variant={statusBadgeColor(status)}>
            {status ? String(status) : "-"}
          </Badge>
        </div>
        {issuedDate && (
          <div>
            <span className="font-semibold">Issued:</span>{" "}
            {new Date(issuedDate).toLocaleString()}
          </div>
        )}
      </div>
    );
  }

  // Holder-specific summary
  function renderHolderSummary() {
    return (
      <div className="mb-2 flex flex-wrap gap-4 items-center">
        <div>
          <span className="font-semibold">Issuer:</span>{" "}
          <span className="font-mono text-xs">{issuer || "-"}</span>
        </div>
        <div>
          <span className="font-semibold">Type:</span> {friendlyTypeLabel(type)}
        </div>
        <div>
          <span className="font-semibold">Status:</span>{" "}
          <Badge variant={statusBadgeColor(status)}>
            {status ? String(status) : "-"}
          </Badge>
        </div>
        {receivedDate && (
          <div>
            <span className="font-semibold">Received:</span>{" "}
            {new Date(receivedDate).toLocaleString()}
          </div>
        )}
      </div>
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
        {isACDC(credential) ? (
          <>
            {viewerType === "issuer" && renderIssuerSummary()}
            {viewerType === "holder" && renderHolderSummary()}
            {renderACDCDetails()}
          </>
        ) : (
          renderGenericDetails()
        )}
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
