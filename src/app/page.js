/* eslint-disable */
"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, CheckSquare, ShieldCheck, FileText, Save, Camera, Printer, LogOut, Share2, List, PlusCircle, X, Settings, UserCircle, CheckCircle, Clock, Download, RefreshCw, Edit, CreditCard, Search, Building2 } from "lucide-react";
import "./globals.css";

const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  let str = '';
  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() + ' Only';
}

export const dynamic = 'force-dynamic';

function normalizeToYMD(dateStr, sheetName = '') {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    let year, month, day;
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, '0');
      day = parts[2].padStart(2, '0');
    } else {
      year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);

      if (p0 > 12) {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
      } else if (p1 > 12) {
        month = parts[0].padStart(2, '0');
        day = parts[1].padStart(2, '0');
      } else if (sheetName === 'Direct') {
        month = parts[0].padStart(2, '0');
        day = parts[1].padStart(2, '0');
      } else {
        day = parts[0].padStart(2, '0');
        month = parts[1].padStart(2, '0');
      }
    }
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

const escapeXml = (unsafe) => {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export default function Home() {
  const [role, setRole] = useState(null); // 'helper' or 'admin'
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState("new"); // helper: new, recent | admin: pending, completed, settings
  const [recentEntries, setRecentEntries] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedEntryIdx, setExpandedEntryIdx] = useState(null);

  // Settings state
  const [voucherSettings, setVoucherSettings] = useState({
    apmcStart: 10001,
    apmcEnd: 19999,
    apmcCurrent: 10001,
    directStart: 20001,
    directEnd: 29999,
    directCurrent: 20001,
    bankName: "SBI",
    firmName: "DARSHAN SEEDS INDUSTRIES",
  });

  // Entry Form State
  const initialForm = {
    date: typeof window !== "undefined" ? new Date().toISOString().split("T")[0] : "",
    purchaseType: "APMC",
    farmerName: "",
    villageName: "",
    mobileNumber: "",
    items: [{
      variety: "TaG24",
      customVariety: "",
      netWeight: "",
      deductionGrams: "",
      purchaseRate: ""
    }]
  };
  const [formData, setFormData] = useState(initialForm);
      
  // Admin Approval State
  const [editingEntry, setEditingEntry] = useState(null); // The row being approved
  const [paymentData, setPaymentData] = useState({
    cashAmount: "",
    chequeAmount: "",
    chequeNumber: ""
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [directBillFormat, setDirectBillFormat] = useState("modern"); // "modern" or "gujarati"
  const [showExportModal, setShowExportModal] = useState(false);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const handleRowClick = (entry) => {
    setSelectedEntry(entry);
    setShowViewModal(true);
  };

  const handlePrintFromView = (type) => {
    setLastSavedData(selectedEntry);
    setShowViewModal(false);
    if (type === 'invoice') setShowInvoiceModal(true);
    if (type === 'cheque') setShowChequeModal(true);
  };
  const [lastSavedData, setLastSavedData] = useState(null); 
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");

  const [chequeSettings, setChequeSettings] = useState({
    dateTop: "1", dateLeft: "15", dateCharSpacing: "5",
    payeeTop: "2.5", payeeLeft: "2",
    amountWordsTop: "3.5", amountWordsLeft: "2", amountWordsWidth: "12",
    amountNumTop: "4", amountNumLeft: "15"
  });

  const [dbSource, setDbSource] = useState("sheets");
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    if (showChequeModal) {
      const style = document.createElement('style');
      style.innerHTML = `
        @media print { 
          @page { size: 20.3cm 8.9cm !important; margin: 0 !important; } 
          body * { visibility: hidden; }
          #cheque-print-only, #cheque-print-only * { visibility: visible; }
          #cheque-print-only { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 0; }
        }
      `;
      style.id = 'cheque-print-style';
      document.head.appendChild(style);
    } else {
      const style = document.getElementById('cheque-print-style');
      if (style) style.remove();
    }
  }, [showChequeModal]);

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];
    setExportStartDate(firstDay);
    setExportEndDate(todayStr);
  }, []);

  useEffect(() => {
    const savedSettings = localStorage.getItem("voucherSettings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.start && !parsed.apmcStart) {
        setVoucherSettings({
          apmcStart: parsed.start,
          apmcEnd: parsed.end,
          apmcCurrent: parsed.current,
          directStart: 20001,
          directEnd: 29999,
          directCurrent: 20001,
          bankName: parsed.bankName || "SBI",
          firmName: parsed.firmName || "DARSHAN SEEDS INDUSTRIES"
        });
      } else {
        setVoucherSettings(parsed);
      }
    }

    // Hydrate persistent settings from Neon Postgres Cloud DB if available
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.isNeon) setDbSource("neon");
          if (data.settings) {
            if (data.settings.voucherSettings) {
              setVoucherSettings(prev => ({ ...prev, ...data.settings.voucherSettings }));
              localStorage.setItem("voucherSettings", JSON.stringify(data.settings.voucherSettings));
            }
            if (data.settings.chequeSettings) {
              setChequeSettings(data.settings.chequeSettings);
              localStorage.setItem("chequeSettings", JSON.stringify(data.settings.chequeSettings));
            }
          }
        }
      })
      .catch(err => console.error("Cloud settings fetch error:", err));
  }, []);

  useEffect(() => {
    const savedRole = localStorage.getItem("userRole");
    const savedUser = localStorage.getItem("purchaseApp_user");
    if (savedRole) {
      setRole(savedRole);
      setActiveTab(savedRole === 'admin' ? 'dashboard' : 'new');
    }
    if (savedUser) setLoginUsername(savedUser);
    const savedCheque = localStorage.getItem("chequeSettings");
    if (savedCheque) {
      setChequeSettings(JSON.parse(savedCheque));
    }
  }, []);

  useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement.type === "number") {
        document.activeElement.blur();
      }
    };
    window.addEventListener("wheel", handleWheel);
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  const fetchRecentEntries = async (forceAll = false) => {
    setIsLoadingRecent(true);
    try {
      let url = '/api/sheets/read?tab=' + activeTab + '&limit=30';
      if (activeTab === 'dashboard') {
         const d = new Date();
         const currentYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
         const nextYear = currentYear + 1;
         url = `/api/sheets/read?tab=dashboard&startDate=${currentYear}-04-01&endDate=${nextYear}-03-31`;
      } else if (forceAll === true && startDate && endDate) {
        url = `/api/sheets/read?tab=${activeTab}&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRecentEntries(data.data);
        if (data.source) setDbSource(data.source);
      } else {
        setRecentEntries([]);
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
      setRecentEntries([]);
    }
    setIsLoadingRecent(false);
  };

  useEffect(() => {
    if (role === "admin" || activeTab === "recent" || activeTab === "pending" || activeTab === "completed") {
      fetchRecentEntries();
    }
  }, [activeTab, role]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        setRole(data.role);
        localStorage.setItem("userRole", data.role);
        if (data.settings) {
          setVoucherSettings(prev => ({...prev, ...data.settings}));
          localStorage.setItem("voucherSettings", JSON.stringify(data.settings));
        }
        setActiveTab(data.role === 'admin' ? 'dashboard' : 'new');
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("નેટવર્ક એરર!");
    }
    setIsLoggingIn(false);
  };

  const netWeight = formData.items?.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0) || 0;
  const totalDeduction = formData.items?.reduce((sum, item) => sum + ((parseFloat(item.netWeight) || 0) / 35.0) * ((parseFloat(item.deductionGrams) || 0) / 1000), 0) || 0;
  const finalWeight = netWeight - totalDeduction;

  const finalAmount = formData.items?.reduce((sum, item) => {
    const nw = parseFloat(item.netWeight) || 0;
    const ded = parseFloat(item.deductionGrams) || 0;
    const fw = nw - ((nw / 35.0) * (ded / 1000));
    const pr = parseFloat(item.purchaseRate) || 0;
    return sum + Math.round((Math.floor(fw) / 20.0) * pr);
  }, 0) || 0;

  const purchaseRate = finalWeight > 0 ? (finalAmount / (Math.floor(finalWeight) / 20.0)).toFixed(2) : 0; // Average rate

  useEffect(() => {
    setPaymentData(prev => {
      if (prev.cashAmount !== "") {
        const cash = parseFloat(prev.cashAmount) || 0;
        const expectedCheque = Math.max(0, finalAmount - cash).toString();
        if (prev.chequeAmount !== expectedCheque) {
          return { ...prev, chequeAmount: expectedCheque };
        }
      }
      return prev;
    });
  }, [finalAmount]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [name]: value };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { variety: "TaG24", customVariety: "", netWeight: "", deductionGrams: "", purchaseRate: "" }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "cashAmount") {
        const cash = parseFloat(value) || 0;
        // Auto calculate cheque amount if value is entered (even 0)
        newData.chequeAmount = (value !== "" && cash >= 0) ? Math.max(0, finalAmount - cash).toString() : "";
      }
      return newData;
    });
  };

  const handlePhotoCapture = (e, setPhotoFunc) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => setPhotoFunc({ base64: reader.result, file: file });
  };

  const uploadPhoto = async (photoObj, type) => {
    if (!photoObj) return null;
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photoObj.base64, filename: `${type}_${photoObj.file.name}` })
      });
      const result = await response.json();
      if (result.success) return result.url;
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  };


  // HELPER SUBMIT
  const handleHelperSubmit = async (e) => {
    e.preventDefault();
    const isAPMC = formData.purchaseType === "APMC";
    setIsProcessing(true);

    try {
      const todayString = formData.date.replace(/-/g, ""); 
      const dailyKey = `dailySeq_${todayString}`;
      
      // 1. Fetch latest entries to determine correct next voucher and daily seq
      let currentVoucher = isAPMC ? (parseInt(voucherSettings.apmcStart, 10) || 10001) : (parseInt(voucherSettings.directStart, 10) || 1);
      let maxDailyNum = 0;
      
      try {
        const resRead = await fetch('/api/sheets/read');
        const readData = await resRead.json();
        const sheetNameStr = isAPMC ? "APMC" : "Direct";
        let maxFound = isNaN(currentVoucher) ? 0 : currentVoucher - 1;
        
        if (readData && readData.success && readData.data) {
           const endVoucherCheck = isAPMC ? parseInt(voucherSettings.apmcEnd, 10) : parseInt(voucherSettings.directEnd, 10);
           const startVoucherCheck = isAPMC ? parseInt(voucherSettings.apmcStart, 10) : parseInt(voucherSettings.directStart, 10);
           
           readData.data.forEach(item => {
             if (item.sheetName === sheetNameStr) {
               const v = parseInt(item.voucherId, 10);
               // Only consider voucher IDs within the current active series range
               if (!isNaN(v) && v >= startVoucherCheck && v <= endVoucherCheck && v > maxFound) {
                 maxFound = v;
               }
             }
             if (item.date === formData.date && item.dailyPurchaseId) {
               const parts = item.dailyPurchaseId.split("-");
               if (parts.length === 3) {
                 const num = parseInt(parts[2], 10);
                 if (!isNaN(num) && num > maxDailyNum) maxDailyNum = num;
               }
             }
           });
        }
        currentVoucher = maxFound + 1;
      } catch (err) {
        console.error("Error fetching latest voucher series", err);
      }

      // Use user provided voucher ID if admin overrides
      if (role === "admin" && formData.voucherId && formData.voucherId.trim() !== "") {
        currentVoucher = formData.voucherId.trim();
      } else {
        const endVoucher = isAPMC ? parseInt(voucherSettings.apmcEnd, 10) : parseInt(voucherSettings.directEnd, 10);
        if (currentVoucher > endVoucher) {
          alert(`${isAPMC ? 'APMC' : 'Direct'} સિરીઝ ની રેન્જ પૂરી થઈ ગઈ છે! (છેલ્લો વાઉચર નંબર: ${currentVoucher - 1})`);
          setIsProcessing(false);
          return;
        }
      }

      const actualVariety = formData.variety === "Other" ? formData.customVariety : formData.variety;

      const currentDailyNum = maxDailyNum + 1;
      const dailyPurchaseId = `PUR-${todayString}-${currentDailyNum.toString().padStart(3, '0')}`;

      const payload = {
        ...formData,
        voucherId: currentVoucher.toString(),
        sheetName: isAPMC ? "APMC" : "Direct",
        dailyPurchaseId: dailyPurchaseId,
        variety: actualVariety,
        netWeight,
        totalDeduction: totalDeduction.toFixed(2),
        finalWeight: finalWeight.toFixed(2),
        finalAmount,
        status: role === "admin" ? "Completed" : "Pending", // Helper entries are pending, admin entries are completed
        cashAmount: role === "admin" ? (paymentData.cashAmount === "" && paymentData.chequeAmount === "" ? "0" : (paymentData.cashAmount !== "" ? paymentData.cashAmount : Math.max(0, finalAmount - (parseFloat(paymentData.chequeAmount)||0)).toString())) : "",
        chequeAmount: role === "admin" ? (paymentData.cashAmount === "" && paymentData.chequeAmount === "" ? finalAmount.toString() : (paymentData.cashAmount !== "" ? Math.max(0, finalAmount - (parseFloat(paymentData.cashAmount)||0)).toString() : paymentData.chequeAmount)) : "",
        chequeNumber: role === "admin" ? paymentData.chequeNumber : "",
        mobileNumber: formData.mobileNumber,
        bankName: role === "admin" ? (voucherSettings.bankName || "") : "",
        itemsJSON: JSON.stringify(formData.items)
      };

      const response = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.success) {
        localStorage.setItem(dailyKey, currentDailyNum.toString());
        const newSettings = { 
          ...voucherSettings, 
          apmcCurrent: isAPMC ? voucherSettings.apmcCurrent + 1 : voucherSettings.apmcCurrent,
          directCurrent: !isAPMC ? voucherSettings.directCurrent + 1 : voucherSettings.directCurrent
        };
        setVoucherSettings(newSettings);
        localStorage.setItem("voucherSettings", JSON.stringify(newSettings));
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voucherSettings: newSettings })
        }).catch(err => console.error("Cloud voucher count save error:", err));

        if (role === "admin") {
          setLastSavedData(payload);
          setShowInvoiceModal(true);
          setFormData(initialForm);
          setPaymentData({ cashAmount: "", chequeAmount: "", chequeNumber: "" });
          setActiveTab("completed");
          fetchRecentEntries();
        } else {
          alert("એન્ટ્રી સફળતાપૂર્વક થઈ ગઈ છે! હવે એડમિન તેને ચેક કરશે.");
          setFormData(initialForm);
        }
      } else {
        alert("સેવ કરવામાં ભૂલ: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("નેટવર્ક એરર");
    } finally {
      setIsProcessing(false);
    }
  };

  // ADMIN APPROVE SUBMIT
  const handleAdminApprove = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const actualVariety = formData.variety === "Other" ? formData.customVariety : formData.variety;

      const payload = {
        id: editingEntry.id,
        rowIndex: editingEntry.rowIndex,
        oldSheetName: editingEntry.sheetName,
        purchaseType: formData.purchaseType,
        sheetName: formData.purchaseType === "APMC" ? "APMC" : "Direct",
        voucherId: formData.voucherId || editingEntry.voucherId,
        date: formData.date,
        dailyPurchaseId: editingEntry.dailyPurchaseId,
        farmerName: formData.farmerName,
        variety: actualVariety,
        netWeight,
        deductionGrams: "",
        totalDeduction: totalDeduction.toFixed(2),
        finalWeight: finalWeight.toFixed(2),
        purchaseRate,
        finalAmount,
        status: "Completed",
        cashAmount: paymentData.cashAmount === "" && paymentData.chequeAmount === "" ? "0" : (paymentData.cashAmount !== "" ? paymentData.cashAmount : Math.max(0, finalAmount - (parseFloat(paymentData.chequeAmount)||0)).toString()),
        chequeAmount: paymentData.cashAmount === "" && paymentData.chequeAmount === "" ? finalAmount.toString() : (paymentData.cashAmount !== "" ? Math.max(0, finalAmount - (parseFloat(paymentData.cashAmount)||0)).toString() : paymentData.chequeAmount),
        chequeNumber: paymentData.chequeNumber,
        bankName: voucherSettings.bankName || "",
        mobileNumber: formData.mobileNumber,
        itemsJSON: JSON.stringify(formData.items)
      };

      const response = await fetch('/api/sheets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        setLastSavedData(payload);
        setShowInvoiceModal(true);
        setEditingEntry(null);
        fetchRecentEntries();
      } else {
        alert("અપ્રુવ કરવામાં ભૂલ: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("નેટવર્ક એરર");
    } finally {
      setIsProcessing(false);
    }
  };

  const openApprovalModal = (entry) => {
    setEditingEntry(entry);
    let parsedItems = [];
    try {
      if (entry.itemsJSON) {
        parsedItems = JSON.parse(entry.itemsJSON);
      }
    } catch (e) {
      console.error("Failed to parse itemsJSON", e);
    }
    if (!parsedItems || parsedItems.length === 0) {
      parsedItems = [{
        variety: entry.variety || "TaG24",
        customVariety: "",
        netWeight: entry.netWeight || "",
        deductionGrams: entry.deductionGrams || "1500",
        purchaseRate: entry.purchaseRate || ""
      }];
    }

    // Ensure date is formatted as YYYY-MM-DD for date input
    let formattedDate = "";
    if (entry.date) {
      formattedDate = normalizeToYMD(entry.date, entry.sheetName);
    }
    if (!formattedDate) {
      formattedDate = new Date().toISOString().split("T")[0];
    }

    setFormData({
      purchaseType: (entry.sheetName === 'APMC' || entry.sheetName === 'Sheet1') ? 'APMC' : 'Direct',
      date: formattedDate,
      farmerName: entry.farmerName,
      villageName: entry.villageName || "",
      mobileNumber: entry.mobileNumber || "",
      voucherId: entry.voucherId,
      items: parsedItems
    });
    setPaymentData({
      cashAmount: entry.cashAmount || "",
      chequeAmount: entry.chequeAmount || "",
      chequeNumber: entry.chequeNumber || ""
    });
  };

  const handleExportTallyXML = async (sheetFilter) => {
    let entriesToExport = recentEntries;
    try {
      const res = await fetch(`/api/sheets/read?tab=completed&startDate=${exportStartDate}&endDate=${exportEndDate}`);
      const data = await res.json();
      if (data.success) {
        entriesToExport = data.data;
      }
    } catch (e) {
      console.error("Failed to fetch full data for export:", e);
    }

    const normExportStart = normalizeToYMD(exportStartDate);
    const normExportEnd = normalizeToYMD(exportEndDate);

    const completedEntries = entriesToExport.filter(e => {
      const actualSheetName = e.sheetName || e.purchaseType || 'APMC';
      if (e.status?.trim().toLowerCase() !== 'completed' || actualSheetName !== sheetFilter) return false;
      const entryDateStr = normalizeToYMD(e.date, actualSheetName);
      return entryDateStr && entryDateStr >= normExportStart && entryDateStr <= normExportEnd;
    });

    if (completedEntries.length === 0) {
      alert(`${exportStartDate} થી ${exportEndDate} સુધીની કોઈ ${sheetFilter === 'APMC' ? 'APMC' : 'Direct'} કમ્પ્લીટ એન્ટ્રી મળી નથી!`);
      return;
    }

    const companyName = voucherSettings.firmName || "DARSHAN SEEDS INDUSTRIES";

    let xml = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>`;

    completedEntries.forEach(entry => {
      const ymd = normalizeToYMD(entry.date, entry.sheetName || entry.purchaseType);
      const tallyDate = ymd ? ymd.replace(/-/g, "") : "";

      const voucherNo = escapeXml(entry.voucherId);
      const farmerName = escapeXml(entry.farmerName);
      const total = parseFloat(entry.finalAmount) || 0;

      let bankAmt = parseFloat(entry.chequeAmount) || 0;
      let cashAmt = parseFloat(entry.cashAmount) || 0;
      if (bankAmt === 0 && cashAmt === 0 && total > 0) {
        bankAmt = total;
      }

      const rawCheque = entry.chequeNumber || "";
      const chequeNo = rawCheque.replace(/[^0-9]/g, '');

      const bankLedger = escapeXml(entry.bankName || voucherSettings.bankName || "icici bank ltd cc");
      const cashLedger = "Cash";
      const purchaseLedger = "Purchase";
      const partyName = escapeXml(sheetFilter === 'Direct' ? "FARMERS PURCHASE DIRECT" : "FARMERS PURCHASE APMC");
      const voucherType = "Point of Purchase";

      xml += `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${voucherType}" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${tallyDate}</DATE>
            <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${voucherNo}</VOUCHERNUMBER>
            <PARTYNAME>${partyName}</PARTYNAME>
            <PARTYLEDGERNAME>${bankLedger}</PARTYLEDGERNAME>
            <BASICBUYERNAME>${escapeXml(companyName)}</BASICBUYERNAME>
            <BASICBASEPARTYNAME>${partyName}</BASICBASEPARTYNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <VCHENTRYMODE>Item Invoice</VCHENTRYMODE>`;

      if (chequeNo) {
        xml += `
            <POSCHEQUENUMBER>${chequeNo}</POSCHEQUENUMBER>`;
      }

      xml += `
            <UDF:UDF_CMPAUTHORISEDPLACE.LIST DESC="\`UDF_CMPAuthorisedPlace\`\`POPSellerNameUDF\`" ISLIST="YES" TYPE="String" INDEX="10050">
              <UDF:UDF_CMPAUTHORISEDPLACE DESC="\`UDF_CMPAuthorisedPlace\`\`POPSellerNameUDF\`">${farmerName}</UDF:UDF_CMPAUTHORISEDPLACE>
            </UDF:UDF_CMPAUTHORISEDPLACE.LIST>`;

      let items = [];
      try {
        if (entry.itemsJSON) {
          items = typeof entry.itemsJSON === 'string' ? JSON.parse(entry.itemsJSON) : entry.itemsJSON;
        }
      } catch (e) {}

      if (!Array.isArray(items) || items.length === 0) {
        items = [{
          netWeight: entry.finalWeight || entry.netWeight || 0,
          deductionGrams: entry.deductionGrams || 0,
          purchaseRate: entry.purchaseRate || 0,
        }];
      }

      if (items.length === 1) {
        const qty = parseFloat(entry.finalWeight) || parseFloat(items[0].netWeight) || 0;
        let rate20kg = parseFloat(entry.purchaseRate) || parseFloat(items[0].purchaseRate) || 0;
        const rate = rate20kg > 0 ? (rate20kg / 20).toFixed(2) : (qty > 0 && total > 0 ? (total / qty).toFixed(2) : "0.00");
        const itemName = "Magfali";

        xml += `
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${itemName}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <RATE>${rate}/k.g.</RATE>
              <AMOUNT>-${total}</AMOUNT>
              <ACTUALQTY>${qty} k.g.</ACTUALQTY>
              <BILLEDQTY>${qty} k.g.</BILLEDQTY>
              <BATCHALLOCATIONS.LIST>
                <GODOWNNAME>Main Location</GODOWNNAME>
                <BATCHNAME>Primary Batch</BATCHNAME>
                <AMOUNT>-${total}</AMOUNT>
                <ACTUALQTY>${qty} k.g.</ACTUALQTY>
                <BILLEDQTY>${qty} k.g.</BILLEDQTY>
              </BATCHALLOCATIONS.LIST>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${purchaseLedger}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                <AMOUNT>-${total}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>`;
      } else {
        items.forEach(it => {
          const deductionGrams = Number(it.deductionGrams) || 0;
          const rawWt = Number(it.netWeight) || 0;
          const wKg = deductionGrams > 0 ? (rawWt - ((rawWt / 35.0) * (deductionGrams / 1000))) : rawWt;
          const itemQty = Number(wKg.toFixed(2));
          const rate20kg = Number(it.purchaseRate) || 0;
          const itemAmt = Math.round((Math.floor(wKg) / 20.0) * rate20kg);
          const rate = rate20kg > 0 ? (rate20kg / 20).toFixed(2) : (itemQty > 0 ? (itemAmt / itemQty).toFixed(2) : "0.00");
          const itemName = "Magfali";

          xml += `
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${itemName}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <RATE>${rate}/k.g.</RATE>
              <AMOUNT>-${itemAmt}</AMOUNT>
              <ACTUALQTY>${itemQty} k.g.</ACTUALQTY>
              <BILLEDQTY>${itemQty} k.g.</BILLEDQTY>
              <BATCHALLOCATIONS.LIST>
                <GODOWNNAME>Main Location</GODOWNNAME>
                <BATCHNAME>Primary Batch</BATCHNAME>
                <AMOUNT>-${itemAmt}</AMOUNT>
                <ACTUALQTY>${itemQty} k.g.</ACTUALQTY>
                <BILLEDQTY>${itemQty} k.g.</BILLEDQTY>
              </BATCHALLOCATIONS.LIST>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${purchaseLedger}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                <AMOUNT>-${itemAmt}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>`;
        });
      }

      if (bankAmt > 0) {
        xml += `
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${bankLedger}</LEDGERNAME>
              <POSPAYMENTTYPE>Bank</POSPAYMENTTYPE>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>Yes</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${bankAmt}</AMOUNT>
              <BANKALLOCATIONS.LIST>
                <DATE>${tallyDate}</DATE>
                <INSTRUMENTDATE>${tallyDate}</INSTRUMENTDATE>
                <TRANSACTIONTYPE>Cheque/DD</TRANSACTIONTYPE>
                <PAYMENTMODE>Transacted</PAYMENTMODE>
                <INSTRUMENTNUMBER>${chequeNo}</INSTRUMENTNUMBER>
                <AMOUNT>${bankAmt}</AMOUNT>
              </BANKALLOCATIONS.LIST>
            </LEDGERENTRIES.LIST>`;
      }

      if (cashAmt > 0) {
        xml += `
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${cashLedger}</LEDGERNAME>
              <POSPAYMENTTYPE>Cash</POSPAYMENTTYPE>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>Yes</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${cashAmt}</AMOUNT>
            </LEDGERENTRIES.LIST>`;
      }

      xml += `
          </VOUCHER>
        </TALLYMESSAGE>`;
    });

    xml += `
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_${sheetFilter === 'APMC' ? 'APMC' : 'Direct'}_${exportStartDate}_to_${exportEndDate}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- RENDERING ---

  if (role === null) {
    return (
      <main style={{ padding: "2rem", maxWidth: "400px", margin: "10vh auto", display: "flex", flexDirection: "column" }} className="glass-panel animate-fade-in">
        <h1 style={{ textAlign: "center", color: "var(--primary)", marginBottom: "2rem" }}>લૉગિન (Login)</h1>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">યુઝરનેમ (Username)</label>
            <input type="text" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">પાસવર્ડ (Password)</label>
            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="form-input" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: "1rem", marginTop: "1rem" }} disabled={isLoggingIn}>
            {isLoggingIn ? "લોગીન ચાલુ છે..." : "લૉગિન કરો"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: "1rem", maxWidth: "900px", margin: "0 auto", width: "100%" }} className="app-container">
      {/* PREMIUM TOP HEADER */}
      <div className="main-content-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "visible", minHeight: "100vh" }}>


      <div className="main-content" style={{ width: "100%" }}>
        <header className="hide-on-print premium-header" style={{ width: "100%", margin: 0, maxWidth: "none", boxSizing: "border-box" }}>
        <div className="header-logo-section">
          <img src="/logo.png" alt="Logo" className="header-logo" onError={(e) => { e.target.style.display = 'none' }} />
          <div className="header-title">
            <span className="title-krishi" style={{ fontSize: "1.2rem", fontWeight: "900", letterSpacing: "1px", marginLeft: "0.5rem" }}>{voucherSettings.firmName || "DARSHAN SEEDS"}</span>
            <span className="title-subtitle">Purchase ERP</span>
          </div>
        </div>

        <nav className="header-nav" style={{ gap: "0.4rem", justifyContent: "center" }}>
          {role === "admin" && (
            <button onClick={() => setActiveTab("dashboard")} className={`header-nav-btn ${activeTab === "dashboard" ? "active" : ""}`} title="Dashboard">
              <LayoutDashboard className="nav-icon" />
              <span className="nav-label">Dashboard</span>
            </button>
          )}
          {(role === "helper" || role === "admin") && (
            <button onClick={() => { setActiveTab("new"); setFormData(initialForm); }} className={`header-nav-btn ${activeTab === "new" ? "active" : ""}`} title="New Entry">
              <PlusCircle className="nav-icon" />
              <span className="nav-label">New Entry</span>
            </button>
          )}
          {role === "helper" && (
            <button onClick={() => setActiveTab("recent")} className={`header-nav-btn ${activeTab === "recent" ? "active" : ""}`} title="Records">
              <CheckSquare className="nav-icon" />
              <span className="nav-label">Records</span>
            </button>
          )}
          {role === "admin" && (
            <button onClick={() => setActiveTab("completed")} className={`header-nav-btn ${activeTab === "completed" ? "active" : ""}`} title="Records">
              <CheckSquare className="nav-icon" />
              <span className="nav-label">Records</span>
            </button>
          )}
          {role === "admin" && (
            <button onClick={() => setActiveTab("pending")} className={`header-nav-btn ${activeTab === "pending" ? "active" : ""}`} title="Pending">
              <Clock className="nav-icon" />
              <span className="nav-label">Pending</span>
              {recentEntries.filter(e => e.status === 'Pending').length > 0 && (
                <span className="nav-badge-inline">{recentEntries.filter(e => e.status === 'Pending').length}</span>
              )}
            </button>
          )}
          {role === "admin" && (
            <button onClick={() => setActiveTab("settings")} className={`header-nav-btn ${activeTab === "settings" ? "active" : ""}`} title="Settings">
              <Settings className="nav-icon" />
              <span className="nav-label">Settings</span>
            </button>
          )}
        </nav>

        <div className="header-profile">
          <div className="profile-badge">
             
            {loginUsername ? loginUsername : (role === 'admin' ? 'Admin' : 'User')}
          </div>
          <button onClick={() => { setRole(null); localStorage.removeItem("userRole"); localStorage.removeItem("purchaseApp_user"); }} className="logout-btn">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* NEW ENTRY */}
      {(role === "helper" || role === "admin") && activeTab === "new" && (
        <div className="animate-fade-in hide-on-print" style={{ padding: "1.5rem" }}>
          <form onSubmit={handleHelperSubmit}>
            
            {/* Header / Meta */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "1.5rem", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-main)", margin: 0 }}>Purchase Entry</h2>
                <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>NEW RECORD</span>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <input type="date" className="form-input" name="date" value={formData.date} onChange={handleInputChange} required style={{ width: "100%", maxWidth: "160px", borderRadius: "50px", padding: "0.5rem 1rem", border: "1px solid #e2e8f0" }} />
                {role === "admin" && (
                  <input type="tel" inputMode="numeric" pattern="[0-9]*" className="form-input" name="voucherId" value={formData.voucherId || ""} onChange={handleInputChange} placeholder="Auto Voucher #" style={{ width: "100%", maxWidth: "150px", borderRadius: "50px", padding: "0.5rem 1rem", border: "1px solid #e2e8f0" }} />
                )}
              </div>
            </div>

            {/* PURCHASE TYPE */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "1rem" }}>Purchase Type</label>
              <div className="purchase-type-cards">
                <div className={`purchase-type-card ${formData.purchaseType === "APMC" ? "active" : ""}`} onClick={() => handleInputChange({ target: { name: 'purchaseType', value: 'APMC' } })}>
                  <span className="icon">🏢</span>
                  <span className="title">APMC (Market Yard)</span>
                </div>
                <div className={`purchase-type-card ${formData.purchaseType === "Direct" ? "active" : ""}`} onClick={() => handleInputChange({ target: { name: 'purchaseType', value: 'Direct' } })}>
                  <span className="icon">🚜</span>
                  <span className="title">Direct (From Farmer)</span>
                </div>
              </div>
            </div>

            {/* FARMER DETAILS (Admin only usually, but let's show it for both if we want, or match role) */}
            {role === "admin" && (
              <div className="farmer-details-inline">
                <div className="farmer-input-wrapper">
                  <span style={{ color: "var(--primary)" }}>👤</span>
                  <input type="text" name="farmerName" value={formData.farmerName || ""} onChange={handleInputChange} required placeholder="Farmer Name" />
                </div>
                <div className="farmer-input-wrapper">
                  <span style={{ color: "var(--primary)" }}>📍</span>
                  <input type="text" name="villageName" value={formData.villageName || ""} onChange={handleInputChange} required placeholder="Village" />
                </div>
                <div className="farmer-input-wrapper">
                  <span style={{ color: "var(--primary)" }}>📱</span>
                  <input type="tel" inputMode="numeric" pattern="[0-9]*" name="mobileNumber" value={formData.mobileNumber || ""} onChange={handleInputChange} placeholder="મોબાઈલ નં. (મરજિયાત)" maxLength="10" />
                </div>
              </div>
            )}

            {/* ITEMS SECTION */}
            <div className="items-section-premium">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 style={{ margin: 0 }}>Items</h3>
                  <span style={{ background: "var(--primary)", color: "white", padding: "0.1rem 0.6rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "700" }}>{formData.items.length}</span>
                </div>
                <button type="button" onClick={handleAddItem} className="btn" style={{ background: "transparent", color: "var(--primary)", border: "1px solid var(--primary)", padding: "0.4rem 1rem", borderRadius: "50px", fontSize: "0.9rem", fontWeight: "600" }}>
                  + Add Item
                </button>
              </div>

              <div className="table-responsive" style={{ overflowX: "auto", width: "100%", paddingBottom: "10px" }}>
<div style={{ minWidth: "650px" }}>
<div className="items-header">
                <div>VARIETY</div>
                <div>NET WT (KG)</div>
                <div>DEDUCTION (G / 35KG)</div>
                <div>RATE (₹/20KG)</div>
                <div>AMOUNT</div>
                <div></div>
              </div>

              {formData.items?.map((item, index) => {
                // Calculate amount live for display
                const w = parseFloat(item.netWeight) || 0;
                const d = parseFloat(item.deductionGrams) || 0;
                const r = parseFloat(item.purchaseRate) || 0;
                const totalDed = (w / 35) * (d / 1000);
                const finalW = w - totalDed;
                const amount = (Math.floor(finalW) / 20) * r;
                
                return (
                  <div key={index} className="item-row-premium">
                    <select name="variety" value={item.variety} onChange={(e) => handleItemChange(index, e)}>
                      <option value="TaG24">TaG24</option>
                      <option value="G20">G20</option>
                      <option value="TJ37">TJ37</option>
                      <option value="BT32">BT32</option>
                      <option value="Other">Other</option>
                    </select>
                    <input type="number" step="0.01" name="netWeight" value={item.netWeight} onChange={(e) => handleItemChange(index, e)} required placeholder="વજન (કિલો)" />
                    <input type="number" name="deductionGrams" value={item.deductionGrams} onChange={(e) => handleItemChange(index, e)} required placeholder="કપાત (ગ્રામ)" />
                    <input type="number" name="purchaseRate" value={item.purchaseRate} onChange={(e) => handleItemChange(index, e)} required placeholder="Rate (₹/20kg)" />
                    <div className="amount-col">₹{Math.round(amount).toLocaleString('en-IN')}</div>
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => handleRemoveItem(index)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.2rem", padding: "0" }}>✖</button>
                    )}
                  </div>
                )
              })}

              </div>
</div>
<div className="total-bar-premium">
                <div style={{ fontSize: "1rem", fontWeight: "600", opacity: 0.9 }}>{finalWeight.toFixed(2)} KG TOTAL EFFECTIVE WEIGHT</div>
                <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>₹{finalAmount.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {role === "admin" && (
              <>
                <h3 style={{ borderBottom: "1px solid var(--surface-border)", paddingBottom: "0.5rem", marginTop: "1.5rem", marginBottom: "1rem", color: "var(--text-main)" }}>પેમેન્ટ વિગતો</h3>
                <div className="payment-section-grid">
                  <div className="payment-box">
                    <div className="payment-box-title">💵 રોકડ (CASH)</div>
                    <input type="number" className="form-input" name="cashAmount" value={paymentData.cashAmount} onChange={handlePaymentChange} placeholder="રકમ (₹)" style={{ fontSize: "1.2rem", padding: "1rem", background: "rgba(16, 185, 129, 0.05)", fontWeight: "bold" }} />
                  </div>

                  <div className="payment-box">
                    <div className="payment-box-title">🏦 ચેક (CHEQUE)</div>
                    <input type="number" className="form-input" name="chequeAmount" value={paymentData.chequeAmount} onChange={handlePaymentChange} placeholder="રકમ (₹)" style={{ fontSize: "1.2rem", padding: "1rem", marginBottom: "1rem", background: "rgba(16, 185, 129, 0.05)", fontWeight: "bold" }} />
                    <div className="grid-responsive-2" style={{ gap: "0.5rem" }}>
                      <input type="text" className="form-input" disabled value={voucherSettings.bankName || 'Bank name'} style={{ background: "rgba(0,0,0,0.02)", color: "var(--text-muted)" }} />
                      <input type="tel" inputMode="numeric" pattern="[0-9]*" className="form-input" name="chequeNumber" value={paymentData.chequeNumber} onChange={handlePaymentChange} placeholder="Cheque #" />
                    </div>
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "2rem", padding: "1rem", fontSize: "1.1rem", borderRadius: "50px" }} disabled={isProcessing}>
              {isProcessing ? "પ્રોસેસિંગ..." : (role === "admin" ? "સેવ કરો (Save)" : "સેવ કરો (Save)")}
            </button>
          </form>
        </div>
      )}

      
      {/* ADMIN: DASHBOARD */}
      {role === "admin" && activeTab === "dashboard" && (
        <div className="animate-fade-in hide-on-print" style={{ padding: 0, width: "100%", boxSizing: "border-box" }}>
          <div style={{ marginBottom: "2rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--primary)", letterSpacing: "1px", textTransform: "uppercase" }}>Workspace</span>
            
            <p style={{ color: "var(--text-muted)" }}>{recentEntries.length} total entries · live summary</p>
          </div>

          {(() => {
            let totalPurchases = 0;
            let cashPaid = 0;
            let chequePaid = 0;
            let entriesToday = 0;
            let todayPurchasesSum = 0;
            let todayCashSum = 0;
            let todayChequeSum = 0;
            let todayWeightSum = 0;
            let apmcSum = 0;
            let directSum = 0;
            let totalWeight = 0;
            
            const today = new Date();
            const todayYMD = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            const todayDMY = String(today.getDate()).padStart(2, '0') + '/' + String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getFullYear();
            const todayMDY = String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0') + '/' + today.getFullYear();

            recentEntries.forEach(entry => {
              const finalAmt = Number(entry.finalAmount) || 0;
              const cashAmt = Number(entry.cashAmount) || 0;
              const chequeAmt = Number(entry.chequeAmount) || 0;
              const weight = Number(entry.finalWeight) || 0;

              totalPurchases += finalAmt;
              totalWeight += weight;
              cashPaid += cashAmt;
              chequePaid += chequeAmt;

              const entryNorm = normalizeToYMD(entry.date, entry.sheetName);
              const isToday = (
                entryNorm === todayYMD ||
                entry.date === todayYMD ||
                entry.date === todayDMY ||
                entry.date === todayMDY
              );

              if (isToday) {
                entriesToday++;
                todayPurchasesSum += finalAmt;
                todayCashSum += cashAmt;
                todayChequeSum += chequeAmt;
                todayWeightSum += weight;
              }

              if (entry.sheetName === 'APMC') {
                apmcSum += finalAmt;
              } else {
                directSum += finalAmt;
              }
            });

            const apmcPct = totalPurchases > 0 ? Math.round((apmcSum / totalPurchases) * 100) : 0;
            const directPct = totalPurchases > 0 ? Math.round((directSum / totalPurchases) * 100) : 0;

            return (
              <>
                <div className="dashboard-grid">
                  <div className="dashboard-card" style={{ paddingBottom: "1.5rem" }}>
                    <span className="dashboard-card-title">Total Purchases</span>
                    <span className="dashboard-card-value">₹{totalPurchases.toLocaleString('en-IN')}</span>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem", fontWeight: "600", background: "rgba(0,0,0,0.03)", padding: "0.5rem", borderRadius: "8px" }}>
                      વજન: {totalWeight.toFixed(2)} KG <br/>
                      દળો: ₹{totalWeight > 0 ? ((totalPurchases / totalWeight) * 20).toFixed(2) : 0}
                    </div>
                    <div className="dashboard-card-icon">🌾</div>
                  </div>
                  <div className="dashboard-card">
                    <span className="dashboard-card-title">Cash Paid</span>
                    <span className="dashboard-card-value">₹{cashPaid.toLocaleString('en-IN')}</span>
                    <div className="dashboard-card-icon yellow">💵</div>
                  </div>
                  <div className="dashboard-card">
                    <span className="dashboard-card-title">Cheque Paid</span>
                    <span className="dashboard-card-value">₹{chequePaid.toLocaleString('en-IN')}</span>
                    <div className="dashboard-card-icon">🏦</div>
                  </div>
                  <div className="dashboard-card">
                    <span className="dashboard-card-title">Total Entries</span>
                    <span className="dashboard-card-value">{recentEntries.length}</span>
                    <div className="dashboard-card-icon">🗂️</div>
                  </div>
                </div>

                <h3 style={{ fontSize: "1.1rem", marginTop: "2rem", marginBottom: "1rem" }}>Today's Summary</h3>
                <div className="dashboard-grid">
                  <div className="dashboard-card" style={{ paddingBottom: "1.5rem" }}>
                    <span className="dashboard-card-title">Today's Purchases</span>
                    <span className="dashboard-card-value">₹{todayPurchasesSum.toLocaleString('en-IN')}</span>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem", fontWeight: "600", background: "rgba(0,0,0,0.03)", padding: "0.5rem", borderRadius: "8px" }}>
                      વજન: {todayWeightSum.toFixed(2)} KG <br/>
                      દળો: ₹{todayWeightSum > 0 ? ((todayPurchasesSum / todayWeightSum) * 20).toFixed(2) : 0}
                    </div>
                    <div className="dashboard-card-icon">🌾</div>
                  </div>
                  <div className="dashboard-card">
                    <span className="dashboard-card-title">Today's Cash</span>
                    <span className="dashboard-card-value">₹{todayCashSum.toLocaleString('en-IN')}</span>
                    <div className="dashboard-card-icon yellow">💵</div>
                  </div>
                  <div className="dashboard-card">
                    <span className="dashboard-card-title">Today's Cheque</span>
                    <span className="dashboard-card-value">₹{todayChequeSum.toLocaleString('en-IN')}</span>
                    <div className="dashboard-card-icon">🏦</div>
                  </div>
                  <div className="dashboard-card">
                    <span className="dashboard-card-title">Entries Today</span>
                    <span className="dashboard-card-value">{entriesToday}</span>
                    <div className="dashboard-card-icon">📈</div>
                  </div>
                </div>

                <div className="purchase-mix-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Purchase All</h3>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>All time</span>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem", fontSize: "0.9rem", fontWeight: "600" }}>
                    <span style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>🏢 APMC</span>
                    <span>₹{apmcSum.toLocaleString('en-IN')} · {apmcPct}%</span>
                  </div>
                  <div className="mix-bar-container" style={{ marginBottom: "1rem" }}>
                    <div className="mix-bar-apmc" style={{ width: apmcPct + '%' }}></div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "0.9rem", fontWeight: "600" }}>
                    <span style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "0.5rem" }}>🚜 Direct</span>
                    <span>₹{directSum.toLocaleString('en-IN')} · {directPct}%</span>
                  </div>
                  <div className="mix-bar-container">
                    <div className="mix-bar-direct" style={{ width: directPct + '%' }}></div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ADMIN OR HELPER: LIST TABS */}
      {["recent", "pending", "completed"].includes(activeTab) && (
        <div className="animate-fade-in hide-on-print" style={{ padding: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ color: "var(--primary)", margin: 0 }}>લિસ્ટ</h2>
            <div className="date-filter-container">
              {activeTab !== 'pending' && (
                <>
                  <input type="date" className="form-input filter-date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "0.4rem", fontSize: "0.9rem" }} />
                  <span style={{color: "var(--text-muted)"}}>થી</span>
                  <input type="date" className="form-input filter-date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "0.4rem", fontSize: "0.9rem" }} />
                  <button onClick={() => fetchRecentEntries(true)} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
                    <Search size={16} /> શોધો
                  </button>
                </>
              )}
              <button onClick={() => {setStartDate(""); setEndDate(""); fetchRecentEntries(false);}} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.9rem" }}>
                <RefreshCw size={16} /> રિફ્રેશ
              </button>
              {activeTab === "completed" && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => setShowExportModal(true)} className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderColor: "var(--primary)", color: "var(--primary)", fontSize: "0.9rem" }}>
                    <Download size={16} /> XML ડાઉનલોડ
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {isLoadingRecent ? <p>લોડ થઈ રહ્યું છે...</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {recentEntries
                .filter(entry => {
                  if (activeTab === "pending") return entry.status === "Pending";
                  if (activeTab === "completed") return entry.status === "Completed";
                  return true; // "recent" shows all for helper
                })
                .map((entry, idx) => (
                <div key={idx} onClick={() => setExpandedEntryIdx(expandedEntryIdx === idx ? null : idx)} style={{ background: "white", padding: "1rem", borderRadius: "12px", border: `2px solid ${entry.status?.trim() === 'Completed' ? 'var(--success)' : 'var(--danger)'}`, boxShadow: "0 2px 10px rgba(0,0,0,0.05)", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {entry.voucherId} 
                      <span style={{ fontSize: "0.75rem", background: "rgba(111, 17, 19, 0.1)", color: "var(--primary)", padding: "2px 6px", borderRadius: "4px" }}>
                        {entry.sheetName === 'APMC' ? 'APMC' : 'Direct'}
                      </span>
                    </span>
                    <span style={{ fontSize: "0.9rem" }}>{entry.status === 'Pending' ? <span style={{color: "var(--danger)"}}>બાકી</span> : <span style={{color: "var(--success)"}}>ફાઈનલ</span>}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div>{entry.farmerName}{entry.villageName ? ` - ${entry.villageName}` : ''} <small>({entry.variety || (entry.itemsJSON ? (() => { try { const items = JSON.parse(entry.itemsJSON); return items.map(i => i.variety === 'Other' ? i.customVariety : i.variety).filter(Boolean).join(', '); } catch(e) { return ''; } })() : '')})</small></div>
                      <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>વજન: {entry.finalWeight}kg | ₹{Number(entry.finalAmount).toLocaleString()}</div>
                    </div>
                    {role === "admin" && entry.status === "Pending" && (
                      <button onClick={(e) => { e.stopPropagation(); openApprovalModal(entry); }} className="btn btn-primary" style={{ padding: "0.5rem" }}>
                        અપ્રુવ કરો
                      </button>
                    )}
                  </div>
                  
                  {expandedEntryIdx === idx && (
                    <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                        <span>રોકડ: <strong>₹{entry.cashAmount || 0}</strong></span>
                        <span>ચેક: <strong>₹{entry.chequeAmount || 0}</strong></span>
                      </div>
                      
                      {entry.status === "Completed" && (
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", justifyContent: "flex-end" }}>
                          {role === "admin" && (
                            <button onClick={(e) => { e.stopPropagation(); openApprovalModal(entry); }} className="btn btn-outline" style={{ padding: "0.5rem" }} title="Edit Entry">
                              <Edit size={16} /> એડિટ 
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); setLastSavedData(entry); setShowInvoiceModal(true); }} className="btn btn-primary" style={{ padding: "0.5rem" }} title="Print Voucher">
                            <Printer size={16} /> પહોંચ
                          </button>
                          {(parseFloat(entry.chequeAmount) > 0) && (
                            <button onClick={(e) => { e.stopPropagation(); setLastSavedData(entry); setShowChequeModal(true); }} className="btn btn-outline" style={{ padding: "0.5rem", borderColor: "var(--primary)", color: "var(--primary)" }} title="Print Cheque">
                              <CreditCard size={16} /> ચેક 
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADMIN: APPROVAL MODAL */}
      {editingEntry && (
        <div className="modal-overlay">
          <div className="glass-panel animate-fade-in" style={{ padding: "1.5rem", maxWidth: "500px", width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ color: "var(--primary)" }}>{editingEntry.status === "Completed" ? "એન્ટ્રી એડિટ કરો" : "ચેક અને અપ્રુવ કરો"} (વાઉચર: {editingEntry.voucherId})</h2>
              <button onClick={() => { setEditingEntry(null); setFormData(initialForm); }} className="btn btn-outline" style={{ padding: "0.5rem" }}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleAdminApprove}>
              <div className="grid-responsive-2" style={{ marginBottom: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">તારીખ (Date)</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    name="date" 
                    value={formData.date || ""} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">વાઉચર નં. (વિકલ્પ)</label>
                  <input type="tel" inputMode="numeric" pattern="[0-9]*" className="form-input" name="voucherId" value={formData.voucherId || ""} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">ખરીદીનો પ્રકાર</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="button" onClick={() => handleInputChange({ target: { name: 'purchaseType', value: 'APMC' } })} className={`btn ${formData.purchaseType === 'APMC' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, padding: "0.5rem", fontSize: "0.9rem" }}>APMC</button>
                  <button type="button" onClick={() => handleInputChange({ target: { name: 'purchaseType', value: 'Direct' } })} className={`btn ${formData.purchaseType === 'Direct' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, padding: "0.5rem", fontSize: "0.9rem" }}>ડાયરેક્ટ</button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}><label className="form-label">ખેડૂત</label><input type="text" className="form-input" name="farmerName" value={formData.farmerName} onChange={handleInputChange} required /></div>
              <div className="grid-responsive-2" style={{ marginBottom: "1rem" }}>
                <div className="form-group"><label className="form-label">ગામનું નામ</label><input type="text" className="form-input" name="villageName" value={formData.villageName || ""} onChange={handleInputChange} /></div>
                <div className="form-group"><label className="form-label">મોબાઈલ નં.</label><input type="tel" className="form-input" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} maxLength="10" pattern="\d{10}" /></div>
              </div>

              <h3 style={{ marginTop: "1rem", borderBottom: "1px solid var(--surface-border)", paddingBottom: "0.5rem", color: "var(--text-main)", fontSize: "1rem" }}>વજન અને ભાવની વિગતો</h3>
              {formData.items?.map((item, index) => (
                <div key={index} style={{ border: "1px solid var(--surface-border)", padding: "1rem", borderRadius: "8px", marginTop: "1rem", position: "relative" }}>
                  {formData.items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(index)} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "none", border: "none", color: "red", cursor: "pointer" }}><X size={20} /></button>
                  )}
                  <div className="form-group">
                    <label className="form-label">જાત</label>
                    <select className="form-input" name="variety" value={item.variety} onChange={(e) => handleItemChange(index, e)}>
                      <option value="TaG24">TaG24</option>
                      <option value="G20">G20</option>
                      <option value="TJ37">TJ37</option>
                      <option value="BT32">BT32</option>
                      <option value="Other">બીજી (Other)</option>
                    </select>
                  </div>
                  {item.variety === "Other" && (
                    <div className="form-group" style={{ marginTop: "1rem" }}>
                      <label className="form-label">જાતનું નામ લખો</label>
                      <input type="text" className="form-input" name="customVariety" value={item.customVariety} onChange={(e) => handleItemChange(index, e)} required />
                    </div>
                  )}
                  <div className="grid-equal-2" style={{ marginTop: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">વજન</label>
                      <input type="number" step="0.01" className="form-input" name="netWeight" value={item.netWeight} onChange={(e) => handleItemChange(index, e)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">કપાત (ગ્રામ/35kg)</label>
                      <input type="number" className="form-input" name="deductionGrams" value={item.deductionGrams} onChange={(e) => handleItemChange(index, e)} required />
                    </div>
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                      <label className="form-label">ભાવ (૨૦ કિલોના)</label>
                      <input type="number" className="form-input" name="purchaseRate" value={item.purchaseRate} onChange={(e) => handleItemChange(index, e)} required />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={handleAddItem} className="btn btn-outline" style={{ marginTop: "1rem", marginBottom: "1rem", width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}><PlusCircle size={18} /> વધુ વજન ઉમેરો</button>

              <div style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.1)", marginBottom: "1.5rem", borderRadius: "8px" }}>
                <span>ફાઈનલ રકમ: <strong style={{ fontSize: "1.4rem", color: "var(--success)" }}>₹ {finalAmount.toLocaleString('en-IN')}</strong></span>
              </div>

              {/* PAYMENT SECTION */}
              <h3 style={{ borderBottom: "1px solid var(--surface-border)", paddingBottom: "0.5rem", marginBottom: "1rem", color: "var(--text-main)" }}>પેમેન્ટ વિગતો</h3>
              <div className="grid-equal-2">
                <div className="form-group">
                  <label className="form-label">રોકડ (Cash)</label>
                  <input type="number" className="form-input" name="cashAmount" value={paymentData.cashAmount} onChange={handlePaymentChange} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">ચેક (Cheque Amt)</label>
                  <input type="number" className="form-input" name="chequeAmount" value={paymentData.chequeAmount} onChange={handlePaymentChange} placeholder="0" />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label className="form-label">ચેક નંબર {voucherSettings.bankName && `(${voucherSettings.bankName})`}</label>
                  <input type="tel" inputMode="numeric" pattern="[0-9]*" className="form-input" name="chequeNumber" value={paymentData.chequeNumber} onChange={handlePaymentChange} placeholder="દા.ત. 123456" />
                </div>
              </div>

              <button type="submit" className="btn btn-success" style={{ width: "100%", marginTop: "1.5rem" }} disabled={isProcessing}>
                {isProcessing ? "પ્રોસેસિંગ..." : (editingEntry.status === "Completed" ? "ફેરફારો સેવ કરો (Save Changes)" : "પેમેન્ટ સેવ કરો અને ફાઈનલ કરો")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN: SETTINGS */}
      {role === "admin" && activeTab === "settings" && (
        <div className="glass-panel animate-fade-in hide-on-print" style={{ padding: "1.5rem" }}>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.2rem", color: "var(--primary)" }}>વાઉચર સિરીઝ સેટિંગ્સ</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const newSettings = { 
              apmcStart: parseInt(voucherSettings.apmcStart, 10), 
              apmcEnd: parseInt(voucherSettings.apmcEnd, 10), 
              apmcCurrent: parseInt(voucherSettings.apmcStart, 10), 
              directStart: parseInt(voucherSettings.directStart, 10), 
              directEnd: parseInt(voucherSettings.directEnd, 10), 
              directCurrent: parseInt(voucherSettings.directStart, 10), 
              bankName: voucherSettings.bankName,
              firmName: voucherSettings.firmName,
              managerUsername: voucherSettings.managerUsername,
              managerPassword: voucherSettings.managerPassword
            };
            setVoucherSettings(newSettings);
            localStorage.setItem("voucherSettings", JSON.stringify(newSettings));
            localStorage.setItem("chequeSettings", JSON.stringify(chequeSettings));
            
            // Cloud sync to Neon DB
            fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ voucherSettings: newSettings, chequeSettings })
            }).catch(err => console.error('Cloud settings save error', err));
            
            if (voucherSettings.managerUsername && voucherSettings.managerPassword) {
              try {
                await fetch('/api/auth/update', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    managerUser: voucherSettings.managerUsername, 
                    managerPass: voucherSettings.managerPassword,
                    apmcStart: newSettings.apmcStart,
                    apmcEnd: newSettings.apmcEnd,
                    directStart: newSettings.directStart,
                    directEnd: newSettings.directEnd,
                    bankName: newSettings.bankName,
                    firmName: newSettings.firmName
                  })
                });
              } catch (err) {
                console.error('Error saving manager credentials', err);
              }
            }
            
            alert("સેટિંગ્સ સેવ થઈ ગયા છે!");
          }}>
            <h3 style={{fontSize: "1rem", marginBottom: "0.5rem"}}>APMC (હરાજી) વાઉચર</h3>
            <div className="grid-responsive-2" style={{ marginBottom: "1rem" }}>
              <div className="form-group"><label className="form-label">શરૂઆત</label><input type="number" className="form-input" value={voucherSettings.apmcStart || ""} onChange={(e) => setVoucherSettings({...voucherSettings, apmcStart: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">અંત</label><input type="number" className="form-input" value={voucherSettings.apmcEnd || ""} onChange={(e) => setVoucherSettings({...voucherSettings, apmcEnd: e.target.value})} required /></div>
            </div>

            <h3 style={{fontSize: "1rem", marginBottom: "0.5rem"}}>Direct (ડાયરેક્ટ) વાઉચર</h3>
            <div className="grid-responsive-2">
              <div className="form-group"><label className="form-label">શરૂઆત</label><input type="number" className="form-input" value={voucherSettings.directStart || ""} onChange={(e) => setVoucherSettings({...voucherSettings, directStart: e.target.value})} required /></div>
              <div className="form-group"><label className="form-label">અંત</label><input type="number" className="form-input" value={voucherSettings.directEnd || ""} onChange={(e) => setVoucherSettings({...voucherSettings, directEnd: e.target.value})} required /></div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label className="form-label">ડિફૉલ્ટ બેંકનું નામ (Default Bank)</label>
              <input type="text" className="form-input" value={voucherSettings.bankName || ""} onChange={(e) => setVoucherSettings({...voucherSettings, bankName: e.target.value})} placeholder="દા.ત. SBI" />
            </div>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label className="form-label">પ્રિન્ટ માટે પેઢીનું નામ (Firm Name)</label>
              <input type="text" className="form-input" value={voucherSettings.firmName || ""} onChange={(e) => setVoucherSettings({...voucherSettings, firmName: e.target.value})} placeholder="દા.ત. DARSHAN SEEDS INDUSTRIES" />
            </div>

            <h3 style={{fontSize: "1rem", marginTop: "1.5rem", marginBottom: "0.5rem"}}>મેનેજર લોગીન સેટિંગ્સ</h3>
            <div className="grid-responsive-2">
              <div className="form-group"><label className="form-label">યુઝરનેમ</label><input type="text" className="form-input" value={voucherSettings.managerUsername || ""} onChange={(e) => setVoucherSettings({...voucherSettings, managerUsername: e.target.value})} placeholder="દા.ત. admin" /></div>
              <div className="form-group"><label className="form-label">પાસવર્ડ</label><input type="text" className="form-input" value={voucherSettings.managerPassword || ""} onChange={(e) => setVoucherSettings({...voucherSettings, managerPassword: e.target.value})} placeholder="નવો પાસવર્ડ" /></div>
            </div>

            <h3 style={{fontSize: "1rem", marginTop: "1.5rem", marginBottom: "0.5rem"}}>ચેક પ્રિન્ટિંગ સેટિંગ્સ (cm માં)</h3>
            <div className="grid-responsive-3">
              <div className="form-group"><label className="form-label">તારીખ Top</label><input type="text" className="form-input" value={chequeSettings.dateTop} onChange={(e) => setChequeSettings({...chequeSettings, dateTop: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">તારીખ Left</label><input type="text" className="form-input" value={chequeSettings.dateLeft} onChange={(e) => setChequeSettings({...chequeSettings, dateLeft: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">તારીખ અક્ષરો વચ્ચે જગ્યા(px)</label><input type="text" className="form-input" value={chequeSettings.dateCharSpacing} onChange={(e) => setChequeSettings({...chequeSettings, dateCharSpacing: e.target.value})} /></div>
              
              <div className="form-group"><label className="form-label">નામ Top</label><input type="text" className="form-input" value={chequeSettings.payeeTop} onChange={(e) => setChequeSettings({...chequeSettings, payeeTop: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">નામ Left</label><input type="text" className="form-input" value={chequeSettings.payeeLeft} onChange={(e) => setChequeSettings({...chequeSettings, payeeLeft: e.target.value})} /></div>
              <div className="form-group"></div>

              <div className="form-group"><label className="form-label">રકમ(શબ્દો) Top</label><input type="text" className="form-input" value={chequeSettings.amountWordsTop} onChange={(e) => setChequeSettings({...chequeSettings, amountWordsTop: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">રકમ(શબ્દો) Left</label><input type="text" className="form-input" value={chequeSettings.amountWordsLeft} onChange={(e) => setChequeSettings({...chequeSettings, amountWordsLeft: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">રકમ(શબ્દો) પહોળાઈ</label><input type="text" className="form-input" value={chequeSettings.amountWordsWidth} onChange={(e) => setChequeSettings({...chequeSettings, amountWordsWidth: e.target.value})} /></div>
              
              <div className="form-group"><label className="form-label">રકમ(આંકડા) Top</label><input type="text" className="form-input" value={chequeSettings.amountNumTop} onChange={(e) => setChequeSettings({...chequeSettings, amountNumTop: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">રકમ(આંકડા) Left</label><input type="text" className="form-input" value={chequeSettings.amountNumLeft} onChange={(e) => setChequeSettings({...chequeSettings, amountNumLeft: e.target.value})} /></div>
            </div>

            <button type="submit" className="btn btn-success" style={{ width: "100%", marginTop: "1.5rem" }}>સેટિંગ્સ સેવ કરો</button>
          </form>

          {/* CLOUD DATABASE & MIGRATION */}
          <div style={{ marginTop: "2rem", padding: "1.2rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "1rem", color: "#1e293b" }}>ડેટાબેઝ સિસ્ટમ:</strong>
                  <span style={{ 
                    fontSize: "0.85rem", 
                    padding: "3px 10px", 
                    borderRadius: "6px", 
                    backgroundColor: dbSource === 'neon' ? '#dcfce7' : '#fef9c3', 
                    color: dbSource === 'neon' ? '#166534' : '#854d0e',
                    fontWeight: "600",
                    border: dbSource === 'neon' ? '1px solid #86efac' : '1px solid #fde047'
                  }}>
                    {dbSource === 'neon' ? '⚡ Neon Postgres (હાઈ-સ્પીડ ક્લાઉડ DB)' : '📊 Google Sheets (ડિફોલ્ટ મોડ)'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", maxWidth: "600px" }}>
                  {dbSource === 'neon' 
                    ? 'તમારો બધો ડેટા અને સેટિંગ્સ Neon Cloud Database માં સુરક્ષિત છે. Google Sheets માં બેકઅપ પણ ચાલુ છે.' 
                    : 'જ્યારે Neon DATABASE_URL સેટ થશે ત્યારે ડેટાબેઝ આપોઆપ Neon પર સ્વિચ થઈ જશે. નીચેના બટનથી ગૂગલ શીટનો તમામ જૂનો ડેટા Neon માં લાવી શકાય છે.'}
                </p>
              </div>

              <button 
                type="button" 
                onClick={async () => {
                  if (!confirm("શું તમે Google Sheets નો તમામ જૂનો ડેટા Neon Postgres માં Import કરવા માંગો છો?")) return;
                  setIsMigrating(true);
                  try {
                    const res = await fetch('/api/migrate', { method: 'POST' });
                    let data;
                    try {
                      data = await res.json();
                    } catch (e) {
                      throw new Error(res.statusText || "સર્વર પ્રતિસાદ મળ્યો નથી");
                    }
                    if (data && data.success) {
                      alert(data.message);
                      setDbSource('neon');
                      fetchRecentEntries();
                    } else {
                      alert("માઈગ્રેશન એરર: " + (data?.error || "કંઈક ખોટું થયું"));
                    }
                  } catch (err) {
                    alert("કનેક્શન એરર: " + err.message);
                  } finally {
                    setIsMigrating(false);
                  }
                }} 
                disabled={isMigrating} 
                className="btn btn-primary"
                style={{ padding: "0.6rem 1.2rem", fontSize: "0.9rem" }}
              >
                {isMigrating ? "માઈગ્રેશન ચાલુ છે..." : "🔄 Google Sheets નો જૂનો ડેટા Neon માં લાવો"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedEntry && (
        <div className="modal-overlay">
          <div className="glass-panel animate-fade-in hide-on-print" style={{ padding: "2rem", maxWidth: "500px", width: "95%", backgroundColor: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <h2 style={{ color: "var(--primary)", margin: 0 }}>એન્ટ્રી વિગત</h2>
              <button onClick={() => setShowViewModal(false)} className="btn btn-outline" style={{ padding: "0.5rem" }}><X size={18} /></button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", fontSize: "1.1rem", color: "#333" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>વાઉચર નં:</span><strong>{selectedEntry.voucherId}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>તારીખ:</span><strong>{selectedEntry.date}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>ખેડૂતનું નામ:</span><strong>{selectedEntry.farmerName}{selectedEntry.villageName ? ` - ${selectedEntry.villageName}` : ''}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>નેટ વજન:</span><strong>{selectedEntry.netWeight} kg</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>ફાઇનલ વજન:</span><strong>{selectedEntry.finalWeight} kg</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>રકમ:</span><strong style={{ color: "var(--success)" }}>₹ {selectedEntry.finalAmount}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>સ્ટેટસ:</span><strong>{selectedEntry.status}</strong></div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button onClick={() => handlePrintFromView('invoice')} className="btn btn-primary" style={{ flex: 1, padding: "0.8rem" }}><Printer size={18} /> પહોંચ</button>
              <button onClick={() => handlePrintFromView('cheque')} className="btn btn-primary" style={{ flex: 1, padding: "0.8rem" }}><Printer size={18} /> ચેક</button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE MODAL (Overlay) */}
      {showInvoiceModal && lastSavedData && (
        <div className="modal-overlay">
          <div id="invoice-print-area" className="glass-panel print-panel modal-content" style={{ padding: "0", maxWidth: "100%", width: "100%", margin: "0 auto", position: "relative", backgroundColor: "#f8fafc", overflowX: "auto", overflowY: "visible", paddingBottom: "2rem" }}>
            <button id="invoice-close-btn" className="hide-on-print" onClick={() => setShowInvoiceModal(false)} style={{ position: "fixed", right: "1rem", top: "1rem", background: "#fff", borderRadius: "50%", padding: "0.5rem", border: "1px solid #ccc", color: "var(--danger)", cursor: "pointer", zIndex: 9999, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}><X size={24} /></button>

                                    {/* APMC EXACT FIT 14x16cm */}
                        {/* Format toggle for Direct Purchase */}
            {lastSavedData.purchaseType === 'Direct' && (
              <div className="hide-on-print" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", margin: "10px auto 14px auto", padding: "6px 14px", background: "#f1f5f9", borderRadius: "8px", border: "1px solid #cbd5e1", width: "fit-content" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>બિલ ફોર્મેટ:</span>
                <button 
                  type="button" 
                  onClick={() => setDirectBillFormat('modern')} 
                  style={{ 
                    padding: "4px 12px", 
                    fontSize: "12px", 
                    fontWeight: "bold", 
                    borderRadius: "6px", 
                    border: directBillFormat === 'modern' ? "2px solid #6F1113" : "1px solid #cbd5e1", 
                    background: directBillFormat === 'modern' ? "#6F1113" : "#fff", 
                    color: directBillFormat === 'modern' ? "#fff" : "#334155", 
                    cursor: "pointer" 
                  }}>
                  મોડર્ન ઇન્વોઇસ
                </button>
                <button 
                  type="button" 
                  onClick={() => setDirectBillFormat('gujarati')} 
                  style={{ 
                    padding: "4px 12px", 
                    fontSize: "12px", 
                    fontWeight: "bold", 
                    borderRadius: "6px", 
                    border: directBillFormat === 'gujarati' ? "2px solid #6F1113" : "1px solid #cbd5e1", 
                    background: directBillFormat === 'gujarati' ? "#6F1113" : "#fff", 
                    color: directBillFormat === 'gujarati' ? "#fff" : "#334155", 
                    cursor: "pointer" 
                  }}>
                  ગુજરાતી પાવતી (APMC સ્ટાઇલ)
                </button>
              </div>
            )}

            {lastSavedData.purchaseType === 'Direct' && directBillFormat === 'modern' ? (

            <div className="w-full print-area block" style={{ padding: "0.5rem", width: "100%", display: "flex", justifyContent: "center", marginBottom: "0" }}>
              <div className="w-full max-w-[13.2cm] mx-auto bg-white text-black border border-gray-300 shadow-md p-3 sm:p-4 rounded-lg print:border-[1.5px] print:border-black print:shadow-none print:p-2 print:rounded-none print-font print-direct-container" style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', width: "13.2cm", boxSizing: 'border-box' }}>
                <div>
                  <header className="flex items-start justify-between border-b-2 border-black pb-2">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-0.5" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>{voucherSettings.firmName || "Darshan seeds industries"}</h1>
                      <p className="text-xs text-neutral-700">{voucherSettings.firmAddress || "40+41, GIDC, Ganeshpur , Modasa, Arvalli"}</p>
                      <p className="text-xs text-neutral-700 font-semibold">Ph: {voucherSettings.mobileNumber || "9426846985"}</p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Voucher</div>
                      <div className="text-lg font-black text-black">#{(lastSavedData.voucherId && lastSavedData.voucherId !== 'NaN') ? lastSavedData.voucherId : (lastSavedData.dailyPurchaseId ? lastSavedData.dailyPurchaseId.split('-').pop() : '1')}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Date</div>
                      <div className="font-bold text-sm text-black">{lastSavedData.date ? lastSavedData.date.split('-').reverse().join(' / ') : '    /    /૨૦૨'}</div>
                    </div>
                  </header>

                  <div className="mt-2 inline-block rounded border border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-neutral-100" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', marginBottom: '8px' }}>
                    Direct Purchase / સીધી ખરીદી
                  </div>

                  <section className="mt-1 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Farmer Name / વેચનારનું નામ</div>
                      <div className="font-bold text-sm text-black">{lastSavedData.farmerName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-0.5">Village / ગામ</div>
                      <div className="font-bold text-sm text-black">{lastSavedData.villageName || "-"}</div>
                    </div>
                  </section>

                  <section style={{ marginTop: '12px' }}>
                    <h2 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-neutral-700" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>Items / વિગત</h2>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-y-2 border-black bg-neutral-100 text-[11px] uppercase font-bold">
                          <th className="px-2 text-center w-8" style={{ paddingTop: '6px', paddingBottom: '6px' }}>#</th>
                          <th className="px-2 text-left" style={{ paddingTop: '6px', paddingBottom: '6px' }}>Variety</th>
                          <th className="px-2 text-right" style={{ paddingTop: '6px', paddingBottom: '6px' }}>Net Wt. (kg)</th>
                          <th className="px-2 text-right" style={{ paddingTop: '6px', paddingBottom: '6px' }}>Rate (₹)</th>
                          <th className="px-2 text-right" style={{ paddingTop: '6px', paddingBottom: '6px' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let items = [];
                          try {
                            if (lastSavedData.itemsJSON) items = JSON.parse(lastSavedData.itemsJSON);
                            else if (lastSavedData.items) items = lastSavedData.items;
                          } catch(e) {}
                          
                          const minRows = 5;
                          const rows = [...items];
                          while (rows.length < minRows) rows.push(null);

                          return rows.map((it, idx) => {
                            if (!it) {
                              return (
                                <tr key={`empty-${idx}`} style={{ height: "18pt" }}>
                                  <td colSpan="5" style={{ border: "none", padding: "0" }}>&nbsp;</td>
                                </tr>
                              );
                            }

                            const deductionGrams = Number(it.deductionGrams) || 0;
                            const rawWt = Number(it.netWeight) || 0;
                            const wKg = rawWt - ((rawWt / 35.0) * (deductionGrams / 1000));
                            const amt = Math.round((Math.floor(wKg) / 20.0) * Number(it.purchaseRate));

                            return (
                              <tr key={idx} style={{ height: "20pt" }}>
                                <td className="px-2 text-center font-medium" style={{ paddingTop: '4px', paddingBottom: '4px', border: "none" }}>{idx + 1}</td>
                                <td className="px-2 font-bold" style={{ paddingTop: '4px', paddingBottom: '4px', border: "none" }}>મગફળી ({it.variety})</td>
                                <td className="px-2 text-right tabular-nums font-semibold" style={{ paddingTop: '4px', paddingBottom: '4px', border: "none" }}>{wKg.toFixed(2)}</td>
                                <td className="px-2 text-right tabular-nums font-semibold" style={{ paddingTop: '4px', paddingBottom: '4px', border: "none" }}>{Number(it.purchaseRate).toFixed(2)}</td>
                                <td className="px-2 text-right font-bold tabular-nums text-sm" style={{ paddingTop: '4px', paddingBottom: '4px', border: "none" }}>{amt.toLocaleString("en-IN")}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-black bg-neutral-100">
                          <td colSpan="4" className="px-2 text-right text-xs font-bold uppercase" style={{ paddingTop: '6px', paddingBottom: '6px' }}>Total Amount / કુલ રકમ</td>
                          <td className="px-2 text-right text-sm font-extrabold tabular-nums" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
                            <span className="text-xs font-bold mr-1">₹</span>
                            {Math.floor(Number(lastSavedData.finalAmount)).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </section>

                  <section className="mt-3 w-full sm:w-[85%]">
                    <h2 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-neutral-700" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>Payment Breakdown / ચુકવણી વિગત</h2>
                    <table className="w-full text-xs">
                      <tbody>
                        {lastSavedData.cashAmount > 0 && (
                          <tr className="border-b border-dashed border-neutral-300">
                            <td className="py-1 tabular-nums text-neutral-800 w-24">{lastSavedData.date ? lastSavedData.date.split('-').reverse().join('/') : ''}</td>
                            <td className="py-1 text-neutral-800 font-medium">Cash Payment (રોકડ)</td>
                            <td className="py-1 text-right tabular-nums font-bold">₹ {Math.floor(Number(lastSavedData.cashAmount)).toLocaleString("en-IN")}</td>
                          </tr>
                        )}
                        {lastSavedData.chequeAmount > 0 && (
                          <tr className="border-b border-dashed border-neutral-300">
                            <td className="py-1 tabular-nums text-neutral-800 w-24">{lastSavedData.date ? lastSavedData.date.split('-').reverse().join('/') : ''}</td>
                            <td className="py-1 text-neutral-800 font-medium pr-2">
                              Cheque {lastSavedData.chequeNumber ? "#" + lastSavedData.chequeNumber : ""}
                              {lastSavedData.bankName ? " (" + lastSavedData.bankName + ")" : ""}
                            </td>
                            <td className="py-1 text-right tabular-nums font-bold">₹ {Math.floor(Number(lastSavedData.chequeAmount)).toLocaleString("en-IN")}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </section>
                </div>

                <footer className="grid grid-cols-2 gap-8 text-xs pb-1 pt-6" style={{ marginTop: '20px' }}>
                  <div className="border-t border-black pt-1.5 text-center text-neutral-800 font-bold">Farmer's Signature<br/>(વેચનારની સહી)</div>
                  <div className="border-t border-black pt-1.5 text-center text-neutral-800 font-bold">For {voucherSettings.firmName || "Darshan seeds industries"}<br/>(ખરીદનારની સહી)</div>
                </footer>
              </div>
            </div>
) : (<div style={{ width: "13.2cm", minHeight: "auto", height: "auto", boxSizing: "border-box", margin: "0 auto", padding: "0.2cm 0.4cm", backgroundColor: "#fff", color: "#000", fontFamily: "sans-serif", position: "relative", overflow: "visible" }} className="print-apmc-container">
              {/* Header Section */}
              {lastSavedData.purchaseType === 'Direct' ? (
                <>
                  <div style={{ position: "relative", marginBottom: "8px", color: "#000", borderBottom: "1px solid #000", paddingBottom: "4px", minHeight: "2.2cm" }}>
                    <div style={{ position: "absolute", left: 0, top: 0 }}>
                      <img src="/new-logo.png" style={{ width: "2.1cm", height: "2.1cm", objectFit: "contain", backgroundColor: "#fff", display: "block" }} alt="Logo" />
                    </div>
                    <div style={{ width: "100%", textAlign: "center", lineHeight: "1.2", paddingTop: "5px" }}>
                      <div style={{ fontSize: "20pt", fontWeight: "bold", letterSpacing: "1px" }} className="print-dark">દર્શન સીડ્સ ઇન્ડસ્ટ્રીઝ</div>
                      <div style={{ fontSize: "12pt", fontWeight: "bold", marginTop: "4px" }} className="print-dark">ખેતીવાડી ઉત્પન્ન સીધી ખરીદી બિલ</div>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: "9pt", lineHeight: "1.4", marginBottom: "6px", color: "#000" }} className="print-dark">
                    <div style={{ display: "flex", marginBottom: "2px" }}>
                      <span style={{ fontWeight: "bold", width: "3cm" }}>વેચનારનું નામ :</span>
                      <span>{lastSavedData.farmerName}</span>
                    </div>
                    {lastSavedData.villageName && (
                      <div style={{ display: "flex", marginBottom: "2px" }}>
                        <span style={{ fontWeight: "bold", width: "3cm" }}>ગામ :</span>
                        <span>{lastSavedData.villageName}</span>
                      </div>
                    )}
                    
                    <div style={{ display: "flex", alignItems: "center", marginTop: "4px" }}>
                      <span style={{ fontWeight: "bold", width: "1.5cm" }}>NO. :</span>
                      <span style={{ fontSize: "11pt", fontWeight: "bold", width: "3.5cm" }} className="print-dark">{lastSavedData.voucherId}</span>
                      <span style={{ fontWeight: "bold", marginRight: "10px" }}>તારીખ :</span>
                      <span>{lastSavedData.date ? lastSavedData.date.split('-').reverse().join('/') : '    /    /૨૦૨'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: "center", paddingBottom: "2px", marginBottom: "4px" }}>
                    <h1 style={{ fontSize: "16pt", fontWeight: "bold", margin: "0", color: "#000", letterSpacing: "0.5px" }} className="print-dark">
                      ખેતીવાડી ઉત્પન્ન બજાર સમિતિ, મોડાસા.
                    </h1>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", color: "#000", minHeight: "44px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: "14pt", fontWeight: "bold", marginRight: "6px" }} className="print-dark">NO.</span>
                      <div style={{ border: "2px solid #000", padding: "2px 14px", borderRadius: "8px" }}>
                        <span style={{ fontSize: "16pt", fontWeight: "bold" }} className="print-dark">{(lastSavedData.voucherId && lastSavedData.voucherId !== 'NaN') ? lastSavedData.voucherId : (lastSavedData.dailyPurchaseId ? lastSavedData.dailyPurchaseId.split('-').pop() : '1')}</span>
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, textAlign: "center", fontSize: "9.5pt", lineHeight: "1.35", fontWeight: "bold" }} className="print-dark">
                      <div style={{ fontSize: "8.5pt" }}>(જુઓ ઉપવિધિ ૩૬ (૨))</div>
                      <div>વેચાણના આંકડાની રોકડ પાવતી (બીલ)</div>
                      <div>વેચનાર માટે</div>
                    </div>

                    <div style={{ width: "95px" }}></div>
                  </div>

                  <div style={{ fontSize: "9.5pt", lineHeight: "1.4", marginBottom: "6px", color: "#000" }} className="print-dark">
                    <div style={{ display: "flex", alignItems: "baseline" }}>
                      <div style={{ fontWeight: "bold", width: "5.0cm" }}>જનરલ કમીશન એજન્ટનું નામ :</div>
                      <div></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline" }}>
                      <div style={{ fontWeight: "bold", width: "5.0cm" }}>ખરીદનારનું નામ અને સરનામું :</div>
                      <div style={{ fontWeight: "bold" }}>દર્શન સીડ્સ ઇન્ડસ્ટ્રીઝ</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline" }}>
                      <div style={{ fontWeight: "bold", width: "5.0cm" }}>વેચનારનું નામ અને સરનામું :</div>
                      <div>{lastSavedData.farmerName} {lastSavedData.villageName ? `, ${lastSavedData.villageName}` : ''}</div>
                    </div>
                    <div style={{ display: "flex", marginTop: "2px", alignItems: "baseline" }}>
                      <div style={{ fontWeight: "bold", width: "5.0cm" }}>કબાલા નંબર :</div>
                      <div><span style={{ fontWeight: "bold" }}>તારીખ :</span> &nbsp;&nbsp;&nbsp;&nbsp; {lastSavedData.date ? lastSavedData.date.split('-').reverse().join('/') : '    /    /૨૦૨'}</div>
                    </div>
                  </div>
                </>
              )}

              {/* APMC Table Section */}
              <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", marginBottom: "4px", fontSize: "9pt", color: "#000" }} className="print-dark">
                <thead>
                  <tr>
                    <th rowSpan="2" style={{ border: "1px solid #000", padding: "2px", width: "32%" }}>ઉત્પન્નની જાત</th>
                    <th colSpan="3" style={{ border: "1px solid #000", padding: "2px", textAlign: "center", width: "24%" }}>વજન</th>
                    <th colSpan="2" style={{ border: "1px solid #000", padding: "2px", textAlign: "center", width: "22%" }}>ભાવ</th>
                    <th colSpan="2" style={{ border: "1px solid #000", padding: "2px", textAlign: "center", width: "22%" }}>કુલ કિંમત</th>
                  </tr>
                  <tr>
                    <th style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "1px solid #000", borderRight: "none", padding: "1px", textAlign: "center", fontSize: "8pt", width: "8%" }}>કવી.</th>
                    <th style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "none", borderRight: "none", padding: "1px", textAlign: "center", fontSize: "8pt", width: "8%" }}>કીલો</th>
                    <th style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", borderLeft: "none", borderRight: "1px solid #000", padding: "1px", textAlign: "center", fontSize: "8pt", width: "8%" }}>ગ્રામ</th>
                    <th style={{ border: "1px solid #000", padding: "1px", textAlign: "center", fontSize: "8pt", width: "16%" }}>રૂ.</th>
                    <th style={{ border: "1px solid #000", padding: "1px", textAlign: "center", fontSize: "8pt", width: "6%" }}>પૈસા</th>
                    <th style={{ border: "1px solid #000", padding: "1px", textAlign: "center", fontSize: "8pt", width: "16%" }}>રૂ.</th>
                    <th style={{ border: "1px solid #000", padding: "1px", textAlign: "center", fontSize: "8pt", width: "6%" }}>પૈસા</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let items = [];
                    try {
                      if (lastSavedData.itemsJSON) items = JSON.parse(lastSavedData.itemsJSON);
                      else if (lastSavedData.items) items = lastSavedData.items;
                    } catch(e) {}
                    
                    const minRows = lastSavedData.purchaseType === 'Direct' ? 9 : 7;
                    const rows = [...items];
                    while(rows.length < minRows) rows.push(null);

                    return rows.map((it, idx) => {
                      if(!it) return (
                        <tr key={`empty-${idx}`} style={{ height: "18pt" }}>
                          <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: "none", borderBottom: "none" }}></td>
                          <td colSpan="3" style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: "none", borderBottom: "none" }}></td>
                          <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: "none", borderBottom: "none" }}></td>
                          <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: "none", borderBottom: "none" }}></td>
                          <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: "none", borderBottom: "none" }}></td>
                          <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: "none", borderBottom: "none" }}></td>
                        </tr>
                      );
                      
                      const deduction = Number(it.deductionGrams) || 0;
                      const rawWt = Number(it.netWeight) || 0;
                      const itWeight = Math.floor(rawWt - ((rawWt / 35.0) * (deduction / 1000)));
                      const itAmount = Math.round((itWeight / 20.0) * Number(it.purchaseRate));

                      const wKg = Math.floor(itWeight);
                      const kvi = Math.floor(wKg / 100);
                      const kilo = wKg % 100;
                      
                      const rateStr = Number(it.purchaseRate).toFixed(2);
                      const [rRs, rPs] = rateStr.split('.');
                      
                      const amtStr = Number(itAmount).toFixed(2);
                      const [aRs, aPs] = amtStr.split('.');

                      return (
                        <tr key={idx} style={{ height: "18pt", textAlign: "center", fontWeight: "bold", fontSize: "12pt" }}>
                          <td style={{ border: "1px solid #000", padding: "1px", textAlign: "left", borderTop: idx===0?"1px solid #000":"none", borderBottom:"none" }}>મગફળી ({it.variety})</td>
                          <td colSpan="3" style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: idx===0?"1px solid #000":"none", borderBottom: "none", padding: "1px" }}>
                            {wKg}.000
                          </td>
                          <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: idx===0?"1px solid #000":"none", borderBottom: "none", padding: "1px" }}>{rRs}</td>
                          <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: idx===0?"1px solid #000":"none", borderBottom: "none", padding: "1px" }}>{rPs || '00'}</td>
                          <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: idx===0?"1px solid #000":"none", borderBottom: "none", padding: "1px" }}>{aRs}</td>
                          <td style={{ borderLeft: "1px solid #000", borderRight: "1px solid #000", borderTop: idx===0?"1px solid #000":"none", borderBottom: "none", padding: "1px" }}>{aPs || '00'}</td>
                        </tr>
                      );
                    });
                  })()}
                  
                  {/* Footer Line explicitly to cap the open columns */}
                  <tr>
                    <td colSpan="4" style={{ borderTop: "1px solid #000" }}></td>
                    <td colSpan="2" style={{ borderTop: "1px solid #000" }}></td>
                    <td colSpan="2" style={{ borderTop: "1px solid #000" }}></td>
                  </tr>

                  {/* Summary rows */}
                  <tr style={{ height: "18pt" }}>
                    <td colSpan="4" rowSpan={lastSavedData.purchaseType === 'Direct' ? 3 : 5} style={{ border: "1px solid #000", borderRight: "none", verticalAlign: "top", padding: "0px", position: "relative" }}>
                      <div style={{ height: "18pt", display: "flex", alignItems: "center", borderBottom: "1px solid #000", padding: "0 2px", fontSize: "9pt", fontWeight: "bold", boxSizing: "border-box" }}>
                        રોકડ: ₹{lastSavedData.cashAmount || 0} &nbsp;&nbsp;|&nbsp;&nbsp; ચેક: ₹{lastSavedData.chequeAmount || 0}
                      </div>
                      <div style={{ height: "18pt", display: "flex", alignItems: "center", borderBottom: "1px solid #000", padding: "0 2px", fontWeight: "bold", boxSizing: "border-box" }}>
                        GSTIN,
                      </div>
                      
                      <div style={{ padding: "0 2px", position: "absolute", bottom: "10px", left: "2px", fontWeight: "bold" }}>વેચનારની સહી...</div>
                      <hr style={{ borderTop: "1px solid #000", margin: "0", position: "absolute", bottom: "8px", left: "2px", width: "70%" }} />
                      {/* Logo positioned absolute, to the right side of this cell */}
                      {lastSavedData.purchaseType !== 'Direct' && (
                        <div style={{ position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}>
                          <img src="/apmc-logo.png" style={{ width: "2.2cm", height: "2.2cm", objectFit: "contain", backgroundColor: "#fff", display: "block" }} alt="APMC Logo" />
                        </div>
                      )}
                    </td>
                    <td colSpan="2" style={{ borderBottom: "1px solid #000", borderLeft: "1px solid #000", borderRight: "1px solid #000", padding: "2px", textAlign: "right", fontWeight: "bold", fontSize: "9pt" }}>ટોટલ...</td>
                    <td colSpan="2" style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "2px" }}></td>
                  </tr>
                  <tr style={{ height: "18pt" }}>
                    <td colSpan="2" style={{ borderBottom: "1px solid #000", borderLeft: "1px solid #000", borderRight: "1px solid #000", padding: "2px", textAlign: "right", fontWeight: "bold", fontSize: "9pt" }}>કપાતની વિગત..</td>
                    <td colSpan="2" style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "2px" }}></td>
                  </tr>
                  {lastSavedData.purchaseType !== 'Direct' && (
                    <>
                      <tr style={{ height: "18pt" }}>
                        <td colSpan="2" style={{ borderBottom: "1px solid #000", borderLeft: "1px solid #000", borderRight: "1px solid #000", padding: "2px", textAlign: "right", fontWeight: "bold", fontSize: "9pt" }}>કમીશન...</td>
                        <td colSpan="2" style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "2px" }}></td>
                      </tr>
                      <tr style={{ height: "18pt" }}>
                        <td colSpan="2" style={{ borderBottom: "1px solid #000", borderLeft: "1px solid #000", borderRight: "1px solid #000", padding: "2px", textAlign: "right", fontWeight: "bold", fontSize: "9pt" }}>દલાલી...</td>
                        <td colSpan="2" style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "2px" }}></td>
                      </tr>
                    </>
                  )}
                  {lastSavedData.purchaseType !== 'Direct' && (
                    <tr style={{ height: "18pt" }}>
                      <td colSpan="2" style={{ borderBottom: "1px solid #000", borderLeft: "1px solid #000", borderRight: "1px solid #000", padding: "2px", textAlign: "right", fontWeight: "bold", fontSize: "9pt" }}>કુલ...</td>
                      <td colSpan="2" style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "2px" }}></td>
                    </tr>
                  )}
                  {/* Row 6: The bottom row containing thumb impression and final amount */}
                  <tr style={{ height: "24pt" }}>
                    {lastSavedData.purchaseType !== 'Direct' ? (
                      <>
                        <td colSpan="1" style={{ borderBottom: "1px solid #000", borderLeft: "1px solid #000", borderRight: "1px solid #000", padding: "2px", position: "relative", verticalAlign: "bottom" }}>
                          <div style={{ fontWeight: "bold", fontSize: "9pt", lineHeight: "1.2", paddingBottom: "2px" }}>
                            અથવા અંગુઠાનું<br/>નિશાન
                          </div>
                        </td>
                        <td colSpan="5" style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "2px", textAlign: "right", fontWeight: "bold", fontSize: "11pt", verticalAlign: "middle" }}>
                          કપાત બાદ ચોખ્ખી ચૂકવવાની રકમ
                        </td>
                      </>
                    ) : (
                      <td colSpan="2" style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "2px", textAlign: "right", fontWeight: "bold", fontSize: "12pt", verticalAlign: "middle" }}>
                        ચોખ્ખી ચૂકવવાની રકમ
                      </td>
                    )}
                    <td colSpan="2" style={{ borderBottom: "1px solid #000", borderRight: "1px solid #000", padding: "2px", fontWeight: "bold", textAlign: "center", fontSize: "11pt", verticalAlign: "middle" }}>
                      {Math.floor(Number(lastSavedData.finalAmount))}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* APMC Bottom Signatures */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "12px", padding: "0 4px", color: "#000" }} className="print-dark">
                <div style={{ zIndex: 1, paddingBottom: "2px" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {lastSavedData.purchaseType !== 'Direct' && (
                      <div style={{ fontWeight: "bold", fontSize: "8pt", lineHeight: "1.2" }}>
                        ખરીદનારે/જ.ક.એજન્ટે<br/>ભરવાની માર્કેટ ફીની રકમ
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ zIndex: 1, fontWeight: "bold", fontSize: "9.5pt", paddingBottom: "2px", textAlign: "right" }}>
                  {lastSavedData.purchaseType === 'Direct' ? 'For, દર્શન સીડ્સ ઇન્ડસ્ટ્રીઝ' : 'ખરીદનાર અથવા તેના એજન્ટની સહી.'}
                </div>
              </div>
            </div>

            )}<div className="hide-on-print" style={{ maxWidth: "440px", margin: "0 auto", marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem", borderTop: "2px dashed #cbd5e1", paddingTop: "0.8rem" }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                
              <button type="button" onClick={() => {
                const firmName = voucherSettings.firmName || "DARSHAN SEEDS INDUSTRIES";
                let itemsText = "";
                try {
                  let parsed = [];
                  if (lastSavedData.itemsJSON) parsed = JSON.parse(lastSavedData.itemsJSON);
                  else if (lastSavedData.items) parsed = lastSavedData.items;
                  if (parsed && parsed.length > 0) {
                    itemsText = "વજન(kg) | ભાવ(₹) | રકમ(₹)\n";
                    itemsText += parsed.map((it, i) => {
                      const deduction = Number(it.deductionGrams) || 0;
                      const rawWt = Number(it.netWeight) || 0;
                      const w = rawWt - ((rawWt / 35.0) * (deduction / 1000));
                      const amt = Math.round((Math.floor(w) / 20.0) * Number(it.purchaseRate));
                      return `${Math.floor(w)} | ${it.purchaseRate} | ${Math.floor(amt)}`;
                    }).join('\n');
                  } else {
                    itemsText = `વજન: ${Math.floor(Number(lastSavedData.finalWeight))} kg\nભાવ: ₹${lastSavedData.purchaseRate}`;
                  }
                } catch(e) {}
                const waText = `*${firmName}*\n\nવાઉચર નં: ${lastSavedData.voucherId}\nખેડૂતનું નામ: ${lastSavedData.farmerName}${lastSavedData.villageName ? ' - ' + lastSavedData.villageName : ''}\n\n${itemsText}\n------------------\n*કુલ રકમ: ₹${Math.floor(Number(lastSavedData.finalAmount)).toLocaleString('en-IN')}*\n` 
                + (lastSavedData.cashAmount ? `રોકડ: ₹${Math.floor(Number(lastSavedData.cashAmount))}\n` : "") 
                + (lastSavedData.chequeAmount ? `ચેક: ₹${Math.floor(Number(lastSavedData.chequeAmount))}\n` : "")
                + (lastSavedData.chequeNumber ? `ચેક નં: ${lastSavedData.chequeNumber} ${lastSavedData.bankName ? '(' + lastSavedData.bankName + ')' : ''}\n` : "");
                
                const cleanPhone = lastSavedData.mobileNumber ? lastSavedData.mobileNumber.replace(/\D/g, '') : '';
                const waUrl = cleanPhone && cleanPhone.length >= 10 
                  ? `whatsapp://send?phone=91${cleanPhone.slice(-10)}&text=${encodeURIComponent(waText)}` 
                  : `whatsapp://send?text=${encodeURIComponent(waText)}`;
                
                // Use window.location.href to trigger the intent without opening a blank tab
                window.location.href = waUrl;
              }} className="btn" style={{ flex: 1, background: "#25D366", color: "white" }}><Share2 size={18} /> WhatsApp</button>
              <button type="button" onClick={() => window.print()} className="btn btn-primary" style={{ flex: 1 }}><Printer size={18} /> પ્રિન્ટ (A5)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHEQUE PRINT MODAL */}
      {showChequeModal && lastSavedData && (
        <div className="modal-overlay">
          <div className="glass-panel print-panel modal-content" style={{ padding: "2rem", maxWidth: "900px", width: "95%", margin: "0 auto", position: "relative", backgroundColor: "#ffffff", overflow: "visible" }}>
            <button className="hide-on-print" onClick={() => setShowChequeModal(false)} style={{ position: "absolute", right: "1rem", top: "1rem", background: "none", border: "none", color: "var(--danger)", cursor: "pointer", zIndex: 10 }}><X size={24} /></button>
            
            <h2 className="hide-on-print" style={{marginBottom: "1rem", color: "var(--primary)", marginTop: "1rem"}}>ચેક પ્રિન્ટ પ્રિવ્યૂ</h2>
            <p className="hide-on-print" style={{fontSize: "0.9rem", color: "#555", marginBottom: "2rem"}}>નોંધ: આ પ્રિવ્યૂ છે. પ્રિન્ટ આપશો ત્યારે બેકગ્રાઉન્ડ છુપાઈ જશે અને માત્ર અક્ષરો જ પ્રિન્ટ થશે. સેટિંગ્સમાંથી જગ્યા (માર્જિન) સેટ કરી શકાશે.</p>

            <div style={{ width: "100%", overflowX: "auto", paddingBottom: "1rem" }} className="hide-on-print">
              <div id="cheque-print-area" style={{ position: "relative", width: "20.3cm", height: "8.9cm", border: "1px dashed #ccc", backgroundColor: "#fdfdfd", fontFamily: "monospace", fontSize: "14px", color: "black", overflow: "visible" }}>
                <div className="cheque-field" style={{ position: "absolute", top: `${chequeSettings.dateTop}cm`, left: `${chequeSettings.dateLeft}cm`, letterSpacing: `${chequeSettings.dateCharSpacing}px` }}>
                  {lastSavedData.date.split('-').reverse().join('')}
                </div>
                <div className="cheque-field" style={{ position: "absolute", top: `${chequeSettings.payeeTop}cm`, left: `${chequeSettings.payeeLeft}cm` }}>
                  {lastSavedData.farmerName}
                </div>
                <div className="cheque-field" style={{ position: "absolute", top: `${chequeSettings.amountWordsTop}cm`, left: `${chequeSettings.amountWordsLeft}cm`, width: `${chequeSettings.amountWordsWidth}cm`, lineHeight: "1.8" }}>
                  Rupees {numberToWords(Math.floor(Number(lastSavedData.chequeAmount)))}
                </div>
                <div className="cheque-field" style={{ position: "absolute", top: `${chequeSettings.amountNumTop}cm`, left: `${chequeSettings.amountNumLeft}cm` }}>
                  **{Math.floor(Number(lastSavedData.chequeAmount)).toLocaleString('en-IN')}/-
                </div>
              </div>
            </div>

            {/* Print Only Layout */}
            <div id="cheque-print-only" style={{ display: "none" }} className="show-on-print">
              <div style={{ position: "relative", width: "20.3cm", height: "8.9cm", fontFamily: "monospace", fontSize: "14px", color: "black", overflow: "visible" }}>
                <div style={{ position: "absolute", top: `${chequeSettings.dateTop}cm`, left: `${chequeSettings.dateLeft}cm`, letterSpacing: `${chequeSettings.dateCharSpacing}px` }}>
                  {lastSavedData.date.split('-').reverse().join('')}
                </div>
                <div style={{ position: "absolute", top: `${chequeSettings.payeeTop}cm`, left: `${chequeSettings.payeeLeft}cm` }}>
                  {lastSavedData.farmerName}
                </div>
                <div style={{ position: "absolute", top: `${chequeSettings.amountWordsTop}cm`, left: `${chequeSettings.amountWordsLeft}cm`, width: `${chequeSettings.amountWordsWidth}cm`, lineHeight: "1.8" }}>
                  Rupees {numberToWords(Math.floor(Number(lastSavedData.chequeAmount)))}
                </div>
                <div style={{ position: "absolute", top: `${chequeSettings.amountNumTop}cm`, left: `${chequeSettings.amountNumLeft}cm` }}>
                  **{Math.floor(Number(lastSavedData.chequeAmount)).toLocaleString('en-IN')}/-
                </div>
              </div>
            </div>

            <div className="hide-on-print" style={{ marginTop: "1.5rem", display: "flex", gap: "1rem" }}>
              <button type="button" onClick={() => window.print()} className="btn btn-primary" style={{ flex: 1 }}><Printer size={18} /> ચેક પ્રિન્ટ કરો</button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="glass-panel animate-fade-in hide-on-print" style={{ padding: "1.5rem", maxWidth: "400px", width: "90%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ color: "var(--primary)" }}>Tally XML ડાઉનલોડ</h2>
              <button onClick={() => setShowExportModal(false)} className="btn btn-outline" style={{ padding: "0.5rem" }}><X size={18} /></button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="form-group">
                <label className="form-label">શરૂઆતની તારીખ (Start Date)</label>
                <input type="date" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">અંતિમ તારીખ (End Date)</label>
                <input type="date" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="form-input" />
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button onClick={() => { handleExportTallyXML('APMC'); setShowExportModal(false); }} className="btn btn-primary" style={{ flex: 1, backgroundColor: "#6F1113" }}>APMC XML</button>
              <button onClick={() => { handleExportTallyXML('Direct'); setShowExportModal(false); }} className="btn btn-primary" style={{ flex: 1, backgroundColor: "#6F1113" }}>Direct XML</button>
            </div>
          </div>
        </div>
      )}

      </div>
      </div>
    </main>
  );
}
