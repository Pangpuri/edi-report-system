"use client";

import { useEffect, useState, use, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getPOPrintData, getBulkPOPrintData, moveProcessedToHistoryAction } from "@/app/actions/edi/as400-actions";
import { getCustomerAddresses, CustomerAddressData } from "@/app/actions/master/address-actions";
import { Loader2, Printer, Search, X, AlertCircle } from "lucide-react";

const formatDateToDDMMYYYY = (dateString: string | null | undefined): string => {
  if (!dateString) return "";

  const val = dateString.toString().trim();
  
  // 1. กรณี YYYY-MM-DD หรือ YYYY/MM/DD (รองรับที่มีเวลาต่อท้าย เช่น 2024-10-27 10:00:00)
  const isoMatch = val.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})/);
  if (isoMatch) {
    const [_, y, m, d] = isoMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // 2. กรณี DD-MM-YYYY หรือ DD/MM/YYYY
  const dmyMatch = val.match(/^(\d{1,2})-\/-\//);
  if (dmyMatch) {
    const [_, d, m, y] = dmyMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // 3. กรณี YYYYMMDD (รูปแบบ legacy string เช่น 20241027)
  if (/^\d{8}$/.test(val)) {
    return `${val.slice(6, 8)}/${val.slice(4, 6)}/${val.slice(0, 4)}`;
  }

  return val;
};

interface POHeader {
  id: number;
  customerNum?: string | null;
  customerName?: string | null;
  customerPo?: string | null;
  datePo?: string | null;
  dateShip?: string | null;
  eanLocationCode?: string | null;
  companyNameMaster?: string | null;
  fileName?: string | null;
  hType?: string | null;
  totalAmount?: number | string | null;
}

interface POAddress {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  zip_code?: string | null;
  telephone?: string | null;
  fax_no?: string | null;
}

interface PODetail {
  id: number | string;
  lineNum: string | number | null;
  productName?: string | null;
  packSize?: string | null;
  barCodeItem?: string | null;
  buyerProdCode?: string | null;
  vendorProdCode?: string | null;
  qtyOrder?: number | string | null;
  priceUnit?: number | string | null;
  freeQty?: number | string | null;
  discount1?: number | string | null;
  discount2?: number | string | null;
  discount3?: number | string | null;
  netAmount?: number | string | null;
}

interface POEditData {
  customerNum: string;
  customerName: string;
  address1: string;
  address2: string;
  city: string;
  zipCode: string;
  telephone: string;
  faxNo: string;
  deptCode: string;
  deptName: string;
  note: string;
  poNum: string;
  datePo: string;
  dateShip: string;
  dateCancel: string;
  paymentTerm: string;
  poType: string;
  mailPromotion: string;
  discount: string;
  vendorInternalCode: string;
  headOfficeCode: string;
  shipToEan: string;
  shipToName: string;
  shipToAddress1: string;
  shipToAddress2: string;
  shipToCity: string;
  shipToZipCode: string;
  shipToTelephone: string;
  shipToFaxNo: string;
}

interface POFullData {
  header: POHeader;
  address: POAddress;
  details: PODetail[];
  editData: POEditData;
}

export default function POPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const idParam = resolvedParams.id;
  const type = (searchParams.get("type") as "processed" | "history") || "processed";
  const idsFromQuery = searchParams.get("ids");

  const [poList, setPoList] = useState<POFullData[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const [showAddressSelector, setShowAddressSelector] = useState<{show: boolean, poIndex: number}>({show: false, poIndex: 0});
  const [searchQuery, setSearchQuery] = useState("");

  const initEditData = (po: { header: POHeader; address: POAddress }): POEditData => {
    const { header, address } = po;
    return {
      customerNum: header.customerNum || "",
      customerName: header.customerName || "",
      address1: address?.address1 || "",
      address2: address?.address2 || "",
      city: address?.city || "",
      zipCode: address?.zip_code || "",
      telephone: address?.telephone || "",
      faxNo: address?.fax_no || "",
      deptCode: "",
      deptName: "",
      note: "",
      poNum: header.customerPo || "",
      datePo: formatDateToDDMMYYYY(header.datePo),
      dateShip: formatDateToDDMMYYYY(header.dateShip),
      dateCancel: "-",
      paymentTerm: "",
      poType: "-",
      mailPromotion: "-",
      discount: "-",
      vendorInternalCode: "-",
      headOfficeCode: "-",
      shipToEan: header.eanLocationCode || "",
      shipToName: header.companyNameMaster || header.customerName || "",
      shipToAddress1: address?.address1 || "",
      shipToAddress2: address?.address2 || "",
      shipToCity: address?.city || "",
      shipToZipCode: address?.zip_code || "",
      shipToTelephone: address?.telephone || "",
      shipToFaxNo: address?.fax_no || "",
    };
  };

  // Load Data
  useEffect(() => {
    async function loadData() {
      try {
        let results: { header: POHeader; address: POAddress; details: PODetail[] }[] = [];
        const [addrRes] = await Promise.all([getCustomerAddresses()]);
        if (addrRes.success) setAddresses(addrRes.data);

        if (idParam === "bulk" && idsFromQuery) {
          const ids = idsFromQuery.split(",").map(i => parseInt(i));
          const res = (await getBulkPOPrintData(ids, type)) as unknown as { header: POHeader; address: POAddress; details: PODetail[] }[];
          results = res;
        } else if (idParam !== "bulk") {
          const res = (await getPOPrintData(parseInt(idParam), type)) as unknown as { header: POHeader; address: POAddress; details: PODetail[] };
          if (res) results = [res];
        }

        if (results.length === 0) {
          setError("ไม่พบข้อมูลใบสั่งซื้อ");
        } else {
          setPoList(results.map(r => ({ ...r, editData: initEditData(r) })));
        }

      } catch (err) {
        console.error("Load Bulk PO Error:", err);
        setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [idParam, idsFromQuery, type]);

  const handleFieldChange = (poIndex: number, field: keyof POEditData, value: string) => {
    setPoList(prev => {
      const newList = [...prev];
      const targetPo = newList[poIndex];
      targetPo.editData = { ...targetPo.editData, [field]: value } as POEditData;

      if (field === "customerNum") {
        const match = addresses.find(a => (a.customer_no || "").trim() === value.trim());
        if (match) {
          targetPo.editData.customerName = match.company_name || "";
          targetPo.editData.address1 = match.address1 || "";
          targetPo.editData.address2 = match.address2 || "";
          targetPo.editData.city = match.city || "";
          targetPo.editData.zipCode = match.zip_code || "";
          targetPo.editData.telephone = match.telephone || "";
          targetPo.editData.faxNo = match.fax_no || "";
        }
      } else if (field === "shipToEan") {
        const match = addresses.find(a => (a.ean_location_code || "").trim() === value.trim());
        if (match) {
          targetPo.editData.shipToName = match.company_name || "";
          targetPo.editData.shipToAddress1 = match.address1 || "";
          targetPo.editData.shipToAddress2 = match.address2 || "";
          targetPo.editData.shipToCity = match.city || "";
          targetPo.editData.shipToZipCode = match.zip_code || "";
          targetPo.editData.shipToTelephone = match.telephone || "";
          targetPo.editData.shipToFaxNo = match.fax_no || "";
        }
      }
      return newList;
    });
  };

  const filteredAddresses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return addresses.slice(0, 20); 
    return addresses.filter(a => 
      (a.company_name?.toLowerCase().includes(q)) ||
      (a.ean_location_code?.toLowerCase().includes(q)) ||
      (a.customer_no?.toLowerCase().includes(q))
    ).slice(0, 50); 
  }, [addresses, searchQuery]);

  const handleSelectShipTo = (addr: CustomerAddressData) => {
    const poIdx = showAddressSelector.poIndex;
    handleFieldChange(poIdx, "shipToEan", addr.ean_location_code || "");
    setShowAddressSelector({ show: false, poIndex: 0 });
    setSearchQuery("");
  };

  const handlePrint = async () => {
    if (type === 'processed') {
      if (!confirm("ยืนยันการบันทึกและย้ายข้อมูลรายการเหล่านี้เข้าคลังประวัติ?")) return;
      setIsArchiving(true);
      try {
        for (const po of poList) {
          await moveProcessedToHistoryAction([po.header.id], po.editData);
        }
        window.print();
      } catch (err) {
        console.error("Archive on Print Error:", err);
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      } finally {
        setIsArchiving(false);
      }
    } else {
      window.print();
    }
  };

  // --- Logic for Pagination ---
  const getPagedData = (po: POFullData): PODetail[][] => {
    const itemsPerPageFirst = 12; 
    const itemsPerPageOthers = 28; 
    const pages: PODetail[][] = [];
    let currentItem = 0;

    while (currentItem < po.details.length) {
      const isFirstPage = pages.length === 0;
      const count = isFirstPage ? itemsPerPageFirst : itemsPerPageOthers;
      pages.push(po.details.slice(currentItem, currentItem + count));
      currentItem += count;
    }
    
    if (pages.length === 0) pages.push([]); 
    return pages;
  };

  const calculatePOTotals = (po: POFullData) => {
    const subtotal = po.details.reduce((sum, d) => sum + Number(d.netAmount || 0), 0);
    const grandTotal = Number(po.header.totalAmount || 0);
    const vat = grandTotal - subtotal;
    return {
      subtotal,
      vat,
      grandTotal
    };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-black" size={48} /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-white p-4"><div className="border border-black p-8 text-center max-w-md"><AlertCircle className="mx-auto text-black mb-4" size={48} /><h2 className="text-xl font-medium mb-2">ไม่พบข้อมูล</h2><p className="text-black mb-6">{error}</p><button onClick={() => window.close()} className="px-6 py-2 border border-black hover:bg-black hover:text-white transition-colors">ปิดหน้านี้</button></div></div>;

  const now = new Date();
  const printDateStr = `${now.toLocaleDateString("th-TH")} ${now.toLocaleTimeString("th-TH", { hour12: false })}`;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 print:bg-white print:py-0 print:px-0 font-sans overflow-x-hidden relative text-black">
      
      {/* Controls */}
      <div className="max-w-[210mm] mx-auto mb-8 bg-white p-6 border border-black flex flex-col sm:flex-row justify-between items-center gap-6 print:hidden sticky top-4 z-50 shadow-md">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Purchase Order Preview</h1>
          <p className="text-sm">Batch: {poList.length} Items</p>
        </div>
        <div className="flex gap-3">
          <button disabled={isArchiving} onClick={handlePrint} className="flex items-center gap-2 px-8 py-3 bg-black text-white disabled:opacity-50 transition-all font-bold uppercase text-xs">
            {isArchiving ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
            {isArchiving ? "Saving..." : "Confirm & Print"}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-12 print:gap-0">
        {poList.map((po, poIdx) => {
          const pages = getPagedData(po);
          const totals = calculatePOTotals(po);

          return pages.map((pageItems, pageIdx) => (
            <div key={`${po.header.id}-${pageIdx}`} className="document-page bg-white w-[210mm] min-h-[297mm] pt-[calc(10mm+20px)] pb-[calc(10mm+20px)] px-[10mm] text-[11px] leading-tight text-black relative flex flex-col mb-12 print:mb-0 shadow-2xl print:shadow-none">
              
              {/* Metadata */}
              <div className="flex justify-between items-start mb-2 text-[10px] text-black">
                <div className="flex gap-6">
                  <div>Print {printDateStr}</div>
                  <div>Filename : {po.header.fileName || "N/A"}</div>
                </div>
                <div>PAGE {pageIdx + 1}/{pages.length}</div>
              </div>

              {/* Header - Page 1 Only */}
              {pageIdx === 0 && (
                <div className="grid grid-cols-2 gap-0 border-t border-black mb-4 text-black">
                  <div className="border-r border-black p-4 space-y-1">
                    <div className="flex items-center gap-2 mb-1 border-b border-dotted border-black/20 pb-0.5">
                      <span>ผู้สั่งซื้อ :</span>
                      <input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.customerNum} onChange={(e) => handleFieldChange(poIdx, "customerNum", e.target.value)} />
                    </div>
                    <input className="w-full uppercase bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors mb-0.5" value={po.editData.customerName} onChange={(e) => handleFieldChange(poIdx, "customerName", e.target.value)} />
                    <div className="space-y-0.5 min-h-[3em]">
                      <input className="w-full bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.address1} onChange={(e) => handleFieldChange(poIdx, "address1", e.target.value)} />
                      <input className="w-full bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.address2} onChange={(e) => handleFieldChange(poIdx, "address2", e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                       <input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.city} onChange={(e) => handleFieldChange(poIdx, "city", e.target.value)} />
                       <input className="w-20 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.zipCode} onChange={(e) => handleFieldChange(poIdx, "zipCode", e.target.value)} />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1 flex gap-1 items-center">
                        <span className="text-[12px]">โทรศัพท์:</span>
                        <input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-[12px] text-black transition-colors" value={po.editData.telephone} onChange={(e) => handleFieldChange(poIdx, "telephone", e.target.value)} />
                      </div>
                      <div className="flex-1 flex gap-1 items-center">
                        <span className="text-[12px]">โทรสาร:</span>
                        <input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-[12px] text-black transition-colors" value={po.editData.faxNo} onChange={(e) => handleFieldChange(poIdx, "faxNo", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-2 border-t border-black">
                      <div className="flex items-center gap-1"><span>Dept Code:</span><input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.deptCode} onChange={(e) => handleFieldChange(poIdx, "deptCode", e.target.value)} /></div>
                      <div className="flex items-center gap-1"><span>Dept Name:</span><input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.deptName} onChange={(e) => handleFieldChange(poIdx, "deptName", e.target.value)} /></div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-black text-black">
                      <div className="mb-1 border-b border-dotted border-black/20 pb-0.5">ผู้ผลิต : {po.header.hType || "H"}</div>
                      <div className="py-0.5">บ.โรงงานผลิตภัณฑ์อาหารไทย จำกัด.</div>
                      <div className="text-black">42/1 หมู่ 4 ถ.เพชรเกษม ต.อ้อมใหญ่ อ.สามพราน จ.นครปฐม 73160</div>
                      <div className="flex gap-4 mt-1"><span>โทรศัพท์ : 028116210</span><span>โทรสาร : 028116220</span></div>
                      <div className="mt-4 flex gap-2 items-start"><span>หมายเหตุ :</span><textarea className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm resize-none h-12 overflow-hidden leading-snug text-black transition-colors" value={po.editData.note} onChange={(e) => handleFieldChange(poIdx, "note", e.target.value)} /></div>
                    </div>
                  </div>
                  <div className="p-4 space-y-1 text-black">
                    <div className="space-y-1.5 mb-4 mt-4">
                      {([
                        { label: "เลขที่ใบสั่งซื้อ :", name: "poNum" },
                        { label: "วันที่สั่งสินค้า :", name: "datePo" },
                        { label: "วันที่ส่งสินค้า :", name: "dateShip" },
                        { label: "วันที่ยกเลิกใบสั่งซื้อ :", name: "dateCancel" },
                        { label: "การชำระเงิน :", name: "paymentTerm", suffix: "วัน" },
                        { label: "PO Type :", name: "poType" },
                        { label: "Mail Promotion :", name: "mailPromotion" },
                        { label: "ส่วนลด(%) :", name: "discount" },
                        { label: "รหัสภายในผู้ผลิต :", name: "vendorInternalCode" },
                        { label: "รหัสสำนักงานใหญ่ :", name: "headOfficeCode" },
                      ] as { label: string; name: keyof POEditData; suffix?: string }[]).map(f => (
                        <div key={f.name} className="flex items-center">
                          <span className="w-36 flex-shrink-0 opacity-60">{f.label}</span>
                          <div className="flex-1 flex items-center">
                            <input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData[f.name]} onChange={(e) => handleFieldChange(poIdx, f.name, e.target.value)} />
                            {f.suffix && <span className="ml-1">{f.suffix}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-black group/shipto relative text-black">
                      <button onClick={() => setShowAddressSelector({ show: true, poIndex: poIdx })} className={`absolute right-0 top-4 p-1.5 border border-black bg-white rounded transition-all print:hidden ${showAddressSelector.show && showAddressSelector.poIndex === poIdx ? "bg-black text-white ring-4 ring-black/5" : "opacity-40 hover:opacity-100"}`} title="ค้นหาที่จัดส่ง"><Search size={12} /></button>
                      <div className="flex items-center gap-2 mb-1 border-b border-dotted border-black/20 pb-0.5"><span>โปรดส่งสินค้าไปที่ :</span><input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.shipToEan} onChange={(e) => handleFieldChange(poIdx, "shipToEan", e.target.value)} /></div>
                      <input className="w-full uppercase bg-slate-50 hover:bg-slate-100 outline-none border-none px-1 rounded-sm py-0.5 text-black transition-colors mb-0.5" value={po.editData.shipToName} onChange={(e) => handleFieldChange(poIdx, "shipToName", e.target.value)} />
                      <div className="space-y-0.5 min-h-[3em]">
                        <input className="w-full bg-slate-50 hover:bg-slate-100 outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.shipToAddress1} onChange={(e) => handleFieldChange(poIdx, "shipToAddress1", e.target.value)} />
                        <input className="w-full bg-slate-50 hover:bg-slate-100 outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.shipToAddress2} onChange={(e) => handleFieldChange(poIdx, "shipToAddress2", e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <input className="flex-1 bg-slate-50 hover:bg-slate-100 outline-none border-none px-1 rounded-sm text-black transition-colors" value={po.editData.shipToCity} onChange={(e) => handleFieldChange(poIdx, "shipToCity", e.target.value)} />
                        <input className="w-20 bg-slate-50 hover:bg-slate-100 outline-none border-none px-1 rounded-sm text-center text-black transition-colors" value={po.editData.shipToZipCode} onChange={(e) => handleFieldChange(poIdx, "shipToZipCode", e.target.value)} />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1 flex gap-1 items-center"><span className="text-[12px]">โทรศัพท์:</span><input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-[12px] text-black transition-colors" value={po.editData.shipToTelephone} onChange={(e) => handleFieldChange(poIdx, "shipToTelephone", e.target.value)} /></div>
                        <div className="flex-1 flex gap-1 items-center"><span className="text-[12px]">โทรสาร:</span><input className="flex-1 bg-slate-50 hover:bg-slate-100 focus:outline-none border-none px-1 rounded-sm text-[12px] text-black transition-colors" value={po.editData.shipToFaxNo} onChange={(e) => handleFieldChange(poIdx, "shipToFaxNo", e.target.value)} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="flex-1 flex flex-col border-t border-black">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-black text-[10px] uppercase font-normal">
                      <th className="py-2 px-1 border-r border-black text-left w-10">ลำดับ</th>
                      <th className="py-2 px-2 border-r border-black text-center">รายการ</th>
                      <th className="py-2 px-1 border-r border-black text-center w-16">ขนาดบรรจุ</th>
                      <th className="py-2 px-2 border-r border-black text-center w-60">รหัส(บาร์โค้ด/ผู้ซื้อ/ผู้ผลิต)</th>
                      <th className="py-2 px-1 border-r border-black text-right w-16">จำนวน</th>
                      <th className="py-2 px-1 border-r border-black text-center w-20">ราคา</th>
                      <th className="py-2 px-1 border-r border-black text-right w-12">แถม</th>
                      <th className="py-2 px-1 border-r border-black text-right w-16">ส่วนลด(%)</th>
                      <th className="py-2 px-1 border-r border-black text-right w-16">ส่วนลด2</th>
                      <th className="py-2 px-1 border-r border-black text-right w-16">ส่วนลด3</th>
                      <th className="py-2 px-1 text-center w-24">จำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="text-black">
                    {pageItems.map((item: PODetail) => (
                      <tr key={item.id} className="border-b border-black/10">
                        <td className="py-1.5 px-1 border-r border-black/10 text-center">{String(item.lineNum).padStart(3, '0')}</td>
                        <td className="py-1.5 px-2 border-r border-black/10 truncate max-w-[200px]">{item.productName}</td>
                        <td className="py-1.5 px-1 border-r border-black/10 text-center">{item.packSize}</td>
                        <td className="py-1.5 px-2 border-r border-black/10 text-[9px]">({item.barCodeItem || "-"}/{item.buyerProdCode || "-"}/{item.vendorProdCode || "-"})</td>
                        <td className="py-1.5 px-1 border-r border-black/10 text-right">{Number(item.qtyOrder).toFixed(1)}</td>
                        <td className="py-1.5 px-1 border-r border-black/10 text-right">{Number(item.priceUnit).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-1.5 px-1 border-r border-black/10 text-right">{Number(item.freeQty).toFixed(0)}</td>
                        <td className="py-1.5 px-1 border-r border-black/10 text-right">{Number(item.discount1).toFixed(2)}</td>
                        <td className="py-1.5 px-1 border-r border-black/10 text-right">{Number(item.discount2).toFixed(2)}</td>
                        <td className="py-1.5 px-1 border-r border-black/10 text-right">{Number(item.discount3).toFixed(2)}</td>
                        <td className="py-1.5 px-1 text-right">{Number(item.netAmount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                    {/* Empty Space Fillers */}
                    {pageItems.length < (pageIdx === 0 ? 12 : 28) && Array.from({length: (pageIdx === 0 ? 12 : 28) - pageItems.length}).map((_, i) => (
                      <tr key={`empty-${i}`} className="opacity-0"><td colSpan={11} className="py-1.5">&nbsp;</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Section - Page Last */}
              {pageIdx === pages.length - 1 && (
                <div className="mt-4 flex justify-end text-black">
                  <div className="w-72 border p-3 space-y-1.5">
                    <div className="flex justify-between"><span>รวมเงิน :</span><span>{totals.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>ส่วนลด :</span><span>0.00</span></div>
                    <div className="flex justify-between"><span>คงเหลือ :</span><span>0.00</span></div>
                    <div className="flex justify-between"><span>ส่วนลดพิเศษ :</span><span>0.00</span></div>
                    <div className="flex justify-between border-b border-black pb-1"><span>ภาษีมูลค่าเพิ่ม :</span><span>{totals.vat.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between pt-1 font-bold"><span>รวมทั้งสิ้น :</span><span>{totals.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                  </div>
                </div>
              )}

              {/* Document End Footer */}
              <div className="border-t border-black mt-auto pt-2 text-[9px] text-center opacity-40 uppercase">
                DOCUMENT - {po.editData.poNum} - PAGE {pageIdx + 1}/{pages.length}
              </div>
            </div>
          ));
        })}
      </div>

      {/* Selector Sidebar */}
      {showAddressSelector.show && (
        <div className="fixed right-0 top-0 bottom-0 z-[100] w-full max-w-md bg-white shadow-[-20px_0_50px_-12px_rgba(0,0,0,0.25)] flex flex-col border-l border-black animate-in slide-in-from-right duration-200 print:hidden">
            <div className="p-6 border-b border-black flex justify-between items-center bg-slate-50">
              <div><h2 className="font-bold text-black uppercase text-sm">ค้นหาที่จัดส่ง</h2><p className="text-[10px] text-brand-primary font-bold uppercase mt-1">กำลังเลือกให้ PO: {poList[showAddressSelector.poIndex].editData.poNum}</p></div>
              <button onClick={() => setShowAddressSelector({show: false, poIndex: 0})} className="p-2 border border-black hover:bg-black hover:text-white transition-all"><X size={20}/></button>
            </div>
            <div className="p-4 bg-white border-b border-black"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black" /><input type="text" placeholder="ค้นหา..." className="w-full pl-10 pr-4 py-3 border border-black outline-none" autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredAddresses.length === 0 ? <div className="py-20 text-center text-black italic text-sm">ไม่พบข้อมูล</div> : filteredAddresses.map((addr, idx) => (
                <button key={idx} onClick={() => handleSelectShipTo(addr)} className="w-full text-left p-4 border border-black mb-2 hover:bg-slate-100 transition-all">
                  <div className="flex justify-between items-start mb-1"><span className="font-medium text-sm text-black">{addr.company_name}</span><span className="text-[9px] border border-black px-2 py-0.5 font-mono text-black">{addr.ean_location_code}</span></div>
                  <p className="text-[11px] text-black line-clamp-2">{addr.address1} {addr.address2} {addr.city} {addr.zip_code}</p>
                </button>
              ))}
            </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0 !important; background: white !important; }
          .print-hidden { display: none !important; }
          .document-page { box-shadow: none !important; margin: 0 !important; padding-top: calc(10mm + 20px) !important; padding-bottom: calc(10mm + 20px) !important; padding-left: 10mm !important; padding-right: 10mm !important; page-break-after: always !important; border: none !important; }
          input, textarea { background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; font-family: inherit !important; font-size: inherit !important; color: black !important; }
        }
      `}</style>
    </div>
  );
}
