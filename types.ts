
export interface BOMItem {
  materialId: string;
  materialName: string;
  quantityPerUnit: number; // e.g., 0.05 kg per 1 product unit
}

export interface Product {
  id: string;
  name: string;
  category: string;
  standardColor: string;
  salePrice: number;
  bom: BOMItem[]; 
  cycleTime?: number; // วินาที
  laborAllocation?: number; // เปอร์เซ็นต์ (0-100)
  profitMargin?: number; // เปอร์เซ็นต์กำไรที่ต้องการ
}

export interface PackingOrder {
  id: string;
  name: string;
  customerId: string;
  color: string;
  quantity: number;
  dueDate: string;
  stock?: number;
  salePrice: number;
  status?: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  quantityDelivered?: number;
  lotNumber?: string;
  docId?: string; // Link to ProductionDocument
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
  status: string; // เช่น 'รอฉีด', 'รอประกอบ', 'รอแพ็ค', 'รอ QC', 'เสร็จสิ้น'
  productId: string;
  machine: string;
  quantityProduced: number;
  targetQuantity?: number;
  priority?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  costPerUnit?: number;
  reservedQuantity?: number; // ยอดจองผลิต
  source?: 'Purchased' | 'Produced'; // แหล่งที่มา: ซื้อมา หรือ ผลิตเอง
  category?: 'Material' | 'Component' | 'Finished'; // ประเภท: วัตถุดิบหลัก, ชิ้นส่วนประกอบ, สินค้าสำเร็จรูป
}

// Added missing CostItem interface for financial settings
export interface CostItem {
  id: string;
  name: string;
  value: number;
  unit?: string;
}

// Added missing Machine interface for production monitoring
export interface Machine {
  id: string;
  name: string;
  status: string;
  location: string;
  workingHoursPerDay: number;
}

export interface FactorySettings {
  name: string; // Added missing name property
  companyInfo: {
    name: string;
    address: string;
    taxId: string;
    phone: string;
    email: string;
    logoUrl: string;
  };
  productionConfig: {
    shifts: string[]; 
    lowStockThreshold: number; 
    vatRate: number;
    regrindPercentage: number;
    workingHoursPerDay: number;
  };
  qcRejectReasons: string[];
  machineStatuses: string[];
  productionSteps: string[]; // ['รอฉีด', 'รอประกอบ', 'รอแพ็ค', 'รอ QC', 'เสร็จสิ้น']
  departments: string[];
  overheadCosts: CostItem[]; // Updated from any[] to use CostItem
  machineDepreciation: CostItem[]; // Updated from any[] to use CostItem
}

export interface ProductionDocumentItem {
    id: string;
    productId: string; // Link to Product
    productName: string;
    quantity: number;
    unit: string;
    dueDate: string;
    note?: string;
}

export interface ProductionDocument {
    id: string;
    docNumber: string;
    date: string;
    customerName: string;
    status: 'Draft' | 'Material Checking' | 'Approved' | 'In Progress' | 'Completed';
    items: ProductionDocumentItem[];
    createdBy: string;
    note?: string;
    materialShortage?: boolean; // บอกว่าวัตถุดิบพอไหม
}

export interface FactoryData {
  packing_orders: PackingOrder[];
  molding_logs: MoldingLog[];
  packing_inventory: InventoryItem[];
  factory_machines: Machine[]; // Updated from any[] to use Machine
  packing_employees: any[];
  packing_qc_entries: any[];
  packing_raw_materials: InventoryItem[];
  factory_products: Product[];
  factory_settings: FactorySettings;
  production_documents: ProductionDocument[];
}
