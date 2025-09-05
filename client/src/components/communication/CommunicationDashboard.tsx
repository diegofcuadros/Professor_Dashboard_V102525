import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RealtimeMonitoring from "./RealtimeMonitoring";
import { 
  Send, 
  Users, 
  MessageCircle, 
  Brain, 
  TrendingUp, 
  AlertTriangle,
  Star,
  Mail,
  Clock,
  User
} from "lucide-react";

interface MessageableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
}

interface LabInsights {
  overallHealth: number;
  topPerformers: string[];
  atRiskStudents: string[];
  recommendations: string[];
}

export default function CommunicationDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  // Fetch messageable users
  const { data: messageableUsers, isLoading: usersLoading } = useQuery<MessageableUser[]>({
    queryKey: ["/api/users/messageable"],
    retry: false,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { recipientId: string; subject: string; message: string }) => {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send message");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Message sent successfully!",
      });
      setSelectedRecipient("");
      setMessageSubject("");
      setMessageBody("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Inbox & Sent
  const { data: inbox } = useQuery<any[]>({ queryKey: ["/api/messages/inbox"], retry: false });
  const { data: sent } = useQuery<any[]>({ queryKey: ["/api/messages/sent"], retry: false });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete message');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/sent"] });
    }
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/messages/${id}/read`, { method: 'PUT', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to mark read');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/messages/inbox"] })
  });

  // Fetch lab insights from AI service
  const { data: labInsights, isLoading: insightsLoading } = useQuery<LabInsights>({
    queryKey: ["/api/ai/lab-insights"],
    retry: false,
    enabled: user?.role === 'admin' || user?.role === 'professor',
  });

  // Fallback data if API fails
  const defaultInsights: LabInsights = {
    overallHealth: 0,
    topPerformers: [],
    atRiskStudents: [],
    recommendations: ["Unable to load insights at this time"]
  };

  const handleSendMessage = () => {
    if (!selectedRecipient || !messageSubject.trim() || !messageBody.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      recipientId: selectedRecipient,
      subject: messageSubject,
      message: messageBody,
    });
  };

  const getHealthColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 75) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  // Use actual insights or fallback data
  const insights = labInsights || defaultInsights;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communication Dashboard</h1>
          <p className="text-muted-foreground">
            Manage communications and monitor lab performance
          </p>
        </div>
      </div>

      <Tabs defaultValue="messaging" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Direct Messaging
          </TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Lab Insights
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Team Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messaging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Direct Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient</Label>
                  <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                    <SelectTrigger>
                      <SelectValue placeholder={usersLoading ? "Loading users..." : "Select recipient"} />
                    </SelectTrigger>
                    <SelectContent>
                      {messageableUsers?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{user.firstName} {user.lastName}</span>
                            <Badge variant="outline" className="ml-2">
                              {user.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Enter message subject"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              
              <Button 
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                className="w-full md:w-auto"
              >
                {sendMessageMutation.isPending ? (
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Message
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4">
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">Send to All Students</div>
                    <div className="text-xs text-muted-foreground">Broadcast message</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4">
                  <div className="text-center">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                    <div className="text-sm font-medium">Alert At-Risk Students</div>
                    <div className="text-xs text-muted-foreground">Send productivity alerts</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4">
                  <div className="text-center">
                    <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                    <div className="text-sm font-medium">Encourage Top Performers</div>
                    <div className="text-xs text-muted-foreground">Send recognition messages</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inbox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(inbox || []).length === 0 && <div className="text-sm text-muted-foreground">No messages</div>}
              {(inbox || []).map((m) => (
                <div key={m.id} className={`p-3 border rounded ${m.readAt ? '' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="flex justify-between text-sm">
                    <div><strong>From:</strong> {m.senderId}</div>
                    <div className="text-muted-foreground">{new Date(m.sentAt).toLocaleString()}</div>
                  </div>
                  <div className="font-medium">{m.subject}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{m.body}</div>
                  <div className="mt-2 flex gap-2">
                    {!m.readAt && <Button size="sm" variant="outline" onClick={() => markRead.mutate(m.id)}>Mark Read</Button>}
                    <Button size="sm" variant="outline" onClick={() => { setSelectedRecipient(m.senderId); setMessageSubject(m.subject.startsWith('Re:') ? m.subject : `Re: ${m.subject}`); setMessageBody(''); }}>Reply</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMessage.mutate(m.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(sent || []).length === 0 && <div className="text-sm text-muted-foreground">No messages</div>}
              {(sent || []).map((m) => (
                <div key={m.id} className="p-3 border rounded">
                  <div className="flex justify-between text-sm">
                    <div><strong>To:</strong> {m.recipientId}</div>
                    <div className="text-muted-foreground">{new Date(m.sentAt).toLocaleString()}</div>
                  </div>
                  <div className="font-medium">{m.subject}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{m.body}</div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => deleteMessage.mutate(m.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Lab Health</p>
                    <p className={`text-2xl font-bold ${getHealthColor(insights.overallHealth)}`}>
                      {insights.overallHealth}/100
                    </p>
                  </div>
                  <Badge variant={getHealthBadgeVariant(insights.overallHealth)}>
                    {insights.overallHealth >= 75 ? "Excellent" : 
                     insights.overallHealth >= 50 ? "Good" : "Needs Attention"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Top Performers</p>
                    <p className="text-2xl font-bold text-green-600">{insights.topPerformers.length}</p>
                  </div>
                  <Star className="h-6 w-6 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">At-Risk Students</p>
                    <p className="text-2xl font-bold text-red-600">{insights.atRiskStudents.length}</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold text-blue-600">{messageableUsers?.length || 0}</p>
                  </div>
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.topPerformers.length > 0 ? (
                  <ul className="space-y-2">
                    {insights.topPerformers.map((performer, index) => (
                      <li key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{performer}</span>
                        <Badge variant="default" className="ml-auto">Excellent</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No top performers identified yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Students Needing Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.atRiskStudents.length > 0 ? (
                  <ul className="space-y-2">
                    {insights.atRiskStudents.map((student, index) => (
                      <li key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-medium">{student}</span>
                        <Badge variant="destructive" className="ml-auto">At Risk</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-green-600">All students are performing well! 🎉</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.recommendations.length > 0 ? (
                <ul className="space-y-3">
                  {insights.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded">
                      <Brain className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No recommendations at this time.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <RealtimeMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
}