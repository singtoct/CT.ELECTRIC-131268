
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // --- Layout & Header ---
    'app.name': 'CT.ELECTRIC',
    'app.desc': 'Factory OS',
    'layout.quickAdd': 'Quick Actions',
    'layout.newOrder': 'New Order',
    'layout.newOrderDesc': 'Create Production Doc',
    'layout.newProduct': 'New Product',
    'layout.newProductDesc': 'Add to Catalog',
    'layout.newCustomer': 'New Customer',
    'layout.newCustomerDesc': 'Register Client',
    'layout.notifications': 'Notifications',
    'layout.markRead': 'Mark all read',
    'layout.viewAll': 'View All Activity',
    'layout.profile': 'Admin User',
    'layout.role': 'Factory Manager',
    'layout.settings': 'Settings',
    'layout.logout': 'Logout',
    'layout.copyright': 'CT.ELECTRIC © 2025',

    // --- Navigation ---
    'nav.overview': 'System Overview',
    'nav.sales': 'Sales & Planning',
    'nav.production': 'Production Line',
    'nav.warehouse': 'Warehouse & Shipping',
    'nav.management': 'Management & Analysis',
    'nav.dashboard': 'Dashboard',
    'nav.customers': 'Customer Management',
    'nav.orders': 'MRP / Production Plan',
    'nav.poDocs': 'Create Job Order',
    'nav.machineStatus': 'Machine Status',
    'nav.kanban': 'Production Kanban',
    'nav.prodLogs': 'Production Logs',
    'nav.qc': 'Quality Control (QC)',
    'nav.finishedGoods': 'Finished Goods',
    'nav.rawMaterials': 'Raw Materials / BOM',
    'nav.products': 'Product Catalog',
    'nav.shipping': 'Shipping',
    'nav.complaints': 'Complaints',
    'nav.employees': 'Employees',
    'nav.maintenance': 'Maintenance',
    'nav.purchasing': 'Purchasing',
    'nav.analysisProfit': 'Profit Analysis',
    'nav.oee': 'OEE Efficiency',
    'nav.reports': 'Executive Reports',
    'nav.settings': 'Settings',
    'nav.warehouseMap': 'Warehouse Map (WMS)',

    // --- Dashboard ---
    'dash.totalOrders': 'Total Orders',
    'dash.activeMachines': 'Active Machines',
    'dash.pendingQC': 'Pending QC',
    'dash.ofTotal': 'of total',
    'dash.productionVolume': 'Production Volume',
    'dash.qcStatus': 'QC Status',
    'dash.recentLogs': 'Recent Logs',

    // --- MRP / Orders ---
    'mrp.title': 'Production Planning (MRP)',
    'mrp.subtitle': 'Material Requirements Planning',
    'mrp.autoCalc': 'Auto-calculation from Orders',
    'mrp.demand': 'Total Demand',
    'mrp.stock': 'Stock',
    'mrp.wip': 'WIP',
    'mrp.qcPending': 'QC Pending',
    'mrp.shortage': 'Shortage',
    'mrp.sufficient': 'Sufficient',
    'mrp.produceNow': 'Produce Now',
    'mrp.orderList': 'Order Breakdown',
    'mrp.noData': 'No active orders found',

    // --- Products & AI ---
    'product.add': 'Add Product',
    'product.search': 'Search products...',
    'product.name': 'Product Name',
    'product.color': 'Color',
    'product.cycleTime': 'Cycle Time (s)',
    'product.price': 'Sale Price',
    'product.aiBtn': 'Ask AI Suggestion',
    'product.aiAnalyzing': 'Analyzing Costs...',
    'product.aiTitle': 'AI Insight',
    'product.breakEven': 'Break-Even',
    'product.recommended': 'Recommended',
    'product.marketRange': 'Market Range',
    'product.applyPrice': 'Apply This Price',
    'product.save': 'Save Product',
    'product.cancel': 'Cancel',
    'product.edit': 'Edit Product',
    'product.new': 'New Product',

    // --- Inventory ---
    'inv.title': 'Inventory Management',
    'inv.subtitle': 'Real-time Stock Management',
    'inv.tabFinished': 'Finished Goods',
    'inv.tabComponent': 'Components',
    'inv.tabRaw': 'Raw Materials',
    'inv.search': 'Search items...',
    'inv.updateStock': 'Update Stock',
    'inv.save': 'Save Changes',

    // --- Common ---
    'common.search': 'Search...',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.unit': 'Unit',
    'common.date': 'Date',
    'common.loading': 'Loading...',
  },
  th: {
    // --- Layout & Header ---
    'app.name': 'CT.ELECTRIC',
    'app.desc': 'ระบบจัดการโรงงาน',
    'layout.quickAdd': 'เมนูลัด',
    'layout.newOrder': 'สร้างออเดอร์ใหม่',
    'layout.newOrderDesc': 'เปิดใบสั่งผลิต (PO)',
    'layout.newProduct': 'เพิ่มสินค้าใหม่',
    'layout.newProductDesc': 'ลงทะเบียนสินค้าในระบบ',
    'layout.newCustomer': 'เพิ่มลูกค้าใหม่',
    'layout.newCustomerDesc': 'ลงทะเบียนลูกค้า',
    'layout.notifications': 'การแจ้งเตือน',
    'layout.markRead': 'อ่านทั้งหมด',
    'layout.viewAll': 'ดูรายการทั้งหมด',
    'layout.profile': 'ผู้ดูแลระบบ',
    'layout.role': 'ผู้จัดการโรงงาน',
    'layout.settings': 'ตั้งค่าระบบ',
    'layout.logout': 'ออกจากระบบ',
    'layout.copyright': 'CT.ELECTRIC © 2025 สงวนลิขสิทธิ์',

    // --- Navigation ---
    'nav.overview': 'ภาพรวมระบบ',
    'nav.sales': 'ฝ่ายขายและวางแผน',
    'nav.production': 'ฝ่ายผลิต (หน้างาน)',
    'nav.warehouse': 'คลังสินค้าและจัดส่ง',
    'nav.management': 'ผู้บริหารและวิเคราะห์',
    'nav.dashboard': 'แดชบอร์ด',
    'nav.customers': 'ฐานข้อมูลลูกค้า',
    'nav.orders': 'แผนการผลิต (MRP)',
    'nav.poDocs': 'ใบสั่งผลิต (Job Order)',
    'nav.machineStatus': 'สถานะเครื่องจักร',
    'nav.kanban': 'ติดตามงาน (Kanban)',
    'nav.prodLogs': 'บันทึกยอดผลิต',
    'nav.qc': 'ตรวจสอบคุณภาพ (QC)',
    'nav.finishedGoods': 'สินค้าสำเร็จรูป',
    'nav.rawMaterials': 'วัตถุดิบ / BOM',
    'nav.products': 'ข้อมูลสินค้า',
    'nav.shipping': 'การจัดส่ง',
    'nav.complaints': 'ข้อร้องเรียน',
    'nav.employees': 'พนักงาน',
    'nav.maintenance': 'ซ่อมบำรุง',
    'nav.purchasing': 'จัดซื้อวัตถุดิบ',
    'nav.analysisProfit': 'วิเคราะห์กำไร',
    'nav.oee': 'ประสิทธิภาพเครื่อง (OEE)',
    'nav.reports': 'รายงานผู้บริหาร',
    'nav.settings': 'ตั้งค่าระบบ',
    'nav.warehouseMap': 'แผนผังโกดัง (WMS)',

    // --- Dashboard ---
    'dash.totalOrders': 'คำสั่งซื้อทั้งหมด',
    'dash.activeMachines': 'เครื่องจักรทำงาน',
    'dash.pendingQC': 'รอตรวจสอบ QC',
    'dash.ofTotal': 'ของทั้งหมด',
    'dash.productionVolume': 'ปริมาณการผลิต',
    'dash.qcStatus': 'สถานะ QC',
    'dash.recentLogs': 'งานล่าสุด',

    // --- MRP / Orders ---
    'mrp.title': 'แผนการผลิต (MRP Dashboard)',
    'mrp.subtitle': 'วางแผนทรัพยากรการผลิต',
    'mrp.autoCalc': 'คำนวณอัตโนมัติจากออเดอร์',
    'mrp.demand': 'ยอดสั่งซื้อ (Demand)',
    'mrp.stock': 'สต็อกคงเหลือ',
    'mrp.wip': 'งานระหว่างทำ (WIP)',
    'mrp.qcPending': 'รอ QC',
    'mrp.shortage': 'ต้องผลิตเพิ่ม',
    'mrp.sufficient': 'เพียงพอ',
    'mrp.produceNow': 'สั่งผลิตทันที',
    'mrp.orderList': 'รายการออเดอร์ย่อย',
    'mrp.noData': 'ไม่พบข้อมูลคำสั่งซื้อในระบบ',

    // --- Products & AI ---
    'product.add': 'เพิ่มสินค้า',
    'product.search': 'ค้นหาสินค้า...',
    'product.name': 'ชื่อสินค้า',
    'product.color': 'สี',
    'product.cycleTime': 'รอบเวลาการผลิต (วินาที)',
    'product.price': 'ราคาขาย',
    'product.aiBtn': 'ขอคำแนะนำราคาจาก AI',
    'product.aiAnalyzing': 'กำลังวิเคราะห์ต้นทุน...',
    'product.aiTitle': 'บทวิเคราะห์จาก AI',
    'product.breakEven': 'จุดคุ้มทุน (Break-Even)',
    'product.recommended': 'ราคาแนะนำ',
    'product.marketRange': 'ช่วงราคาตลาด',
    'product.applyPrice': 'ใช้ราคานี้',
    'product.save': 'บันทึกข้อมูล',
    'product.cancel': 'ยกเลิก',
    'product.edit': 'แก้ไขข้อมูลสินค้า',
    'product.new': 'เพิ่มสินค้าใหม่',

    // --- Inventory ---
    'inv.title': 'จัดการสต็อกสินค้า',
    'inv.subtitle': 'ระบบบริหารคลังสินค้า Real-time',
    'inv.tabFinished': 'สินค้าสำเร็จรูป',
    'inv.tabComponent': 'ชิ้นส่วนประกอบ',
    'inv.tabRaw': 'วัตถุดิบจัดซื้อ',
    'inv.search': 'ค้นหาชื่อรายการ...',
    'inv.updateStock': 'ปรับปรุงยอดสต็อก',
    'inv.save': 'บันทึกยอด',

    // --- Common ---
    'common.search': 'ค้นหา...',
    'common.status': 'สถานะ',
    'common.actions': 'จัดการ',
    'common.unit': 'หน่วย',
    'common.date': 'วันที่',
    'common.loading': 'กำลังโหลด...',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('th');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
