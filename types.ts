
export interface PackingOrder {
  id: string;
  name: string;
  customerId: string;
  color: string;
  quantity: number;
  dueDate: string;
  stock?: number;
  salePrice: number;
  status?: string;
  quantityDelivered?: number;
  lotNumber?: string;
}

export interface PackingLog {
  id: string;
  date: string;
  quantity: number;
  name: string;
  packerName: string;
  packingLogId?: string; // Referenced in QC
}

export interface MoldingLog {
  id: string;
  jobId: string;
  orderId: string;
  quantityRejected: number;
  operatorName: string;
  productName: string;
  shift: string;
  lotNumber: string;
  date: string;
  status: string;
  productId: string;
  machine: string;
  quantityProduced: number;
  hours?: number;
  machineId?: string;
  // New Fields for Enhanced Management
  startTime?: string;
  targetQuantity?: number;
  priority?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  costPerUnit?: number;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  department: string;
  dailyWage: number;
  hireDate: string;
  address: string;
  status: string;
  roleId: string;
  includeInWageCalculation?: boolean;
}

export interface Machine {
  id: string;
  status: string;
  workingHoursPerDay: number;
  location: string;
  name: string;
  lastStartedAt?: string;
}

export interface QcEntry {
  id: string;
  quantity: number;
  unit: string;
  lotNumber: string;
  reasons: string[];
  sourceDate: string;
  qcDate: string;
  qcInspector: string;
  productName: string;
  moldingLogId?: string;
  packingLogId?: string;
  status: string;
  orderId?: string;
  employeeName: string;
}

// --- New Settings Interfaces ---

export interface CompanyInfo {
  name: string;
  address: string;
  taxId: string;
  phone: string;
  email: string;
  logoUrl: string;
}

export interface CostItem {
  id: string;
  name: string;
  value: number;
  unit?: string; // e.g., /month, /year
}

export interface ProductionConfig {
  shifts: string[]; 
  lowStockThreshold: number; 
  vatRate: number;
  regrindPercentage: number; // New
  workingHoursPerDay: number; // New
}

export interface FactorySettings {
  name?: string; // Legacy
  companyInfo: CompanyInfo;
  productionConfig: ProductionConfig;
  
  // Dynamic Lists from UI
  qcRejectReasons: string[];
  machineStatuses: string[];
  productionSteps: string[];
  departments: string[];
  overheadCosts: CostItem[];
  machineDepreciation: CostItem[];
}

// --- NEW: Production Document Interface ---
export interface ProductionDocumentItem {
    id: string;
    productName: string;
    quantity: number;
    unit: string;
    dueDate: string;
    note?: string;
}

export interface ProductionDocument {
    id: string;
    docNumber: string; // e.g., PO-2025-001
    date: string;
    customerName: string;
    status: 'Draft' | 'Approved' | 'In Progress' | 'Completed';
    items: ProductionDocumentItem[];
    createdBy: string;
    approvedBy?: string; // Boss signature name
    note?: string;
}

export interface FactoryData {
  packing_orders: PackingOrder[];
  packing_logs: PackingLog[];
  molding_logs: MoldingLog[];
  packing_inventory: InventoryItem[];
  packing_employees: Employee[];
  factory_machines: Machine[];
  packing_qc_entries: QcEntry[];
  packing_raw_materials: InventoryItem[];
  factory_products: any[];
  factory_settings: FactorySettings;
  production_documents: ProductionDocument[]; // New Collection
}