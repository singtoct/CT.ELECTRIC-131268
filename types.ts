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

export interface FactoryData {
  packing_orders: PackingOrder[];
  packing_logs: PackingLog[];
  molding_logs: MoldingLog[];
  packing_inventory: InventoryItem[];
  packing_employees: Employee[];
  factory_machines: Machine[];
  packing_qc_entries: QcEntry[];
  packing_raw_materials: InventoryItem[];
  factory_products: any[]; // Simplified for brevity
  factory_settings: any;
}
