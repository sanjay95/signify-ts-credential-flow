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
  Key,
  ArrowLeft,
  Plus,
  Send,
  RotateCcw,
  CheckCircle,
  Copy,
  Building,
  RefreshCw,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Oobis, randomPasscode, Saider, Serder } from "signify-ts";
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
} from "@/types/accounts";
import { FIXED_PASSCODES } from "@/config/environment";

const Issuer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [issuerClient, setIssuerClient] = useState(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [credentials, setCredentials] = useState([]);
  const [isNewCredential, setNewCredential] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const accountType = (location.state?.accountType as AccountType) || "GLEIF";
  const [config, setConfig] = useState({
    adminUrl: "https://keria.testnet.gleif.org:3901",
    bootUrl: "https://keria.testnet.gleif.org:3903",
    schemaServer: "https://schema.testnet.gleif.org:7723",
  });
  const [accountData, setAccountData] = useState<AccountConfig>({
    type: accountType,
    alias:
      accountType === "GLEIF"
        ? `${accountType.toLowerCase()}`
        : `${accountType.toLowerCase()}Aid`,
    passcode: "",
    aid: "",
    oobi: "",
    registrySaid: "",
  });
  // Available schemas for this account type
  const availableSchemas = getAvailableSchemas(accountType);
  const [selectedSchema, setSelectedSchema] = useState(
    availableSchemas[0]?.said || ""
  );
  // Target selection
  const [targetOOBI, setTargetOOBI] = useState({
    oobis: "",
    alias: "",
  });
  const [selectedOOBI, setSelectedOOBI] = useState({
    oobis: "",
    alias: "",
  });
  const [customOOBI, setCustomOOBI] = useState("");

  // Dynamic credential data
  const [credentialData, setCredentialData] = useState<Record<string, any>>({});
  const LEIPayload = {
    LEI: "",
  };

  useEffect(() => {
    if (location.state?.config) {
      setConfig(location.state.config);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const contactList = await issuerClient.contacts().list();
        setContacts(contactList || []);
        console.log("Fetched contacts:", contactList);
      } catch (err: any) {
        console.error("Failed to fetch contacts");
      }
    };
    fetchContacts();
  }, [issuerClient]);

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

  useEffect(() => {
    // Save account data to IndexedDB whenever it changes
    if (accountData.passcode && accountData.aid) {
      console.log(`Saving ${accountType} data to IndexedDB...`);
      setItem(`${accountType.toLowerCase()}-data`, accountData);
    }
  }, [accountData, accountType]);

  useEffect(() => {
    const finalOOBI = selectedOOBI || customOOBI;
    if (typeof finalOOBI === "string") {
      setTargetOOBI({ oobis: finalOOBI, alias: "" });
    } else {
      setTargetOOBI({ oobis: finalOOBI.oobis, alias: finalOOBI.alias });
    }
    if (accountType === "GLEIF" || accountType === "QVI") {
      setCredentialData(LEIPayload);
    }
  }, [selectedOOBI, customOOBI]);

  useEffect(() => {
    const loadIssuedCredentials = async () => {
      if (!issuerClient || !isChecking) return;
      try {
        const credList = (await issuerClient.credentials().list()).filter(
          (cred: any) => cred.sad.a.i !== accountData.aid
        ); // Filter out credentials with accounts AID, display only issued credentials, not received
        console.log("Loaded issued credentials:", credList);
        setCredentials(credList);
      } catch (error) {
        console.error("Error loading issued credentials:", error);
      } finally {
        setIsChecking(false);
      }
    };
    loadIssuedCredentials();
  }, [isConnected, isNewCredential, isChecking]);

  const handleConnect = async (userPasscode: string, isReconnect = false) => {
    setIsProcessing(true);
    if (isReconnect) {
      console.log(`Reconnecting ${accountType} Issuer...`);
    } else {
      console.log(`Connecting ${accountType} Issuer...`);
    }

    try {
      const { client: issuerClient, clientState: issuerClientState } =
        await initializeAndConnectClient(
          userPasscode,
          config.adminUrl,
          config.bootUrl
        );
      setIssuerClient(issuerClient);
      console.log(`${accountType} client connected:`, issuerClientState);

      let aid, registrySaid, oobi;

      try {
        aid = await issuerClient.identifiers().get(accountData.alias);
        console.log(`Existing ${accountType} AID found:`, aid);

        const registries = await issuerClient
          .registries()
          .list(accountData.alias);
        if (registries.length > 0) {
          registrySaid = registries[0].regk;
          console.log("Existing registry found:", registrySaid);
        } else {
          console.log("No existing registry found, creating new one...");
          const regResult = await createCredentialRegistry(
            issuerClient,
            accountData.alias,
            `${accountType.toLowerCase()}Registry`
          );
          registrySaid = regResult.registrySaid;
          console.log("New registry created:", registrySaid);
        }

        oobi = await generateOOBI(issuerClient, accountData.alias, ROLE_AGENT);
      } catch (error) {
        console.log(
          `No existing ${accountType} AID found, creating new one...`
        );
        const { aid: newAid } = await createNewAID(
          issuerClient,
          accountData.alias,
          DEFAULT_IDENTIFIER_ARGS
        );
        aid = newAid;
        console.log(`${accountType} AID created:`, aid);

        console.log("Adding Agent role to AID...");
        await addEndRoleForAID(issuerClient, accountData.alias, ROLE_AGENT);

        oobi = await generateOOBI(issuerClient, accountData.alias, ROLE_AGENT);
        console.log(`${accountType} OOBI generated:`, oobi);

        console.log("Creating Credential Registry...");
        const regResult = await createCredentialRegistry(
          issuerClient,
          accountData.alias,
          `${accountType.toLowerCase()}Registry`
        );
        registrySaid = regResult.registrySaid;
        console.log("Credential Registry created:", registrySaid);
      }

      // Store OOBI in IndexedDB for easy access
      setItem(`${accountType.toLowerCase()}-oobi`, oobi);

      const updatedAccountData = {
        ...accountData,
        passcode: userPasscode,
        aid: aid.prefix || aid.d,
        oobi: oobi,
        registrySaid: registrySaid,
      };

      setAccountData(updatedAccountData);

      // Persist to IndexedDB immediately
      await setItem(`${accountType.toLowerCase()}-data`, updatedAccountData);

      setIsConnected(true);
      if (isReconnect) {
        toast({
          title: "Reconnected",
          description: `Automatically reconnected ${accountType} to KERI network.`,
        });
      } else {
        toast({
          title: "Connected to KERI Network",
          description: `${accountType} issuer client initialized and connected.`,
        });
      }
    } catch (error) {
      console.error(`Error connecting ${accountType} client:`, error);
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

  const handleIssueCredential = async () => {
    setIsProcessing(true);
    console.log("Issuing credential to target");

    try {
      if (!targetOOBI) {
        toast({
          title: "Error",
          description: "Target OOBI is required to issue a credential",
          variant: "destructive",
        });
        return;
      }

      // Resolve target OOBI
      await resolveOOBI(issuerClient, targetOOBI.oobis, targetOOBI.alias);

      // Resolve schema OOBI
      const schemaOOBI = `${config.schemaServer}/oobi/${selectedSchema}`;
      await resolveOOBI(issuerClient, schemaOOBI, "schemaContact");

      console.log("Schema resolved from OOBI:", schemaOOBI);

      const credentialSaid = await issueCredential(
        issuerClient,
        accountData.alias,
        accountData.registrySaid,
        selectedSchema,
        targetOOBI.oobis.split("/")[4] || "", // Extract AID from OOBI
        credentialData
      );

      console.log(
        "Credential issued with SAID:",
        credentialSaid.credentialSaid || credentialSaid
      );

      const credential = await issuerClient
        .credentials()
        .get(credentialSaid.credentialSaid || credentialSaid);

      setNewCredential(true);

      console.log("Credential details:", credential);
      console.log("Granting credential to target");

      const grantResponse = await ipexGrantCredential(
        issuerClient,
        accountData.alias,
        targetOOBI.oobis.split("/")[4] || "",
        credential
      );

      console.log(`${accountType} created and granted credential.`);

      toast({
        title: "Credential Issued",
        description:
          "ACDC credential has been successfully created and granted to target",
      });
    } catch (error) {
      console.error("Error issuing credential:", error);
      toast({
        title: "ERROR",
        description: "Failed to issue credential",
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

  async function handleRevokeCredential(credentialSaid: any): Promise<void> {
    if (!issuerClient || !credentialSaid) return;
    setIsProcessing(true);
    try {
      console.log("Revoking credential:", credentialSaid);
      const revokeResult = await issuerClient
        .credentials()
        .revoke(accountData.alias, credentialSaid);
      const revokeOperation = revokeResult.op;
      const revokeResponse = await issuerClient
        .operations()
        .wait(revokeOperation, AbortSignal.timeout(DEFAULT_TIMEOUT_MS));
      toast({
        title: "Credential Revoked",
        description: "The credential has been successfully revoked.",
      });
      setNewCredential((prev) => !prev); // trigger reload
    } catch (error) {
      console.error("Error revoking credential:", error);
      toast({
        title: "Error",
        description: "Failed to revoke credential.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }
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
                  {accountType} Issuer Dashboard
                </h1>
                <p className="text-slate-600">
                  Manage credential issuance and revocation as {accountType}
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
              <CardTitle>Initialize {accountType} Issuer Client</CardTitle>
              <CardDescription>
                Connect to the KERI network and set up your {accountType} issuer
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
                <Label htmlFor="alias">{accountType} AID Alias</Label>
                <Input
                  id="alias"
                  value={accountData.alias}
                  onChange={(e) =>
                    setAccountData({ ...accountData, alias: e.target.value })
                  }
                  placeholder={`Enter ${accountType} alias`}
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
                    Issue New Credential as {accountType}
                  </CardTitle>
                  <CardDescription>
                    Create and issue an ACDC credential to a target entity
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
                        <SelectValue placeholder="Select schema to issue" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSchemas.map((schema) => (
                          <SelectItem key={schema.said} value={schema.said}>
                            <div>
                              <div className="font-medium">
                                {schema.name} - for -{" "}
                                {schema.targetTypes.join(", ")} - {schema.said}
                              </div>
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
                    <Label>Target Entity's OOBI</Label>

                    {/* Preconfigured OOBIs */}
                    {contacts.filter(
                      (contact) =>
                        contact.oobi && contact.oobi.includes("agent")
                    ).length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="preconfiguredOOBI">
                          Existing Contacts
                        </Label>
                        <Select
                          value={selectedOOBI.oobis}
                          onValueChange={(value) => {
                            const selectedContact = contacts.find(
                              (contact) =>
                                contact.oobi === value &&
                                contact.oobi.includes("agent")
                            );
                            setSelectedOOBI({
                              oobis: value,
                              alias: selectedContact
                                ? selectedContact.alias
                                : "",
                            });
                          }}
                        >
                          <SelectTrigger id="preconfiguredOOBI">
                            <SelectValue placeholder="Select agent contact" />
                          </SelectTrigger>
                          <SelectContent>
                            {contacts
                              .filter(
                                (contact) =>
                                  contact.oobi && contact.oobi.includes("agent")
                              )
                              .map((contact, index) => (
                                <SelectItem key={index} value={contact.oobi}>
                                  <div className="font-mono text-xs">
                                    {contact.alias} -{" "}
                                    {contact.oobi.split("/")[4]}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Custom OOBI */}
                    <div className="space-y-2">
                      <Label htmlFor="customOOBI">
                        Or Enter Custom Target OOBI
                      </Label>
                      <Input
                        id="customOOBI"
                        value={customOOBI}
                        onChange={(e) => setCustomOOBI(e.target.value)}
                        placeholder="Enter target entity OOBI"
                      />
                    </div>

                    {/* Final OOBI Display */}
                    {targetOOBI && (
                      <div className="space-y-2">
                        <Label>Selected Target OOBI</Label>
                        <div className="p-2 bg-gray-50 rounded text-xs font-mono break-all">
                          {customOOBI || targetOOBI.oobis}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Credential Data */}
                  <div className="space-y-2">
                    <Label>Credential Data (JSON)</Label>
                    <textarea
                      className="w-full p-2 border rounded-md font-mono text-sm"
                      rows={4}
                      value={JSON.stringify(credentialData, null, 2)}
                      onChange={(e) => {
                        try {
                          console.log(
                            "Parsing credential data JSON:",
                            e.target.value
                          );
                          setCredentialData(JSON.parse(e.target.value));
                        } catch {
                          // Invalid JSON, keep current state
                        }
                      }}
                      placeholder='{"attribute": "value"}'
                    />
                  </div>

                  <Button
                    onClick={handleIssueCredential}
                    disabled={isProcessing || !targetOOBI || !selectedSchema}
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Issued Credentials
                        {isChecking && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <RotateCcw className="h-4 w-4 animate-spin" />
                            Monitoring...
                          </div>
                        )}
                      </CardTitle>
                      <CardDescription>
                        View and manage all credentials issued by this{" "}
                        {accountType} AID
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChecking(true)}
                      disabled={isChecking}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          isChecking ? "animate-spin" : ""
                        }`}
                      />
                      {isChecking ? "Checking..." : "Check Now"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {credentials.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        No credentials issued yet
                        {isChecking && (
                          <div className="mt-2 text-sm">
                            Monitoring for new credentials...
                          </div>
                        )}
                      </div>
                    ) : (
                      credentials.map((credential: any, index: number) => (
                        <div
                          key={credential.sad?.d || index}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-mono text-slate-600">
                                Credential SAID: {credential.sad?.d || ""}
                              </div>
                              <Badge
                                variant="default"
                                style={{
                                  textTransform: "capitalize",
                                  marginLeft: "0.5rem",
                                }}
                              >
                                {credential.status.et === "iss"
                                  ? "Issued"
                                  : "Revoked"}
                              </Badge>
                              {credential.status.et === "iss" && (
                                <Badge
                                  variant="destructive"
                                  style={{
                                    textTransform: "capitalize",
                                    marginLeft: "0.5rem",
                                  }}
                                  onClick={() => {
                                    if (accountType === "GLEIF") {
                                      alert(
                                        "GLEIF credentials should not be revoked directly. It might be in use by other as GLEIF is root for all test apps."
                                      );
                                      return;
                                    }
                                    handleRevokeCredential(credential.sad?.d);
                                  }}
                                >
                                  Revoke
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-slate-600">
                            <div>
                              VC date:{" "}
                              {new Date(credential.status.dt).toLocaleString()}
                            </div>
                            <div>Issued to: {credential.sad?.a?.i}</div>
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
                  <CardTitle>{accountType} Issuer Configuration</CardTitle>
                  <CardDescription>
                    Manage your {accountType} issuer settings and network
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
                      Connected to KERI network as {accountType}
                    </span>
                  </div>

                  {/* Contacts Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-2">Contacts</h3>
                    <ContactsSection
                      client={issuerClient}
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
import { set } from "date-fns";
export default Issuer;
