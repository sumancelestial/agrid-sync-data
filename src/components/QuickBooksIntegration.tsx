import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from './ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';

interface QuickBooksIntegrationProps {
  onCustomersSync?: () => void;
}

export function QuickBooksIntegration({ onCustomersSync }: QuickBooksIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [realmId, setRealmId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
    
    // Handle OAuth callback
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'qbo-connected') {
        await completeConnection();
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('qbo_connections')
        .select('realm_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setIsConnected(true);
        setRealmId(data.realm_id);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const completeConnection = async () => {
    try {
      const pendingData = localStorage.getItem('qbo_pending');
      if (!pendingData) return;

      const { realmId, accessToken, refreshToken, expiresIn } = JSON.parse(pendingData);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to complete the connection',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.functions.invoke('qbo-complete-connection', {
        body: { realmId, accessToken, refreshToken, expiresIn },
      });

      if (error) throw error;

      localStorage.removeItem('qbo_pending');
      setIsConnected(true);
      setRealmId(realmId);
      
      toast({
        title: 'Connected successfully',
        description: 'QuickBooks is now connected',
      });
    } catch (error) {
      console.error('Error completing connection:', error);
      toast({
        title: 'Connection failed',
        description: 'Failed to complete QuickBooks connection',
        variant: 'destructive',
      });
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to connect QuickBooks',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('qbo-oauth-init');
      
      if (error) throw error;
      if (!data?.url) throw new Error('No authorization URL received');

      // Open OAuth window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        data.url,
        'QuickBooks OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      toast({
        title: 'Connection failed',
        description: 'Failed to initiate QuickBooks connection',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      
      const { data, error } = await supabase.functions.invoke('qbo-sync-customers');
      
      if (error) throw error;
      
      toast({
        title: 'Sync complete',
        description: data.message || 'Customers synced successfully',
      });
      
      onCustomersSync?.();
    } catch (error: any) {
      console.error('Error syncing customers:', error);
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to sync customers from QuickBooks',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('qbo_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setRealmId(null);
      
      toast({
        title: 'Disconnected',
        description: 'QuickBooks has been disconnected',
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Disconnect failed',
        description: 'Failed to disconnect QuickBooks',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>QuickBooks Integration</CardTitle>
            <CardDescription>
              Connect to QuickBooks to sync customer data
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant="secondary">Connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {realmId && (
          <div className="text-sm text-muted-foreground">
            Company ID: {realmId}
          </div>
        )}
        
        <div className="flex gap-2">
          {!isConnected ? (
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect QuickBooks
            </Button>
          ) : (
            <>
              <Button onClick={handleSync} disabled={isSyncing}>
                {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isSyncing && <RefreshCw className="mr-2 h-4 w-4" />}
                Sync Customers
              </Button>
              <Button variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
