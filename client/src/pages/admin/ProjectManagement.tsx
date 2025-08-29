import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, 
  Users, 
  Calendar, 
  Target, 
  TrendingUp,
  Edit,
  Trash2,
  UserPlus,
  Clock,
  ArrowLeft,
  Home
} from "lucide-react";
import { Link } from "wouter";
import type { Project, User } from "@shared/schema";

export default function ProjectManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Form states
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectType, setProjectType] = useState("research");
  const [priority, setPriority] = useState("medium");
  const [deadline, setDeadline] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch users for assignment
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      return await apiRequest("POST", "/api/projects", projectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Created",
        description: "New project has been created successfully",
      });
      setShowCreateProject(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  // Assign project mutation
  const assignProjectMutation = useMutation({
    mutationFn: async (assignmentData: any) => {
      return await apiRequest("POST", "/api/assignments", assignmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Assigned",
        description: "Project has been assigned successfully",
      });
      setShowAssignDialog(false);
      setSelectedProject(null);
      setSelectedUserId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign project",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setProjectTitle("");
    setProjectDescription("");
    setProjectType("research");
    setPriority("medium");
    setDeadline("");
    setEstimatedHours("");
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide project title and description",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate({
      name: projectTitle,
      description: projectDescription,
      projectType: projectType,
      targetEndDate: deadline || undefined,
      status: "planning"
    });
  };

  const handleAssignProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedUserId) {
      toast({
        title: "Missing Information",
        description: "Please select both project and user",
        variant: "destructive",
      });
      return;
    }

    assignProjectMutation.mutate({
      projectId: selectedProject.id,
      userId: selectedUserId,
      role: "assignee"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (projectsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

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
        <span className="text-foreground font-medium">Project Management</span>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Project Management</h1>
            <p className="text-muted-foreground">Create and manage research projects</p>
          </div>
        
        <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-project">
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <Label htmlFor="project-title">Project Title</Label>
                <Input
                  id="project-title"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Machine Learning for Health Data Analysis"
                  className="mt-2"
                  data-testid="input-project-title"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Detailed description of the research project..."
                  rows={4}
                  className="mt-2"
                  data-testid="textarea-project-description"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project-type">Project Type</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger className="mt-2" data-testid="select-project-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="analysis">Data Analysis</SelectItem>
                      <SelectItem value="publication">Publication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="mt-2" data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deadline">Deadline (Optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="mt-2"
                    data-testid="input-deadline"
                  />
                </div>
                
                <div>
                  <Label htmlFor="estimated-hours">Estimated Hours (Optional)</Label>
                  <Input
                    id="estimated-hours"
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    placeholder="120"
                    className="mt-2"
                    data-testid="input-estimated-hours"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateProject(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold">{projects?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">
                  {projects?.filter(p => p.status === 'in_progress').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {projects?.filter(p => p.status === 'completed').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects?.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {project.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {project.projectType || 'research'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${getPriorityColor('medium')}`}>
                      medium
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${getStatusColor(project.status || 'planning')}`}>
                      {project.status?.replace('_', ' ') || 'planning'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={0} className="w-16" />
                      <p className="text-xs text-muted-foreground">0%</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString() : 'No deadline'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProject(project);
                          setShowAssignDialog(true);
                        }}
                        data-testid={`button-assign-${project.id}`}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-edit-${project.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!projects || projects.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No projects yet. Create your first project to get started!</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignProject} className="space-y-4">
            <div>
              <Label>Project</Label>
              <Input
                value={selectedProject?.name || ""}
                disabled
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="assign-user">Assign to Team Member</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="mt-2" data-testid="select-assign-user">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {users?.filter(u => u.role !== 'admin' && u.role !== 'professor').map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAssignDialog(false)}
                data-testid="button-cancel-assign"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignProjectMutation.isPending}
                data-testid="button-submit-assign"
              >
                {assignProjectMutation.isPending ? "Assigning..." : "Assign Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}