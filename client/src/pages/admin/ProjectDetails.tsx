import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiRequestJson } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProjectDetails() {
  const [match, params] = useRoute("/admin/projects/:projectId");
  const projectId = match ? (params as any).projectId : "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: milestones } = useQuery({
    queryKey: [`/api/projects/${projectId}/milestones`],
    enabled: !!projectId,
  });

  const { data: assignments } = useQuery({
    queryKey: [`/api/projects/${projectId}/assignments`],
    enabled: !!projectId,
  });

  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: true,
  });

  // Project tasks (professor/admin view: all tasks in project)
  const { data: projectTasks } = useQuery({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: !!projectId,
  });

  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestoneDue, setMilestoneDue] = useState("");

  const createMilestone = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/projects/${projectId}/milestones`, {
        title: milestoneTitle,
        description: milestoneDesc || undefined,
        dueDate: milestoneDue || undefined,
        status: "planned",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      setMilestoneTitle("");
      setMilestoneDesc("");
      setMilestoneDue("");
      toast({ title: "Milestone created" });
    },
  });

  // Overview editable fields
  const [objective, setObjective] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [deliverables, setDeliverables] = useState<string>("[]");

  useEffect(() => {
    if (project) {
      setObjective(project.objective || "");
      setSuccessCriteria(project.successCriteria || "");
      setDeliverables(JSON.stringify(project.deliverables || [], null, 2));
    }
  }, [project]);

  const updateProject = useMutation({
    mutationFn: async () => {
      let parsedDeliverables: any = undefined;
      try {
        parsedDeliverables = deliverables.trim() ? JSON.parse(deliverables) : undefined;
      } catch (e) {
        // Fallback: wrap plain text as a simple list [{ title }]
        const trimmed = deliverables.trim();
        if (trimmed.length > 0) {
          parsedDeliverables = trimmed
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((title) => ({ title }));
        }
      }
      return apiRequest("PATCH", `/api/projects/${projectId}`, {
        objective: objective || undefined,
        successCriteria: successCriteria || undefined,
        deliverables: parsedDeliverables,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast({ title: "Project updated" });
    },
  });

  // Assignment management
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  const assignStudent = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/assignments", {
        userId: selectedStudent,
        projectId,
        role: "contributor",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/assignments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSelectedStudent("");
      toast({ title: "Student assigned" });
    },
  });

  const removeAssignment = useMutation({
    mutationFn: async (assignmentId: string) =>
      apiRequest("DELETE", `/api/assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/assignments`] });
      toast({ title: "Assignment removed" });
    },
  });

  // Task create/edit/delete
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");

  const createTask = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/projects/${projectId}/tasks`, {
        title: newTaskTitle,
        description: newTaskDesc || undefined,
        dueDate: newTaskDue ? new Date(newTaskDue).toISOString() : undefined,
        priority: newTaskPriority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskDue("");
      setNewTaskPriority("medium");
      toast({ title: "Task created" });
    },
  });

  const [editTaskId, setEditTaskId] = useState<string>("");
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editPriority, setEditPriority] = useState("medium");

  const startEdit = (task: any) => {
    setEditTaskId(task.id);
    setEditTitle(task.title || "");
    setEditDesc(task.description || "");
    setEditPriority(task.priority || "medium");
    setEditDue(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "");
  };

  const cancelEdit = () => {
    setEditTaskId("");
    setEditTitle("");
    setEditDesc("");
    setEditDue("");
    setEditPriority("medium");
  };

  const updateTask = useMutation({
    mutationFn: async () =>
      apiRequest("PUT", `/api/tasks/${editTaskId}`, {
        title: editTitle || undefined,
        description: editDesc || undefined,
        dueDate: editDue ? new Date(editDue).toISOString() : undefined,
        priority: editPriority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({ title: "Task updated" });
      cancelEdit();
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => apiRequest("DELETE", `/api/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/tasks`] });
      toast({ title: "Task deleted" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Project Details</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{project?.name || "Project"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Objective</Label>
                  <Textarea rows={4} value={objective} onChange={(e) => setObjective(e.target.value)} />
                </div>
                <div>
                  <Label>Success Criteria</Label>
                  <Textarea rows={4} value={successCriteria} onChange={(e) => setSuccessCriteria(e.target.value)} />
                </div>
                <div>
                  <Label>Deliverables (JSON)</Label>
                  <Textarea rows={6} value={deliverables} onChange={(e) => setDeliverables(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => updateProject.mutate()} disabled={updateProject.isPending}>
                    {updateProject.isPending ? "Saving..." : "Save Overview"}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="text-lg font-semibold">Assigned Students</h3>
                <div className="flex items-end gap-3">
                  <div className="w-80">
                    <Label>Select student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {(allUsers || [])
                          ?.filter((u: any) => u.role === 'student' && u.isActive !== false)
                          .map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.firstName || ''} {u.lastName || ''} ({u.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => selectedStudent && assignStudent.mutate()} disabled={!selectedStudent || assignStudent.isPending}>
                    {assignStudent.isPending ? 'Assigning...' : 'Assign Student'}
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned At</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(assignments || []).map((a: any) => {
                      const user = (allUsers || []).find((u: any) => u.id === a.userId);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{user ? `${user.firstName || ''} ${user.lastName || ''} (${user.email})` : a.userId}</TableCell>
                          <TableCell>{a.role || 'member'}</TableCell>
                          <TableCell>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => removeAssignment.mutate(a.id)} disabled={removeAssignment.isPending}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="milestones" className="space-y-4 pt-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!milestoneTitle.trim()) return;
                  createMilestone.mutate();
                }}
                className="grid grid-cols-3 gap-3"
              >
                <div className="col-span-1">
                  <Label>Title</Label>
                  <Input value={milestoneTitle} onChange={(e) => setMilestoneTitle(e.target.value)} />
                </div>
                <div className="col-span-1">
                  <Label>Due Date</Label>
                  <Input type="date" value={milestoneDue} onChange={(e) => setMilestoneDue(e.target.value)} />
                </div>
                <div className="col-span-3">
                  <Label>Description</Label>
                  <Textarea rows={3} value={milestoneDesc} onChange={(e) => setMilestoneDesc(e.target.value)} />
                </div>
                <div className="col-span-3 flex justify-end">
                  <Button type="submit" disabled={createMilestone.isPending}>
                    {createMilestone.isPending ? "Creating..." : "Add Milestone"}
                  </Button>
                </div>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(milestones || []).map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.title}</TableCell>
                      <TableCell>{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{m.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6 pt-4">
              {/* Create Task */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTaskTitle.trim()) return;
                  createTask.mutate();
                }}
                className="grid grid-cols-4 gap-3"
              >
                <div className="col-span-2">
                  <Label>Title</Label>
                  <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                </div>
                <div className="col-span-1">
                  <Label>Due Date</Label>
                  <Input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} />
                </div>
                <div className="col-span-1">
                  <Label>Priority</Label>
                  <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Label>Description</Label>
                  <Textarea rows={3} value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} />
                </div>
                <div className="col-span-4 flex justify-end">
                  <Button type="submit" disabled={createTask.isPending}>
                    {createTask.isPending ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </form>

              {/* Tasks List */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(projectTasks || []).map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        {editTaskId === t.id ? (
                          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                        ) : (
                          t.title
                        )}
                      </TableCell>
                      <TableCell>
                        {editTaskId === t.id ? (
                          <Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} />
                        ) : (
                          t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {editTaskId === t.id ? (
                          <Select value={editPriority} onValueChange={setEditPriority}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Priority" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          t.priority
                        )}
                      </TableCell>
                      <TableCell>{t.status || 'pending'}</TableCell>
                      <TableCell className="space-x-2">
                        {editTaskId === t.id ? (
                          <>
                            <Button size="sm" onClick={() => updateTask.mutate()} disabled={updateTask.isPending}>Save</Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => startEdit(t)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteTask.mutate(t.id)} disabled={deleteTask.isPending}>Delete</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


