import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Copy, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { randomPasscode } from "signify-ts";
import { getItem, setItem } from "@/utils/db";

interface PasscodeDialogProps {
  onPasscodeSubmit: (passcode: string) => void;
  isProcessing: boolean;
  entityType: string; // "issuer" | "holder" | "verifier";
}

export const PasscodeDialog = ({
  onPasscodeSubmit,
  isProcessing,
  entityType,
}: PasscodeDialogProps) => {
  const { toast } = useToast();
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [generatedPasscode, setGeneratedPasscode] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGeneratePasscode = () => {
    const newPasscode = randomPasscode();
    setGeneratedPasscode(newPasscode);
  };

  const handleCopyPasscode = async () => {
    try {
      await navigator.clipboard.writeText(generatedPasscode);
      toast({
        title: "Copied to Clipboard",
        description: "Passcode has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSavePasscode = async () => {
    try {
      const saved = await getItem<any>(`${entityType.toLowerCase()}-data`);
      const updated = { ...saved, [`${entityType}Bran`]: generatedPasscode };
      await setItem(`${entityType.toLowerCase()}-data`, updated);
      toast({
        title: "Saved to Browser",
        description: "Passcode has been saved to your browser storage",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save passcode to browser",
        variant: "destructive",
      });
    }
  };

  const handleUseGeneratedPasscode = () => {
    setPasscode(generatedPasscode);
    setShowGenerateDialog(false);
    setShowPasscode(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      toast({
        title: "Passcode Required",
        description: "Please enter a passcode to continue",
        variant: "destructive",
      });
      return;
    }
    onPasscodeSubmit(passcode);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="passcode">KERIA Agent Passcode</Label>
          <div className="relative">
            <Input
              id="passcode"
              type={showPassword ? "text" : "password"}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter your passcode"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <Button type="submit" disabled={isProcessing} className="w-full">
          {isProcessing ? "Connecting..." : "Connect"}
        </Button>
      </form>

      <div className="text-center">
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              onClick={() => setShowGenerateDialog(true)}
            >
              Don't have KERIA agent passcode?
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Passcode</DialogTitle>
              <DialogDescription>
                The passcode safeguards your identity.
                <br />
                <br />
                Please store it in a secure online or offline location.
                <br />
                <br />
                <strong>
                  We CANNOT retrieve your passcode if you lose it.
                </strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {!generatedPasscode ? (
                <Button onClick={handleGeneratePasscode} className="w-full">
                  Generate Passcode
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Generated Passcode:</Label>
                    <div className="p-3 bg-gray-50 rounded-md font-mono text-sm break-all">
                      {generatedPasscode}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCopyPasscode}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSavePasscode}
                      className="flex-1"
                    >
                      Save to Browser
                    </Button>
                  </div>
                  <Button
                    onClick={handleUseGeneratedPasscode}
                    className="w-full"
                  >
                    Use This Passcode
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
