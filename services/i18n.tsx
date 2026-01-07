
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'th' | 'cn';

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
    'inv.itemName': 'Item Name',
    'inv.inStock': 'In Stock',
    'inv.unit': 'Unit',
    'inv.updateStock': 'Update Stock',
    'inv.save': 'Save Changes',

    // --- Purchasing ---
    'pur.rfq': 'Request for Quotation',
    'pur.smartRestock': 'Smart Restock',
    'pur.lowStockAlert': 'Items Low Stock',
    'pur.selectMaterial': 'Select Material',
    'pur.compareTitle': 'Price Comparison',
    'pur.addQuote': 'Add Quote',

    // --- Complaints ---
    'comp.title': 'Customer Complaints',
    'comp.subtitle': 'Support & Resolution Tracking',
    'comp.add': 'Add Complaint',
    'comp.pending': 'Pending',
    'comp.resolved': 'Resolved',
    'comp.date': 'Date',
    'comp.topic': 'Topic',
    'comp.assigned': 'Assigned To',
    'comp.priority': 'Priority',
    'comp.status': 'Status',
    'comp.desc': 'Description',
    'comp.resolution': 'Resolution',

    // --- Reports ---
    'report.title': 'Executive Reports',
    'report.subtitle': 'Data-Driven Insights',
    'report.selectYear': 'Year',
    'report.print': 'Print Report',
    'report.aiAnalysis': 'AI Executive Summary',
    'report.customerRisk': 'Customer Dependency Risk',
    'report.laborEff': 'Labor Efficiency',
    'report.totalSpend': 'Total Spend',
    'report.totalItems': 'Total Items',
    'report.totalProduced': 'Total Produced',

    // --- Warehouse Map ---
    'wms.title': 'Warehouse Map (WMS)',
    'wms.relocate': 'Relocate',

    // --- Production ---
    'prod.title': 'Production Control',
    'prod.subtitle': 'Real-time Monitoring',
    'prod.dailyLog': 'Daily Logs',
    'prod.dailyLogSub': 'Record output per shift',
    'prod.poNumber': 'PO Number',
    'prod.productDetail': 'Product Detail',
    'prod.target': 'Target',
    'prod.produced': 'Produced',
    'prod.progress': 'Progress',
    'prod.shift': 'Shift',
    'prod.outputToday': 'Output',
    'prod.noLogs': 'No logs found for this date',

    // --- Employees ---
    'emp.title': 'Employee Management',
    'emp.subtitle': 'HR & Payroll',
    'emp.name': 'Name',
    'emp.department': 'Department',
    'emp.dailyWage': 'Daily Wage',
    'emp.hireDate': 'Start Date',

    // --- Settings ---
    'set.title': 'System Settings',
    'set.saveAll': 'Save All Changes',
    'set.companyProfile': 'Company Profile',
    'set.companyName': 'Company Name',
    'set.companyAddress': 'Address',
    'set.taxId': 'Tax ID',
    'set.logoUrl': 'Logo URL',
    'set.overhead': 'Overhead Costs',
    'set.depreciation': 'Machine Depreciation',
    'set.general': 'General Config',
    'set.regrind': 'Regrind %',
    'set.oeeHours': 'Standard Hours/Day',
    'set.qcReasons': 'QC Reject Reasons',
    'set.prodSteps': 'Production Steps',
    'set.machineStatus': 'Machine Statuses',
    'set.newItemPlaceholder': 'Type and press Enter...',
    'set.totalPerHour': 'Total Cost / Hour',
    'set.addOverhead': 'Add Cost Item',
    'set.costName': 'Cost Name',
    'set.export': 'Export Data',
    'set.import': 'Import Data',
    'set.saveSuccess': 'Settings Saved Successfully',

    // --- QC ---
    'qc.title': 'Quality Control (QC)',

    // --- Common ---
    'common.search': 'Search...',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.unit': 'Unit',
    'common.date': 'Date',
    'common.loading': 'Loading...',
    'common.comingSoon': 'Coming Soon',
    'common.underConstruction': 'This feature is under development.',
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
    'inv.itemName': 'ชื่อรายการ',
    'inv.inStock': 'คงเหลือ',
    'inv.unit': 'หน่วยนับ',
    'inv.updateStock': 'ปรับปรุงยอดสต็อก',
    'inv.save': 'บันทึกยอด',

    // --- Purchasing ---
    'pur.rfq': 'เทียบราคา (RFQ)',
    'pur.smartRestock': 'ระบบช่วยเติมของ',
    'pur.lowStockAlert': 'รายการของใกล้หมด',
    'pur.selectMaterial': 'เลือกวัตถุดิบ',
    'pur.compareTitle': 'เปรียบเทียบราคา Supplier',
    'pur.addQuote': 'เพิ่มใบเสนอราคา',

    // --- Complaints ---
    'comp.title': 'ข้อร้องเรียนลูกค้า',
    'comp.subtitle': 'ติดตามและแก้ไขปัญหา',
    'comp.add': 'แจ้งเรื่องร้องเรียน',
    'comp.pending': 'รอดำเนินการ',
    'comp.resolved': 'แก้ไขแล้ว',
    'comp.date': 'วันที่แจ้ง',
    'comp.topic': 'หัวข้อ',
    'comp.assigned': 'ผู้รับผิดชอบ',
    'comp.priority': 'ความสำคัญ',
    'comp.status': 'สถานะ',
    'comp.desc': 'รายละเอียดปัญหา',
    'comp.resolution': 'แนวทางแก้ไข',

    // --- Reports ---
    'report.title': 'รายงานผู้บริหาร',
    'report.subtitle': 'วิเคราะห์ข้อมูลเชิงลึก',
    'report.selectYear': 'ปี',
    'report.print': 'พิมพ์รายงาน',
    'report.aiAnalysis': 'บทวิเคราะห์จาก AI',
    'report.customerRisk': 'ความเสี่ยงการพึ่งพาลูกค้า',
    'report.laborEff': 'ประสิทธิภาพแรงงาน',
    'report.totalSpend': 'ยอดซื้อรวม',
    'report.totalItems': 'จำนวนรายการ',
    'report.totalProduced': 'ยอดผลิตรวม',

    // --- Warehouse Map ---
    'wms.title': 'แผนผังโกดัง (WMS Blueprint)',
    'wms.relocate': 'ย้ายตำแหน่ง',

    // --- Production ---
    'prod.title': 'ควบคุมการผลิต',
    'prod.subtitle': 'ติดตามสถานะเครื่องจักร',
    'prod.dailyLog': 'บันทึกประจำวัน',
    'prod.dailyLogSub': 'ลงยอดผลิตตามกะงาน',
    'prod.poNumber': 'เลขที่ PO',
    'prod.productDetail': 'รายละเอียดสินค้า',
    'prod.target': 'เป้าหมาย',
    'prod.produced': 'ผลิตได้',
    'prod.progress': 'คืบหน้า',
    'prod.shift': 'กะงาน',
    'prod.outputToday': 'ยอดผลิตวันนี้',
    'prod.noLogs': 'ไม่พบบันทึกการผลิตในวันที่เลือก',

    // --- Employees ---
    'emp.title': 'จัดการพนักงาน',
    'emp.subtitle': 'ข้อมูลบุคคลและค่าแรง',
    'emp.name': 'ชื่อ-นามสกุล',
    'emp.department': 'แผนก',
    'emp.dailyWage': 'ค่าแรงรายวัน',
    'emp.hireDate': 'วันที่เริ่มงาน',

    // --- Settings ---
    'set.title': 'ตั้งค่าระบบ',
    'set.saveAll': 'บันทึกการตั้งค่าทั้งหมด',
    'set.companyProfile': 'ข้อมูลบริษัท',
    'set.companyName': 'ชื่อบริษัท',
    'set.companyAddress': 'ที่อยู่',
    'set.taxId': 'เลขผู้เสียภาษี',
    'set.logoUrl': 'URL โลโก้บริษัท',
    'set.overhead': 'ค่าใช้จ่ายแฝง (Overhead)',
    'set.depreciation': 'ค่าเสื่อมราคาเครื่องจักร',
    'set.general': 'การตั้งค่าทั่วไป',
    'set.regrind': 'สัดส่วนของบด (%)',
    'set.oeeHours': 'ชั่วโมงงานมาตรฐาน/วัน',
    'set.qcReasons': 'สาเหตุของเสีย (QC Reject)',
    'set.prodSteps': 'ขั้นตอนการผลิต',
    'set.machineStatus': 'สถานะเครื่องจักร',
    'set.newItemPlaceholder': 'พิมพ์และกด Enter เพื่อเพิ่ม...',
    'set.totalPerHour': 'รวมต้นทุนต่อชั่วโมง',
    'set.addOverhead': 'เพิ่มรายการค่าใช้จ่าย',
    'set.costName': 'ชื่อรายการ',
    'set.export': 'ส่งออกข้อมูล (Backup)',
    'set.import': 'นำเข้าข้อมูล (Restore)',
    'set.saveSuccess': 'บันทึกการตั้งค่าเรียบร้อยแล้ว',

    // --- QC ---
    'qc.title': 'ตรวจสอบคุณภาพ (QC)',

    // --- Common ---
    'common.search': 'ค้นหา...',
    'common.status': 'สถานะ',
    'common.actions': 'จัดการ',
    'common.unit': 'หน่วย',
    'common.date': 'วันที่',
    'common.loading': 'กำลังโหลด...',
    'common.comingSoon': 'เร็วๆ นี้',
    'common.underConstruction': 'ฟีเจอร์นี้กำลังอยู่ระหว่างการพัฒนา',
  },
  cn: {
    // --- Layout & Header ---
    'app.name': 'CT.ELECTRIC',
    'app.desc': '工厂操作系统',
    'layout.quickAdd': '快速操作',
    'layout.newOrder': '新订单',
    'layout.newOrderDesc': '创建生产单',
    'layout.newProduct': '新产品',
    'layout.newProductDesc': '添加到目录',
    'layout.newCustomer': '新客户',
    'layout.newCustomerDesc': '注册客户信息',
    'layout.notifications': '通知',
    'layout.markRead': '全部标记为已读',
    'layout.viewAll': '查看全部',
    'layout.profile': '管理员',
    'layout.role': '工厂经理',
    'layout.settings': '系统设置',
    'layout.logout': '登出',
    'layout.copyright': 'CT.ELECTRIC © 2025 版权所有',

    // --- Navigation ---
    'nav.overview': '系统概览',
    'nav.sales': '销售与计划',
    'nav.production': '生产线管理',
    'nav.warehouse': '仓库与运输',
    'nav.management': '管理与分析',
    'nav.dashboard': '仪表盘',
    'nav.customers': '客户管理',
    'nav.orders': '生产计划 (MRP)',
    'nav.poDocs': '生产工单 (Job Order)',
    'nav.machineStatus': '机器状态',
    'nav.kanban': '生产看板 (Kanban)',
    'nav.prodLogs': '生产记录',
    'nav.qc': '质量控制 (QC)',
    'nav.finishedGoods': '成品库存',
    'nav.rawMaterials': '原材料 / BOM',
    'nav.products': '产品目录',
    'nav.shipping': '发货管理',
    'nav.complaints': '客户投诉',
    'nav.employees': '员工管理',
    'nav.maintenance': '设备维护',
    'nav.purchasing': '采购管理',
    'nav.analysisProfit': '利润分析',
    'nav.oee': '设备综合效率 (OEE)',
    'nav.reports': '高管报告',
    'nav.settings': '设置',
    'nav.warehouseMap': '仓库地图 (WMS)',

    // --- Dashboard ---
    'dash.totalOrders': '总订单数',
    'dash.activeMachines': '运行机器',
    'dash.pendingQC': '待质检',
    'dash.ofTotal': '占总数',
    'dash.productionVolume': '生产总量',
    'dash.qcStatus': '质检状态',
    'dash.recentLogs': '最近记录',

    // --- MRP / Orders ---
    'mrp.title': '生产计划 (MRP)',
    'mrp.subtitle': '物料需求计划',
    'mrp.autoCalc': '自动计算',
    'mrp.demand': '总需求',
    'mrp.stock': '当前库存',
    'mrp.wip': '在制品 (WIP)',
    'mrp.qcPending': '待质检',
    'mrp.shortage': '短缺',
    'mrp.sufficient': '充足',
    'mrp.produceNow': '立即生产',
    'mrp.orderList': '订单详情',
    'mrp.noData': '未找到活跃订单',

    // --- Products & AI ---
    'product.add': '添加产品',
    'product.search': '搜索产品...',
    'product.name': '产品名称',
    'product.color': '颜色',
    'product.cycleTime': '生产周期 (秒)',
    'product.price': '销售价格',
    'product.aiBtn': 'AI 价格建议',
    'product.aiAnalyzing': '正在分析成本...',
    'product.aiTitle': 'AI 分析',
    'product.breakEven': '盈亏平衡点',
    'product.recommended': '建议价格',
    'product.marketRange': '市场价格范围',
    'product.applyPrice': '应用此价格',
    'product.save': '保存产品',
    'product.cancel': '取消',
    'product.edit': '编辑产品',
    'product.new': '新产品',

    // --- Inventory ---
    'inv.title': '库存管理',
    'inv.subtitle': '实时库存监控',
    'inv.tabFinished': '成品',
    'inv.tabComponent': '组件',
    'inv.tabRaw': '原材料',
    'inv.search': '搜索物品...',
    'inv.itemName': '物品名称',
    'inv.inStock': '库存量',
    'inv.unit': '单位',
    'inv.updateStock': '更新库存',
    'inv.save': '保存更改',

    // --- Purchasing ---
    'pur.rfq': '询价 (RFQ)',
    'pur.smartRestock': '智能补货',
    'pur.lowStockAlert': '低库存预警',
    'pur.selectMaterial': '选择原料',
    'pur.compareTitle': '供应商比价',
    'pur.addQuote': '添加报价',

    // --- Complaints ---
    'comp.title': '客户投诉',
    'comp.subtitle': '支持与解决跟踪',
    'comp.add': '添加投诉',
    'comp.pending': '待处理',
    'comp.resolved': '已解决',
    'comp.date': '日期',
    'comp.topic': '主题',
    'comp.assigned': '指派给',
    'comp.priority': '优先级',
    'comp.status': '状态',
    'comp.desc': '描述',
    'comp.resolution': '解决方案',

    // --- Reports ---
    'report.title': '高管报告',
    'report.subtitle': '数据驱动洞察',
    'report.selectYear': '年份',
    'report.print': '打印报告',
    'report.aiAnalysis': 'AI 执行摘要',
    'report.customerRisk': '客户依赖风险',
    'report.laborEff': '劳动力效率',
    'report.totalSpend': '总支出',
    'report.totalItems': '总项目数',
    'report.totalProduced': '总产量',

    // --- Warehouse Map ---
    'wms.title': '仓库地图 (WMS)',
    'wms.relocate': '移动位置',

    // --- Production ---
    'prod.title': '生产控制',
    'prod.subtitle': '实时监控',
    'prod.dailyLog': '每日记录',
    'prod.dailyLogSub': '每班次产量记录',
    'prod.poNumber': '订单号 (PO)',
    'prod.productDetail': '产品详情',
    'prod.target': '目标',
    'prod.produced': '已生产',
    'prod.progress': '进度',
    'prod.shift': '班次',
    'prod.outputToday': '今日产量',
    'prod.noLogs': '该日期无记录',

    // --- Employees ---
    'emp.title': '员工管理',
    'emp.subtitle': '人力资源与薪资',
    'emp.name': '姓名',
    'emp.department': '部门',
    'emp.dailyWage': '日薪',
    'emp.hireDate': '入职日期',

    // --- Settings ---
    'set.title': '系统设置',
    'set.saveAll': '保存所有更改',
    'set.companyProfile': '公司简介',
    'set.companyName': '公司名称',
    'set.companyAddress': '地址',
    'set.taxId': '税务登记号',
    'set.logoUrl': 'Logo 链接',
    'set.overhead': '间接成本 (Overhead)',
    'set.depreciation': '机器折旧',
    'set.general': '常规配置',
    'set.regrind': '回料比例 (%)',
    'set.oeeHours': '标准工时/天',
    'set.qcReasons': '质检拒收原因',
    'set.prodSteps': '生产步骤',
    'set.machineStatus': '机器状态列表',
    'set.newItemPlaceholder': '输入并按回车添加...',
    'set.totalPerHour': '每小时总成本',
    'set.addOverhead': '添加成本项',
    'set.costName': '成本名称',
    'set.export': '导出数据',
    'set.import': '导入数据',
    'set.saveSuccess': '设置保存成功',

    // --- QC ---
    'qc.title': '质量控制 (QC)',

    // --- Common ---
    'common.search': '搜索...',
    'common.status': '状态',
    'common.actions': '操作',
    'common.unit': '单位',
    'common.date': '日期',
    'common.loading': '加载中...',
    'common.comingSoon': '即将推出',
    'common.underConstruction': '此功能正在开发中',
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
