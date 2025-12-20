import { FactoryData, Product, BOMItem, PackingBOM, InventoryItem, FactorySettings } from '../types';

const defaultSettings: FactorySettings = {
  id: 'main',
  name: 'CT Electric',
  companyInfo: {
    name: 'CT Electric Factory',
    address: '123 Factory Road',
    taxId: '1234567890123',
    phone: '02-123-4567',
    email: 'admin@ctelectric.com',
    logoUrl: ''
  },
  productionConfig: {
    shifts: ['เช้า', 'ดึก'],
    lowStockThreshold: 100,
    vatRate: 7,
    regrindPercentage: 0,
    workingHoursPerDay: 8
  },
  productionStatuses: ['รอฉีด', 'รอประกบ', 'รอแพค', 'รอนับ', 'เสร็จสิ้น'],
  machineStatuses: ['ว่าง', 'ทำงาน', 'เสีย', 'ซ่อมบำรุง'],
  overheadCosts: [],
  machineDepreciation: [],
  roles: [],
  overheadRatePerHour: 0,
  depreciationCostPerHour: 0,
  productionSteps: ['รอฉีด', 'รอประกบ', 'รอแพค', 'รอนับ', 'เสร็จสิ้น'],
  departments: ['ฝ่ายผลิต', 'ฝ่ายแพค', 'คลังสินค้า', 'จัดส่ง']
};

// Full Dataset with Fixed IDs matching JSON Source
const rawJsonData: any = {
  "packing_orders": [
    {
      "id": "0ca4f17c-eced-4217-abd7-2db801f0d908",
      "quantity": 21120,
      "color": "สีขาว",
      "dueDate": "2025-07-21",
      "salePrice": 3.77,
      "customerId": "4c9db0db-1cf2-40f7-9dc9-f445a87e6891", // Links to factory_customers below
      "stock": 0,
      "name": "ฝาหน้ากาก CT A-101"
    },
    {
      "id": "3166d972-599d-470c-b4e5-0796a9825715",
      "name": "ฝาหน้ากาก CT A-102",
      "stock": 0,
      "color": "สีขาว",
      "customerId": "4c9db0db-1cf2-40f7-9dc9-f445a87e6891",
      "salePrice": 3.7,
      "dueDate": "2025-07-21",
      "quantity": 4800
    },
    {
      "id": "334ae6a2-4657-4726-b812-50606dcfd533",
      "color": "สีขาว",
      "salePrice": 0,
      "dueDate": "2025-07-21",
      "quantity": 4800,
      "name": "ฝาตะแกรง 1022"
    },
    {
      "id": "4f74dd86-0df1-4077-aada-fe9529d046c6",
      "salePrice": 0.48,
      "name": "CPS-113 ชุดขาล็อคฝาครอบ",
      "color": "สีขาว",
      "quantity": 87500,
      "dueDate": "2025-07-21"
    }
  ],
  // Explicit Customer Data to match IDs in Orders
  "factory_customers": [
      {
          "id": "4c9db0db-1cf2-40f7-9dc9-f445a87e6891",
          "name": "ร้านอุปกรณ์ไฟฟ้า (ทั่วไป)",
          "contactPerson": "คุณสมชาย",
          "phone": "081-234-5678",
          "address": "กรุงเทพมหานคร"
      }
  ],
  // Explicit Raw Materials with JSON IDs
  "raw_materials": [
      { 
          "id": "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0", // ID from your JSON
          "name": "เม็ดพลาสติก PP (ตัวอย่าง)", 
          "quantity": 5000, 
          "unit": "kg", 
          "costPerUnit": 45 
      },
      { 
          "id": "rm-poly-black-001", 
          "name": "เม็ดพลาสติก PP (ดำ)", 
          "quantity": 2000, 
          "unit": "kg", 
          "costPerUnit": 42 
      },
      { 
          "id": "rm-screw-001", 
          "name": "สกรูกล่อง", 
          "quantity": 10000, 
          "unit": "ตัว", 
          "costPerUnit": 0.5 
      }
  ],
  // Explicit Products so IDs are stable
  "factory_products": [
      {
          "id": "prod-a101-fixed-id",
          "name": "ฝาหน้ากาก CT A-101",
          "color": "สีขาว",
          "salePrice": 3.77,
          "category": "สินค้าเพื่อขาย",
          "productType": "Finished Good",
          "standardColor": "สีขาว",
          "cycleTimeSeconds": 15,
          "laborAllocation": 100,
          "profitMargin": 30,
          "totalCost": 0,
          "overheadCost": 0,
          "laborCost": 0,
          "materialCost": 0,
          "profit": 0,
          "bom": [] // Will be hydrated below
      },
      {
          "id": "prod-a102-fixed-id",
          "name": "ฝาหน้ากาก CT A-102",
          "color": "สีขาว",
          "salePrice": 3.70,
          "category": "สินค้าเพื่อขาย",
          "productType": "Finished Good",
          "standardColor": "สีขาว",
          "cycleTimeSeconds": 18,
          "laborAllocation": 100,
          "profitMargin": 30,
          "totalCost": 0,
          "overheadCost": 0,
          "laborCost": 0,
          "materialCost": 0,
          "profit": 0,
          "bom": []
      }
  ],
  // BOMs linking Product Names to Raw Material IDs
  "packing_boms": [
      {
          "id": "bom-001",
          "productName": "ฝาหน้ากาก CT A-101",
          "components": [
              { "rawMaterialId": "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0", "quantity": 0.05 } // 50g per unit
          ]
      }
  ],
  "packing_logs": [],
  "molding_logs": [],
  "packing_inventory": [],
  "packing_raw_materials": [], // Will be filled from raw_materials
  "factory_machines": [
      { id: "m1", name: "เครื่องฉีด 1", status: "ว่าง", location: "Zone A", workingHoursPerDay: 24 },
      { id: "m2", name: "เครื่องฉีด 2", status: "ว่าง", location: "Zone A", workingHoursPerDay: 24 },
      { id: "m3", name: "เครื่องฉีด 3", status: "ว่าง", location: "Zone A", workingHoursPerDay: 24 },
      { id: "m4", name: "เครื่องฉีด 4", status: "ว่าง", location: "Zone A", workingHoursPerDay: 24 },
      { id: "m5", name: "เครื่องฉีด 5", status: "ว่าง", location: "Zone A", workingHoursPerDay: 24 },
      { id: "m6", name: "เครื่องฉีด 6", status: "ว่าง", location: "Zone B", workingHoursPerDay: 24 },
      { id: "m7", name: "เครื่องฉีด 7", status: "ว่าง", location: "Zone B", workingHoursPerDay: 24 },
      { id: "m8", name: "เครื่องฉีด 8", status: "ว่าง", location: "Zone B", workingHoursPerDay: 24 },
  ],
  "packing_employees": [
      { id: "e1", name: "อาโม", department: "ฝ่ายแพค", status: "Active", dailyWage: 350, hireDate: "2024-01-01", roleId: "packer", phone: "", address: "" },
      { id: "e2", name: "อาต่อ", department: "ฝ่ายแพค", status: "Active", dailyWage: 350, hireDate: "2024-01-01", roleId: "packer", phone: "", address: "" },
      { id: "e3", name: "อาฮิน", department: "ฝ่ายผลิต", status: "Active", dailyWage: 400, hireDate: "2024-01-01", roleId: "operator", phone: "", address: "" },
      { id: "e4", name: "อามี", department: "ฝ่ายผลิต", status: "Active", dailyWage: 400, hireDate: "2024-01-01", roleId: "operator", phone: "", address: "" },
      { id: "e5", name: "ตะเล็ก", department: "ฝ่ายผลิต", status: "Active", dailyWage: 400, hireDate: "2024-01-01", roleId: "operator", phone: "", address: "" },
  ],
  "packing_qc_entries": [],
  "factory_settings": defaultSettings,
  "production_documents": []
};

export const getFactoryData = (): FactoryData => {
    // Clone raw data
    const data = JSON.parse(JSON.stringify(rawJsonData)) as FactoryData;
    const rawAny = rawJsonData as any;
    
    // --- 1. MIGRATION: Fix 'raw_materials' naming mismatch AND PRESERVE IDs ---
    // If JSON has 'raw_materials' but 'packing_raw_materials' is empty, move the data over.
    if (rawAny.raw_materials && Array.isArray(rawAny.raw_materials)) {
        if (!data.packing_raw_materials || data.packing_raw_materials.length === 0) {
            data.packing_raw_materials = rawAny.raw_materials.map((m: any) => ({
                id: m.id, // KEEP THE ORIGINAL ID FROM JSON
                name: m.name,
                quantity: m.quantity || 0,
                unit: m.unit || 'kg',
                costPerUnit: m.costPerUnit || 0,
                category: 'Material', 
                source: 'Purchased'
            }));
        }
    }

    // Ensure all critical arrays exist (Safety Check)
    if(!data.packing_inventory) data.packing_inventory = [];
    if(!data.packing_raw_materials) data.packing_raw_materials = [];
    if(!data.factory_products) data.factory_products = [];
    if(!data.packing_boms) data.packing_boms = [];
    if(!data.factory_machines) data.factory_machines = [];
    if(!data.factory_settings) data.factory_settings = defaultSettings;
    if(!data.molding_logs) data.molding_logs = [];
    if(!data.packing_orders) data.packing_orders = [];
    if(!data.factory_customers) data.factory_customers = [];

    // --- 2. HYDRATION: Link Products from Orders (Only if missing) ---
    // This logic now runs ONLY for products NOT already defined in factory_products
    if (data.packing_orders.length > 0) {
        data.packing_orders.forEach(order => {
            const existingProduct = data.factory_products.find(p => p.name === order.name);
            if (!existingProduct) {
                // Only generate if not found in JSON
                data.factory_products.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: order.name,
                    color: order.color || 'N/A',
                    salePrice: order.salePrice || 0,
                    category: 'สินค้าเพื่อขาย',
                    standardColor: order.color || 'N/A',
                    totalCost: 0,
                    overheadCost: 0,
                    laborCost: 0,
                    materialCost: 0,
                    profit: 0,
                    cycleTimeSeconds: 15,
                    laborAllocation: 100,
                    productType: 'Finished Good',
                    bom: []
                });
            }
        });
    }

    // --- 3. HYDRATION: Link BOMs to Products ---
    if (data.packing_boms && data.factory_products.length > 0) {
        data.factory_products = data.factory_products.map(product => {
            const relatedBom = data.packing_boms.find(b => b.productName === product.name);
            if (relatedBom) {
                const appBom: BOMItem[] = relatedBom.components.map(comp => {
                    // Match using the Preserved ID
                    const material = data.packing_raw_materials.find(m => m.id === comp.rawMaterialId);
                    return {
                        materialId: comp.rawMaterialId,
                        materialName: material ? material.name : 'Unknown Material (' + comp.rawMaterialId + ')',
                        quantityPerUnit: comp.quantity
                    };
                });
                return { ...product, bom: appBom };
            }
            return product;
        });
    }

    return data;
};