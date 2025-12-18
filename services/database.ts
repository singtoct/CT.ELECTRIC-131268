
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
      "name": "ชุดโคมไฟสำเร็จรูป CT-01",
      "status": "In Progress",
      "lotNumber": "LOT-2025-001"
    }
  ],
  "molding_logs": [
    {
      "id": "log-demo",
      "jobId": "JOB-INJ-001",
      "orderId": "ord-001",
      "productName": "ฝาครอบโคม (Internal Part)",
      "productId": "prod-sub-01",
      "machine": "เครื่องฉีด 1",
      "quantityProduced": 1200,
      "quantityRejected": 5,
      "operatorName": "อาโม",
      "shift": "เช้า",
      "date": "2025-05-15",
      "status": "รอนับ",
      "targetQuantity": 5000,
      "lotNumber": "LOT-2025-001"
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
    { "id": "i1", "name": "ชุดโคมไฟสำเร็จรูป CT-01", "quantity": 100, "unit": "pcs", "source": "Produced", "category": "Finished" }
  ],
  "packing_raw_materials": [
    { "id": "raw-001", "name": "เม็ดพลาสติก ABS เกรด A", "quantity": 500, "unit": "kg", "source": "Purchased", "category": "Material" },
    { "id": "raw-comp-01", "name": "ฝาครอบโคม (Internal Part)", "quantity": 0, "unit": "pcs", "source": "Produced", "category": "Component" }
  ],
  "packing_qc_entries": [],
  "factory_products": [
    {
      "id": "prod-main-01",
      "name": "ชุดโคมไฟสำเร็จรูป CT-01",
      "category": "Assembly",
      "standardColor": "White",
      "salePrice": 45.0,
      "bom": [
        { "materialId": "raw-comp-01", "materialName": "ฝาครอบโคม (Internal Part)", "quantityPerUnit": 1 },
        { "materialId": "raw-001", "materialName": "เม็ดพลาสติก ABS (ส่วนฐาน)", "quantityPerUnit": 0.02 }
      ]
    },
    {
      "id": "prod-sub-01",
      "name": "ฝาครอบโคม (Internal Part)",
      "category": "Injection",
      "standardColor": "Clear",
      "salePrice": 0,
      "bom": [
        { "materialId": "raw-001", "materialName": "เม็ดพลาสติก ABS เกรด A", "quantityPerUnit": 0.045 }
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
