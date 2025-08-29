import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Slack,
  Mail,
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Zap,
  Globe,
  Key
} from "lucide-react";

interface IntegrationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  features: string[];
}

function IntegrationCard({ 
  icon, 
  title, 
  description, 
  isConnected, 
  onConnect, 
  onDisconnect, 
  features 
}: IntegrationCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className="ml-2">
            {isConnected ? (
              <><CheckCircle className="h-3 w-3 mr-1" />Connected</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" />Not Connected</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Features:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div className="pt-2">
          {isConnected ? (
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={onDisconnect}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={onConnect} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect {title}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExternalIntegrations() {
  const { toast } = useToast();
  const [slackConnected, setSlackConnected] = useState(false);
  const [emailConnected, setEmailConnected] = useState(true);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [showSlackDialog, setShowSlackDialog] = useState(false);
  
  // Integration settings
  const [slackWebhook, setSlackWebhook] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [calendarSync, setCalendarSync] = useState(false);
  const [autoUpdates, setAutoUpdates] = useState(true);

  const handleSlackConnect = () => {
    setShowSlackDialog(true);
  };

  const handleSlackSetup = () => {
    if (!slackWebhook) {
      toast({
        title: "Error",
        description: "Please enter a valid Slack webhook URL",
        variant: "destructive",
      });
      return;
    }
    
    setSlackConnected(true);
    setShowSlackDialog(false);
    toast({
      title: "Success",
      description: "Slack integration connected successfully!",
    });
  };

  const handleEmailConnect = () => {
    setEmailConnected(true);
    toast({
      title: "Email Connected",
      description: "Email notifications are now active",
    });
  };

  const handleCalendarConnect = () => {
    setCalendarConnected(true);
    toast({
      title: "Calendar Connected", 
      description: "Calendar sync enabled for project deadlines",
    });
  };

  const handleGithubConnect = () => {
    setGithubConnected(true);
    toast({
      title: "GitHub Connected",
      description: "Repository integration active",
    });
  };

  const integrations = [
    {
      icon: <Slack className="h-6 w-6 text-purple-600" />,
      title: "Slack",
      description: "Team communication and notifications",
      isConnected: slackConnected,
      onConnect: handleSlackConnect,
      onDisconnect: () => setSlackConnected(false),
      features: [
        "Real-time project updates",
        "Task assignment notifications", 
        "Daily standup reminders",
        "Deadline alerts",
        "Custom channel routing"
      ]
    },
    {
      icon: <Mail className="h-6 w-6 text-blue-600" />,
      title: "Email",
      description: "Automated email notifications and reports",
      isConnected: emailConnected,
      onConnect: handleEmailConnect,
      onDisconnect: () => setEmailConnected(false),
      features: [
        "Weekly progress reports",
        "Task assignment emails",
        "Deadline reminders",
        "System alerts",
        "Custom email templates"
      ]
    },
    {
      icon: <Calendar className="h-6 w-6 text-green-600" />,
      title: "Calendar",
      description: "Sync deadlines and meetings",
      isConnected: calendarConnected,
      onConnect: handleCalendarConnect,
      onDisconnect: () => setCalendarConnected(false),
      features: [
        "Project deadline sync",
        "Meeting scheduling",
        "Reminder notifications",
        "Team availability",
        "Recurring events"
      ]
    },
    {
      icon: <Globe className="h-6 w-6 text-gray-700" />,
      title: "GitHub",
      description: "Repository and code integration",
      isConnected: githubConnected,
      onConnect: handleGithubConnect,
      onDisconnect: () => setGithubConnected(false),
      features: [
        "Commit tracking",
        "Pull request notifications",
        "Code review assignments",
        "Branch protection",
        "Repository analytics"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">External Integrations</h2>
          <p className="text-muted-foreground">
            Connect external tools to streamline your workflow
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center">
            <Zap className="h-3 w-3 mr-1" />
            {integrations.filter(i => i.isConnected).length} Connected
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList>
          <TabsTrigger value="services">Available Services</TabsTrigger>
          <TabsTrigger value="settings">Integration Settings</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks & APIs</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations.map((integration, index) => (
              <IntegrationCard key={index} {...integration} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email updates</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Calendar Sync</Label>
                    <p className="text-sm text-muted-foreground">Sync deadlines to calendar</p>
                  </div>
                  <Switch
                    checked={calendarSync}
                    onCheckedChange={setCalendarSync}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Updates</Label>
                    <p className="text-sm text-muted-foreground">Automatically update external tools</p>
                  </div>
                  <Switch
                    checked={autoUpdates}
                    onCheckedChange={setAutoUpdates}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Communication Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Default Slack Channel</Label>
                  <Input 
                    placeholder="#lab-general" 
                    className="mt-2"
                    disabled={!slackConnected}
                  />
                </div>
                
                <div>
                  <Label>Email Template</Label>
                  <Input 
                    placeholder="Weekly Lab Report" 
                    className="mt-2"
                    disabled={!emailConnected}
                  />
                </div>
                
                <div>
                  <Label>Calendar Name</Label>
                  <Input 
                    placeholder="Lab Deadlines" 
                    className="mt-2"
                    disabled={!calendarConnected}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                API Keys & Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Slack Webhook URL</Label>
                <Input 
                  type="password"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Create a webhook in your Slack workspace settings
                </p>
              </div>
              
              <div>
                <Label>GitHub Personal Access Token</Label>
                <Input 
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Generate a token with repo and notifications scope
                </p>
              </div>
              
              <div>
                <Label>Calendar API Endpoint</Label>
                <Input 
                  placeholder="https://api.calendar.provider.com/v1"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Google Calendar or Outlook API endpoint
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Slack Setup Dialog */}
      <Dialog open={showSlackDialog} onOpenChange={setShowSlackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Slack className="h-5 w-5 mr-2 text-purple-600" />
              Connect Slack Workspace
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create a webhook in your Slack workspace: Settings → Apps → Incoming Webhooks
              </p>
            </div>
            
            <div>
              <Label>Default Channel</Label>
              <Input
                placeholder="#lab-notifications"
                className="mt-2"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowSlackDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSlackSetup}>
                Connect Slack
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}