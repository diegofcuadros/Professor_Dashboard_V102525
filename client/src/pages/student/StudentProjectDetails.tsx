import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import TaskList from "@/components/tasks/TaskList";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function StudentProjectDetails() {
  const [match, params] = useRoute("/student/projects/:projectId");
  const projectId = match ? (params as any).projectId : "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Control active tab, allow deep-linking to #progress
  const [activeTab, setActiveTab] = useState<string>(() => {
    return window.location.hash?.replace('#', '') || 'overview';
  });
  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash?.replace('#', '') || 'overview';
      setActiveTab(hash);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: milestones } = useQuery({
    queryKey: [`/api/projects/${projectId}/milestones`],
    enabled: !!projectId,
  });

  const { data: assignments } = useQuery({
    queryKey: [`/api/assignments/user/${user?.id}`],
    enabled: !!user?.id,
  });

  // Progress logging
  let myAssignmentId: string | undefined = undefined;
  if (Array.isArray(assignments)) {
    const a = assignments.find((x: any) => x.projectId === projectId);
    myAssignmentId = a?.assignmentId || a?.id;
  }

  const [progressNotes, setProgressNotes] = useState("");
  const [progressPct, setProgressPct] = useState<number>(0);

  const logProgress = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/progress", {
        assignmentId: myAssignmentId,
        percentComplete: progressPct,
        hoursWorked: 0,
        notes: progressNotes || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Progress logged" });
      setProgressNotes("");
      setProgressPct(0);
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/progress/user/${user.id}`] });
      }
    },
  });

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{project?.name || "Project"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); window.location.hash = v; }}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="progress">Log Progress</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 pt-4">
              <div>
                <Label>Objective</Label>
                <p className="text-muted-foreground whitespace-pre-wrap">{project?.objective || "—"}</p>
              </div>
              <div>
                <Label>Success Criteria</Label>
                <p className="text-muted-foreground whitespace-pre-wrap">{project?.successCriteria || "—"}</p>
              </div>
            </TabsContent>

            <TabsContent value="milestones" className="pt-4">
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

            <TabsContent value="tasks" className="pt-4">
              <TaskList projectId={projectId} showProject={false} />
            </TabsContent>

            <TabsContent value="progress" className="space-y-3 pt-4">
              <div>
                <Label>Progress Notes</Label>
                <Textarea rows={4} value={progressNotes} onChange={(e) => setProgressNotes(e.target.value)} />
              </div>
              <div>
                <Label>Percent Complete</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progressPct}
                  onChange={(e) => setProgressPct(parseInt(e.target.value))}
                />
                <div className="text-sm text-muted-foreground">{progressPct}%</div>
              </div>
              <Button onClick={() => myAssignmentId && logProgress.mutate()} disabled={!myAssignmentId || logProgress.isPending}>
                {logProgress.isPending ? "Logging..." : "Log Progress"}
              </Button>
              {!myAssignmentId && (
                <div className="text-sm text-muted-foreground">No assignment found for this project.</div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


