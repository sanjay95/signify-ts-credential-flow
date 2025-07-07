import { useEffect, useState } from "react";
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
  Users,
  ArrowLeft,
  Download,
  Send,
  Eye,
  CheckCircle,
} from "lucide-react";
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
import { getItem, setItem } from "@/utils/db";
import { set } from "date-fns";

const Holder = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [holderData, setHolderData] = useState({
    alias: "holderAid",
    registryName: "issuerRegistry",
    holderAid: "",
    holderOOBI: "",
    holderBran: "",
  });
  const [holderClient, setHolderClient] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const saved = await getItem<any>("holder-data");
      if (saved) {
        setHolderData(saved);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (holderData) {
      setItem("holder-data", holderData);
    }
  }, [holderData]);

  const [credentials, setCredentials] = useState([
    {
      id: "cred-001",
      said: "EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK",
      status: "received",
      issuer: "issuer123",
      receivedDate: "2024-01-15",
      claims: {
        eventName: "GLEIF Summit",
        accessLevel: "staff",
        validDate: "2026-10-01",
      },
    },
  ]);

  const [presentationData, setPresentationData] = useState({
    verifierAID: "",
    selectedCredential: "",
  });

  const handleConnect = async () => {
    setIsProcessing(true);
    console.log("Creating Holder...");
    try {
      const holderBran = randomPasscode();
      const holderAidAlias = holderData.alias || "holderAid";
      const { client: holderClient } = await initializeAndConnectClient(
        holderBran,
        config.adminUrl,
        config.bootUrl
      );
      setHolderClient(holderClient);
      console.log("Holder client initialized:");
      if (!holderData.holderAid) {
        const { aid: holderAid } = await createNewAID(
          holderClient,
          holderData.alias,
          DEFAULT_IDENTIFIER_ARGS
        );
        console.log("Holder AID created:", holderAid);

        console.log("Adding Agent role to AID...");
        await addEndRoleForAID(holderClient, holderAidAlias, ROLE_AGENT);
        const holderOOBI = await generateOOBI(
          holderClient,
          holderAidAlias,
          ROLE_AGENT
        );
        console.log("Holder OOBI generated:", holderOOBI);
        setHolderData((prevData) => ({
          ...prevData,
          holderAid: holderAid,
          holderOOBI: holderOOBI,
          holderBran: holderBran,
        }));
      }
      setIsConnected(true);
      setIsProcessing(false);

      toast({
        title: "Connected to KERI Network",
        description: "Holder client initialized and connected to KERI network",
      });
    } catch (error) {
      console.error("Error connecting holder client:", error);
      setIsProcessing(false);
      toast({
        title: "ERROR",
        description: "Failed to connect to KERI network or present credential",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  const handlePresentCredential = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Credential Presented",
        description:
          "ACDC credential has been successfully presented to verifier",
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-50">
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
              <div className="p-2 bg-green-600 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Holder Dashboard
                </h1>
                <p className="text-slate-600">
                  Receive, store, and present credentials
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
              <CardTitle>Initialize Holder Client</CardTitle>
              <CardDescription>
                Connect to the KERI network and set up your holder identity
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
                <Label htmlFor="alias">Holder AID Alias</Label>
                <Input
                  id="alias"
                  value={holderData.alias}
                  onChange={(e) =>
                    setHolderData({ ...holderData, alias: e.target.value })
                  }
                  placeholder="Enter holder alias"
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
          <Tabs defaultValue="credentials" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="credentials">My Credentials</TabsTrigger>
              <TabsTrigger value="present">Present Credential</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="credentials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stored Credentials</CardTitle>
                  <CardDescription>
                    View and manage all credentials in your wallet
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
                            <Badge variant="default">{credential.status}</Badge>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
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
                            <span className="text-slate-500">Received:</span>
                            <div className="font-medium">
                              {credential.receivedDate}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="present" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Present Credential
                  </CardTitle>
                  <CardDescription>
                    Share your credential with a verifier using IPEX protocol
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verifierAID">Verifier AID</Label>
                    <Input
                      id="verifierAID"
                      value={presentationData.verifierAID}
                      onChange={(e) =>
                        setPresentationData({
                          ...presentationData,
                          verifierAID: e.target.value,
                        })
                      }
                      placeholder="Enter verifier's AID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credential">Select Credential</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={presentationData.selectedCredential}
                      onChange={(e) =>
                        setPresentationData({
                          ...presentationData,
                          selectedCredential: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose a credential...</option>
                      {credentials.map((cred) => (
                        <option key={cred.id} value={cred.id}>
                          {cred.claims.eventName} - {cred.claims.accessLevel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    onClick={handlePresentCredential}
                    disabled={
                      isProcessing ||
                      !presentationData.verifierAID ||
                      !presentationData.selectedCredential
                    }
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isProcessing
                      ? "Presenting Credential..."
                      : "Present Credential"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Holder Configuration</CardTitle>
                  <CardDescription>
                    Manage your holder settings and network configuration
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
                    <Input value={holderData.alias} readOnly />
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

export default Holder;
