// Mock API service that simulates backend calls
// Replace this with real API calls to your Node.js backend

export interface DataRecord {
  id: number;
  name: string;
  date: string;
  status: 'Active' | 'Inactive' | 'Pending';
  email: string;
  department: string;
}

// Mock data generator
const generateMockData = (): DataRecord[] => {
  const statuses: Array<'Active' | 'Inactive' | 'Pending'> = ['Active', 'Inactive', 'Pending'];
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];
  const names = [
    'John Smith', 'Emma Johnson', 'Michael Brown', 'Sarah Davis', 'James Wilson',
    'Lisa Anderson', 'David Taylor', 'Jennifer Martinez', 'Robert Thomas', 'Mary Garcia',
    'William Rodriguez', 'Patricia Lopez', 'Richard Lee', 'Linda Walker', 'Joseph Hall',
    'Barbara Allen', 'Thomas Young', 'Nancy King', 'Christopher Wright', 'Karen Scott'
  ];

  const data: DataRecord[] = [];
  for (let i = 1; i <= 100; i++) {
    const randomDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    data.push({
      id: i,
      name: names[Math.floor(Math.random() * names.length)],
      date: randomDate.toISOString().split('T')[0],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      email: `user${i}@example.com`,
      department: departments[Math.floor(Math.random() * departments.length)]
    });
  }
  return data;
};

const mockData = generateMockData();

export interface FetchDataParams {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export interface FetchDataResponse {
  data: DataRecord[];
  total: number;
}

// Simulated API call with delay
export const fetchData = async (params: FetchDataParams): Promise<FetchDataResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  let filteredData = [...mockData];

  // Apply search filter
  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filteredData = filteredData.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      item.email.toLowerCase().includes(searchLower) ||
      item.department.toLowerCase().includes(searchLower)
    );
  }

  // Apply status filter
  if (params.status && params.status !== 'All') {
    filteredData = filteredData.filter(item => item.status === params.status);
  }

  // Apply date range filter
  if (params.startDate) {
    filteredData = filteredData.filter(item => item.date >= params.startDate!);
  }
  if (params.endDate) {
    filteredData = filteredData.filter(item => item.date <= params.endDate!);
  }

  const total = filteredData.length;

  // Apply pagination
  const startIndex = (params.page - 1) * params.limit;
  const endIndex = startIndex + params.limit;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    total
  };
};
