import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "wouter";
import ExternalIntegrations from "@/components/ExternalIntegrations";

export default function IntegrationsPage() {
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
        <span className="text-foreground font-medium">Integrations</span>
      </div>

      {/* Main Content */}
      <ExternalIntegrations />
    </div>
  );
}