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
      "status": "Open"
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
      "status": "Open"
    },
    {
      "id": "334ae6a2-4657-4726-b812-50606dcfd533",
      "name": "ฝาตะแกรง 1022",
      "color": "สีขาว",
      "quantity": 4800,
      "dueDate": "2025-07-21",
      "salePrice": 0,
      "status": "Open"
    },
    {
      "id": "BrLHa2KvzUjdkMV8Msmd",
      "status": "Completed",
      "quantityDelivered": 1000,
      "quantity": 1000,
      "color": "ดำใส",
      "lotNumber": "PO-100768",
      "salePrice": 7.4,
      "name": "CTU ฝา NEW 8 PC",
      "dueDate": "2025-07-25"
    },
    {
      "id": "hLQYewQ4x2SCpJH4BqGM",
      "salePrice": 3.92,
      "status": "Open",
      "lotNumber": "PO-220768",
      "dueDate": "2025-07-25",
      "name": "ฝาหน้ากาก CT A-1022",
      "color": "สีขาว",
      "quantityDelivered": 10800,
      "quantity": 16800
    },
    {
      "id": "wTd9N3SsYc4P8oyxHHLt",
      "quantity": 1000,
      "name": "CTU ฝา NEW 8 PC",
      "salePrice": 7.4,
      "quantityDelivered": 1000,
      "lotNumber": "PO-100768",
      "dueDate": "2025-07-25",
      "color": "ดำใส",
      "status": "Completed"
    },
    {
      "id": "QXxOOubdiMkPfflAGNnd",
      "status": "Cancelled",
      "lotNumber": "PO-050968",
      "salePrice": 1.63,
      "dueDate": "2025-09-05",
      "name": "ฐานรองขั้วต่อสาย J2",
      "color": "สีครีม",
      "quantity": 5000,
      "customerId": "a6a2a826-3c22-4721-98de-0b31fac86559"
    },
    {
      "id": "Qnj75B7mIRWHYazVzcav",
      "operatorName": "---ว่าง---",
      "jobId": "LZRGuVZKR2TAsXLcHOmZ",
      "machine": "เครื่องฉีด 3",
      "orderId": "pdY8eFbV6RQauiqTe3g2",
      "quantityRejected": 0,
      "productId": "f5g6h7i8-j9k0-l1m2-n3o4-p5q6r7s8t9u0",
      "quantityProduced": 1700,
      "productName": "บล็อคลอย CT 4x4 (สีขาว)",
      "date": "2025-11-17",
      "status": "Open"
    }
  ],
  "packing_logs": [
    {
      "id": "RQEQk0O1cSYd6dry0fku",
      "quantity": 10,
      "name": "ฝาหน้ากาก CT A-103 (สีขาว)",
      "packerName": "อาโม",
      "date": "2025-08-06"
    },
    {
      "id": "a8472b66-d1a4-471c-a8a5-48034488ba81",
      "name": "บล็อคลอย CT 2x4 (สีขาว)",
      "quantity": 360,
      "date": "2025-07-18",
      "packerName": "อาโม"
    },
    {
      "id": "49ede72c-f201-4504-aaa5-fb3f0716b645",
      "quantity": 35640,
      "packerName": "อาโม",
      "name": "บล็อคลอย CT 2x4 (สีขาว)",
      "date": "2025-07-18"
    },
    {
      "id": "1307d222-935a-458a-9bd4-05f72b1b7934",
      "date": "2025-07-18",
      "quantity": 6240,
      "name": "ฝาหน้ากาก CT A-103B (สีดำ)",
      "packerName": "อาต่อ"
    }
  ],
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
      "id": "wOwj1uC4asm8vw7o2YmM",
      "productName": "ฝาหน้ากาก CT A-103 (สีขาว)",
      "status": "รอประกบ",
      "machine": "เครื่องฉีด 4",
      "quantityProduced": 1900,
      "productId": "m2n3o4p5-q6r7-s8t9-u0v1-w2x3y4z5a6b7",
      "lotNumber": "091268",
      "operatorName": "---ว่าง---",
      "date": "2025-12-12",
      "shift": "ดึก",
      "quantityRejected": 0,
      "orderId": "tEoJONvQ3Bsx7HtwpdkL",
      "jobId": "bsO4YL5lejJkiskSG39A"
    },
    {
      "id": "vO8dR3CFM1hDUAxFck9a",
      "shift": "ดึก",
      "jobId": "pP6UjzcdebDbUJjFuygg",
      "quantityRejected": 0,
      "productId": "k8l9m0n1-o2p3-q4r5-s6t7-u8v9w0x1y2z3",
      "status": "รอนับ",
      "quantityProduced": 15000,
      "operatorName": "---ว่าง---",
      "orderId": "UxgUC2BMOLfC3o1leRyk",
      "machine": "เครื่องฉีด 3",
      "lotNumber": "PO-081168",
      "productName": "CPS-113 ชุดขาล็อคฝาครอบ (สีขาว)",
      "date": "2025-12-12"
    },
    {
      "id": "ibyoHkLWi7HkrwuwUEJs",
      "quantityRejected": 0,
      "productName": "CTU ฝา NEW 4 PC (สีขาว)",
      "lotNumber": "091268",
      "machine": "เครื่องฉีด 1",
      "orderId": "X10ZNyJJ9a7TmZiilXMH",
      "operatorName": "---ว่าง---",
      "quantityProduced": 946,
      "shift": "เช้า",
      "jobId": "hB82yaV9xQSRISeSoM24",
      "date": "2025-12-12",
      "productId": "s4t5u6v7-w8x9-y0z1-a2b3-c4d5e6f7g8h9",
      "status": "รอประกบ"
    },
    {
      "id": "VyLdUusjGGpRtCGa9sZ0",
      "quantityRejected": 0,
      "status": "รอนับ",
      "machine": "เครื่องฉีด 6",
      "productId": "a8b9c0d1-e2f3-g4h5-i6j7-k8l9m0n1o2p3",
      "date": "2025-12-12",
      "shift": "เช้า",
      "orderId": "wZnMqT8gm07gF07QWNsJ",
      "lotNumber": "PO-081168",
      "operatorName": "---ว่าง---",
      "jobId": "lxvPygYdUIR0SxGS8Ybt",
      "productName": "CWS-111 รองฝาเปิด-ปิดด้านในเล็ก (สีขาว)",
      "quantityProduced": 2541
    },
    {
      "id": "JvfiC3RVh51AekoYDy0O",
      "machine": "เครื่องฉีด 1",
      "lotNumber": "091268",
      "quantityProduced": 736,
      "operatorName": "---ว่าง---",
      "productName": "CTU ฝา NEW 4 PC (สีขาว)",
      "date": "2025-12-12",
      "shift": "ดึก",
      "orderId": "X10ZNyJJ9a7TmZiilXMH",
      "jobId": "hB82yaV9xQSRISeSoM24",
      "productId": "s4t5u6v7-w8x9-y0z1-a2b3-c4d5e6f7g8h9",
      "status": "รอประกบ",
      "quantityRejected": 0
    },
    {
      "id": "JOX7MkdHqnpWfcuwtqSN",
      "quantityRejected": 0,
      "productName": "บล็อคลอย CT 2x4B (สีดำ)",
      "lotNumber": "PO-230968",
      "machine": "เครื่องฉีด 8",
      "orderId": "4cGxcDwxBZvwcyjm1ssg",
      "operatorName": "อาฮิน",
      "quantityProduced": 4100,
      "shift": "เช้า",
      "jobId": "iZBcRoPAktz1KvmU6r33",
      "productId": "g6h7i8j9-k0l1-m2n3-o4p5-q6r7s8t9u0v1",
      "date": "2025-12-12",
      "status": "รอแพค"
    },
    {
      "id": "Qnj75B7mIRWHYazVzcav",
      "operatorName": "---ว่าง---",
      "jobId": "LZRGuVZKR2TAsXLcHOmZ",
      "machine": "เครื่องฉีด 3",
      "orderId": "pdY8eFbV6RQauiqTe3g2",
      "quantityRejected": 0,
      "productId": "f5g6h7i8-j9k0-l1m2-n3o4-p5q6r7s8t9u0",
      "quantityProduced": 1700,
      "productName": "บล็อคลอย CT 4x4 (สีขาว)",
      "date": "2025-11-17",
      "shift": "เช้า",
      "lotNumber": "PO-080968",
      "status": "Completed"
    }
  ],
  "factory_machines": [
    { "id": "m1", "name": "เครื่องฉีด 1", "status": "ทำงาน", "location": "Zone A", "workingHoursPerDay": 24 },
    { "id": "m2", "name": "เครื่องฉีด 2", "status": "หยุด", "location": "Zone A", "workingHoursPerDay": 24 },
    { "id": "m3", "name": "เครื่องฉีด 3", "status": "ทำงาน", "location": "Zone A", "workingHoursPerDay": 24 },
    { "id": "m4", "name": "เครื่องฉีด 4", "status": "ทำงาน", "location": "Zone B", "workingHoursPerDay": 24 },
    { "id": "m5", "name": "เครื่องฉีด 5", "status": "ทำงาน", "location": "Zone B", "workingHoursPerDay": 24 },
    { "id": "m6", "name": "เครื่องฉีด 6", "status": "ทำงาน", "location": "Zone B", "workingHoursPerDay": 24 },
    { "id": "m7", "name": "เครื่องฉีด 7", "status": "ทำงาน", "location": "Zone C", "workingHoursPerDay": 24 },
    { "id": "m8", "name": "เครื่องฉีด 8", "status": "ทำงาน", "location": "Zone C", "workingHoursPerDay": 24 }
  ],
  "packing_employees": [
    { "id": "e1", "name": "อาโม", "phone": "081-111-1111", "department": "Packing", "dailyWage": 350, "hireDate": "2023-01-15", "address": "Bangkok", "status": "Active", "roleId": "r1" },
    { "id": "e2", "name": "อาต่อ", "phone": "081-222-2222", "department": "Packing", "dailyWage": 350, "hireDate": "2023-02-20", "address": "Bangkok", "status": "Active", "roleId": "r1" },
    { "id": "e3", "name": "อาฮิน", "phone": "081-333-3333", "department": "Molding", "dailyWage": 400, "hireDate": "2022-11-01", "address": "Bangkok", "status": "Active", "roleId": "r2" },
    { "id": "e4", "name": "อามี", "phone": "081-444-4444", "department": "Molding", "dailyWage": 400, "hireDate": "2022-10-15", "address": "Bangkok", "status": "Active", "roleId": "r2" },
    { "id": "e5", "name": "ตะเล็ก", "phone": "081-555-5555", "department": "Molding", "dailyWage": 380, "hireDate": "2024-01-10", "address": "Bangkok", "status": "Active", "roleId": "r2" }
  ],
  "packing_inventory": [
    { "id": "i1", "name": "ฝาหน้ากาก CT A-101", "quantity": 15000, "unit": "pcs", "costPerUnit": 2.5 },
    { "id": "i2", "name": "บล็อคลอย CT 2x4", "quantity": 8500, "unit": "pcs", "costPerUnit": 2.8 },
    { "id": "i3", "name": "CTU ฝา NEW 4 PC", "quantity": 2100, "unit": "pcs", "costPerUnit": 4.5 },
    { "id": "i4", "name": "CPS-113 ฝาครอบด้านหน้า", "quantity": 500, "unit": "pcs", "costPerUnit": 0.8 },
    { "id": "i5", "name": "พุก (สีขาว)", "quantity": 50000, "unit": "pcs", "costPerUnit": 0.1 }
  ],
  "packing_raw_materials": [
    { "id": "rm1", "name": "Plastic Resin ABS White", "quantity": 5000, "unit": "kg", "costPerUnit": 45 },
    { "id": "rm2", "name": "Plastic Resin PC Black", "quantity": 2500, "unit": "kg", "costPerUnit": 60 },
    { "id": "rm3", "name": "Packaging Boxes Size S", "quantity": 1000, "unit": "pcs", "costPerUnit": 5 }
  ],
  "packing_qc_entries": [
    {
      "id": "qc1",
      "quantity": 1700,
      "unit": "pcs",
      "lotNumber": "PO-080968",
      "reasons": [],
      "sourceDate": "2025-11-17",
      "qcDate": "2025-11-18",
      "qcInspector": "Admin",
      "productName": "บล็อคลอย CT 4x4 (สีขาว)",
      "status": "Passed",
      "employeeName": "อาโม"
    },
    {
      "id": "qc2",
      "quantity": 946,
      "unit": "pcs",
      "lotNumber": "091268",
      "reasons": ["Scratches"],
      "sourceDate": "2025-12-12",
      "qcDate": "2025-12-13",
      "qcInspector": "Admin",
      "productName": "CTU ฝา NEW 4 PC (สีขาว)",
      "status": "Pending",
      "employeeName": "---ว่าง---"
    }
  ],
  "factory_products": [],
  "factory_settings": {
    "name": "CT Electric"
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
      factory_settings: {}
    };
  }
};
