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
  RefreshCw,
  Clock,
  RotateCcw,
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
import { PasscodeDialog } from "@/components/PasscodeDialog";

const Holder = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCheckingIncoming, setIsCheckingIncoming] = useState(false);
  const [isIssuerResolved, setIsIssuerResolved] = useState(false);
  const [schemaOOBI, setSchemaOOBI] = useState(
    "http://vlei-server:7723/oobi/EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK"
  );
  const [schemaOOBI2, setSchemaOOBI2] = useState(
    "http://vlei-server:7723/oobi/EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao"
  );

  const [holderData, setHolderData] = useState({
    alias: "holderAid",
    registryName: "issuerRegistry",
    holderAid: "",
    holderOOBI: "",
    holderBran: "",
  });
  const [holderClient, setHolderClient] = useState(null);

  const [incomingCredentials, setIncomingCredentials] = useState([]);

  useEffect(() => {
    const attemptReconnect = async () => {
      const savedData = await getItem<any>("holder-data");
      if (savedData) {
        setHolderData(savedData);
        if (savedData.holderBran) {
          console.log("Attempting to reconnect with saved passcode...");
          await handleConnect(savedData.holderBran, true);
        }
      }
      setIsInitializing(false);
    };
    attemptReconnect();
  }, []);

  useEffect(() => {
    if (holderData.holderBran) {
      // Only save if we have a bran
      setItem("holder-data", holderData);
    }
  }, [holderData]);

  // Auto-check for incoming credentials when connected
  useEffect(() => {
    if (isConnected && holderClient) {
      checkIncomingCredentials();
      // Set up periodic checking every 30 seconds
      const interval = setInterval(() => {
        checkIncomingCredentials();
      }, 300000);
      return () => clearInterval(interval);
    }
  }, [isConnected, holderClient]);

  useEffect(() => {
    const getCredential = async () => {
      const credentials = await holderClient?.credentials()?.list();

      console.log("------ ---- Fetched credential:", credentials);
      if (!credentials || credentials.length === 0) {
        console.log("No credentials found for this holder.");
        return;
      }
      setCredentials([]);
      credentials.map((cred) => {
        setCredentials((prev) => [
          ...prev,
          {
            id: cred.sad.d,
            said: cred.sad.d,
            status: cred.status.et || "received",
            issuer: cred.sad.i,
            receivedDate: cred.sad.a.dt,
            claims: {
              eventName: cred.sad.a.eventName,
              accessLevel: cred.sad.a.accessLevel,
              validDate: cred.sad.a.validDate,
            },
          },
        ]);
      });
    };
    getCredential();
  }, [incomingCredentials, holderData]);

  const [credentials, setCredentials] = useState([]);

  const [presentationData, setPresentationData] = useState({
    verifierOOBI: "",
    selectedCredential: "",
  });

  const handleConnect = async (userPasscode: string, isReconnect = false) => {
    setIsProcessing(true);
    if (isReconnect) {
      console.log("Reconnecting holder...");
    } else {
      console.log("Connecting holder...");
    }
    try {
      const holderBran = userPasscode;
      const holderAidAlias = holderData.alias || "holderAid";
      const { client: holderClient, clientState: holderClientState } =
        await initializeAndConnectClient(
          holderBran,
          config.adminUrl,
          config.bootUrl
        );
      setHolderClient(holderClient);
      console.log("Holder client connected:", holderClientState);

      let holderAid, holderOOBI;

      try {
        // Check if the AID already exists for this client
        holderAid = await holderClient.identifiers().get(holderAidAlias);
        console.log("Existing Holder AID found:", holderAid);

        holderOOBI = await generateOOBI(
          holderClient,
          holderAidAlias,
          ROLE_AGENT
        );
      } catch (error) {
        // If getting AID fails, it likely doesn't exist, so create it.
        console.log("No existing Holder AID found, creating new one...");
        const { aid: newHolderAid } = await createNewAID(
          holderClient,
          holderAidAlias,
          DEFAULT_IDENTIFIER_ARGS
        );
        holderAid = newHolderAid;
        console.log("Holder AID created:", holderAid);

        console.log("Adding Agent role to AID...");
        await addEndRoleForAID(holderClient, holderAidAlias, ROLE_AGENT);
        holderOOBI = await generateOOBI(
          holderClient,
          holderAidAlias,
          ROLE_AGENT
        );
        console.log("Holder OOBI generated:", holderOOBI);
      }

      setItem("holder-oobi", holderOOBI);
      setHolderData((prevData) => ({
        ...prevData,
        holderBran: holderBran,
        holderAid: holderAid.prefix || holderAid.d,
        holderOOBI: holderOOBI,
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
      console.error("Error connecting holder client:", error);
      if (isReconnect) {
        // On reconnect failure, clear the bad passcode so the user has to enter it again
        setHolderData((prev) => ({ ...prev, holderBran: "" }));
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

  const checkIncomingCredentials = async () => {
    if (!holderClient) return;

    setIsCheckingIncoming(true);
    try {
      // Ensure necessary OOBIs are resolved before checking notifications.
      // This could be optimized to only run if needed.
      await resolveOOBI(holderClient, schemaOOBI, "schemaContact");
      await resolveOOBI(holderClient, schemaOOBI2, "schemaContact2");
      if (!isIssuerResolved) {
        const issuerOOBI = await getItem("issuer-oobi");
        if (issuerOOBI) {
          console.log("Resolving issuer OOBI...");
          await resolveOOBI(
            holderClient,
            issuerOOBI as string,
            "issuerContact"
          );
          setIsIssuerResolved(true);
        }
      }

      console.log("Holder checking for incoming credentials...");
      const grantNotifications = await waitForAndGetNotification(
        holderClient,
        IPEX_GRANT_ROUTE
      );

      if (grantNotifications.length === 0) {
        console.log("No new grant notifications found.");
        return;
      }

      console.log(
        `Found ${grantNotifications.length} incoming grant notification(s).`
      );

      const newIncomingPromises = grantNotifications.map(
        async (notification) => {
          const grantExchange = await holderClient
            .exchanges()
            .get(notification.a.d);
          return {
            id: notification.i, // Use the notification ID as the unique key
            notificationId: notification.i, // Correctly assign the notification ID
            grantSaid: grantExchange.exn.d,
            receivedAt: grantExchange.exn.dt,
            status: "pending",
            issuer: grantExchange.exn.i || "Unknown Issuer",
          };
        }
      );

      const newIncoming = await Promise.all(newIncomingPromises);

      // Filter out credentials that are already in the incoming list to avoid duplicates
      setIncomingCredentials((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const uniqueNew = newIncoming.filter((c) => !existingIds.has(c.id));
        return [...prev, ...uniqueNew];
      });
    } catch (error) {
      console.log("No incoming credentials found or error:", error.message);
    } finally {
      setIsCheckingIncoming(false);
    }
  };

  const handleAdmitCredential = async (incomingCred) => {
    if (!holderClient) return;

    setIsProcessing(true);
    try {
      console.log("Holder admitting credential:", incomingCred.grantSaid);

      // Admit the grant
      const admitResponse = await ipexAdmitGrant(
        holderClient,
        holderData.alias,
        incomingCred.issuer,
        incomingCred.grantSaid
      );
      console.log("Holder admitting credential");

      // Mark notification as read
      await markNotificationRead(holderClient, incomingCred.notificationId);

      // Update the incoming credential status
      setIncomingCredentials((prev) =>
        prev.map((cred) =>
          cred.id === incomingCred.id ? { ...cred, status: "admitted" } : cred
        )
      );

      toast({
        title: "Credential Admitted",
        description: "Credential has been successfully admitted to your wallet",
      });

      setTimeout(() => {
        // Remove from incoming after successful admit
        setIncomingCredentials((prev) =>
          prev.filter((cred) => cred.id !== incomingCred.id)
        );
      }, 2000);
    } catch (error) {
      console.error("Error admitting credential:", error);
      toast({
        title: "ERROR",
        description: "Failed to admit credential",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePresentCredential = async () => {
    setIsProcessing(true);
    const { verifierOOBI, selectedCredential } = presentationData;
    // Extract the Verifier AID from the OOBI URL
    let verifierAid = "";
    try {
      const parts = verifierOOBI.split("/oobi/");
      if (parts.length > 1) {
        verifierAid = parts[1].split("/")[0];
      }
    } catch (e) {
      verifierAid = "";
    }
    if (!verifierAid) {
      toast({
        title: "Invalid Verifier OOBI",
        description: "Please enter a valid Verifier OOBI URL",
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    } else {
      resolveOOBI(holderClient, verifierOOBI, "verifierContact").catch(
        (error) => {
          console.error("Error resolving Verifier OOBI:", error);
          toast({
            title: "ERROR",
            description: "Failed to resolve Verifier OOBI",
            variant: "destructive",
          });
          setIsProcessing(false);
        }
      );

      console.log("selectedCredential", selectedCredential);
      // Holder - get credential (with all its data)
      const credential = await holderClient
        .credentials()
        .get(selectedCredential);

      // Holder - Ipex grant
      console.log("Granting credential from holder to issuer");
      const grantResponse = await ipexGrantCredential(
        holderClient,
        holderData.alias,
        verifierAid,
        credential
      );
    }
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
              <PasscodeDialog
                onPasscodeSubmit={handleConnect}
                isProcessing={isProcessing}
                entityType="holder"
              />
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
              {/* Incoming Credentials Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Incoming Credentials
                      </CardTitle>
                      <CardDescription>
                        New credentials awaiting your approval
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkIncomingCredentials}
                      disabled={isCheckingIncoming}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          isCheckingIncoming ? "animate-spin" : ""
                        }`}
                      />
                      {isCheckingIncoming ? "Checking..." : "Check Now"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {incomingCredentials.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No incoming credentials found</p>
                      <p className="text-sm">
                        Check back later or use the refresh button
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {incomingCredentials.map((incomingCred) => (
                        <div
                          key={incomingCred.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-mono text-slate-600">
                                {incomingCred.grantSaid.substring(0, 20)}...
                              </div>
                              <Badge
                                variant={
                                  incomingCred.status === "admitted"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {incomingCred.status}
                              </Badge>
                            </div>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                handleAdmitCredential(incomingCred)
                              }
                              disabled={
                                isProcessing ||
                                incomingCred.status === "admitted"
                              }
                            >
                              {incomingCred.status === "admitted"
                                ? "Admitted"
                                : "Admit Credential"}
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">From:</span>
                              <div className="font-medium font-mono text-xs">
                                {incomingCred.issuer.substring(0, 20)}...
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500">Received:</span>
                              <div className="font-medium">
                                {new Date(
                                  incomingCred.receivedAt
                                ).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stored Credentials Section */}
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
                    <Label htmlFor="verifierOOBI">Verifier OOBI</Label>
                    <Input
                      id="verifierOOBI"
                      value={presentationData.verifierOOBI}
                      onChange={(e) =>
                        setPresentationData({
                          ...presentationData,
                          verifierOOBI: e.target.value,
                        })
                      }
                      placeholder="Enter verifier's OOBI"
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
                      !presentationData.verifierOOBI ||
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
