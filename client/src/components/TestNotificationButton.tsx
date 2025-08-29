import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bell, Zap, CheckCircle, AlertTriangle, Info } from "lucide-react";

export default function TestNotificationButton() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const sendTestNotification = async (type: string, message: string) => {
    setIsSending(true);
    try {
      await apiRequest("POST", "/api/test/notification", { type, message });
      toast({
        title: "Test Sent",
        description: "Real-time notification dispatched to all users",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    }
    setIsSending(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="h-5 w-5 mr-2" />
          Test Real-Time Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Test the real-time notification system by sending notifications to all connected users.
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isSending}
            onClick={() => sendTestNotification("success", "Great job! Project milestone completed successfully.")}
            className="text-green-600 border-green-600"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Success
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            disabled={isSending}
            onClick={() => sendTestNotification("warning", "Deadline approaching: ML Project due in 2 days.")}
            className="text-yellow-600 border-yellow-600"
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Warning
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            disabled={isSending}
            onClick={() => sendTestNotification("info", "New team member Sarah has joined the Data Analytics project.")}
            className="text-blue-600 border-blue-600"
          >
            <Info className="h-4 w-4 mr-1" />
            Info
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            disabled={isSending}
            onClick={() => sendTestNotification("error", "System maintenance scheduled for tonight at 2 AM.")}
            className="text-red-600 border-red-600"
          >
            <Bell className="h-4 w-4 mr-1" />
            Alert
          </Button>
        </div>
        
        {isSending && (
          <p className="text-xs text-muted-foreground text-center">
            Sending notification...
          </p>
        )}
      </CardContent>
    </Card>
  );
}