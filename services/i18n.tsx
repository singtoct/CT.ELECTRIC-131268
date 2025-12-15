import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'th' | 'cn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.orders': 'Orders',
    'nav.production': 'Production',
    'nav.inventory': 'Inventory',
    'nav.qc': 'Quality Control',
    'nav.employees': 'Employees',
    'nav.settings': 'Settings',
    'nav.welcome': 'Welcome',
    
    // Dashboard
    'dash.totalOrders': 'Total Orders',
    'dash.activeMachines': 'Active Machines',
    'dash.totalProduction': 'Total Production',
    'dash.pendingQC': 'Pending QC',
    'dash.productionVolume': 'Production Volume by Machine',
    'dash.qcStatus': 'Quality Control Status',
    'dash.recentLogs': 'Recent Production Logs',
    'dash.vsLastMonth': 'vs last month',
    'dash.ofTotal': 'of total',

    // Orders
    'orders.title': 'Packing Orders',
    'orders.subtitle': 'Manage customer orders and production goals.',
    'orders.search': 'Search orders...',
    'orders.filter': 'Filter',
    'orders.lotNo': 'Lot No.',
    'orders.productName': 'Product Name',
    'orders.color': 'Color',
    'orders.quantity': 'Quantity',
    'orders.dueDate': 'Due Date',
    'orders.status': 'Status',
    'orders.noFound': 'No orders found matching your search.',

    // Production
    'prod.title': 'Production Floor',
    'prod.subtitle': 'Overview of machine status and order progress.',
    'prod.activeSummary': 'Active Production Orders Summary',
    'prod.activeSummarySub': 'Summary of all open production orders',
    'prod.poNumber': 'PO Number',
    'prod.productDetail': 'Product Detail',
    'prod.target': 'Target',
    'prod.produced': 'Produced',
    'prod.remaining': 'Remaining',
    'prod.progress': 'Progress',
    'prod.dailyLog': 'Daily Production Log',
    'prod.dailyLogSub': 'Daily production report (by machine)',
    'prod.outputToday': 'Output Today',
    'prod.accumulated': 'Accumulated / Target',
    'prod.statusToday': 'Status Today',
    'prod.dailyTotal': 'Daily Total:',
    'prod.noActive': 'No active orders found.',
    'prod.noLogs': 'No production logs found for this date.',
    'prod.shift': 'Shift',

    // Inventory
    'inv.title': 'Inventory Management',
    'inv.subtitle': 'Track finished goods and raw materials.',
    'inv.finishedGoods': 'Finished Goods',
    'inv.rawMaterials': 'Raw Materials',
    'inv.searchFinished': 'Search finished goods...',
    'inv.searchRaw': 'Search materials...',
    'inv.itemName': 'Item Name',
    'inv.unit': 'Unit',
    'inv.costUnit': 'Cost/Unit',
    'inv.status': 'Status',
    'inv.inStock': 'In Stock',
    'inv.lowStock': 'Low Stock',
    'inv.outOfStock': 'Out of Stock',

    // QC
    'qc.title': 'Quality Control',
    'qc.subtitle': 'Inspect and approve production batches.',
    'qc.pass': 'Pass',
    'qc.fail': 'Fail',
    'qc.inspectedBy': 'Inspected by',
    'qc.on': 'on',
    'qc.sourceDate': 'Source Date',

    // Employees
    'emp.title': 'Employee Directory',
    'emp.subtitle': 'Manage workforce and assignments.',
    'emp.name': 'Name',
    'emp.department': 'Department',
    'emp.dailyWage': 'Daily Wage',
    'emp.hireDate': 'Hire Date',

    // Settings
    'set.title': 'System Settings',
    'set.subtitle': 'Manage application data and configurations.',
    'set.dataManagement': 'Data Management',
    'set.uploadDesc': 'Upload a JSON file to update the factory database. This will overwrite current data.',
    'set.selectFile': 'Select JSON File',
    'set.dragDrop': 'or drag and drop here',
    'set.reset': 'Reset to Default',
    'set.resetDesc': 'Clear local data and restore the original sample data.',
    'set.success': 'Data updated successfully!',
    'set.error': 'Invalid JSON format or structure.',
    'set.confirmReset': 'Are you sure you want to reset all data?',
  },
  th: {
    // Navigation
    'nav.dashboard': 'แดชบอร์ด',
    'nav.orders': 'ใบสั่งขาย',
    'nav.production': 'ฝ่ายผลิต',
    'nav.inventory': 'คลังสินค้า',
    'nav.qc': 'ตรวจสอบคุณภาพ',
    'nav.employees': 'พนักงาน',
    'nav.settings': 'ตั้งค่าระบบ',
    'nav.welcome': 'ยินดีต้อนรับ',

    // Dashboard
    'dash.totalOrders': 'คำสั่งซื้อทั้งหมด',
    'dash.activeMachines': 'เครื่องจักรทำงาน',
    'dash.totalProduction': 'ยอดผลิตรวม',
    'dash.pendingQC': 'รอตรวจสอบ QC',
    'dash.productionVolume': 'ปริมาณการผลิตตามเครื่องจักร',
    'dash.qcStatus': 'สถานะการตรวจสอบคุณภาพ',
    'dash.recentLogs': 'ประวัติการผลิตล่าสุด',
    'dash.vsLastMonth': 'เทียบเดือนก่อน',
    'dash.ofTotal': 'ของทั้งหมด',

    // Orders
    'orders.title': 'ใบสั่งบรรจุสินค้า',
    'orders.subtitle': 'จัดการคำสั่งซื้อลูกค้าและเป้าหมายการผลิต',
    'orders.search': 'ค้นหาคำสั่งซื้อ...',
    'orders.filter': 'ตัวกรอง',
    'orders.lotNo': 'เลข Lot',
    'orders.productName': 'ชื่อสินค้า',
    'orders.color': 'สี',
    'orders.quantity': 'จำนวน',
    'orders.dueDate': 'กำหนดส่ง',
    'orders.status': 'สถานะ',
    'orders.noFound': 'ไม่พบคำสั่งซื้อที่ตรงกัน',

    // Production
    'prod.title': 'หน้างานผลิต',
    'prod.subtitle': 'ภาพรวมสถานะเครื่องจักรและความคืบหน้า',
    'prod.activeSummary': 'สรุปใบสั่งผลิตที่กำลังดำเนินการ',
    'prod.activeSummarySub': 'สรุปสถานะใบสั่งผลิตที่เปิดอยู่ทั้งหมด',
    'prod.poNumber': 'เลขที่ PO',
    'prod.productDetail': 'รายละเอียดสินค้า',
    'prod.target': 'เป้าหมาย',
    'prod.produced': 'ผลิตได้',
    'prod.remaining': 'คงเหลือ',
    'prod.progress': 'ความคืบหน้า',
    'prod.dailyLog': 'บันทึกการผลิตรายวัน',
    'prod.dailyLogSub': 'รายงานยอดผลิตรายวัน (แยกตามเครื่อง)',
    'prod.outputToday': 'ยอดวันนี้',
    'prod.accumulated': 'สะสม / เป้าหมาย',
    'prod.statusToday': 'สถานะวันนี้',
    'prod.dailyTotal': 'รวมวันนี้:',
    'prod.noActive': 'ไม่มีใบสั่งผลิตที่กำลังดำเนินการ',
    'prod.noLogs': 'ไม่พบข้อมูลการผลิตในวันที่เลือก',
    'prod.shift': 'กะ',

    // Inventory
    'inv.title': 'จัดการสต็อกสินค้า',
    'inv.subtitle': 'ติดตามสินค้าสำเร็จรูปและวัตถุดิบ',
    'inv.finishedGoods': 'สินค้าสำเร็จรูป',
    'inv.rawMaterials': 'วัตถุดิบ',
    'inv.searchFinished': 'ค้นหาสินค้า...',
    'inv.searchRaw': 'ค้นหาวัตถุดิบ...',
    'inv.itemName': 'ชื่อรายการ',
    'inv.unit': 'หน่วย',
    'inv.costUnit': 'ทุน/หน่วย',
    'inv.status': 'สถานะ',
    'inv.inStock': 'มีสินค้า',
    'inv.lowStock': 'สินค้าใกล้หมด',
    'inv.outOfStock': 'สินค้าหมด',

    // QC
    'qc.title': 'ตรวจสอบคุณภาพ (QC)',
    'qc.subtitle': 'ตรวจสอบและอนุมัติล็อตการผลิต',
    'qc.pass': 'ผ่าน',
    'qc.fail': 'ไม่ผ่าน',
    'qc.inspectedBy': 'ตรวจสอบโดย',
    'qc.on': 'เมื่อ',
    'qc.sourceDate': 'วันที่ผลิต',

    // Employees
    'emp.title': 'รายชื่อพนักงาน',
    'emp.subtitle': 'จัดการกำลังคนและการมอบหมายงาน',
    'emp.name': 'ชื่อ',
    'emp.department': 'แผนก',
    'emp.dailyWage': 'ค่าแรงรายวัน',
    'emp.hireDate': 'วันที่เริ่มงาน',

    // Settings
    'set.title': 'ตั้งค่าระบบ',
    'set.subtitle': 'จัดการข้อมูลและการตั้งค่าของแอปพลิเคชัน',
    'set.dataManagement': 'จัดการข้อมูล',
    'set.uploadDesc': 'อัปโหลดไฟล์ JSON เพื่ออัปเดตฐานข้อมูลโรงงาน (ข้อมูลเดิมจะถูกทับ)',
    'set.selectFile': 'เลือกไฟล์ JSON',
    'set.dragDrop': 'หรือลากไฟล์มาวางที่นี่',
    'set.reset': 'รีเซ็ตเป็นค่าเริ่มต้น',
    'set.resetDesc': 'ล้างข้อมูลที่บันทึกไว้และกู้คืนข้อมูลตัวอย่างเริ่มต้น',
    'set.success': 'อัปเดตข้อมูลสำเร็จ!',
    'set.error': 'รูปแบบไฟล์ไม่ถูกต้อง',
    'set.confirmReset': 'คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลทั้งหมด?',
  },
  cn: {
    // Navigation
    'nav.dashboard': '仪表板',
    'nav.orders': '订单',
    'nav.production': '生产',
    'nav.inventory': '库存',
    'nav.qc': '质量控制',
    'nav.employees': '员工',
    'nav.settings': '设置',
    'nav.welcome': '欢迎',

    // Dashboard
    'dash.totalOrders': '总订单',
    'dash.activeMachines': '活跃机器',
    'dash.totalProduction': '总产量',
    'dash.pendingQC': '待质检',
    'dash.productionVolume': '各机器产量',
    'dash.qcStatus': '质检状态',
    'dash.recentLogs': '最近生产记录',
    'dash.vsLastMonth': '与上月相比',
    'dash.ofTotal': '占总数',

    // Orders
    'orders.title': '包装订单',
    'orders.subtitle': '管理客户订单和生产目标',
    'orders.search': '搜索订单...',
    'orders.filter': '筛选',
    'orders.lotNo': '批号',
    'orders.productName': '产品名称',
    'orders.color': '颜色',
    'orders.quantity': '数量',
    'orders.dueDate': '截止日期',
    'orders.status': '状态',
    'orders.noFound': '未找到匹配的订单',

    // Production
    'prod.title': '生产车间',
    'prod.subtitle': '机器状态和订单进度概览',
    'prod.activeSummary': '活跃生产订单汇总',
    'prod.activeSummarySub': '所有未结生产订单汇总',
    'prod.poNumber': 'PO 编号',
    'prod.productDetail': '产品详情',
    'prod.target': '目标',
    'prod.produced': '已生产',
    'prod.remaining': '剩余',
    'prod.progress': '进度',
    'prod.dailyLog': '每日生产记录',
    'prod.dailyLogSub': '每日生产报告（按机器）',
    'prod.outputToday': '今日产量',
    'prod.accumulated': '累计 / 目标',
    'prod.statusToday': '今日状态',
    'prod.dailyTotal': '今日总计:',
    'prod.noActive': '没有活跃订单',
    'prod.noLogs': '该日期无生产记录',
    'prod.shift': '班次',

    // Inventory
    'inv.title': '库存管理',
    'inv.subtitle': '追踪成品和原材料',
    'inv.finishedGoods': '成品',
    'inv.rawMaterials': '原材料',
    'inv.searchFinished': '搜索成品...',
    'inv.searchRaw': '搜索原材料...',
    'inv.itemName': '项目名称',
    'inv.unit': '单位',
    'inv.costUnit': '单位成本',
    'inv.status': '状态',
    'inv.inStock': '有库存',
    'inv.lowStock': '库存不足',
    'inv.outOfStock': '缺货',

    // QC
    'qc.title': '质量控制',
    'qc.subtitle': '检查并批准生产批次',
    'qc.pass': '通过',
    'qc.fail': '失败',
    'qc.inspectedBy': '检查人',
    'qc.on': '时间',
    'qc.sourceDate': '生产日期',

    // Employees
    'emp.title': '员工名录',
    'emp.subtitle': '管理劳动力和任务分配',
    'emp.name': '姓名',
    'emp.department': '部门',
    'emp.dailyWage': '日薪',
    'emp.hireDate': '入职日期',
    
    // Settings
    'set.title': '系统设置',
    'set.subtitle': '管理应用数据和配置',
    'set.dataManagement': '数据管理',
    'set.uploadDesc': '上传JSON文件以更新工厂数据库（将覆盖现有数据）',
    'set.selectFile': '选择JSON文件',
    'set.dragDrop': '或将文件拖放到此处',
    'set.reset': '重置为默认值',
    'set.resetDesc': '清除本地数据并恢复原始样本数据',
    'set.success': '数据更新成功！',
    'set.error': 'JSON格式无效',
    'set.confirmReset': '您确定要重置所有数据吗？',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

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
