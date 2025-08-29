import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Settings,
  Shield,
  Bell,
  Database,
  Users,
  Mail,
  Clock,
  FileText,
  Globe,
  Lock,
  Key,
  Download,
  Upload,
  Trash2,
  Save,
  RefreshCw,
  Home,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";

interface SystemConfig {
  labName: string;
  labDescription: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  notifications: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    weeklyReports: boolean;
    deadlineAlerts: boolean;
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
      requireNumbers: boolean;
    };
    sessionTimeout: number;
    mfaRequired: boolean;
  };
  dataRetention: {
    logRetentionDays: number;
    reportRetentionDays: number;
    automaticBackups: boolean;
  };
}

interface UserPermission {
  id: string;
  userId: string;
  userName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
}

export default function SystemSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  // Form states
  const [labName, setLabName] = useState("Digital Epidemiology Laboratory");
  const [labDescription, setLabDescription] = useState("Epidemiological research and health data science projects");
  const [timezone, setTimezone] = useState("America/New_York");
  const [workingStart, setWorkingStart] = useState("09:00");
  const [workingEnd, setWorkingEnd] = useState("17:00");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(480); // 8 hours in minutes
  const [mfaRequired, setMfaRequired] = useState(false);
  const [logRetentionDays, setLogRetentionDays] = useState(90);
  const [automaticBackups, setAutomaticBackups] = useState(true);

  // Fetch system configuration
  const { data: systemConfig, isLoading: configLoading } = useQuery<SystemConfig>({
    queryKey: ["/api/admin/system-config"],
    retry: false,
  });

  // Fetch user permissions
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery<UserPermission[]>({
    queryKey: ["/api/admin/user-permissions"],
    retry: false,
  });

  // Fetch all users for management
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: any) => {
      return await apiRequest("PUT", "/api/admin/system-config", configData);
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "System configuration updated successfully",
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/system-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PUT", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      setShowUserDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-permissions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const handleSaveConfig = () => {
    const configData = {
      labName,
      labDescription,
      timezone,
      workingHours: { start: workingStart, end: workingEnd },
      notifications: {
        emailEnabled: emailNotifications,
        weeklyReports,
        deadlineAlerts,
      },
      security: {
        passwordPolicy: {
          minLength: minPasswordLength,
          requireSpecialChars,
        },
        sessionTimeout,
        mfaRequired,
      },
      dataRetention: {
        logRetentionDays,
        automaticBackups,
      },
    };

    saveConfigMutation.mutate(configData);
  };

  const handleFieldChange = () => {
    setHasUnsavedChanges(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800">Admin</Badge>;
      case 'professor':
        return <Badge className="bg-blue-100 text-blue-800">Professor</Badge>;
      case 'postdoc':
        return <Badge className="bg-purple-100 text-purple-800">Postdoc</Badge>;
      case 'student':
        return <Badge className="bg-green-100 text-green-800">Student</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center space-x-2 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="nav-home">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <span className="text-muted-foreground">→</span>
        <span className="text-foreground font-medium">System Settings</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">
            Configure lab settings, user permissions, and system preferences
          </p>
        </div>
        
        <div className="flex space-x-3">
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Unsaved changes</span>
            </div>
          )}
          
          <Button
            onClick={handleSaveConfig}
            disabled={saveConfigMutation.isPending || !hasUnsavedChanges}
            data-testid="button-save-config"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveConfigMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="data">Data & Backup</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Lab Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="lab-name">Lab Name</Label>
                    <Input
                      id="lab-name"
                      value={labName}
                      onChange={(e) => { setLabName(e.target.value); handleFieldChange(); }}
                      className="mt-2"
                      data-testid="input-lab-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={(value) => { setTimezone(value); handleFieldChange(); }}>
                      <SelectTrigger className="mt-2" data-testid="select-timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="lab-description">Lab Description</Label>
                    <Textarea
                      id="lab-description"
                      value={labDescription}
                      onChange={(e) => { setLabDescription(e.target.value); handleFieldChange(); }}
                      className="mt-2"
                      data-testid="textarea-lab-description"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Working Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="working-start">Start Time</Label>
                    <Input
                      id="working-start"
                      type="time"
                      value={workingStart}
                      onChange={(e) => { setWorkingStart(e.target.value); handleFieldChange(); }}
                      className="mt-2"
                      data-testid="input-working-start"
                    />
                  </div>
                  <div>
                    <Label htmlFor="working-end">End Time</Label>
                    <Input
                      id="working-end"
                      type="time"
                      value={workingEnd}
                      onChange={(e) => { setWorkingEnd(e.target.value); handleFieldChange(); }}
                      className="mt-2"
                      data-testid="input-working-end"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Send system notifications via email</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={(checked) => { setEmailNotifications(checked); handleFieldChange(); }}
                    data-testid="switch-email-notifications"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">Automatically generate weekly progress reports</p>
                  </div>
                  <Switch
                    checked={weeklyReports}
                    onCheckedChange={(checked) => { setWeeklyReports(checked); handleFieldChange(); }}
                    data-testid="switch-weekly-reports"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Deadline Alerts</Label>
                    <p className="text-sm text-muted-foreground">Send alerts for approaching project deadlines</p>
                  </div>
                  <Switch
                    checked={deadlineAlerts}
                    onCheckedChange={(checked) => { setDeadlineAlerts(checked); handleFieldChange(); }}
                    data-testid="switch-deadline-alerts"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="min-password-length">Minimum Password Length</Label>
                  <Input
                    id="min-password-length"
                    type="number"
                    min="6"
                    max="20"
                    value={minPasswordLength}
                    onChange={(e) => { setMinPasswordLength(parseInt(e.target.value)); handleFieldChange(); }}
                    className="mt-2 w-32"
                    data-testid="input-min-password-length"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require Special Characters</Label>
                    <p className="text-sm text-muted-foreground">Passwords must contain special characters</p>
                  </div>
                  <Switch
                    checked={requireSpecialChars}
                    onCheckedChange={(checked) => { setRequireSpecialChars(checked); handleFieldChange(); }}
                    data-testid="switch-require-special-chars"
                  />
                </div>
                
                <div>
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    min="30"
                    max="1440"
                    value={sessionTimeout}
                    onChange={(e) => { setSessionTimeout(parseInt(e.target.value)); handleFieldChange(); }}
                    className="mt-2 w-32"
                    data-testid="input-session-timeout"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require MFA for all users</p>
                  </div>
                  <Switch
                    checked={mfaRequired}
                    onCheckedChange={(checked) => { setMfaRequired(checked); handleFieldChange(); }}
                    data-testid="switch-mfa-required"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Management</h2>
            <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user">
                  <Users className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="postdoc">Postdoc</SelectItem>
                        <SelectItem value="professor">Professor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => updateUserRoleMutation.mutate({ userId: selectedUserId, role: selectedRole })}
                      disabled={!selectedUserId || !selectedRole || updateUserRoleMutation.isPending}
                    >
                      {updateUserRoleMutation.isPending ? "Adding..." : "Add User"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.isActive ?? false)}</TableCell>
                      <TableCell>
                        Never
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                          {user.role !== 'admin' && (
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data & Backup Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="log-retention">Log Retention (days)</Label>
                  <Input
                    id="log-retention"
                    type="number"
                    min="7"
                    max="365"
                    value={logRetentionDays}
                    onChange={(e) => { setLogRetentionDays(parseInt(e.target.value)); handleFieldChange(); }}
                    className="mt-2 w-32"
                    data-testid="input-log-retention"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Automatic Backups</Label>
                    <p className="text-sm text-muted-foreground">Daily automatic database backups</p>
                  </div>
                  <Switch
                    checked={automaticBackups}
                    onCheckedChange={(checked) => { setAutomaticBackups(checked); handleFieldChange(); }}
                    data-testid="switch-automatic-backups"
                  />
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Data Operations</h3>
                <div className="flex space-x-4">
                  <Button variant="outline" data-testid="button-export-data">
                    <Download className="mr-2 h-4 w-4" />
                    Export All Data
                  </Button>
                  <Button variant="outline" data-testid="button-backup-now">
                    <Database className="mr-2 h-4 w-4" />
                    Backup Now
                  </Button>
                  <Button variant="outline" data-testid="button-restore-backup">
                    <Upload className="mr-2 h-4 w-4" />
                    Restore Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}