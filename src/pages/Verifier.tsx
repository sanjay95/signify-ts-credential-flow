
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, ArrowLeft, Search, FileCheck, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Verifier = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [verifierData, setVerifierData] = useState({
    alias: "verifierAid",
  });

  const [verificationRequest, setVerificationRequest] = useState({
    holderAID: "",
    schemaSaid: "EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK",
    requiredAttributes: "eventName:GLEIF Summit",
  });

  const [verifications, setVerifications] = useState([
    {
      id: "ver-001",
      credentialSaid: "EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK",
      holderAid: "holder123",
      status: "verified",
      verifiedDate: "2024-01-15",
      claims: {
        eventName: "GLEIF Summit",
        accessLevel: "staff",
        validDate: "2026-10-01"
      },
      issuer: "issuer123",
      revocationStatus: "valid"
    },
    {
      id: "ver-002",
      credentialSaid: "E2BGDiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK",
      holderAid: "holder456",
      status: "pending",
      verifiedDate: "2024-01-16",
      claims: {
        eventName: "Tech Conference",
        accessLevel: "attendee",
        validDate: "2025-12-31"
      },
      issuer: "issuer789",
      revocationStatus: "checking"
    }
  ]);

  const [presentationRequests, setPresentationRequests] = useState([]);

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

  const handleRequestPresentation = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newRequest = {
        id: `req-${Date.now()}`,
        holderAid: verificationRequest.holderAID,
        schemaSaid: verificationRequest.schemaSaid,
        attributes: verificationRequest.requiredAttributes,
        status: "sent",
        timestamp: new Date().toISOString()
      };
      
      setPresentationRequests([...presentationRequests, newRequest]);
      setIsProcessing(false);
      toast({
        title: "Presentation Requested",
        description: "IPEX Apply message sent to holder for credential presentation",
      });
    }, 2500);
  };

  const handleVerifyCredential = async (verificationId: string) => {
    setIsProcessing(true);
    setTimeout(() => {
      setVerifications(verifications.map(ver => 
        ver.id === verificationId 
          ? { ...ver, status: "verified", revocationStatus: "valid" }
          : ver
      ));
      setIsProcessing(false);
      toast({
        title: "Credential Verified",
        description: "ACDC credential successfully verified and revocation status checked",
      });
    }, 3000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
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
                <h1 className="text-2xl font-bold text-slate-900">Verifier Dashboard</h1>
                <p className="text-slate-600">Request and verify credentials</p>
              </div>
            </div>
            <div className="ml-auto">
              <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
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
              <div className="space-y-2">
                <Label htmlFor="alias">Verifier AID Alias</Label>
                <Input
                  id="alias"
                  value={verifierData.alias}
                  onChange={(e) => setVerifierData({...verifierData, alias: e.target.value})}
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="verify">Verify</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
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
                    Send an IPEX Apply message to request credential from holder
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="holderAID">Holder AID</Label>
                    <Input
                      id="holderAID"
                      value={verificationRequest.holderAID}
                      onChange={(e) => setVerificationRequest({...verificationRequest, holderAID: e.target.value})}
                      placeholder="Enter holder's AID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schemaSaid">Schema SAID</Label>
                    <Input
                      id="schemaSaid"
                      value={verificationRequest.schemaSaid}
                      onChange={(e) => setVerificationRequest({...verificationRequest, schemaSaid: e.target.value})}
                      placeholder="Schema identifier"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attributes">Required Attributes</Label>
                    <Input
                      id="attributes"
                      value={verificationRequest.requiredAttributes}
                      onChange={(e) => setVerificationRequest({...verificationRequest, requiredAttributes: e.target.value})}
                      placeholder="e.g., eventName:GLEIF Summit"
                    />
                  </div>
                  <Button 
                    onClick={handleRequestPresentation} 
                    disabled={isProcessing || !verificationRequest.holderAID}
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {isProcessing ? "Sending Request..." : "Request Presentation"}
                  </Button>
                </CardContent>
              </Card>

              {presentationRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sent Requests</CardTitle>
                    <CardDescription>Pending presentation requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {presentationRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">Request to {request.holderAid}</div>
                              <div className="text-xs text-slate-600">{request.attributes}</div>
                            </div>
                            <Badge variant="secondary">{request.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="verify" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Verifications</CardTitle>
                  <CardDescription>
                    Credentials awaiting verification and revocation checks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {verifications.filter(v => v.status === "pending").map((verification) => (
                      <Card key={verification.id} className="border-yellow-200 bg-yellow-50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(verification.status)}
                              <div>
                                <h4 className="font-medium text-sm">{verification.claims.eventName}</h4>
                                <p className="text-xs text-slate-600 font-mono">
                                  {verification.credentialSaid.substring(0, 20)}...
                                </p>
                              </div>
                            </div>
                            <Badge variant={getStatusColor(verification.status)}>
                              {verification.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-3">
                            <div>
                              <span className="text-slate-500">Holder:</span>
                              <div className="font-medium">{verification.holderAid}</div>
                            </div>
                            <div>
                              <span className="text-slate-500">Access Level:</span>
                              <div className="font-medium">{verification.claims.accessLevel}</div>
                            </div>
                            <div>
                              <span className="text-slate-500">Valid Until:</span>
                              <div className="font-medium">{verification.claims.validDate}</div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleVerifyCredential(verification.id)}
                            disabled={isProcessing}
                          >
                            <FileCheck className="h-4 w-4 mr-2" />
                            {isProcessing ? "Verifying..." : "Verify Credential"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Verification History</CardTitle>
                  <CardDescription>
                    All completed credential verifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {verifications.map((verification) => (
                      <div key={verification.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(verification.status)}
                            <div>
                              <h4 className="font-medium">{verification.claims.eventName}</h4>
                              <p className="text-sm text-slate-600 font-mono">
                                {verification.credentialSaid.substring(0, 20)}...
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={getStatusColor(verification.status)}>
                              {verification.status}
                            </Badge>
                            <Badge variant={verification.revocationStatus === "valid" ? "default" : "secondary"}>
                              {verification.revocationStatus}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Holder:</span>
                            <div className="font-medium">{verification.holderAid}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Issuer:</span>
                            <div className="font-medium">{verification.issuer}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Access Level:</span>
                            <div className="font-medium">{verification.claims.accessLevel}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Verified:</span>
                            <div className="font-medium">{verification.verifiedDate}</div>
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
                    Manage verification settings and trusted issuers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>AID Alias</Label>
                    <Input value={verifierData.alias} readOnly />
                  </div>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg">
                    <div>
                      <span className="text-sm text-purple-700">Total Verifications:</span>
                      <div className="font-semibold text-purple-800">{verifications.length}</div>
                    </div>
                    <div>
                      <span className="text-sm text-purple-700">Verified:</span>
                      <div className="font-semibold text-purple-800">
                        {verifications.filter(v => v.status === "verified").length}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-purple-700">Pending:</span>
                      <div className="font-semibold text-purple-800">
                        {verifications.filter(v => v.status === "pending").length}
                      </div>
                    </div>
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
