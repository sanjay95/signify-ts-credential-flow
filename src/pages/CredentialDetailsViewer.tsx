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

export const CredentialDetailsViewer: React.FC<
  CredentialDetailsViewerProps
> = ({ open, onClose, credential }) => {
  if (!credential) return null;
  // Try to extract the most relevant fields for display
  const status =
    credential.status || credential.status?.et || credential?.status?.et;
  const sad = credential.sad || credential?.sad;
  const schema = credential.schema || credential?.schema;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Credential Details</DialogTitle>
          <DialogDescription>
            Below are the details for this credential. You can copy or inspect
            the JSON as needed.
          </DialogDescription>
        </DialogHeader>
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
        <div className="mb-4">
          <span className="font-semibold">Credential SAD:</span>
          <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto max-h-64">
            {formatJson(sad)}
          </pre>
        </div>
        <div className="mb-4">
          <span className="font-semibold">Full Credential Object:</span>
          <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto max-h-64">
            {formatJson(credential)}
          </pre>
        </div>
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};
