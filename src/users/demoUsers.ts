export type UserRole = 'Administrator' | 'Warehouse' | 'Security' | 'Warehouse manager' | 'Supplier';
export type UserStatus = 'Active' | 'Inactive';
export type AccountType = 'Internal' | 'Supplier';

export interface DemoUser {
  id: string;
  fullName: string;
  email: string;
  organization: string;
  role: UserRole;
  warehouseAccess: string;
  status: UserStatus;
  lastActive: string;
  accountType: AccountType;
}

export const demoUsers: DemoUser[] = [
  {
    id: 'u-1',
    fullName: 'Demo Administrator',
    email: 'demo@dock.local',
    organization: 'Pernod Ricard Poland',
    role: 'Administrator',
    warehouseAccess: 'All warehouses',
    status: 'Active',
    lastActive: 'Just now',
    accountType: 'Internal'
  },
  {
    id: 'u-2',
    fullName: 'Alice Smith',
    email: 'alice.smith@pr.com',
    organization: 'Pernod Ricard Poland',
    role: 'Warehouse manager',
    warehouseAccess: 'Poznań Distribution Centre',
    status: 'Active',
    lastActive: '2 hours ago',
    accountType: 'Internal'
  },
  {
    id: 'u-3',
    fullName: 'Bob Jones',
    email: 'bob.jones@pr.com',
    organization: 'Pernod Ricard Poland',
    role: 'Warehouse',
    warehouseAccess: 'Zielona Góra Plant',
    status: 'Active',
    lastActive: '1 day ago',
    accountType: 'Internal'
  },
  {
    id: 'u-4',
    fullName: 'Charlie Davis',
    email: 'cdavis@security.local',
    organization: 'Pernod Ricard Poland',
    role: 'Security',
    warehouseAccess: 'Poznań Distribution Centre',
    status: 'Inactive',
    lastActive: '2 weeks ago',
    accountType: 'Internal'
  },
  {
    id: 'u-5',
    fullName: 'Eve Northstar',
    email: 'eve@northstar-packaging.com',
    organization: 'Northstar Packaging',
    role: 'Supplier',
    warehouseAccess: 'Supplier organization only',
    status: 'Active',
    lastActive: '5 hours ago',
    accountType: 'Supplier'
  },
  {
    id: 'u-6',
    fullName: 'Frank Baltic',
    email: 'frank@balticfreight.com',
    organization: 'Baltic Freight',
    role: 'Supplier',
    warehouseAccess: 'Supplier organization only',
    status: 'Active',
    lastActive: '3 days ago',
    accountType: 'Supplier'
  },
  {
    id: 'u-7',
    fullName: 'Grace Vistula',
    email: 'grace@vistulamaterials.com',
    organization: 'Vistula Materials',
    role: 'Supplier',
    warehouseAccess: 'Supplier organization only',
    status: 'Inactive',
    lastActive: '1 month ago',
    accountType: 'Supplier'
  },
  {
    id: 'u-8',
    fullName: 'Henry Ford',
    email: 'hford@pr.com',
    organization: 'Pernod Ricard Poland',
    role: 'Warehouse',
    warehouseAccess: 'No warehouse assignment',
    status: 'Active',
    lastActive: '4 hours ago',
    accountType: 'Internal'
  }
];
