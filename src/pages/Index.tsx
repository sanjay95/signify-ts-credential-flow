import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Users,
  CheckCircle,
  Key,
  FileText,
  Globe,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useConfigContext } from "@/context/ConfigContext";
import { AccountTypeSelector } from "@/components/AccountTypeSelector";
import { AccountType, SCHEMA_OPTIONS } from "@/types/accounts";

const Index = () => {
  const navigate = useNavigate();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isConfigHovered, setIsConfigHovered] = useState(false);
  const [showAccountTypeDialog, setShowAccountTypeDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"issuer" | "holder" | null>(
    null
  );
  const [selectedAccountType, setSelectedAccountType] =
    useState<AccountType | null>(null);

  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const [isSchemaHovered, setIsSchemaHovered] = useState(false);
  useEffect(() => {
    if (isSchemaOpen && !isSchemaHovered) {
      const timer = setTimeout(() => setIsSchemaOpen(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSchemaOpen, isSchemaHovered]);

  useEffect(() => {
    if (isConfigOpen && !isConfigHovered) {
      const timer = setTimeout(() => setIsConfigOpen(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConfigOpen, isConfigHovered]);

  const { config, env, setEnv } = useConfigContext();

  const handleRoleSelection = (role: "issuer" | "holder") => {
    setSelectedRole(role);
    setShowAccountTypeDialog(true);
  };

  const handleAccountTypeSelection = (accountType: AccountType) => {
    setSelectedAccountType(accountType);
  };

  const handleProceed = () => {
    if (selectedRole && selectedAccountType) {
      navigate(`/${selectedRole}`, {
        state: {
          config,
          accountType: selectedAccountType,
        },
      });
    }
  };

  const handleVerifierNavigation = () => {
    navigate("/verifier", { state: { config } });
  };

  const roles = [
    {
      id: "issuer",
      title: "Issuer",
      description: "Create and issue verifiable credentials to holders",
      icon: Key,
      color: "bg-blue-500",
      features: [
        "Create Credential Registry",
        "Issue ACDCs",
        "Manage Revocation",
        "IPEX Grant Operations",
      ],
      action: () => handleRoleSelection("issuer"),
    },
    {
      id: "holder",
      title: "Holder",
      description: "Receive, store, and present credentials to verifiers",
      icon: Users,
      color: "bg-green-500",
      features: [
        "Receive Credentials",
        "Store ACDCs",
        "Present to Verifiers",
        "IPEX Apply/Offer",
      ],
      action: () => handleRoleSelection("holder"),
    },
    {
      id: "verifier",
      title: "Verifier",
      description: "Request and verify credentials from holders",
      icon: CheckCircle,
      color: "bg-purple-500",
      features: [
        "Request Presentations",
        "Verify Credentials",
        "Check Revocation Status",
        "IPEX Admit",
      ],
      action: handleVerifierNavigation,
    },
  ];

  const envColors: Record<string, string> = {
    local: "bg-green-100 text-green-800 border-green-400",
    test: "bg-yellow-100 text-yellow-800 border-yellow-400",
    prod: "bg-gray-200 text-gray-800 border-gray-400",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                KERI Credential Manager
              </h1>
              <p className="text-slate-600">
                SignifyTS ACDC Presentation and Verification Platform
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              IPEX Protocol
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              ACDC Standards
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Cryptographic Verification
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Row of Dropdowns */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 max-w-3xl mx-auto">
          {/* Supported Schemas Dropdown */}
          <div
            className="flex-1"
            onMouseEnter={() => setIsSchemaHovered(true)}
            onMouseLeave={() => setIsSchemaHovered(false)}
          >
            <Collapsible open={isSchemaOpen} onOpenChange={setIsSchemaOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-between border"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Supported Schemas
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isSchemaOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Supported Schemas</CardTitle>
                    <CardDescription>
                      List of credential schemas supported in this app,
                      including their unique SAID and target account types.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {SCHEMA_OPTIONS.map((schema) => (
                      <div
                        key={schema.said}
                        className="border-b pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">
                            {schema.name}
                          </span>
                          <a
                            href={`${config.schemaServer}/oobi/${schema.said}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-slate-100 text-blue-700 px-2 py-0.5 rounded underline hover:text-blue-900"
                          >
                            SAID: {schema.said}
                          </a>
                        </div>
                        <div className="text-slate-600 text-sm mb-1">
                          {schema.description}
                        </div>
                        <div className="text-xs text-slate-500">
                          Target Types: {schema.targetTypes.join(", ")}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
          {/* Network Environment Dropdown */}
          <div
            className="flex-1"
            onMouseEnter={() => setIsConfigHovered(true)}
            onMouseLeave={() => setIsConfigHovered(false)}
          >
            <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-between border"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Network Environment
                  </div>
                  <span
                    className={`ml-2 px-3 py-1 rounded-full border text-xs font-semibold ${envColors[env]}`}
                  >
                    {env === "local"
                      ? "Local"
                      : env === "test"
                      ? "Test"
                      : "Production"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isConfigOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Network Environment
                    </CardTitle>
                    <CardDescription>
                      Choose which network to use for all client connections
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="env">Environment</label>
                      <select
                        id="env"
                        className="w-full p-2 border rounded-md"
                        value={env}
                        onChange={(e) => setEnv(e.target.value as any)}
                      >
                        <option value="local">Local</option>
                        <option value="test">Test</option>
                        <option value="prod">Production</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-slate-600">
                      <div>
                        <b>Admin URL:</b> {config.adminUrl}
                      </div>
                      <div>
                        <b>Boot URL:</b> {config.bootUrl}
                      </div>
                      <div>
                        <b>Schema Server:</b> {config.schemaServer}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Choose Your Role
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Select your role in the credential ecosystem to begin issuing,
            holding, or verifying Authentic Chained Data Containers (ACDCs)
            using the IPEX protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {roles.map((role) => {
            const IconComponent = role.icon;
            return (
              <Card
                key={role.id}
                className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200"
              >
                <CardHeader className="text-center pb-4">
                  <div
                    className={`w-16 h-16 ${role.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900">
                    {role.title}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {role.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3 mb-6">
                    {role.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={role.action}
                    className="w-full group-hover:bg-blue-600 transition-colors duration-300"
                  >
                    Enter as {role.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog
          open={showAccountTypeDialog}
          onOpenChange={setShowAccountTypeDialog}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Select Account Type for {selectedRole?.charAt(0).toUpperCase()}
                {selectedRole?.slice(1)}
              </DialogTitle>
              <DialogDescription>
                Choose the type of entity you represent to access the
                appropriate {selectedRole} interface
              </DialogDescription>
            </DialogHeader>

            <AccountTypeSelector
              onSelect={handleAccountTypeSelection}
              selectedType={selectedAccountType}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAccountTypeDialog(false);
                  setSelectedAccountType(null);
                  setSelectedRole(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleProceed} disabled={!selectedAccountType}>
                Continue as {selectedAccountType}{" "}
                {selectedRole?.charAt(0).toUpperCase()}
                {selectedRole?.slice(1)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-16 bg-white rounded-2xl border border-slate-200 p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">
            About KERI Credential Management
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                IPEX Protocol
              </h4>
              <p className="text-slate-600 text-sm">
                The Issuance and Presentation Exchange (IPEX) protocol enables
                secure credential workflows including Apply, Offer, Agree,
                Grant, and Admit operations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">
                ACDC Standards
              </h4>
              <p className="text-slate-600 text-sm">
                Authentic Chained Data Containers provide cryptographically
                verifiable credentials with built-in revocation and validation
                capabilities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
