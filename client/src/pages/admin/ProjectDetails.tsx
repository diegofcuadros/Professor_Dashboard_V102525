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
import TaskList from "@/components/tasks/TaskList";

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

            <TabsContent value="overview" className="space-y-4 pt-4">
              <div>
                <Label>Objective</Label>
                <p className="text-muted-foreground whitespace-pre-wrap">{project?.objective || "—"}</p>
              </div>
              <div>
                <Label>Success Criteria</Label>
                <p className="text-muted-foreground whitespace-pre-wrap">{project?.successCriteria || "—"}</p>
              </div>
              <div>
                <Label>Deliverables</Label>
                <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-auto">{JSON.stringify(project?.deliverables || [], null, 2)}</pre>
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

            <TabsContent value="tasks" className="pt-4">
              <TaskList showProject={false} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


