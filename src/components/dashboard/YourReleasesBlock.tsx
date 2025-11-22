import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ReleasesGallery from "@/components/ReleasesGallery";

interface YourReleasesBlockProps {
  userId?: string;
  onReleaseClick: (id: string) => void;
}

export const YourReleasesBlock = ({ userId, onReleaseClick }: YourReleasesBlockProps) => {
  const navigate = useNavigate();

  return (
    <Collapsible defaultOpen>
      <Card className="backdrop-blur-sm bg-card/80 border-primary/20">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 sm:pb-6 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-xl font-bold text-left">Your Releases</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-left">Manage your music distribution</CardDescription>
              </div>
              <Button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  navigate("/create-release"); 
                }} 
                className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow w-full sm:w-auto text-sm" 
                data-tutorial="create-release"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Release
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <ReleasesGallery
              userId={userId}
              onReleaseClick={onReleaseClick}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
