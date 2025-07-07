
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, Users, CheckCircle, Key, FileText, Globe, Settings, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState({
    adminUrl: "http://localhost:3901",
    bootUrl: "http://localhost:3903"
  });

  const handleNavigate = (path: string) => {
    navigate(path, { state: { config } });
  };

  const roles = [
    {
      id: "issuer",
      title: "Issuer",
      description: "Create and issue verifiable credentials to holders",
      icon: Key,
      color: "bg-blue-500",
      features: ["Create Credential Registry", "Issue ACDCs", "Manage Revocation", "IPEX Grant Operations"],
      path: "/issuer"
    },
    {
      id: "holder",
      title: "Holder",
      description: "Receive, store, and present credentials to verifiers",
      icon: Users,
      color: "bg-green-500",
      features: ["Receive Credentials", "Store ACDCs", "Present to Verifiers", "IPEX Apply/Offer"],
      path: "/holder"
    },
    {
      id: "verifier",
      title: "Verifier",
      description: "Request and verify credentials from holders",
      icon: CheckCircle,
      color: "bg-purple-500",
      features: ["Request Presentations", "Verify Credentials", "Check Revocation Status", "IPEX Admit"],
      path: "/verifier"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">KERI Credential Manager</h1>
              <p className="text-slate-600">SignifyTS ACDC Presentation and Verification Platform</p>
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

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {/* Configuration Section */}
        <div className="mb-8">
          <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full max-w-md mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Network Configuration
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isConfigOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg">KERI Network Settings</CardTitle>
                  <CardDescription>
                    Configure the Admin and Boot URLs for all client connections
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminUrl">Admin URL</Label>
                    <Input
                      id="adminUrl"
                      value={config.adminUrl}
                      onChange={(e) => setConfig({ ...config, adminUrl: e.target.value })}
                      placeholder="http://localhost:3901"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bootUrl">Boot URL</Label>
                    <Input
                      id="bootUrl"
                      value={config.bootUrl}
                      onChange={(e) => setConfig({ ...config, bootUrl: e.target.value })}
                      placeholder="http://localhost:3903"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700">
                      These settings will be used by all client types
                    </span>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Choose Your Role</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Select your role in the credential ecosystem to begin issuing, holding, or verifying 
            Authentic Chained Data Containers (ACDCs) using the IPEX protocol.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {roles.map((role) => {
            const IconComponent = role.icon;
            return (
              <Card key={role.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200">
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 ${role.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-slate-900">{role.title}</CardTitle>
                  <CardDescription className="text-slate-600">{role.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-6">
                    {role.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => handleNavigate(role.path)}
                    className="w-full group-hover:bg-blue-600 transition-colors duration-300"
                  >
                    Enter as {role.title}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-white rounded-2xl border border-slate-200 p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">About KERI Credential Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">IPEX Protocol</h4>
              <p className="text-slate-600 text-sm">
                The Issuance and Presentation Exchange (IPEX) protocol enables secure credential 
                workflows including Apply, Offer, Agree, Grant, and Admit operations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">ACDC Standards</h4>
              <p className="text-slate-600 text-sm">
                Authentic Chained Data Containers provide cryptographically verifiable credentials 
                with built-in revocation and validation capabilities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
