import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  AlertTriangle,
  Save,
  Send
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface WorkSchedule {
  id: string;
  userId: string;
  weekStartDate: string;
  totalScheduledHours: number;
  approved: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  notes?: string;
}

interface ScheduleBlock {
  id?: string;
  scheduleId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  plannedActivity: string;
  projectId?: string;
}

interface ScheduleValidation {
  isValid: boolean;
  totalHours: number;
  violations: string[];
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const LOCATIONS = ['lab', 'remote', 'library', 'office', 'field'];
const ACTIVITIES = ['research', 'analysis', 'writing', 'meeting', 'experiment', 'reading'];

export default function ScheduleSubmission() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkSchedule | null>(null);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [showAddBlock, setShowAddBlock] = useState(false);
  
  // Form states
  const [notes, setNotes] = useState("");
  const [newBlock, setNewBlock] = useState<Partial<ScheduleBlock>>({
    dayOfWeek: 'monday',
    startTime: '09:00',
    endTime: '17:00',
    location: 'lab',
    plannedActivity: 'research'
  });

  // Fetch user's schedules
  const { data: userSchedules, isLoading: schedulesLoading } = useQuery<WorkSchedule[]>({
    queryKey: [`/api/work-schedules?weekStart=${selectedWeek}`],
    retry: false,
    enabled: !!user?.id,
  });

  // Fetch schedule validation
  const { data: validation } = useQuery<ScheduleValidation>({
    queryKey: [`/api/schedule-validation/${user?.id}?weekStart=${selectedWeek}`],
    retry: false,
    enabled: !!user?.id && !!selectedWeek,
  });

  // Create schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/work-schedules", data);
    },
    onSuccess: async (res) => {
      const newSchedule: WorkSchedule = await res.json();
      toast({
        title: "Schedule Created",
        description: "Your work schedule has been saved as draft",
      });
      setShowCreateSchedule(false);
      setEditingSchedule(newSchedule);
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      // Initialize empty blocks for new schedule
      setScheduleBlocks([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create schedule",
        variant: "destructive",
      });
    },
  });

  // Create schedule block mutation
  const createBlockMutation = useMutation({
    mutationFn: async ({ scheduleId, blockData }: { scheduleId: string; blockData: any }) => {
      return await apiRequest("POST", `/api/work-schedules/${scheduleId}/blocks`, blockData);
    },
    onSuccess: () => {
      toast({
        title: "Block Added",
        description: "Schedule block has been added successfully",
      });
      setShowAddBlock(false);
      resetBlockForm();
      // Refresh schedule blocks and validation
      if (editingSchedule) {
        refetchBlocks();
        queryClient.invalidateQueries({ queryKey: ["/api/schedule-validation"] });
        queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add schedule block",
        variant: "destructive",
      });
    },
  });

  // Submit schedule mutation
  const submitScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      return await apiRequest("PUT", `/api/work-schedules/${scheduleId}/submit`, {});
    },
    onSuccess: () => {
      toast({
        title: "Schedule Submitted",
        description: "Your schedule has been submitted for approval",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit schedule",
        variant: "destructive",
      });
    },
  });

  const refetchBlocks = async () => {
    if (editingSchedule) {
      try {
        const res = await apiRequest("GET", `/api/work-schedules/${editingSchedule.id}/blocks`);
        const blocks: ScheduleBlock[] = await res.json();
        setScheduleBlocks(blocks);
      } catch (error) {
        console.error("Failed to fetch schedule blocks:", error);
      }
    }
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    
    const scheduleData = {
      weekStartDate: selectedWeek,
      totalScheduledHours: 0, // Will be calculated from blocks
      status: 'draft',
      notes: notes.trim() || null,
    };

    createScheduleMutation.mutate(scheduleData);
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSchedule) {
      toast({
        title: "No Schedule Selected",
        description: "Please create or select a schedule first",
        variant: "destructive",
      });
      return;
    }

    if (!newBlock.dayOfWeek || !newBlock.startTime || !newBlock.endTime || !newBlock.location || !newBlock.plannedActivity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const duration = calculateDuration(newBlock.startTime!, newBlock.endTime!);
    if (duration <= 0) {
      toast({
        title: "Invalid Time",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    createBlockMutation.mutate({
      scheduleId: editingSchedule.id,
      blockData: {
        ...newBlock,
        scheduleId: editingSchedule.id,
      }
    });
  };

  const resetBlockForm = () => {
    setNewBlock({
      dayOfWeek: 'monday',
      startTime: '09:00',
      endTime: '17:00',
      location: 'lab',
      plannedActivity: 'research'
    });
  };

  const handleSubmitSchedule = () => {
    if (!currentSchedule) return;
    
    if (!isMinimumHoursMet || !validation?.isValid) {
      toast({
        title: "Cannot Submit",
        description: "Please fix all schedule issues before submitting",
        variant: "destructive",
      });
      return;
    }
    
    submitScheduleMutation.mutate(currentSchedule.id);
  };

  const calculateTotalHours = (blocks: ScheduleBlock[]) => {
    return blocks.reduce((total, block) => {
      return total + calculateDuration(block.startTime, block.endTime);
    }, 0);
  };

  const getStatusBadge = (status: string, approved?: boolean) => {
    if (approved) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Pending Approval</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
  };

  const currentSchedule = userSchedules?.[0];
  const isMinimumHoursMet = validation?.totalHours >= 20;

  // Fetch schedule blocks when current schedule changes
  useEffect(() => {
    if (currentSchedule) {
      setEditingSchedule(currentSchedule);
      // Fetch blocks directly for this schedule
      const fetchBlocks = async () => {
        try {
          const res = await apiRequest("GET", `/api/work-schedules/${currentSchedule.id}/blocks`);
          const blocks: ScheduleBlock[] = await res.json();
          setScheduleBlocks(blocks);
        } catch (error) {
          console.error("Failed to fetch schedule blocks:", error);
          setScheduleBlocks([]);
        }
      };
      fetchBlocks();
    }
  }, [currentSchedule?.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Weekly Schedule</h2>
          <p className="text-muted-foreground">
            Submit your 20+ hour weekly schedule for approval
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={getCurrentWeek()}>This Week</SelectItem>
              <SelectItem value={getNextWeek()}>Next Week</SelectItem>
              <SelectItem value={getWeekAfter()}>Week After</SelectItem>
            </SelectContent>
          </Select>
          
          {!currentSchedule && (
            <Dialog open={showCreateSchedule} onOpenChange={setShowCreateSchedule}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Weekly Schedule</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSchedule} className="space-y-4">
                  <div>
                    <Label htmlFor="week-date">Week Starting</Label>
                    <Input
                      id="week-date"
                      type="date"
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="mt-2"
                      disabled
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional notes about your schedule..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateSchedule(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createScheduleMutation.isPending}
                    >
                      {createScheduleMutation.isPending ? "Creating..." : "Create Schedule"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Schedule Status & Validation */}
      {validation && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Schedule Status</h3>
              {currentSchedule && getStatusBadge(currentSchedule.status, currentSchedule.approved)}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  <strong>{validation.totalHours}</strong> hours scheduled
                  {validation.totalHours === 0 && scheduleBlocks.length === 0 && (
                    <span className="text-red-600 ml-2">(Add schedule blocks to get started)</span>
                  )}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {isMinimumHoursMet ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  {isMinimumHoursMet ? "Minimum hours met" : "Need 20+ hours"}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {validation.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  {validation.isValid ? "Schedule valid" : "Has issues"}
                </span>
              </div>
            </div>
            
            {validation.violations.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Schedule Issues:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {validation.violations.map((violation, index) => (
                    <li key={index}>• {violation}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Schedule */}
      {currentSchedule && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Week of {new Date(currentSchedule.weekStartDate).toLocaleDateString()}
              </CardTitle>
              <div className="flex space-x-2">
                {currentSchedule.status === 'draft' && (
                  <>
                    <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Block
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Schedule Block</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddBlock} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Day of Week</Label>
                              <Select 
                                value={newBlock.dayOfWeek} 
                                onValueChange={(value) => setNewBlock({...newBlock, dayOfWeek: value})}
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DAYS_OF_WEEK.map(day => (
                                    <SelectItem key={day} value={day}>
                                      {day.charAt(0).toUpperCase() + day.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Location</Label>
                              <Select 
                                value={newBlock.location} 
                                onValueChange={(value) => setNewBlock({...newBlock, location: value})}
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LOCATIONS.map(location => (
                                    <SelectItem key={location} value={location}>
                                      {location.charAt(0).toUpperCase() + location.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Start Time</Label>
                              <Input
                                type="time"
                                value={newBlock.startTime}
                                onChange={(e) => setNewBlock({...newBlock, startTime: e.target.value})}
                                className="mt-2"
                              />
                            </div>
                            
                            <div>
                              <Label>End Time</Label>
                              <Input
                                type="time"
                                value={newBlock.endTime}
                                onChange={(e) => setNewBlock({...newBlock, endTime: e.target.value})}
                                className="mt-2"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label>Planned Activity</Label>
                            <Select 
                              value={newBlock.plannedActivity} 
                              onValueChange={(value) => setNewBlock({...newBlock, plannedActivity: value})}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTIVITIES.map(activity => (
                                  <SelectItem key={activity} value={activity}>
                                    {activity.charAt(0).toUpperCase() + activity.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex justify-end space-x-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddBlock(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createBlockMutation.isPending}
                            >
                              {createBlockMutation.isPending ? "Adding..." : "Add Block"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={handleSubmitSchedule}
                      disabled={submitScheduleMutation.isPending || !validation?.isValid || !isMinimumHoursMet}
                      title={
                        !validation?.isValid ? "Schedule has validation issues" :
                        !isMinimumHoursMet ? "Need at least 20 hours scheduled" :
                        "Ready to submit"
                      }
                    >
                      <Send className="h-3 w-3 mr-1" />
                      {submitScheduleMutation.isPending ? "Submitting..." : "Submit for Approval"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduleBlocks.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Day</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scheduleBlocks.map((block, index) => (
                        <TableRow key={block.id || index}>
                          <TableCell className="capitalize">{block.dayOfWeek}</TableCell>
                          <TableCell>{block.startTime} - {block.endTime}</TableCell>
                          <TableCell>{calculateDuration(block.startTime, block.endTime).toFixed(1)}h</TableCell>
                          <TableCell className="capitalize">{block.location}</TableCell>
                          <TableCell className="capitalize">{block.plannedActivity}</TableCell>
                          <TableCell>
                            {currentSchedule?.status === 'draft' && (
                              <div className="flex space-x-1">
                                <Button size="sm" variant="outline">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No schedule blocks added yet</p>
                  <p className="text-sm">Add time blocks to build your weekly schedule</p>
                  {currentSchedule?.status === 'draft' && (
                    <p className="text-sm text-orange-600 mt-2">
                      <strong>Note:</strong> You need at least 20 hours of schedule blocks to submit for approval
                    </p>
                  )}
                </div>
              )}
              
              {currentSchedule.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Notes:</h4>
                  <p className="text-sm text-muted-foreground">{currentSchedule.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!currentSchedule && !schedulesLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Schedule for This Week</h3>
            <p className="text-muted-foreground mb-4">
              Create your weekly schedule to meet the 20-hour minimum requirement
            </p>
            <Button onClick={() => setShowCreateSchedule(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Weekly Schedule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper functions
function getCurrentWeek(): string {
  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  return monday.toISOString().split('T')[0];
}

function getNextWeek(): string {
  const today = new Date();
  const nextWeek = new Date(today.setDate(today.getDate() + 7));
  const monday = new Date(nextWeek.setDate(nextWeek.getDate() - nextWeek.getDay() + 1));
  return monday.toISOString().split('T')[0];
}

function getWeekAfter(): string {
  const today = new Date();
  const weekAfter = new Date(today.setDate(today.getDate() + 14));
  const monday = new Date(weekAfter.setDate(weekAfter.getDate() - weekAfter.getDay() + 1));
  return monday.toISOString().split('T')[0];
}

function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  return (endTotalMinutes - startTotalMinutes) / 60;
}