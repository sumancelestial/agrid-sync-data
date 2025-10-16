import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@/components/DataGrid';
import { QuickBooksIntegration } from '@/components/QuickBooksIntegration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickBooksCustomers } from '@/components/QuickBooksCustomers';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { LogOut } from 'lucide-react';

const Index = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleCustomersSync = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out',
    });
  };

  if (!user) {
    return null; // Show nothing while redirecting
  }

  return (
    <div className="w-full min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Data Management System</h1>
            <p className="text-muted-foreground">Manage your data and QuickBooks integrations</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="data-grid" className="w-full">
          <TabsList>
            <TabsTrigger value="data-grid">Data Grid</TabsTrigger>
            <TabsTrigger value="quickbooks">QuickBooks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="data-grid" className="mt-6">
            <DataGrid />
          </TabsContent>
          
          <TabsContent value="quickbooks" className="mt-6 space-y-6">
            <QuickBooksIntegration onCustomersSync={handleCustomersSync} />
            <QuickBooksCustomers key={refreshKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
