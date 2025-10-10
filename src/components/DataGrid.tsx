import { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import '../ag-grid-basic.css';

import { fetchData, DataRecord, FetchDataParams } from '@/services/mockApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community'
ModuleRegistry.registerModules([AllCommunityModule]);


export const DataGrid = () => {
  const [rowData, setRowData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  // Pagination states
  const [page, setPage] = useState(1);
  const limit = 15; // Increased for better demonstration

  const columnDefs: ColDef[] = [
    { field: 'id', headerName: 'ID', sortable: true, width: 80, pinned: 'left' },
    { field: 'name', headerName: 'Full Name', sortable: true, width: 200 },
    { field: 'username', headerName: 'Username', sortable: true, width: 150 },
    { field: 'email', headerName: 'Email', sortable: true, width: 250 },
    { field: 'phone', headerName: 'Phone', sortable: true, width: 180 },
    { field: 'website', headerName: 'Website', sortable: true, width: 200 },
    { 
      field: 'address', 
      headerName: 'City', 
      sortable: true, 
      width: 150,
      valueGetter: (params: any) => params.data.address.city
    },
    { 
      field: 'company', 
      headerName: 'Company', 
      sortable: true, 
      width: 200,
      valueGetter: (params: any) => params.data.company.name
    },
    { field: 'department', headerName: 'Department', sortable: true, width: 150 },
    { field: 'date', headerName: 'Join Date', sortable: true, width: 130 },
    { 
      field: 'status', 
      headerName: 'Status', 
      sortable: true, 
      width: 130,
      cellRenderer: (params: any) => {
        const statusColors: Record<string, string> = {
          Active: 'bg-green-100 text-green-800 border-green-200',
          Inactive: 'bg-gray-100 text-gray-800 border-gray-200',
          Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[params.value] || ''}`}>
            {params.value}
          </span>
        );
      }
    },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: FetchDataParams = {
        search,
        status: status === 'All' ? undefined : status,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        page,
        limit
      };
      
      const response = await fetchData(params);
      setRowData(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [search, status, startDate, endDate, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on filter change
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    setPage(1);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('All');
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="w-full h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Data Grid Management</h1>
          <p className="text-muted-foreground">Filter and manage your data with advanced search capabilities</p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Filters</h2>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, username, company, city..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">Status</label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div 
            style={{ 
              height: '500px', 
              width: '100%'
            }}
          >
            {loading && (
              <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <div className="text-sm text-muted-foreground">
                  🌐 Loading data from remote API...
                </div>
              </div>
            )}
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              domLayout="normal"
              suppressPaginationPanel={true}
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

          {/* Pagination */}
          <div className="border-t border-border p-4 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-sm text-muted-foreground">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
              </div>
              <div className="text-xs text-muted-foreground">
                🌐 Remote API • Server-side pagination • {limit} records per page • Page {page} of {totalPages}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
