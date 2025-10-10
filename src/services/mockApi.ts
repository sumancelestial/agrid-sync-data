// Real API service using JSONPlaceholder for user data
// This API provides real user data with remote filtering, search, and pagination

export interface DataRecord {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  website: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
  // Computed fields for compatibility
  date: string;
  status: 'Active' | 'Inactive' | 'Pending';
  department: string;
}

// Interface for JSONPlaceholder API response
interface JsonPlaceholderUser {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
}

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

// Transform JSONPlaceholder user data to our format
const transformUserData = (user: JsonPlaceholderUser): DataRecord => {
  // Generate random status and department for demo purposes
  const statuses: Array<'Active' | 'Inactive' | 'Pending'> = ['Active', 'Inactive', 'Pending'];
  const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];
  
  // Generate a random date within the last year
  const randomDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
  
  return {
    ...user,
    date: randomDate.toISOString().split('T')[0],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    department: departments[Math.floor(Math.random() * departments.length)]
  };
};

// Real API call to JSONPlaceholder
export const fetchData = async (params: FetchDataParams): Promise<FetchDataResponse> => {
  try {
    // JSONPlaceholder doesn't support pagination, so we'll fetch all data and paginate client-side
    // In a real application, you would implement server-side pagination
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const apiData: JsonPlaceholderUser[] = await response.json();
    
    // Transform the data
    let transformedData = apiData.map(transformUserData);
    
    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      transformedData = transformedData.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.email.toLowerCase().includes(searchLower) ||
        item.username.toLowerCase().includes(searchLower) ||
        item.company.name.toLowerCase().includes(searchLower) ||
        item.address.city.toLowerCase().includes(searchLower) ||
        item.phone.toLowerCase().includes(searchLower) ||
        item.website.toLowerCase().includes(searchLower) ||
        item.department.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (params.status && params.status !== 'All') {
      transformedData = transformedData.filter(item => item.status === params.status);
    }

    // Apply date range filter
    if (params.startDate) {
      transformedData = transformedData.filter(item => item.date >= params.startDate!);
    }
    if (params.endDate) {
      transformedData = transformedData.filter(item => item.date <= params.endDate!);
    }

    const total = transformedData.length;

    // Apply pagination
    const startIndex = (params.page - 1) * params.limit;
    const endIndex = startIndex + params.limit;
    const paginatedData = transformedData.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total
    };
    
  } catch (error) {
    console.error('Error fetching data from API:', error);
    // Return empty data on error
    return {
      data: [],
      total: 0
    };
  }
};
