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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  ArrowLeft,
  Plus,
  Send,
  RotateCcw,
  CheckCircle,
  Copy,
  Building,
  Shield,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { randomPasscode, Saider, Serder } from "signify-ts";
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
import {
  AccountType,
  AccountConfig,
  getAvailableSchemas,
  PRECONFIGURED_OOBIS,
  SCHEMA_OPTIONS,
} from "@/types/accounts";

const Verifier = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [verifierClient, setVerifierClient] = useState(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isCheckingIncoming, setIsCheckingIncoming] = useState(false);
  const [verifications, setVerifications] = useState([]);
  const [accountData, setAccountData] = useState<AccountConfig>({
    type: "verifier",
    alias: "verifierAid",
    passcode: "",
    aid: "",
    oobi: "",
    registrySaid: "",
  });
  const { config } = useConfigContext();

  useEffect(() => {
    if (!verifierClient) return;
    SCHEMA_OPTIONS?.map((schema) => {
      resolveOOBI(
        verifierClient,
        `${config?.schemaServer}/oobi/${schema?.said}`,
        schema?.name
      );
    });
  }, [verifierClient, isConnected, config]);

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

  const handleConnect = async (userPasscode: string, isReconnect = false) => {
    setIsProcessing(true);
    if (isReconnect) {
      console.log("Reconnecting Verifier...");
    } else {
      console.log("Connecting Verifier...");
    }

    try {
      const { client: verifierClient, clientState: verifierClientState } =
        await initializeAndConnectClient(
          userPasscode,
          config.adminUrl,
          config.bootUrl
        );
      setVerifierClient(verifierClient);
      console.log("Verifier client connected:", verifierClientState);

      let aid, oobi;

      try {
        aid = await verifierClient.identifiers().get(accountData.alias);
        console.log("Existing Verifier AID found:", aid);

        oobi = await generateOOBI(
          verifierClient,
          accountData.alias,
          ROLE_AGENT
        );
      } catch (error) {
        console.log("No existing Verifier AID found, creating new one...");
        const { aid: newAid } = await createNewAID(
          verifierClient,
          accountData.alias,
          DEFAULT_IDENTIFIER_ARGS
        );
        aid = newAid;
        console.log("Verifier AID created:", aid);

        console.log("Adding Agent role to AID...");
        await addEndRoleForAID(verifierClient, accountData.alias, ROLE_AGENT);

        oobi = await generateOOBI(
          verifierClient,
          accountData.alias,
          ROLE_AGENT
        );
        console.log("Verifier OOBI generated:", oobi);
      }

      setItem("verifier-oobi", oobi);
      setAccountData((prevData) => ({
        ...prevData,
        passcode: userPasscode,
        aid: aid.prefix || aid.d,
        oobi: oobi,
      }));

      setIsConnected(true);
      if (isReconnect) {
        toast({
          title: "Reconnected",
          description: "Automatically reconnected Verifier to KERI network.",
        });
      } else {
        toast({
          title: "Connected to KERI Network",
          description: "Verifier client initialized and connected.",
        });
      }
    } catch (error) {
      console.error("Error connecting Verifier client:", error);
      if (isReconnect) {
        setAccountData((prev) => ({ ...prev, passcode: "" }));
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

  const copyOOBIToClipboard = () => {
    navigator.clipboard.writeText(accountData.oobi);
    toast({
      title: "OOBI Copied",
      description: "OOBI has been copied to clipboard",
    });
  };

  useEffect(() => {
    const attemptReconnect = async () => {
      const savedData = await getItem<AccountConfig>("verifier-data");
      if (savedData) {
        setAccountData(savedData);
        if (savedData.passcode) {
          console.log("Attempting to reconnect with saved passcode...");
          await handleConnect(savedData.passcode, true);
        }
      }
      setIsInitializing(false);
    };
    attemptReconnect();
  }, []);

  useEffect(() => {
    // Save account data to IndexedDB whenever it changes
    if (accountData.passcode && accountData.aid) {
      console.log("Saving verifier data to IndexedDB...");
      setItem("verifier-data", accountData);
    }
  }, [accountData]);

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
          accountData.alias,
          embeddedACDC?.a.i,
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
              <div className="p-2 bg-purple-600 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Verifier Dashboard
                </h1>
                <p className="text-slate-600">
                  Manage credential requests and verifications
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
                  value={accountData.alias}
                  onChange={(e) =>
                    setAccountData({ ...accountData, alias: e.target.value })
                  }
                  placeholder="Enter verifier alias"
                />
              </div>
              <PasscodeDialog
                onPasscodeSubmit={handleConnect}
                isProcessing={isProcessing}
                entityType="verifier"
              />
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="verify" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="verify">Verify Credentials</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

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
                    {verifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No credentials in wallet yet
                        {isCheckingIncoming && (
                          <div className="mt-2 text-sm">
                            Waiting for incoming credentials...
                          </div>
                        )}
                      </div>
                    ) : (
                      verifications.map((incomingCred: any, index: number) => (
                        <div
                          key={incomingCred.id || index}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-mono text-slate-600">
                                {incomingCred.id.substring(0, 20)}...
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
                            {/* <Button
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
                            </Button> */}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">From:</span>
                              <div className="font-medium font-mono text-xs">
                                {incomingCred?.claims?.i.substring(0, 20)}...
                              </div>
                            </div>
                            <div>
                              <span className="text-slate-500">Received:</span>
                              <div className="font-medium">
                                {new Date(
                                  incomingCred?.verifiedDate
                                )?.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
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
                    <Input value={accountData.alias} readOnly />
                  </div>

                  {/* OOBI Display */}
                  {accountData.oobi && (
                    <div className="space-y-2">
                      <Label>Your OOBI</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 p-2 bg-gray-50 rounded text-xs font-mono break-all">
                          {accountData.oobi}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyOOBIToClipboard}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-700">
                      Connected to KERI network as Verifier
                    </span>
                  </div>

                  {/* Contacts Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-2">Contacts</h3>
                    <ContactsSection
                      client={verifierClient}
                      contacts={contacts}
                      setContacts={setContacts}
                      // filterFn={optionalFilterFn} // e.g. (c) => c.role === 'agent' for Issuer
                    />
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

import { ContactsSection } from "../components/ContactsSection";
import { useConfigContext } from "@/context/ConfigContext";
export default Verifier;
