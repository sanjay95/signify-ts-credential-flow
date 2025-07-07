
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ArrowLeft, Wallet, Send, Eye, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Holder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [holderData, setHolderData] = useState({
    alias: "holderAid",
  });

  const [presentationRequest, setPresentationRequest] = useState({
    verifierAID: "",
    attributes: "",
  });

  const [credentials, setCredentials] = useState([
    {
      id: "cred-001",
      said: "EGUPiCVO73M9worPwR3PfThAtC0AJnH5ZgwsXf6TzbVK",
      status: "valid",
      issuer: "issuer123",
      receivedDate: "2024-01-15",
      claims: {
        eventName: "GLEIF Summit",
        accessLevel: "staff",
        validDate: "2026-10-01"
      },
      presentations: 2
    }
  ]);

  const [notifications, setNotifications] = useState([
    {
      id: "notif-001",
      type: "grant",
      from: "issuer123",
      message: "New credential received from issuer",
      timestamp: "2024-01-15T10:30:00Z",
      read: false
    },
    {
      id: "notif-002",
      type: "apply",
      from: "verifier456",
      message: "Presentation request received",
      timestamp: "2024-01-14T15:45:00Z",
      read: false
    }
  ]);

  const handleConnect = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsProcessing(false);
      toast({
        title: "Connected Successfully",
        description: "Holder client initialized and connected to KERI network",
      });
    }, 2000);
  };

  const handlePresentCredential = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Credential Presented",
        description: "Credential successfully shared with verifier via IPEX Grant",
      });
    }, 2500);
  };

  const handleReceiveCredential = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newCredential = {
        id: `cred-${Date.now()}`,
        said: `E${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        status: "valid",
        issuer: "issuer789",
        receivedDate: new Date().toISOString().split('T')[0],
        claims: {
          eventName: "Tech Conference",
          accessLevel: "attendee",
          validDate: "2025-12-31"
        },
        presentations: 0
      };
      
      setCredentials([...credentials, newCredential]);
      setIsProcessing(false);
      toast({
        title: "Credential Received",
        description: "New ACDC credential added to your wallet",
      });
    }, 2000);
  };

  const markNotificationRead = (notifId: string) => {
    setNotifications(notifications.map(n => 
      n.id === notifId ? { ...n, read: true } : n
    ));
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
                <h1 className="text-2xl font-bold text-slate-900">Holder Dashboard</h1>
                <p className="text-slate-600">Manage your credential wallet</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {notifications.filter(n => !n.read).length > 0 && (
                <Badge variant="destructive">
                  {notifications.filter(n => !n.read).length} new
                </Badge>
              )}
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
              <CardTitle>Initialize Holder Client</CardTitle>
              <CardDescription>
                Connect to the KERI network and set up your holder identity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alias">Holder AID Alias</Label>
                <Input
                  id="alias"
                  value={holderData.alias}
                  onChange={(e) => setHolderData({...holderData, alias: e.target.value})}
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
          <Tabs defaultValue="wallet" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="wallet">Wallet</TabsTrigger>
              <TabsTrigger value="present">Present</TabsTrigger>
              <TabsTrigger value="notifications">
                Notifications
                {notifications.filter(n => !n.read).length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {notifications.filter(n => !n.read).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="wallet" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">My Credentials</h3>
                  <p className="text-slate-600">Manage your stored ACDC credentials</p>
                </div>
                <Button onClick={handleReceiveCredential} disabled={isProcessing}>
                  <Download className="h-4 w-4 mr-2" />
                  {isProcessing ? "Receiving..." : "Receive Credential"}
                </Button>
              </div>

              <div className="grid gap-4">
                {credentials.map((credential) => (
                  <Card key={credential.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Wallet className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{credential.claims.eventName}</h4>
                            <p className="text-sm text-slate-600 font-mono">
                              {credential.said.substring(0, 20)}...
                            </p>
                          </div>
                        </div>
                        <Badge variant={credential.status === "valid" ? "default" : "destructive"}>
                          {credential.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-slate-500">Access Level:</span>
                          <div className="font-medium">{credential.claims.accessLevel}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Valid Until:</span>
                          <div className="font-medium">{credential.claims.validDate}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Received:</span>
                          <div className="font-medium">{credential.receivedDate}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Presentations:</span>
                          <div className="font-medium">{credential.presentations}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <Button variant="outline" size="sm">
                          <Send className="h-4 w-4 mr-2" />
                          Present
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="present" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Present Credential</CardTitle>
                  <CardDescription>
                    Share your credentials with a verifier using IPEX protocol
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verifierAID">Verifier AID</Label>
                    <Input
                      id="verifierAID"
                      value={presentationRequest.verifierAID}
                      onChange={(e) => setPresentationRequest({...presentationRequest, verifierAID: e.target.value})}
                      placeholder="Enter verifier's AID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attributes">Requested Attributes (Optional)</Label>
                    <Input
                      id="attributes"
                      value={presentationRequest.attributes}
                      onChange={(e) => setPresentationRequest({...presentationRequest, attributes: e.target.value})}
                      placeholder="e.g., eventName:GLEIF Summit"
                    />
                  </div>
                  <Button 
                    onClick={handlePresentCredential} 
                    disabled={isProcessing || !presentationRequest.verifierAID}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isProcessing ? "Presenting Credential..." : "Present Credential"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>
                    IPEX protocol messages and credential updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`border rounded-lg p-4 ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={notification.type === "grant" ? "default" : "secondary"}>
                                {notification.type.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-slate-600">
                                from {notification.from}
                              </span>
                            </div>
                            <p className="text-sm font-medium mb-2">{notification.message}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markNotificationRead(notification.id)}
                            >
                              Mark Read
                            </Button>
                          )}
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
                  <CardTitle>Holder Configuration</CardTitle>
                  <CardDescription>
                    Manage your holder settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>AID Alias</Label>
                    <Input value={holderData.alias} readOnly />
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                    <div>
                      <span className="text-sm text-green-700">Total Credentials:</span>
                      <div className="font-semibold text-green-800">{credentials.length}</div>
                    </div>
                    <div>
                      <span className="text-sm text-green-700">Total Presentations:</span>
                      <div className="font-semibold text-green-800">
                        {credentials.reduce((sum, cred) => sum + cred.presentations, 0)}
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

export default Holder;
