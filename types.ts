
// --- Base Interfaces ---

export interface PackingOrder {
  id: string;
  name: string;
  productId?: string; // Linked Product ID
  customerId: string;
  color: string;
  quantity: number;
  dueDate: string;
  stock?: number;
  salePrice: number;
  status?: string; // 'Open' | 'In Progress' | 'Completed' | 'Cancelled' | 'Ready'
  quantityDelivered?: number;
  lotNumber?: string;
  docId?: string; 
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
  targetQuantity?: number;
  priority?: number;
  hours?: number; 
  materialCost?: number;
  startTime?: string;
}

export type ISOStatus = 'Quarantine' | 'Released' | 'Hold' | 'Rejected';

export interface InventoryItem {
  id: string;
  productId?: string; // Linked Product ID if it's a finished good
  name: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
  reservedQuantity?: number;
  source?: 'Purchased' | 'Produced';
  category?: string;
  defaultSupplierId?: string;
  
  // WMS & ISO Fields
  locationId?: string; // ID of the rack/bin
  lotNumber?: string;
  receivedDate?: string;
  expiryDate?: string;
  isoStatus?: ISOStatus; // QC Status per ISO
}

export interface WarehouseLocation {
  id: string;
  name: string; // e.g., "A-01-01" (Zone-Rack-Level)
  zone: string; // "Raw Material", "Finished Goods", "Quarantine", "Structure"
  type: 'Rack' | 'Floor' | 'Bin' | 'Wall' | 'Door' | 'Obstacle';
  capacity: number; // Max capacity in kg or pallets
  description?: string;
  tags?: string[]; // e.g., ["Plastic", "Fast Moving"]
  priority?: 'High' | 'Medium' | 'Low'; 
  
  // Visual Layout Properties
  x?: number;
  y?: number;
  w?: number; // Width in px
  h?: number; // Height in px
  rotation?: number; // 0, 90, 180, 270
  color?: string; // Optional custom color
}

export interface Machine {
  id: string;
  name: string;
  status: string;
  location: string;
  workingHoursPerDay: number;
  lastStartedAt?: string;
  tonnage?: number; // New: Machine Clamping Force (Tons)
}

export interface CostItem {
  id: string;
  name: string;
  value: number;
  unit?: string;
  costPerHour?: number;
}

export interface FactorySettings {
  id: string;
  name: string;
  companyInfo: {
    name: string;
    address: string;
    taxId: string;
    phone: string;
    email: string;
    logoUrl: string;
    currentUserRoleId?: string;
  };
  productionConfig?: {
    shifts: string[]; 
    lowStockThreshold: number; 
    vatRate: number;
    regrindPercentage: number;
    workingHoursPerDay: number;
  };
  regrindPercentage?: number; // Root level in JSON
  workingHoursPerDay?: number; // Root level in JSON
  
  productionStatuses: string[];
  qcFailureReasons?: string[];
  qcRejectReasons?: string[];
  machineStatuses: string[];
  productionSteps?: string[];
  departments?: string[];
  
  // Costs can come from overheadCosts (App) or overheadItems (JSON)
  overheadCosts: CostItem[]; 
  overheadItems?: { name: string; costPerHour: number }[];
  
  machineDepreciation: CostItem[];
  depreciationItems?: { name: string; costPerHour: number }[];
  
  roles: { id: string; name: string }[];
  dashboardLayouts?: any;
  overheadRatePerHour: number;
  depreciationCostPerHour: number;
}

// --- Product & BOM ---

// Used within factory_products in the App logic
export interface BOMItem {
  materialId: string;
  materialName: string;
  quantityPerUnit: number;
}

// JSON Structure for packing_boms
export interface BOMComponent {
  quantity: number;
  rawMaterialId: string;
}

export interface PackingBOM {
  id: string;
  productId?: string; // Direct Link to Product ID
  productName: string;
  components: BOMComponent[];
}

export interface AiPriceSource {
    title: string;
    uri: string;
}

export interface AiPriceRecommendation {
    breakEvenPrice: number;
    recommendedPrice: number;
    justification: string;
    marketMinPrice?: number;
    marketMaxPrice?: number;
    sources?: AiPriceSource[];
}

export interface Product {
  id: string;
  name: string;
  color: string;
  cycleTimeSeconds: number;
  laborAllocation: number;
  createsRawMaterialId?: string;
  minTonnage?: number; // New: Minimum machine size required
  cavity?: number; // New: Number of parts per shot
  
  // Financials
  totalCost: number;
  overheadCost: number;
  laborCost: number;
  materialCost: number;
  profit: number;
  salePrice: number;
  cost?: number;
  
  productType: string;
  category?: string; 
  standardColor?: string;
  profitMargin?: number;
  
  aiPriceRecommendation?: AiPriceRecommendation;
  
  // App expects this populated, JSON might separate it
  bom?: BOMItem[]; 
}

// --- New Modules from JSON ---

export interface ProductionQueueItem {
  id: string;
  productId: string;
  productName: string;
  quantityGoal: number;
  lotNumber: string;
  machineId: string;
  priority: number;
  operatorName: string;
  quantityProduced: number;
  addedDate: string;
  status: string;
  orderId?: string;
}

export interface MaintenanceLog {
  id: string;
  technician: string;
  type: string;
  date: string;
  downtimeHours: number;
  description: string;
  machineId: string;
}

export interface FactorySupplier {
  id: string;
  phone: string;
  name: string;
  contactPerson: string;
}

export interface FactoryQuotation {
  id: string;
  rawMaterialId: string;
  supplierId: string;
  pricePerUnit: number;
  moq: number; // Minimum Order Quantity
  unit: string;
  leadTimeDays: number; // Delivery time in days
  paymentTerm: string; // e.g., "Credit 30 Days", "Cash"
  quotationDate: string;
  validUntil: string;
  note?: string;
  isPreferred?: boolean; // Mark as selected supplier
}

export interface PurchaseOrderItem {
  quantity: number;
  rawMaterialId: string;
  unitPrice: number;
}

export interface FactoryPurchaseOrder {
  id: string;
  status: string;
  poNumber: string;
  orderDate: string;
  supplierId: string;
  expectedDate: string;
  items: PurchaseOrderItem[];
  linkedProductionDocId?: string; // New: Link back to Production Doc
}

export interface FactoryCustomer {
  id: string;
  address: string;
  contactPerson: string;
  phone: string;
  name: string;
}

export interface PackingStation {
  id: string;
  status: string;
  name: string;
}

export interface PackingLog {
    id: string;
    packerName: string;
    quantity: number;
    name: string;
    date: string;
}

export interface PackingQCEntry {
    id: string;
    productName: string;
    employeeName: string;
    lotNumber: string;
    moldingLogId: string;
    sourceDate: string;
    status: string;
    orderId: string;
    unit: string;
    quantity: number;
    qcInspector?: string;
    reasons?: string[];
    qcDate?: string;
    notes?: string;
}

export interface ProductionDocumentItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    dueDate: string;
    note?: string;
    deliveredQuantity?: number; // New: Track shipping
}

export interface ProductionDocument {
    id: string;
    docNumber: string;
    date: string;
    customerName: string;
    status: string; // 'Draft', 'Approved', 'In Progress', 'Ready to Ship', 'Completed'
    items: ProductionDocumentItem[];
    createdBy: string;
    note?: string;
    materialShortage?: boolean;
    signedImageUrl?: string; 
    purchaseRequestId?: string; 
    shippingStatus?: 'Pending' | 'Ready' | 'Partial' | 'Completed'; // New
}

export interface FactoryEmployee {
    id: string;
    roleId: string;
    status: string;
    includeInWageCalculation?: boolean;
    department: string;
    dailyWage: number;
    phone: string;
    name: string;
    address: string;
    hireDate: string;
}

export interface MachineDailyLog {
  id: string;
  date: string;
  jobId: string;
  machineId: string;
  hours: number;
}

export interface FactoryComplaint {
  id: string;
  date: string;
  customerName: string;
  topic: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'High' | 'Medium' | 'Low';
  assignedEmployeeId?: string;
  resolution?: string;
  resolvedDate?: string;
}

// --- Main Data Store ---

export interface FactoryData {
  packing_orders: PackingOrder[];
  molding_logs: MoldingLog[];
  packing_inventory: InventoryItem[]; // Finished Goods
  packing_raw_materials: InventoryItem[]; // Raw Materials
  factory_machines: Machine[];
  packing_employees: FactoryEmployee[];
  packing_qc_entries: PackingQCEntry[];
  factory_products: Product[];
  factory_settings: FactorySettings;
  
  // WMS
  warehouse_locations: WarehouseLocation[];

  // JSON Specific
  packing_boms: PackingBOM[]; 
  packing_logs: PackingLog[];
  maintenance_logs: MaintenanceLog[];
  factory_suppliers: FactorySupplier[];
  factory_purchase_orders: FactoryPurchaseOrder[];
  factory_quotations?: FactoryQuotation[]; // New: RFQ
  read_notifications: { ids: string[] };
  factory_customers: FactoryCustomer[];
  factory_complaints: FactoryComplaint[];
  production_queue: ProductionQueueItem[];
  machine_daily_logs: MachineDailyLog[];
  packing_stations: PackingStation[];
  packing_queue: any[];
  
  // App Compatibility (might be derived or empty in raw JSON)
  production_documents?: ProductionDocument[];
}
