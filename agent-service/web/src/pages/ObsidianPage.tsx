import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function ObsidianPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Obsidian</h1>
        <p className="text-muted-foreground">Obsidian configuration and settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Obsidian vault configuration and management features will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
