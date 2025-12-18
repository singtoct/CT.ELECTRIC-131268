
import { FactoryData } from '../types';

const rawDataString = `
{
  "packing_orders": [
    {
      "id": "ord-001",
      "dueDate": "2025-07-21",
      "customerId": "cust-demo",
      "quantity": 5000,
      "stock": 0,
      "color": "สีขาว",
      "salePrice": 45.0,
      "name": "GNT เบรคเกอร์ (สีขาว)",
      "status": "In Progress",
      "lotNumber": "LOT-2025-GNT"
    }
  ],
  "molding_logs": [
    {
      "id": "log-gnt",
      "jobId": "JOB-GNT-001",
      "orderId": "ord-001",
      "productName": "GNT เบรคเกอร์ (สีขาว)",
      "productId": "gnt-breaker-01",
      "machine": "เครื่องฉีด 1",
      "quantityProduced": 0,
      "quantityRejected": 0,
      "operatorName": "---",
      "shift": "เช้า",
      "date": "2025-05-15",
      "status": "รอฉีด",
      "targetQuantity": 5000,
      "lotNumber": "LOT-2025-GNT"
    }
  ],
  "factory_machines": [
    { "id": "m1", "name": "เครื่องฉีด 1", "status": "ว่าง", "location": "Zone A", "workingHoursPerDay": 24 },
    { "id": "m2", "name": "เครื่องฉีด 2", "status": "ว่าง", "location": "Zone A", "workingHoursPerDay": 24 }
  ],
  "packing_employees": [
    { "id": "e1", "name": "อาโม", "phone": "081-111-1111", "department": "Packing", "dailyWage": 350, "hireDate": "2023-01-15", "address": "Bangkok", "status": "Active", "roleId": "r1" }
  ],
  "packing_inventory": [
    { "id": "inv-gnt", "name": "GNT เบรคเกอร์ (สีขาว)", "quantity": 0, "unit": "pcs", "source": "Produced", "category": "Finished" }
  ],
  "packing_raw_materials": [
    { 
      "id": "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0", 
      "name": "เม็ดพลาสติก ABS (เกรด GNT)", 
      "quantity": 1000, 
      "unit": "kg", 
      "costPerUnit": 45.5,
      "source": "Purchased", 
      "category": "Material" 
    },
    { 
      "id": "8daabcc1-3ee7-4be0-868c-b41c3922f26b", 
      "name": "แม่สีผสม (White GNT)", 
      "quantity": 50, 
      "unit": "kg", 
      "costPerUnit": 120.0,
      "source": "Purchased", 
      "category": "Material" 
    }
  ],
  "packing_qc_entries": [],
  "factory_products": [
    {
      "id": "gnt-breaker-01",
      "name": "GNT เบรคเกอร์ (สีขาว)",
      "category": "สินค้าเพื่อขาย",
      "standardColor": "White",
      "salePrice": 55.0,
      "bom": [
        { 
          "materialId": "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0", 
          "materialName": "เม็ดพลาสติก ABS (เกรด GNT)", 
          "quantityPerUnit": 0.045 
        },
        { 
          "materialId": "8daabcc1-3ee7-4be0-868c-b41c3922f26b", 
          "materialName": "แม่สีผสม (White GNT)", 
          "quantityPerUnit": 0.0009 
        }
      ]
    }
  ],
  "production_documents": [],
  "factory_settings": {
    "name": "CT Electric",
    "companyInfo": {
      "name": "CT Electric Co., Ltd.",
      "address": "15/16 หมู่ 9 ต.นาดี อ.เมืองสมุทรสาคร จ.สมุทรสาคร 74000",
      "taxId": "0745560001698",
      "phone": "02-123-4567",
      "email": "contact@ctelectric.com",
      "logoUrl": "https://placehold.co/200x80/e2e8f0/1e293b?text=CT+ELECTRIC"
    },
    "productionConfig": {
      "shifts": ["เช้า", "ดึก"],
      "lowStockThreshold": 1000,
      "vatRate": 7,
      "regrindPercentage": 6,
      "workingHoursPerDay": 8
    },
    "qcRejectReasons": ["สินค้าชำรุด", "รอยขีดข่วน", "สีเพี้ยน"],
    "machineStatuses": ["ทำงาน", "ว่าง", "เสีย"],
    "productionSteps": ["รอฉีด", "รอประกอบ", "รอแพค", "รอนับ", "เสร็จสิ้น"],
    "departments": ["ฝ่ายผลิต", "ฝ่ายขาย", "คลังสินค้า"],
    "overheadCosts": [],
    "machineDepreciation": []
  }
}
`;

export const getFactoryData = (): FactoryData => {
  try {
    const data = JSON.parse(rawDataString);
    return data as FactoryData;
  } catch (error) {
    return {
      packing_orders: [],
      molding_logs: [],
      packing_inventory: [],
      packing_employees: [],
      factory_machines: [],
      packing_qc_entries: [],
      packing_raw_materials: [],
      factory_products: [],
      production_documents: [],
      factory_settings: {
        name: 'CT Electric',
        companyInfo: { name: '', address: '', taxId: '', phone: '', email: '', logoUrl: '' },
        productionConfig: { shifts: [], lowStockThreshold: 0, vatRate: 0, regrindPercentage: 0, workingHoursPerDay: 8 },
        qcRejectReasons: [],
        machineStatuses: [],
        productionSteps: [],
        departments: [],
        overheadCosts: [],
        machineDepreciation: []
      }
    };
  }
};
