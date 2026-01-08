
import { FactoryData, WarehouseLocation } from '../types';

// Generate many sample items for testing pagination
const generateSampleOrders = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `order-${i}`,
        name: i % 2 === 0 ? "ฝาหน้ากาก CT A-101" : "ฝาหน้ากาก CT A-102",
        productId: i % 2 === 0 ? "prod-a101" : "prod-a102",
        customerId: `cust-${(i % 5) + 1}`,
        color: "สีขาว",
        quantity: 1000 + (i * 100),
        dueDate: `2025-07-${String((i % 28) + 1).padStart(2, '0')}`,
        stock: 0,
        salePrice: 3.77,
        status: i < 5 ? 'Completed' : 'Open',
        lotNumber: `LOT-${2025000 + i}`
    }));
};

const generateSamplePOs = (count: number) => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `po-idx-${i}`,
        poNumber: `PUR-2025${String(i + 1).padStart(3, '0')}`,
        orderDate: `2025-06-${String((i % 28) + 1).padStart(2, '0')}`,
        expectedDate: `2025-07-${String((i % 28) + 1).padStart(2, '0')}`,
        supplierId: i % 2 === 0 ? "s1" : "s2",
        status: i < 8 ? 'Received' : 'Pending',
        items: [
            { rawMaterialId: "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0", quantity: 500, unitPrice: 52 }
        ]
    }));
};

// Generate Warehouse Locations (Zone A: Raw, Zone B: Finished, Zone Q: Quarantine)
const generateLocations = (): WarehouseLocation[] => {
    const locs: WarehouseLocation[] = [];
    
    // Wall Structure (Simulated boundary)
    locs.push({ id: 'wall-l', name: 'Wall', zone: 'Structure', type: 'Wall', capacity: 0, x: 50, y: 50, w: 20, h: 800 });
    locs.push({ id: 'wall-t', name: 'Wall', zone: 'Structure', type: 'Wall', capacity: 0, x: 50, y: 50, w: 700, h: 20 });
    locs.push({ id: 'wall-r', name: 'Wall', zone: 'Structure', type: 'Wall', capacity: 0, x: 730, y: 50, w: 20, h: 800 });
    locs.push({ id: 'door-1', name: 'Main Entrance', zone: 'Structure', type: 'Door', capacity: 0, x: 350, y: 830, w: 100, h: 20 });

    // Zone A: Raw Materials (Racks A-01 to A-06) - Left Side
    for(let i=1; i<=6; i++) {
        const col = (i-1) % 2;
        const row = Math.floor((i-1) / 2);
        locs.push({
            id: `loc-a-${i}`,
            name: `A-0${i}`,
            zone: 'Raw Material',
            type: 'Rack',
            capacity: 2000,
            description: 'โซนวัตถุดิบหลัก (PC/ABS)',
            x: 120 + (col * 80),
            y: 150 + (row * 120),
            w: 60,
            h: 90
        });
    }

    // Zone B: Finished Goods (Racks B-01 to B-10) - Right Side / Long
    for(let i=1; i<=6; i++) {
        locs.push({
            id: `loc-b-${i}`,
            name: `B-${String(i).padStart(2, '0')}`,
            zone: 'Finished Goods',
            type: 'Rack',
            capacity: 5000,
            description: 'โซนสินค้าสำเร็จรูป',
            x: 550,
            y: 150 + ((i-1) * 100),
            w: 120,
            h: 60
        });
    }

    // Zone Q: Quarantine (QC Area)
    locs.push({
        id: `loc-q-01`,
        name: `Q-01`,
        zone: 'Quarantine',
        type: 'Floor',
        capacity: 1000,
        description: 'พื้นที่พักสินค้า QC',
        x: 550,
        y: 750,
        w: 120,
        h: 80
    });

    // WC
    locs.push({
        id: `wc-1`,
        name: `WC`,
        zone: 'Structure',
        type: 'Obstacle',
        capacity: 0,
        x: 650,
        y: 70,
        w: 60,
        h: 60
    });

    return locs;
};

const rawJsonData: any = {
  "packing_orders": generateSampleOrders(25),
  "packing_raw_materials": [
    { 
        "id": "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0", "name": "เม็ด PC ใส BP15", "quantity": 574, "unit": "kg", "costPerUnit": 52,
        "locationId": "loc-a-1", "isoStatus": "Released", "receivedDate": "2024-01-15", "lotNumber": "RM-240115"
    },
    { 
        "id": "8daabcc1-3ee7-4be0-868c-b41c3922f26b", "name": "สีผงขาว PC ", "unit": "kg", "quantity": 36.56, "costPerUnit": 180,
        "locationId": "loc-a-2", "isoStatus": "Released", "receivedDate": "2024-02-01", "lotNumber": "RM-240201"
    },
    { 
        "id": "u5w0v2x6-x6u5-4vq-s-781u-1x0v3927x3v9", "name": "เม็ด POM", "quantity": 100, "unit": "kg", "costPerUnit": 41,
        "locationId": "loc-a-3", "isoStatus": "Quarantine", "receivedDate": "2024-03-10", "lotNumber": "RM-240310"
    }
  ],
  "factory_products": [
    { "id": "prod-a101", "name": "ฝาหน้ากาก CT A-101", "color": "สีขาว", "salePrice": 3.77, "cycleTimeSeconds": 15, "productType": "FinishedGood", "category": "สินค้าเพื่อขาย", "minTonnage": 100 },
    { "id": "prod-a102", "name": "ฝาหน้ากาก CT A-102", "color": "สีขาว", "salePrice": 3.7, "cycleTimeSeconds": 15, "productType": "FinishedGood", "category": "สินค้าเพื่อขาย", "minTonnage": 100 },
    { "id": "prod-b205", "name": "บล็อกลอย 2x4", "color": "สีขาว", "salePrice": 12.5, "cycleTimeSeconds": 25, "productType": "FinishedGood", "category": "สินค้าเพื่อขาย", "minTonnage": 200 }
  ],
  "packing_boms": [
    {
      "id": "bom-a101",
      "productId": "prod-a101",
      "productName": "ฝาหน้ากาก CT A-101 (สีขาว)",
      "components": [
        { "rawMaterialId": "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0", "quantity": 0.023 },
        { "rawMaterialId": "8daabcc1-3ee7-4be0-868c-b41c3922f26b", "quantity": 0.00046 }
      ]
    }
  ],
  "factory_machines": [
    { "id": "m1", "name": "เครื่องฉีด 1", "status": "ทำงาน", "location": "โซน A", "workingHoursPerDay": 24, "tonnage": 120 },
    { "id": "m2", "name": "เครื่องฉีด 2", "status": "ว่าง", "location": "โซน A", "workingHoursPerDay": 24, "tonnage": 120 },
    { "id": "m3", "name": "เครื่องฉีด 3 (ใหญ่)", "status": "ว่าง", "location": "โซน B", "workingHoursPerDay": 24, "tonnage": 250 },
    { "id": "m4", "name": "เครื่องฉีด 4", "status": "เสีย", "location": "โซน B", "workingHoursPerDay": 24, "tonnage": 120 }
  ],
  "packing_employees": [
    { "id": "e1", "name": "กะปิ", "department": "ฝ่ายผลิต", "status": "Active", "dailyWage": 372, "hireDate": "2024-11-23", "roleId": "operator" },
    { "id": "e2", "name": "สมชาย", "department": "ฝ่ายผลิต", "status": "Active", "dailyWage": 400, "hireDate": "2023-05-15", "roleId": "technician" },
    { "id": "e3", "name": "วิภา", "department": "ฝ่ายผลิต", "status": "Active", "dailyWage": 360, "hireDate": "2024-01-10", "roleId": "general" },
    { "id": "e4", "name": "สมหมาย", "department": "ฝ่ายผลิต", "status": "Active", "dailyWage": 380, "hireDate": "2023-11-01", "roleId": "operator" }
  ],
  "molding_logs": [],
  "factory_suppliers": [
    { "id": "s1", "name": "บริษัท เคมีภัณฑ์ จำกัด", "contactPerson": "คุณสมชาย", "phone": "02-123-4567" },
    { "id": "s2", "name": "Polymer Tech Co.", "contactPerson": "คุณวิชัย", "phone": "081-444-5566" },
    { "id": "s3", "name": "Global Plastic Supply", "contactPerson": "Alice", "phone": "099-888-7777" }
  ],
  "factory_purchase_orders": generateSamplePOs(22),
  "factory_quotations": [
      {
          "id": "q1",
          "rawMaterialId": "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0",
          "supplierId": "s1",
          "pricePerUnit": 52,
          "moq": 500,
          "unit": "kg",
          "leadTimeDays": 7,
          "paymentTerm": "Credit 30 Days",
          "quotationDate": "2025-01-01",
          "validUntil": "2025-12-31",
          "note": "ส่งฟรีเมื่อสั่งครบ 10,000 บาท",
          "isPreferred": true
      },
      {
          "id": "q2",
          "rawMaterialId": "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0",
          "supplierId": "s2",
          "pricePerUnit": 50,
          "moq": 1000,
          "unit": "kg",
          "leadTimeDays": 14,
          "paymentTerm": "Cash",
          "quotationDate": "2025-01-10",
          "validUntil": "2025-06-30",
          "note": "ราคาถูกกว่าแต่ต้องจ่ายสด"
      },
      {
          "id": "q3",
          "rawMaterialId": "l6n1m3o7-o7l6-4mh-j-692l-2o1m4038o4m0",
          "supplierId": "s3",
          "pricePerUnit": 55,
          "moq": 100,
          "unit": "kg",
          "leadTimeDays": 3,
          "paymentTerm": "Credit 60 Days",
          "quotationDate": "2025-02-01",
          "validUntil": "2025-12-31",
          "note": "ส่งไวมาก เครดิตยาว"
      }
  ],
  "production_documents": [
    {
        "id": "doc-1",
        "docNumber": "PO-2025001",
        "date": "2025-07-01",
        "customerName": "ลูกค้ารายใหญ่ A",
        "status": "Approved",
        "items": [
            { "id": "i1", "productId": "prod-a101", "productName": "ฝาหน้ากาก CT A-101", "quantity": 5000, "unit": "pcs", "dueDate": "2025-07-20" }
        ],
        "createdBy": "Admin"
    }
  ],
  "warehouse_locations": generateLocations(),
  "factory_settings": {
    "id": "main",
    "companyInfo": {
        "name": "CT Electric Co., Ltd.",
        "address": "15/16 หมู่ 9 ต.นาดี อ.เมืองสมุทรสาคร จ.สมุทรสาคร 74000",
        "taxId": "0745560001698"
    },
    "productionStatuses": ["รอแปะกันรอย", "รอประกบ", "รอแพค", "รอนับ"],
    "machineStatuses": ["ทำงาน", "ว่าง", "เสีย", "กำลังซ่อม", "รอเปลี่ยนโมล"],
    "overheadRatePerHour": 52.5,
    "depreciationCostPerHour": 17.0,
    "productionSteps": ["รอฉีด", "รอประกบ", "รอแพค", "รอนับ", "เสร็จสิ้น"]
  },
  "packing_inventory": [
      {
        "id": "inv-fg-1", "productId": "prod-a101", "name": "ฝาหน้ากาก CT A-101", "quantity": 1500, "unit": "pcs", "category": "Finished", "source": "Produced",
        "locationId": "loc-b-1", "isoStatus": "Released", "lotNumber": "FG-2501001", "receivedDate": "2025-01-10"
      },
      {
        "id": "inv-fg-2", "productId": "prod-a102", "name": "ฝาหน้ากาก CT A-102", "quantity": 500, "unit": "pcs", "category": "Finished", "source": "Produced",
        "locationId": "loc-q-01", "isoStatus": "Quarantine", "lotNumber": "FG-2501005", "receivedDate": "2025-01-12"
      }
  ],
  "packing_logs": [],
  "maintenance_logs": [],
  "read_notifications": { "ids": [] },
  "factory_customers": [],
  "factory_complaints": [],
  "production_queue": [],
  "machine_daily_logs": [],
  "packing_stations": [],
  "packing_queue": []
};

/**
 * Provides the default factory data structure.
 * Uses a safe cloning method to ensure no cross-contamination between state instances.
 */
export const getFactoryData = (): FactoryData => {
    // 1. Safe clone using stringify/parse for deep immutability of raw data
    let data: FactoryData;
    try {
        data = JSON.parse(JSON.stringify(rawJsonData)) as FactoryData;
    } catch (e) {
        console.error("Critical: Initial data stringify failed", e);
        // Fallback to direct object if stringify fails (though it shouldn't for rawJsonData)
        data = { ...rawJsonData } as FactoryData;
    }
    
    // 2. Perform derived data linking (BOMs to Products)
    data.factory_products = data.factory_products.map(prod => {
        // Normalize helper
        const norm = (s: string) => s ? s.toLowerCase().trim() : '';
        const fullNameKey = `${prod.name} (${prod.color})`;
        
        // Robust BOM finding strategy
        const matchingBom = data.packing_boms.find(b => {
            // Prioritize explicit Product ID Match
            if (b.productId && b.productId === prod.id) return true;

            const bName = norm(b.productName);
            const bId = norm(b.id);
            const pName = norm(prod.name);
            const pFull = norm(fullNameKey);
            
            return bName === pFull || bId === pFull || bName === pName || bId === pName;
        });

        if (matchingBom) {
            return {
                ...prod,
                bom: matchingBom.components.map(c => {
                    // Strategy 1: Direct ID Match
                    let mat = data.packing_raw_materials.find(m => m.id === c.rawMaterialId);
                    
                    // Strategy 2: Match by Name (if ID is actually a name, or data mismatch)
                    if (!mat) {
                        mat = data.packing_raw_materials.find(m => 
                            norm(m.name) === norm(c.rawMaterialId)
                        );
                    }

                    return { 
                        materialId: mat ? mat.id : c.rawMaterialId, // Update ID to real ID if found, else keep original
                        materialName: mat ? mat.name : (c.rawMaterialId || 'Unknown Material'), 
                        quantityPerUnit: c.quantity 
                    };
                })
            };
        }
        return prod;
    });
    return data;
};
