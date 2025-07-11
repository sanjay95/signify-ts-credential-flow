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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  ArrowLeft,
  Download,
  Send,
  RotateCcw,
  CheckCircle,
  Copy,
  Wallet,
  RefreshCw,
  Eye,
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
  // ipexApplyCredential,
  ipexOfferCredential,
  ipexApplyCredential,
} from "../utils/utils";
import { getItem, setItem } from "@/utils/db";
import { PasscodeDialog } from "@/components/PasscodeDialog";
import {
  AccountType,
  AccountConfig,
  getAvailableSchemas,
  PRECONFIGURED_OOBIS,
} from "@/types/accounts";
import { FIXED_PASSCODES } from "@/config/environment";

const Holder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [holderClient, setHolderClient] = useState(null);
  const [contacts, setContacts] = useState<any[]>([]);

  // Get account type from navigation state
  const accountType = (location.state?.accountType as AccountType) || "LE";
  const [config, setConfig] = useState({
    adminUrl: "https://keria.testnet.gleif.org:3901",
    bootUrl: "https://keria.testnet.gleif.org:3903",
    schemaServer: "https://schema.testnet.gleif.org:7723",
  });

  useEffect(() => {
    if (location.state?.config) {
      setConfig(location.state.config);
    }
  }, [location.state]);

  const [accountData, setAccountData] = useState<AccountConfig>({
    type: accountType,
    alias: `${accountType.toLowerCase()}Aid`,
    passcode: "",
    aid: "",
    oobi: "",
    registrySaid: "",
  });

  const [credentials, setCredentials] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isCheckingIncoming, setIsCheckingIncoming] = useState(false);
  const [incomingCredentials, setIncomingCredentials] = useState([]);

  // Target selection for credential requests
  const [targetOOBI, setTargetOOBI] = useState("");
  const [selectedPreconfiguredOOBI, setSelectedPreconfiguredOOBI] =
    useState("");
  const [customOOBI, setCustomOOBI] = useState("");

  // Available schemas for this account type
  const availableSchemas = getAvailableSchemas(accountType);
  const [selectedSchema, setSelectedSchema] = useState(
    availableSchemas[0]?.said || ""
  );

  useEffect(() => {
    const attemptReconnect = async () => {
      const savedData = await getItem<AccountConfig>(
        `${accountType.toLowerCase()}-data`
      );
      if (savedData && savedData.type === accountType) {
        setAccountData(savedData);
        if (savedData.passcode) {
          console.log("Attempting to reconnect with saved passcode...");
          await handleConnect(savedData.passcode, true);
        }
      }
      setIsInitializing(false);
    };
    attemptReconnect();
  }, [accountType]);
  // Add polling mechanism for incoming credentials
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isConnected && holderClient && !isCheckingIncoming) {
      setIsCheckingIncoming(true);
      pollInterval = setInterval(async () => {
        try {
          await checkForIncomingCredentials();
        } catch (error) {
          console.error("Error during polling:", error);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      setIsCheckingIncoming(false);
    };
  }, [isConnected, holderClient]);

  useEffect(() => {
    // Save account data to IndexedDB whenever it changes
    if (accountData.passcode && accountData.aid) {
      console.log(`Saving ${accountType} holder data to IndexedDB...`);
      setItem(`${accountType.toLowerCase()}-data`, accountData);
    }
  }, [accountData, accountType]);

  useEffect(() => {
    const finalOOBI = selectedPreconfiguredOOBI || customOOBI;
    setTargetOOBI(finalOOBI);
  }, [selectedPreconfiguredOOBI, customOOBI]);

  const handleConnect = async (userPasscode: string, isReconnect = false) => {
    setIsProcessing(true);
    if (isReconnect) {
      console.log(`Reconnecting ${accountType} Holder...`);
    } else {
      console.log(`Connecting ${accountType} Holder...`);
    }

    try {
      const { client: holderClient, clientState: holderClientState } =
        await initializeAndConnectClient(
          userPasscode,
          config.adminUrl,
          config.bootUrl
        );
      setHolderClient(holderClient);
      console.log(`${accountType} holder client connected:`, holderClientState);

      let aid, oobi;

      try {
        aid = await holderClient.identifiers().get(accountData.alias);
        console.log(`Existing ${accountType} holder AID found:`, aid);

        oobi = await generateOOBI(holderClient, accountData.alias, ROLE_AGENT);
      } catch (error) {
        console.log(
          `No existing ${accountType} holder AID found, creating new one...`
        );
        const { aid: newAid } = await createNewAID(
          holderClient,
          accountData.alias,
          DEFAULT_IDENTIFIER_ARGS
        );
        aid = newAid;
        console.log(`${accountType} holder AID created:`, aid);

        console.log("Adding Agent role to AID...");
        await addEndRoleForAID(holderClient, accountData.alias, ROLE_AGENT);

        oobi = await generateOOBI(holderClient, accountData.alias, ROLE_AGENT);
        console.log(`${accountType} holder OOBI generated:`, oobi);
      }

      // Store OOBI in IndexedDB for easy access
      setItem(`${accountType.toLowerCase()}-oobi`, oobi);

      const updatedAccountData = {
        ...accountData,
        passcode: userPasscode,
        aid: aid.prefix || aid.d,
        oobi: oobi,
      };

      setAccountData(updatedAccountData);

      // Persist to IndexedDB immediately
      await setItem(`${accountType.toLowerCase()}-data`, updatedAccountData);

      setIsConnected(true);
      if (isReconnect) {
        toast({
          title: "Reconnected",
          description: `Automatically reconnected ${accountType} holder to KERI network.`,
        });
      } else {
        toast({
          title: "Connected to KERI Network",
          description: `${accountType} holder client initialized and connected.`,
        });
      }
    } catch (error) {
      console.error(`Error connecting ${accountType} holder client:`, error);
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

  const checkForIncomingCredentials = async () => {
    if (!holderClient) return;

    try {
      setIsCheckingIncoming(true);
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
      console.log("New incoming credentials:", incomingCredentials);

      // const notifications = await holderClient.notifications().list();
      // const unreadNotifications = notifications.filter((n: any) => !n.r);

      // for (const notification of unreadNotifications) {
      //   if (notification.a && notification.a.r === IPEX_GRANT_ROUTE) {
      //     console.log("Received credential grant:", notification);
      //     await handleCredentialGrant(notification);
      //   }
      // }

      // Refresh credentials list
      // await loadCredentials();
    } catch (error) {
      console.error("Error checking for credentials:", error);
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
        accountData.alias,
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
            claims: Object.entries(cred.sad.a)
              .filter(([key]) => key.length > 2)
              .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
              }, {} as Record<string, any>),
          },
        ]);
      });
    };
    getCredential();
  }, [incomingCredentials, accountData]);

  const loadCredentials = async () => {
    if (!holderClient) return;

    try {
      const credList = await holderClient.credentials().list();
      console.log("Loaded credentials:", credList);
      setCredentials(credList);
    } catch (error) {
      console.error("Error loading credentials:", error);
    }
  };

  const handleRequestCredential = async () => {
    setIsProcessing(true);
    console.log("Requesting credential from issuer");

    try {
      if (!targetOOBI) {
        toast({
          title: "Error",
          description: "Target issuer OOBI is required to request a credential",
          variant: "destructive",
        });
        return;
      }

      // Resolve target OOBI
      // await resolveOOBI(holderClient, targetOOBI, "issuerContact");

      // Resolve schema OOBI
      // const schemaOOBI = `${config.schemaServer}/oobi/${selectedSchema}`;
      // await resolveOOBI(holderClient, schemaOOBI, "schemaContact");

      // console.log("Schema resolved from OOBI:", schemaOOBI);

      const applyResponse = await ipexApplyCredential(
        holderClient,
        accountData.alias,
        targetOOBI.split("/")[4] || "", // Extract AID from OOBI
        selectedSchema
      );

      console.log(`${accountType} holder applied for credential.`);

      toast({
        title: "Credential Request Sent",
        description: "Your credential request has been sent to the issuer",
      });
    } catch (error) {
      console.error("Error requesting credential:", error);
      toast({
        title: "ERROR",
        description: "Failed to request credential",
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

  // Check if this account type has a fixed passcode
  const hasFixedPasscode = accountType in FIXED_PASSCODES;
  const fixedPasscode = hasFixedPasscode
    ? FIXED_PASSCODES[accountType as keyof typeof FIXED_PASSCODES]
    : undefined;

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
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {accountType} Holder Dashboard
                </h1>
                <p className="text-slate-600">
                  Receive, store, and present credentials as {accountType}
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
              <CardTitle>Initialize {accountType} Holder Client</CardTitle>
              <CardDescription>
                Connect to the KERI network and set up your {accountType} holder
                identity
                {hasFixedPasscode && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <strong>Note:</strong> This account type uses a predefined
                    passcode
                  </div>
                )}
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
                <Label htmlFor="alias">{accountType} Holder AID Alias</Label>
                <Input
                  id="alias"
                  value={accountData.alias}
                  onChange={(e) =>
                    setAccountData({ ...accountData, alias: e.target.value })
                  }
                  placeholder={`Enter ${accountType} holder alias`}
                />
              </div>

              {hasFixedPasscode ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 text-sm">
                      Using predefined passcode for {accountType} account
                    </p>
                  </div>
                  <Button
                    onClick={() => handleConnect(fixedPasscode!)}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing
                      ? "Connecting..."
                      : `Connect as ${accountType}`}
                  </Button>
                </div>
              ) : (
                <PasscodeDialog
                  onPasscodeSubmit={handleConnect}
                  isProcessing={isProcessing}
                  entityType={accountType}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="request" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="request">Request Credentials</TabsTrigger>
              <TabsTrigger value="wallet">My Wallet</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="request" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Request New Credential as {accountType}
                  </CardTitle>
                  <CardDescription>
                    Request an ACDC credential from an issuer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Schema Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="schema">
                      Available Schemas for {accountType}
                    </Label>
                    <Select
                      value={selectedSchema}
                      onValueChange={setSelectedSchema}
                    >
                      <SelectTrigger id="schema">
                        <SelectValue placeholder="Select schema to request" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSchemas.map((schema) => (
                          <SelectItem key={schema.said} value={schema.said}>
                            <div>
                              <div className="font-medium">{schema.name}</div>
                              <div className="text-xs text-slate-500">
                                {schema.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Selection */}
                  <div className="space-y-4">
                    <Label>Issuer OOBI</Label>

                    {/* Preconfigured OOBIs */}
                    {PRECONFIGURED_OOBIS[accountType].length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="preconfiguredOOBI">
                          Preconfigured Issuers
                        </Label>
                        <Select
                          value={selectedPreconfiguredOOBI}
                          onValueChange={setSelectedPreconfiguredOOBI}
                        >
                          <SelectTrigger id="preconfiguredOOBI">
                            <SelectValue placeholder="Select preconfigured issuer" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRECONFIGURED_OOBIS[accountType].map(
                              (oobi, index) => (
                                <SelectItem key={index} value={oobi}>
                                  <div className="font-mono text-xs">
                                    {oobi.substring(0, 60)}...
                                  </div>
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Custom OOBI */}
                    <div className="space-y-2">
                      <Label htmlFor="customOOBI">
                        Or Enter Custom Issuer OOBI
                      </Label>
                      <Input
                        id="customOOBI"
                        value={customOOBI}
                        onChange={(e) => setCustomOOBI(e.target.value)}
                        placeholder="Enter issuer OOBI"
                      />
                    </div>

                    {/* Final OOBI Display */}
                    {targetOOBI && (
                      <div className="space-y-2">
                        <Label>Selected Issuer OOBI</Label>
                        <div className="p-2 bg-gray-50 rounded text-xs font-mono break-all">
                          {targetOOBI}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleRequestCredential}
                    disabled={isProcessing || !targetOOBI || !selectedSchema}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isProcessing
                      ? "Requesting Credential..."
                      : "Request Credential"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wallet" className="space-y-6">
              {/* incoming credentials section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Incoming Credentials
                        {isCheckingIncoming && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <RotateCcw className="h-4 w-4 animate-spin" />
                            Listening for credentials...
                          </div>
                        )}
                      </CardTitle>
                      <CardDescription>
                        View and manage all credentials in your {accountType}{" "}
                        wallet
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={checkForIncomingCredentials}
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
                    {incomingCredentials.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No credentials in wallet yet
                        {isCheckingIncoming && (
                          <div className="mt-2 text-sm">
                            Waiting for incoming credentials...
                          </div>
                        )}
                      </div>
                    ) : (
                      incomingCredentials.map(
                        (incomingCred: any, index: number) => (
                          <div
                            key={incomingCred.id || index}
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
                                <span className="text-slate-500">
                                  Received:
                                </span>
                                <div className="font-medium">
                                  {new Date(
                                    incomingCred.receivedAt
                                  ).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
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
                          {Object.entries(credential.claims).map(
                            ([key, value]) => (
                              <div key={key}>
                                <span className="text-slate-500">{key}:</span>
                                <div className="font-medium">
                                  {String(value)}
                                </div>
                              </div>
                            )
                          )}
                          <div>
                            <span className="text-slate-500">Received:</span>
                            <div className="font-medium">
                              {new Date(
                                credential.receivedDate
                              ).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Issuer:</span>
                            <div className="font-medium">
                              {String(credential.issuer)}
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
                  <CardTitle>{accountType} Holder Configuration</CardTitle>
                  <CardDescription>
                    Manage your {accountType} holder settings and network
                    configuration
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
                    <Label>Account Type</Label>
                    <Input value={accountType} readOnly />
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
                      Connected to KERI network as {accountType} holder
                    </span>
                  </div>

                  {/* Contacts Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-2">Contacts</h3>
                    <ContactsSection
                      client={holderClient}
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
export default Holder;
