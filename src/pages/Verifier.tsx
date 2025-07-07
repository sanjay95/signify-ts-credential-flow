
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfig } from "@/hooks/useConfig";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  ArrowLeft,
  Search,
  Shield,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Verifier = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [verifierData, setVerifierData] = useState({
    alias: "verifierAid",
  });

  const [requestData, setRequestData] = useState({
    holderAID: "",
    schemaSAID: "EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK",
    attributes: "eventName: GLEIF Summit",
  });

  const [verifications, setVerifications] = useState([
    {
      id: "ver-001",
      credentialSaid: "EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK",
      status: "verified",
      holder: "holder123",
      verifiedDate: "2024-01-15",
      result: "valid",
      claims: {
        eventName: "GLEIF Summit",
        accessLevel: "staff",
        validDate: "2026-10-01",
      },
    },
  ]);

  const handleConnect = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsProcessing(false);
      toast({
        title: "Connected Successfully",
        description: "Verifier client initialized and connected to KERI network",
      });
    }, 2000);
  };

  const handleRequestCredential = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newVerification = {
        id: `ver-${Date.now()}`,
        credentialSaid: `E${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        status: "pending",
        holder: requestData.holderAID,
        verifiedDate: new Date().toISOString().split("T")[0],
        result: "pending",
        claims: {
          eventName: "GLEIF Summit",
          accessLevel: "staff",
          validDate: "2026-10-01",
        },
      };

      setVerifications([...verifications, newVerification]);
      setIsProcessing(false);
      toast({
        title: "Verification Request Sent",
        description: "IPEX Apply message sent to holder for credential presentation",
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-slate-50">
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
              <div className="p-2 bg-purple-600 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Verifier Dashboard
                </h1>
                <p className="text-slate-600">
                  Request and verify credentials from holders
                </p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <div className="text-sm text-slate-500">
                <div>Admin: {config.adminUrl}</div>
                <div>Boot: {config.bootUrl}</div>
              </div>
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
              <CardTitle>Initialize Verifier Client</CardTitle>
              <CardDescription>
                Connect to the KERI network and set up your verifier identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Admin URL</Label>
                  <div className="p-2 bg-gray-50 rounded text-sm font-mono">
                    {config.adminUrl}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Boot URL</Label>
                  <div className="p-2 bg-gray-50 rounded text-sm font-mono">
                    {config.bootUrl}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="alias">Verifier AID Alias</Label>
                <Input
                  id="alias"
                  value={verifierData.alias}
                  onChange={(e) =>
                    setVerifierData({ ...verifierData, alias: e.target.value })
                  }
                  placeholder="Enter verifier alias"
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
          <Tabs defaultValue="request" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="request">Request Credentials</TabsTrigger>
              <TabsTrigger value="verify">Verifications</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="request" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Request Credential Presentation
                  </CardTitle>
                  <CardDescription>
                    Send an IPEX Apply request to a holder for credential presentation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="holderAID">Holder AID</Label>
                    <Input
                      id="holderAID"
                      value={requestData.holderAID}
                      onChange={(e) =>
                        setRequestData({
                          ...requestData,
                          holderAID: e.target.value,
                        })
                      }
                      placeholder="Enter holder's AID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schemaSAID">Schema SAID</Label>
                    <Input
                      id="schemaSAID"
                      value={requestData.schemaSAID}
                      onChange={(e) =>
                        setRequestData({
                          ...requestData,
                          schemaSAID: e.target.value,
                        })
                      }
                      placeholder="Enter schema SAID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attributes">Required Attributes</Label>
                    <Input
                      id="attributes"
                      value={requestData.attributes}
                      onChange={(e) =>
                        setRequestData({
                          ...requestData,
                          attributes: e.target.value,
                        })
                      }
                      placeholder="e.g., eventName: GLEIF Summit"
                    />
                  </div>
                  <Button
                    onClick={handleRequestCredential}
                    disabled={isProcessing || !requestData.holderAID}
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isProcessing
                      ? "Sending Request..."
                      : "Request Credential"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verify" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Credential Verifications</CardTitle>
                  <CardDescription>
                    View and manage all credential verification requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {verifications.map((verification) => (
                      <div
                        key={verification.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-mono text-slate-600">
                              {verification.credentialSaid.substring(0, 20)}...
                            </div>
                            <Badge
                              variant={
                                verification.result === "valid"
                                  ? "default"
                                  : verification.result === "invalid"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {verification.result}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {verification.result === "valid" ? (
                              <Shield className="h-4 w-4 text-green-600" />
                            ) : verification.result === "invalid" ? (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            ) : (
                              <div className="h-4 w-4 bg-gray-400 rounded-full animate-pulse" />
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Event:</span>
                            <div className="font-medium">
                              {verification.claims.eventName}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Access:</span>
                            <div className="font-medium">
                              {verification.claims.accessLevel}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Valid Until:</span>
                            <div className="font-medium">
                              {verification.claims.validDate}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Verified:</span>
                            <div className="font-medium">
                              {verification.verifiedDate}
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
                  <CardTitle>Verifier Configuration</CardTitle>
                  <CardDescription>
                    Manage your verifier settings and network configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Admin URL</Label>
                      <Input value={config.adminUrl} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Boot URL</Label>
                      <Input value={config.bootUrl} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>AID Alias</Label>
                    <Input value={verifierData.alias} readOnly />
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

export default Verifier;
