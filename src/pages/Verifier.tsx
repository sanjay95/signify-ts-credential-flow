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
  CheckCircle,
  ArrowLeft,
  Search,
  Shield,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  initializeAndConnectClient,
  createNewAID,
  addEndRoleForAID,
  generateOOBI,
  resolveOOBI,
  createTimestamp,
  ipexApplyForCredential,
  waitForAndGetNotification,
  markNotificationRead,
  DEFAULT_IDENTIFIER_ARGS,
  ROLE_AGENT,
  IPEX_OFFER_ROUTE,
  IPEX_GRANT_ROUTE,
  ipexAdmitGrant,
} from "../utils/utils";
import { getItem, setItem } from "@/utils/db";
import { PasscodeDialog } from "@/components/PasscodeDialog";
import { set } from "date-fns";

const Verifier = () => {
  const navigate = useNavigate();
  const { config } = useConfig();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCheckingIncoming, setIsCheckingIncoming] = useState(false);
  const [verifierClient, setVerifierClient] = useState(null);

  const [verifierData, setVerifierData] = useState({
    alias: "verifierAid",
    verifierAid: "",
    verifierOOBI: "",
    verifierBran: "",
  });

  const [requestData, setRequestData] = useState({
    holderAID: "",
    schemaSAID: "EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK",
    attributes: { eventName: "GLEIF Summit" },
  });

  const [verifications, setVerifications] = useState([]);

  useEffect(() => {
    const attemptReconnect = async () => {
      const savedData = await getItem<any>("verifier-data");
      if (savedData) {
        setVerifierData(savedData);
        if (savedData.verifierBran) {
          console.log("Attempting to reconnect with saved passcode...");
          await handleConnect(savedData.verifierBran, true);
        }
      }
      setIsInitializing(false);
    };
    attemptReconnect();
  }, []);

  // Auto-check for incoming presentations when connected
  useEffect(() => {
    if (isConnected && verifierClient) {
      checkIncomingPresentations();
      // Set up periodic checking every 30 seconds
      const interval = setInterval(() => {
        checkIncomingPresentations();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, verifierClient]);

  useEffect(() => {
    if (verifierData.verifierBran) {
      setItem("verifier-data", verifierData);
    }
  }, [verifierData]);

  const handleConnect = async (userPasscode: string, isReconnect = false) => {
    setIsProcessing(true);
    if (isReconnect) {
      console.log("Reconnecting Verifier...");
    } else {
      console.log("Connecting Verifier...");
    }

    try {
      const verifierBran = userPasscode;
      const verifierAidAlias = verifierData.alias || "verifierAid";
      const { client: verifierClient, clientState: verifierClientState } =
        await initializeAndConnectClient(
          verifierBran,
          config.adminUrl,
          config.bootUrl
        );
      setVerifierClient(verifierClient);
      console.log("Verifier client connected:", verifierClientState);

      let verifierAid, verifierOOBI;

      try {
        verifierAid = await verifierClient.identifiers().get(verifierAidAlias);
        console.log("Existing Verifier AID found:", verifierAid);

        verifierOOBI = await generateOOBI(
          verifierClient,
          verifierAidAlias,
          ROLE_AGENT
        );
      } catch (error) {
        console.log("No existing Verifier AID found, creating new one...");
        const { aid: newVerifierAid } = await createNewAID(
          verifierClient,
          verifierAidAlias,
          DEFAULT_IDENTIFIER_ARGS
        );
        verifierAid = newVerifierAid;
        console.log("Verifier AID created:", verifierAid);

        await addEndRoleForAID(verifierClient, verifierAidAlias, ROLE_AGENT);
        verifierOOBI = await generateOOBI(
          verifierClient,
          verifierAidAlias,
          ROLE_AGENT
        );
        console.log("Verifier OOBI generated:", verifierOOBI);
      }
      setItem("verifier-oobi", verifierOOBI);
      setVerifierData((prevData) => ({
        ...prevData,
        verifierBran: verifierBran,
        verifierAid: verifierAid.prefix || verifierAid.d,
        verifierOOBI: verifierOOBI,
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
          description: "Verifier client initialized and connected.",
        });
      }
    } catch (error) {
      console.error("Error connecting verifier client:", error);
      if (isReconnect) {
        setVerifierData((prev) => ({ ...prev, verifierBran: "" }));
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

  const handleRequestCredential = async () => {
    setIsProcessing(true);
    try {
      const holderOOBI = (await getItem("holder-oobi")) as string;
      if (!holderOOBI) {
        throw new Error(
          "Holder OOBI not found. Please ensure the Holder has been created and connected first."
        );
      }
      await resolveOOBI(verifierClient, holderOOBI, "holderContact");

      const { applySaid } = await ipexApplyForCredential(
        verifierClient,
        verifierData.alias,
        requestData.holderAID,
        requestData.schemaSAID,
        requestData.attributes,
        createTimestamp()
      );

      const newVerification = {
        id: applySaid,
        applySaid: applySaid,
        status: "pending",
        holder: requestData.holderAID,
        requestDate: new Date().toISOString(),
        result: "pending",
        claims: null,
      };

      setVerifications((prev) => [...prev, newVerification]);
      toast({
        title: "Verification Request Sent",
        description:
          "IPEX Apply message sent to holder for credential presentation.",
      });
    } catch (error) {
      console.error("Error requesting credential:", error);
      toast({
        title: "Request Error",
        description: error.message || "Failed to send verification request.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const checkIncomingPresentations = async () => {
    if (!verifierClient) return;
    setIsCheckingIncoming(true);
    try {
      console.log("Verifier checking for incoming presentations (offers)...");
      const grantNotifications = await waitForAndGetNotification(
        verifierClient,
        IPEX_GRANT_ROUTE
      );

      if (grantNotifications.length === 0) {
        console.log("No new grant notifications found.");
        return;
      }

      console.log(
        `Found ${grantNotifications.length} incoming grant notification(s).`
      );

      for (const notification of grantNotifications) {
        // Retrieve the full IPEX grant exchange details.

        const grantExchange = await verifierClient
          .exchanges()
          .get(notification.a.d);

        const embeddedACDC = grantExchange.exn.e.acdc;
        console.log(embeddedACDC, "Embedded ACDC in grant exchange");
        setVerifications((prev) => [
          ...prev,
          {
            id: notification.i,
            applySaid: grantExchange.exn.a.p, // SAID of the original apply message
            status: "received",
            result: "valid", // Assuming we accept it for demo purposes
            verifiedDate: new Date().toISOString(),
            claims: embeddedACDC.a,
            credentialSaid: embeddedACDC.d,
          },
        ]);

        console.log(
          "Updated verifications with received credential claims:",
          verifications
        );
        // Verifier - Admit Grant
        const admitResponse = await ipexAdmitGrant(
          verifierClient,
          verifierData.alias,
          embeddedACDC?.a.i || "EFKxZRM-Nxf23dh2di1aDAoDb-N5VB8HwnEtn-LypW_2",
          notification.a.d
        );
        console.log("Verifier admitting credential");

        // Verifier - Mark notification
        await markNotificationRead(verifierClient, notification.i);
        console.log("\n✅ Verifier marked notification read");

        const applySaid = grantExchange.exn.a.p; // SAID of the original apply message
        const offeredAcdc = grantExchange.payload.acdc;

        // // TODO: Full verification logic (check signatures, registry status, etc.)
        // // For this demo, we'll just accept it and mark as verified.
        // const isVerified = true; // Placeholder for actual verification result

        // setVerifications((prev) =>
        //   prev.map((v) =>
        //     v.applySaid === applySaid
        //       ? {
        //           ...v,
        //           status: "received",
        //           result: isVerified ? "valid" : "invalid",
        //           verifiedDate: new Date().toISOString(),
        //           claims: offeredAcdc.a,
        //           credentialSaid: offeredAcdc.d,
        //         }
        //       : v
        //   )
        // );
        // console.log("verifierData", verifierData);

        // await markNotificationRead(verifierClient, notification.i);
        toast({
          title: "Presentation Received",
          description: `Credential received from ${offeredAcdc.i.substring(
            0,
            20
          )}...`,
        });
      }
    } catch (error) {
      console.log("No incoming presentations found or error:", error.message);
    } finally {
      setIsCheckingIncoming(false);
    }
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
              <PasscodeDialog
                onPasscodeSubmit={handleConnect}
                isProcessing={isProcessing}
                entityType="Verifier"
              />
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
                    Send an IPEX Apply request to a holder for credential
                    presentation
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
                    {isProcessing ? "Sending Request..." : "Request Credential"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="verify" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Credential Verifications
                      </CardTitle>
                      <CardDescription>
                        View and manage all credential verification requests
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkIncomingPresentations}
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
