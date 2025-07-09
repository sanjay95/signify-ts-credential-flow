import { useState, useEffect } from "react";
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
import { useLocation, useNavigate } from "react-router-dom";
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
import { PasscodeDialog } from "@/components/PasscodeDialog";

const Issuer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [schemaSaid, setSchemaSaid] = useState(
    "EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK"
  );
  const [schemaOOBI, setSchemaOOBI] = useState(
    "http://vlei-server:7723/oobi/EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK"
  );
  const [isHolderConnected, setIsHolderConnected] = useState(false);

  // Get config from navigation state
  const [config, setConfig] = useState({
    adminUrl: "http://localhost:3901",
    bootUrl: "http://localhost:3903",
  });

  useEffect(() => {
    if (location.state?.config) {
      setConfig(location.state.config);
    }
  }, [location.state]);

  const [issuerData, setIssuerData] = useState({
    alias: "issuerAid",
    registryName: "issuerRegistry",
    issuerAid: "",
    issuerOOBI: "",
    issuerBran: "",
    registrySaid: "",
  });

  const [issuerClient, setIssuerClient] = useState(null);

  useEffect(() => {
    const attemptReconnect = async () => {
      const savedData = await getItem<any>("issuer-data");
      if (savedData) {
        setIssuerData(savedData);
        if (savedData.issuerBran) {
          console.log("Attempting to reconnect with saved passcode...");
          await handleConnect(savedData.issuerBran, true);
        }
      }
      setIsInitializing(false);
    };
    attemptReconnect();
  }, []);

  const [credentialData, setCredentialData] = useState({
    eventName: "GLEIF Summit",
    accessLevel: "staff",
    validDate: "2026-10-01",
  });
  const [holderAid, setHolderAid] = useState("");

  useEffect(() => {
    if (issuerData.issuerBran) {
      // Only save if we have a bran
      setItem("issuer-data", issuerData);
    }
  }, [issuerData]);

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

  const handleConnect = async (userPasscode: string, isReconnect = false) => {
    setIsProcessing(true);
    if (isReconnect) {
      console.log("Reconnecting Issuer...");
    } else {
      console.log("Connecting Issuer...");
    }

    try {
      const issuerBran = userPasscode;
      const issuerAidAlias = issuerData.alias || "issuerAid";
      const { client: issuerClient, clientState: issuerClientState } =
        await initializeAndConnectClient(
          issuerBran,
          config.adminUrl,
          config.bootUrl
        );
      setIssuerClient(issuerClient);
      console.log("Issuer client connected:", issuerClientState);

      let issuerAid, registrySaid, issuerOOBI;

      try {
        // Check if the AID already exists for this client
        issuerAid = await issuerClient.identifiers().get(issuerAidAlias);
        console.log("Existing Issuer AID found:", issuerAid);

        // Check if the registry exists
        const registries = await issuerClient.registries().list(issuerAidAlias);
        if (registries.length > 0) {
          registrySaid = registries[0].regk;
          console.log("Existing registry found:", registrySaid);
        } else {
          console.log("No existing registry found, creating new one...");
          const regResult = await createCredentialRegistry(
            issuerClient,
            issuerAidAlias,
            issuerData.registryName
          );
          registrySaid = regResult.registrySaid;
          console.log("New registry created:", registrySaid);
        }

        issuerOOBI = await generateOOBI(
          issuerClient,
          issuerAidAlias,
          ROLE_AGENT
        );
      } catch (error) {
        // If getting AID fails, it likely doesn't exist, so create it.
        console.log("No existing Issuer AID found, creating new one...");
        const { aid: newIssuerAid } = await createNewAID(
          issuerClient,
          issuerAidAlias,
          DEFAULT_IDENTIFIER_ARGS
        );
        issuerAid = newIssuerAid;
        console.log("Issuer AID created:", issuerAid);

        console.log("Adding Agent role to AID...");
        await addEndRoleForAID(issuerClient, issuerAidAlias, ROLE_AGENT);

        issuerOOBI = await generateOOBI(
          issuerClient,
          issuerAidAlias,
          ROLE_AGENT
        );
        console.log("Issuer OOBI generated:", issuerOOBI);

        console.log("Creating Credential Registry...");
        const regResult = await createCredentialRegistry(
          issuerClient,
          issuerAidAlias,
          issuerData.registryName
        );
        registrySaid = regResult.registrySaid;
        console.log("Credential Registry created:", registrySaid);
      }

      setItem("issuer-oobi", issuerOOBI);
      setIssuerData((prevData) => ({
        ...prevData,
        issuerBran: issuerBran,
        issuerAid: issuerAid.prefix || issuerAid.d,
        issuerOOBI: issuerOOBI,
        registrySaid: registrySaid,
      }));

      setIsConnected(true);
      if (isReconnect) {
        toast({
          title: "Reconnected",
          description: "Automatically reconnected to KERI network.",
        });
      } else {
        toast({
          title: "Connected to KERI Network",
          description: "Issuer client initialized and connected.",
        });
      }
    } catch (error) {
      console.error("Error connecting issuer client:", error);
      if (isReconnect) {
        // On reconnect failure, clear the bad passcode so the user has to enter it again
        setIssuerData((prev) => ({ ...prev, issuerBran: "" }));
      }
      toast({
        title: "Connection Error",
        description: "Failed to connect to KERI network or create identity.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIssueCredential = async () => {
    setIsProcessing(true);
    console.log("issuing credential to holder");
    try {
      if (!holderAid) {
        toast({
          title: "Error",
          description: "Holder AID is required to issue a credential",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      console.log("Issuer Data:", issuerData);
      await resolveOOBI(issuerClient, schemaOOBI, "schemaContact");
      const holderOOBI = (await getItem("holder-oobi")) as string;
      await resolveOOBI(issuerClient, holderOOBI, "holderContact");
      console.log("Schema resolved from OOBI:", schemaOOBI);
      const { credentialSaid: credentialSaid } = await issueCredential(
        issuerClient,
        issuerData.alias,
        issuerData.registrySaid,
        schemaSaid,
        holderAid,
        credentialData
      );

      console.log("Credential issued with SAID:", credentialSaid);
      const credential = await issuerClient.credentials().get(credentialSaid);

      console.log("Credential details:", credential);
      console.log("granting credential to holder");
      const grantResponse = await ipexGrantCredential(
        issuerClient,
        issuerData.alias,
        holderAid,
        credential
      );

      console.log("Issuer created and granted credential.");

      setIsProcessing(false);
      toast({
        title: "Credential Issued",
        description:
          "ACDC credential has been successfully created and granted to holder",
      });
    } catch (error) {
      console.error("Error issuing credential:", error);
      setIsProcessing(false);
      toast({
        title: "ERROR",
        description: "Failed to issue credential",
      });
    } finally {
      setIsProcessing(false);
    }
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
        {isInitializing ? (
          <Card className="max-w-2xl mx-auto text-center p-8">
            <CardHeader>
              <CardTitle>Initializing Client...</CardTitle>
              <CardDescription>
                Please wait while we connect to the network.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RotateCcw className="h-8 w-8 mx-auto animate-spin text-slate-500" />
            </CardContent>
          </Card>
        ) : !isConnected ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Initialize Issuer Client</CardTitle>
              <CardDescription>
                Connect to the KERI network and set up your issuer identity
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
              <PasscodeDialog
                onPasscodeSubmit={handleConnect}
                isProcessing={isProcessing}
                entityType="issuer"
              />
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
                        value={holderAid}
                        onChange={(e) => setHolderAid(e.target.value)}
                        placeholder="Enter holder's AID"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleIssueCredential}
                    disabled={isProcessing || !holderAid}
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
