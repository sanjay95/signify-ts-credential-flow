import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  ArrowLeft,
  Plus,
  Send,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { randomPasscode, Serder } from "signify-ts";
import {
  initializeSignify,
  initializeAndConnectClient,
  createNewAID,
  addEndRoleForAID,
  generateOOBI,
  resolveOOBI,
  createTimestamp,
  createCredentialRegistry,
  getSchema,
  issueCredential,
  ipexGrantCredential,
  getCredentialState,
  waitForAndGetNotification,
  ipexAdmitGrant,
  markNotificationRead,
  DEFAULT_IDENTIFIER_ARGS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_DELAY_MS,
  DEFAULT_RETRIES,
  ROLE_AGENT,
  IPEX_GRANT_ROUTE,
  IPEX_ADMIT_ROUTE,
  IPEX_APPLY_ROUTE,
  IPEX_OFFER_ROUTE,
  SCHEMA_SERVER_HOST,
} from "../utils/utils";

const Issuer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [issuerData, setIssuerData] = useState({
    alias: "issuerAid",
    registryName: "issuerRegistry",
  });

  const [credentialData, setCredentialData] = useState({
    eventName: "GLEIF Summit",
    accessLevel: "staff",
    validDate: "2026-10-01",
    holderAID: "",
  });

  const [credentials, setCredentials] = useState([
    {
      id: "cred-001",
      said: "EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK",
      status: "issued",
      holder: "holder123",
      issuedDate: "2024-01-15",
      claims: {
        eventName: "GLEIF Summit",
        accessLevel: "staff",
        validDate: "2026-10-01",
      },
    },
  ]);

  const handleConnect = async () => {
    setIsProcessing(true);
    // Simulate client initialization
    setTimeout(() => {
      setIsConnected(true);
      setIsProcessing(false);
      toast({
        title: "Connected Successfully",
        description: "Issuer client initialized and connected to KERI network",
      });
    }, 2000);
  };

  const handleIssueCredential = async () => {
    setIsProcessing(true);
    // Simulate credential issuance
    setTimeout(() => {
      const newCredential = {
        id: `cred-${Date.now()}`,
        said: `E${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        status: "issued",
        holder: credentialData.holderAID,
        issuedDate: new Date().toISOString().split("T")[0],
        claims: {
          eventName: credentialData.eventName,
          accessLevel: credentialData.accessLevel,
          validDate: credentialData.validDate,
        },
      };

      setCredentials([...credentials, newCredential]);
      setIsProcessing(false);
      toast({
        title: "Credential Issued",
        description:
          "ACDC credential has been successfully created and granted to holder",
      });
    }, 3000);
  };

  const handleRevokeCredential = async (credentialId: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      setCredentials(
        credentials.map((cred) =>
          cred.id === credentialId ? { ...cred, status: "revoked" } : cred
        )
      );
      setIsProcessing(false);
      toast({
        title: "Credential Revoked",
        description:
          "Credential status updated in TEL and propagated to network",
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Key className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Issuer Dashboard
                </h1>
                <p className="text-slate-600">
                  Manage credential issuance and revocation
                </p>
              </div>
            </div>
            <div className="ml-auto">
              <Badge
                variant={isConnected ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-400" : "bg-gray-400"
                  }`}
                ></div>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {!isConnected ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Initialize Issuer Client</CardTitle>
              <CardDescription>
                Connect to the KERI network and set up your issuer identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alias">Issuer AID Alias</Label>
                <Input
                  id="alias"
                  value={issuerData.alias}
                  onChange={(e) =>
                    setIssuerData({ ...issuerData, alias: e.target.value })
                  }
                  placeholder="Enter issuer alias"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registry">Registry Name</Label>
                <Input
                  id="registry"
                  value={issuerData.registryName}
                  onChange={(e) =>
                    setIssuerData({
                      ...issuerData,
                      registryName: e.target.value,
                    })
                  }
                  placeholder="Enter registry name"
                />
              </div>
              <Button
                onClick={handleConnect}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "Connecting..." : "Connect to KERI Network"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="issue" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="issue">Issue Credentials</TabsTrigger>
              <TabsTrigger value="manage">Manage Credentials</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="issue" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Issue New Credential
                  </CardTitle>
                  <CardDescription>
                    Create and issue an ACDC credential to a holder
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventName">Event Name</Label>
                      <Input
                        id="eventName"
                        value={credentialData.eventName}
                        onChange={(e) =>
                          setCredentialData({
                            ...credentialData,
                            eventName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accessLevel">Access Level</Label>
                      <Input
                        id="accessLevel"
                        value={credentialData.accessLevel}
                        onChange={(e) =>
                          setCredentialData({
                            ...credentialData,
                            accessLevel: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="validDate">Valid Date</Label>
                      <Input
                        id="validDate"
                        type="date"
                        value={credentialData.validDate}
                        onChange={(e) =>
                          setCredentialData({
                            ...credentialData,
                            validDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="holderAID">Holder AID</Label>
                      <Input
                        id="holderAID"
                        value={credentialData.holderAID}
                        onChange={(e) =>
                          setCredentialData({
                            ...credentialData,
                            holderAID: e.target.value,
                          })
                        }
                        placeholder="Enter holder's AID"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleIssueCredential}
                    disabled={isProcessing || !credentialData.holderAID}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isProcessing
                      ? "Issuing Credential..."
                      : "Issue Credential"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Issued Credentials</CardTitle>
                  <CardDescription>
                    View and manage all credentials issued by this AID
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {credentials.map((credential) => (
                      <div
                        key={credential.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-mono text-slate-600">
                              {credential.said.substring(0, 20)}...
                            </div>
                            <Badge
                              variant={
                                credential.status === "issued"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {credential.status}
                            </Badge>
                          </div>
                          {credential.status === "issued" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRevokeCredential(credential.id)
                              }
                              disabled={isProcessing}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Revoke
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Event:</span>
                            <div className="font-medium">
                              {credential.claims.eventName}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Access:</span>
                            <div className="font-medium">
                              {credential.claims.accessLevel}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Valid Until:</span>
                            <div className="font-medium">
                              {credential.claims.validDate}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Issued:</span>
                            <div className="font-medium">
                              {credential.issuedDate}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Issuer Configuration</CardTitle>
                  <CardDescription>
                    Manage your issuer settings and network configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>AID Alias</Label>
                    <Input value={issuerData.alias} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Registry Name</Label>
                    <Input value={issuerData.registryName} readOnly />
                  </div>
                  <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-700">
                      Connected to KERI network
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Issuer;
