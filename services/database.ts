import { FactoryData } from '../types';

const rawDataString = `
{
  "packing_orders": [
    {
      "id": "0ca4f17c-eced-4217-abd7-2db801f0d908",
      "dueDate": "2025-07-21",
      "customerId": "4c9db0db-1cf2-40f7-9dc9-f445a87e6891",
      "quantity": 21120,
      "stock": 0,
      "color": "สีขาว",
      "salePrice": 3.77,
      "name": "ฝาหน้ากาก CT A-101",
      "status": "In Progress",
      "lotNumber": "LOT-101"
    },
    {
      "id": "3166d972-599d-470c-b4e5-0796a9825715",
      "stock": 0,
      "dueDate": "2025-07-21",
      "salePrice": 3.7,
      "customerId": "4c9db0db-1cf2-40f7-9dc9-f445a87e6891",
      "quantity": 4800,
      "color": "สีขาว",
      "name": "ฝาหน้ากาก CT A-102",
      "status": "Open",
      "lotNumber": "LOT-102"
    },
    {
      "id": "order-003",
      "dueDate": "2025-11-20",
      "customerId": "cust-002",
      "quantity": 5000,
      "stock": 0,
      "color": "สีขาว",
      "salePrice": 15.0,
      "name": "บล็อคลอย CT 4x4",
      "status": "Open",
      "lotNumber": "LOT-103"
    }
  ],
  "packing_logs": [],
  "molding_logs": [
    {
      "id": "pkiPaiss3rArSomudDEg",
      "productName": "CTU ฝา NEW 4 PC (ดำใส)",
      "status": "รอแปะกันรอย",
      "machine": "เครื่องฉีด 8",
      "quantityProduced": 0,
      "productId": "n9o0p1q2-r3s4-t5u6-v7w8-x9y0z1a2b3c4",
      "lotNumber": "091268",
      "operatorName": "---ว่าง---",
      "date": "2025-12-13",
      "shift": "เช้า",
      "orderId": "Gw8WZqWqEJOXeep9nwLY",
      "jobId": "OTUZLIO0E3AtP0eZODxd",
      "quantityRejected": 0
    },
    {
      "id": "log-demo-01",
      "productName": "ฝาหน้ากาก CT A-101",
      "status": "In Progress",
      "machine": "เครื่องฉีด 1",
      "quantityProduced": 4500,
      "productId": "prod-101",
      "lotNumber": "LOT-101",
      "operatorName": "อาโม",
      "date": "2025-07-20",
      "shift": "เช้า",
      "orderId": "0ca4f17c-eced-4217-abd7-2db801f0d908",
      "jobId": "JOB-8821",
      "quantityRejected": 24
    }
  ],
  "factory_machines": [
    { "id": "m1", "name": "เครื่องฉีด 1", "status": "ทำงาน", "location": "Zone A", "workingHoursPerDay": 24 },
    { "id": "m2", "name": "เครื่องฉีด 2", "status": "หยุด", "location": "Zone A", "workingHoursPerDay": 24 },
    { "id": "m3", "name": "เครื่องฉีด 3", "status": "ทำงาน", "location": "Zone A", "workingHoursPerDay": 24 },
    { "id": "m4", "name": "เครื่องฉีด 4", "status": "ว่าง", "location": "Zone A", "workingHoursPerDay": 24 }
  ],
  "packing_employees": [
    { "id": "e1", "name": "อาโม", "phone": "081-111-1111", "department": "Packing", "dailyWage": 350, "hireDate": "2023-01-15", "address": "Bangkok", "status": "Active", "roleId": "r1" },
    { "id": "e2", "name": "สมชาย", "phone": "089-999-9999", "department": "Injection", "dailyWage": 400, "hireDate": "2022-05-10", "address": "Samut Sakhon", "status": "Active", "roleId": "r2" }
  ],
  "packing_inventory": [
    { "id": "i1", "name": "ฝาหน้ากาก CT A-101", "quantity": 15000, "unit": "pcs", "costPerUnit": 2.5 }
  ],
  "packing_raw_materials": [],
  "packing_qc_entries": [],
  "factory_products": [],
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
      "shifts": ["เช้า", "ดึก", "โอที"],
      "lowStockThreshold": 1000,
      "vatRate": 7,
      "regrindPercentage": 6,
      "workingHoursPerDay": 8
    },
    "qcRejectReasons": [
      "สินค้าชำรุด",
      "แพ็คเกจไม่สวยงาม",
      "จำนวนผิดพลาด",
      "ฉีดผนังไม่ดี",
      "ติดฉลากผิด",
      "รอยขีดข่วน",
      "สีเพี้ยน"
    ],
    "machineStatuses": [
      "ทำงาน",
      "ว่าง",
      "เสีย",
      "กำลังซ่อม",
      "รอเปลี่ยนโมลด์"
    ],
    "productionSteps": [
      "รอแปะกันรอย",
      "รอประกบ",
      "รอแพค",
      "รอนับ",
      "เสร็จสิ้น"
    ],
    "departments": [
      "ผู้จัดการโรงงาน",
      "ฝ่ายขาย",
      "ฝ่ายผลิต",
      "แพ็คกิ้ง",
      "จัดซื้อ"
    ],
    "overheadCosts": [
      { "id": "oh1", "name": "ค่าไฟ 70,000/m", "value": 31, "unit": "hr" },
      { "id": "oh2", "name": "เงินเดือนผู้จัดการ 26,000", "value": 12, "unit": "hr" },
      { "id": "oh3", "name": "ค่าน้ำ 1,000", "value": 0.5, "unit": "hr" },
      { "id": "oh4", "name": "ค่าซ่อมเครื่องจักร 5,000", "value": 3, "unit": "hr" },
      { "id": "oh5", "name": "เงินเดือนธุรการ 13390", "value": 6, "unit": "hr" }
    ],
    "machineDepreciation": [
      { "id": "md1", "name": "ค่าเสื่อม 8000000-800000/10/12/2288", "value": 11, "unit": "hr" }
    ]
  }
}
`;

export const getFactoryData = (): FactoryData => {
  try {
    const data = JSON.parse(rawDataString);
    return data as FactoryData;
  } catch (error) {
    console.error("Failed to parse factory data:", error);
    return {
      packing_orders: [],
      packing_logs: [],
      molding_logs: [],
      packing_inventory: [],
      packing_employees: [],
      factory_machines: [],
      packing_qc_entries: [],
      packing_raw_materials: [],
      factory_products: [],
      factory_settings: {
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