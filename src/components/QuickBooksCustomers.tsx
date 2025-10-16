import { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import '../ag-grid-basic.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Loader2 } from 'lucide-react';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

interface QBOCustomer {
  id: string;
  qbo_id: string;
  display_name: string;
  company_name: string | null;
  given_name: string | null;
  family_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address_line1: string | null;
  billing_address_city: string | null;
  billing_address_state: string | null;
  billing_address_postal_code: string | null;
  active: boolean;
  balance: number;
  synced_at: string;
}

export function QuickBooksCustomers() {
  const [customers, setCustomers] = useState<QBOCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('qbo_customers')
        .select('*')
        .eq('user_id', user.id)
        .order('display_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const columnDefs: ColDef[] = [
    { field: 'qbo_id', headerName: 'QBO ID', sortable: true, width: 100, pinned: 'left' },
    { field: 'display_name', headerName: 'Display Name', sortable: true, width: 200 },
    { field: 'company_name', headerName: 'Company', sortable: true, width: 200 },
    { field: 'given_name', headerName: 'First Name', sortable: true, width: 150 },
    { field: 'family_name', headerName: 'Last Name', sortable: true, width: 150 },
    { field: 'email', headerName: 'Email', sortable: true, width: 250 },
    { field: 'phone', headerName: 'Phone', sortable: true, width: 180 },
    { field: 'billing_address_city', headerName: 'City', sortable: true, width: 150 },
    { field: 'billing_address_state', headerName: 'State', sortable: true, width: 100 },
    { 
      field: 'balance', 
      headerName: 'Balance', 
      sortable: true, 
      width: 130,
      valueFormatter: (params: any) => {
        return params.value ? `$${Number(params.value).toFixed(2)}` : '$0.00';
      }
    },
    { 
      field: 'active', 
      headerName: 'Status', 
      sortable: true, 
      width: 120,
      cellRenderer: (params: any) => {
        return (
          <Badge variant={params.value ? "secondary" : "outline"}>
            {params.value ? 'Active' : 'Inactive'}
          </Badge>
        );
      }
    },
    { 
      field: 'synced_at', 
      headerName: 'Last Synced', 
      sortable: true, 
      width: 180,
      valueFormatter: (params: any) => {
        return params.value ? new Date(params.value).toLocaleString() : '';
      }
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading customers...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QuickBooks Customers</CardTitle>
          <CardDescription>No customers synced yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Click "Sync Customers" above to import customers from QuickBooks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QuickBooks Customers</CardTitle>
        <CardDescription>
          {customers.length} customers synced from QuickBooks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          style={{ 
            height: '500px', 
            width: '100%'
          }}
        >
          <AgGridReact
            rowData={customers}
            columnDefs={columnDefs}
            domLayout="normal"
            suppressPaginationPanel={false}
            paginationPageSize={20}
            pagination={true}
            suppressHorizontalScroll={false}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true
            }}
            animateRows={true}
            rowSelection="multiple"
            enableRangeSelection={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}
