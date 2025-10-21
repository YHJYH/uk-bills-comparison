"use client";

import { supabase } from "../lib/supabaseClient";
import React, { useState, useEffect } from 'react';
import { Search, Upload, Zap, Droplets, Wifi, Flame, AlertTriangle, Clock, X } from 'lucide-react';

export default function UKBillsComparison() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchData, setSearchData] = useState({ postcode: '', bedrooms: '', people: '' });
  const [submitData, setSubmitData] = useState({
    postcode: '', bedrooms: '', people: '', electricityCost: '', electricityProvider: '',
    waterCost: '', waterProvider: '', broadbandCost: '', broadbandProvider: '',
    gasCost: '', gasProvider: '', costType: 'total'
  });
  const [selectedBills, setSelectedBills] = useState({ electricity: false, water: false, broadband: false, gas: false });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [allData, setAllData] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);

  const validationRanges = {
    electricityCost: { min: 10, max: 500 },
    waterCost: { min: 10, max: 200 },
    broadbandCost: { min: 15, max: 150 },
    gasCost: { min: 10, max: 500 }
  };

  useEffect(() => { loadAllData(); }, []);

  // const loadAllData = async () => {
  //   try {
  //     const keys = await window.storage.list('bill:');
  //     if (keys && keys.keys) {
  //       const dataPromises = keys.keys.map(async (key) => {
  //         try {
  //           const result = await window.storage.get(key);
  //           if (result) {
  //             const data = JSON.parse(result.value);
  //             data.storageKey = key;
  //             return data;
  //           }
  //           return null;
  //         } catch { return null; }
  //       });
  //       const data = (await Promise.all(dataPromises)).filter(d => d !== null);
  //       setAllData(data);
  //     }
  //   } catch (error) {
  //     setAllData([]);
  //   }
  // };
  const loadAllData = async () => {
    // 只取计数，不把整表搬到前端
    const { count, error } = await supabase
      .from("bills")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error(error);
      setAllData([]);
      return;
    }
    // 你页面底部要显示 allData.length，所以这里构造一个“长度数组”
    setAllData(Array.from({ length: count ?? 0 }));
  };

  // 把 Supabase 行 → 映射成你原来前端在用的字段命名
  const mapRowToFront = (r: any) => ({
    id: r.id,
    postcode: r.postcode,
    bedrooms: String(r.bedrooms),
    people: String(r.people),
    costType: r.cost_type, // 'total' | 'perPerson'
    // 费用字段（可能为 null，用 undefined 过滤）
    electricityCost: r.electricity_cost ?? undefined,
    waterCost: r.water_cost ?? undefined,
    broadbandCost: r.broadband_cost ?? undefined,
    gasCost: r.gas_cost ?? undefined,
    electricityProvider: r.electricity_provider ?? "",
    waterProvider: r.water_provider ?? "",
    broadbandProvider: r.broadband_provider ?? "",
    gasProvider: r.gas_provider ?? "",
    // 供“最近更新时间”使用
    timestamp: r.created_at ? new Date(r.created_at).getTime() : undefined,
  });

  const fetchByStrategy = async (
    strategy: "exact" | "flexible-same-area" | "nearby" | "flexible-nearby",
    prefix: string,
    area: string,
    bedrooms: number,
    people: number
  ) => {
    const bMin = bedrooms - 1, bMax = bedrooms + 1;
    const pMin = people - 1, pMax = people + 1;

    if (strategy === "exact") {
      return supabase
        .from("bills")
        .select("*")
        .eq("postcode_prefix", prefix)
        .eq("bedrooms", bedrooms)
        .eq("people", people);
    }

    if (strategy === "flexible-same-area") {
      return supabase
        .from("bills")
        .select("*")
        .eq("postcode_prefix", prefix)
        .gte("bedrooms", bMin).lte("bedrooms", bMax)
        .gte("people", pMin).lte("people", pMax);
    }

    if (strategy === "nearby") {
      return supabase
        .from("bills")
        .select("*")
        .eq("postcode_area", area)
        .eq("bedrooms", bedrooms)
        .eq("people", people);
    }

    // flexible-nearby
    return supabase
      .from("bills")
      .select("*")
      .eq("postcode_area", area)
      .gte("bedrooms", bMin).lte("bedrooms", bMax)
      .gte("people", pMin).lte("people", pMax);
  };


  const validateCost = (field, value) => {
    if (!value || value === '') return true;
    const numValue = parseFloat(value);
    const range = validationRanges[field];
    return numValue >= range.min && numValue <= range.max;
  };

  const getTimeSince = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    return 'Today';
  };

  // const handleSearch = async () => {
  //   if (!searchData.postcode || !searchData.bedrooms || !searchData.people) {
  //     alert('Please fill in all search fields');
  //     return;
  //   }

  //   setLoading(true);
  //   const postcodePrefix = searchData.postcode.trim().toUpperCase().split(' ')[0];
  //   const searchBedrooms = parseInt(searchData.bedrooms);
  //   const searchPeople = parseInt(searchData.people);
    
  //   let filtered = allData.filter(item => {
  //     const itemPostcodePrefix = item.postcode.trim().toUpperCase().split(' ')[0];
  //     return itemPostcodePrefix === postcodePrefix && parseInt(item.bedrooms) === searchBedrooms && parseInt(item.people) === searchPeople;
  //   });
  //   let matchType = 'exact';

  //   if (filtered.length === 0) {
  //     filtered = allData.filter(item => {
  //       const itemPostcodePrefix = item.postcode.trim().toUpperCase().split(' ')[0];
  //       const bedroomMatch = Math.abs(parseInt(item.bedrooms) - searchBedrooms) <= 1;
  //       const peopleMatch = Math.abs(parseInt(item.people) - searchPeople) <= 1;
  //       return itemPostcodePrefix === postcodePrefix && bedroomMatch && peopleMatch;
  //     });
  //     matchType = 'flexible-same-area';
  //   }

  //   if (filtered.length === 0) {
  //     const postcodeArea = postcodePrefix.replace(/\d+$/, '');
  //     filtered = allData.filter(item => {
  //       const itemPostcodePrefix = item.postcode.trim().toUpperCase().split(' ')[0];
  //       const itemPostcodeArea = itemPostcodePrefix.replace(/\d+$/, '');
  //       return itemPostcodeArea === postcodeArea && parseInt(item.bedrooms) === searchBedrooms && parseInt(item.people) === searchPeople;
  //     });
  //     matchType = 'nearby';
  //   }

  //   if (filtered.length === 0) {
  //     const postcodeArea = postcodePrefix.replace(/\d+$/, '');
  //     filtered = allData.filter(item => {
  //       const itemPostcodePrefix = item.postcode.trim().toUpperCase().split(' ')[0];
  //       const itemPostcodeArea = itemPostcodePrefix.replace(/\d+$/, '');
  //       const bedroomMatch = Math.abs(parseInt(item.bedrooms) - searchBedrooms) <= 1;
  //       const peopleMatch = Math.abs(parseInt(item.people) - searchPeople) <= 1;
  //       return itemPostcodeArea === postcodeArea && bedroomMatch && peopleMatch;
  //     });
  //     matchType = 'flexible-nearby';
  //   }

  //   if (filtered.length === 0) {
  //     setResults({ count: 0, message: 'No data found for these criteria. Be the first to contribute!' });
  //   } else {
  //     const calculateStats = (field) => {
  //       const values = filtered.map(item => {
  //         const cost = parseFloat(item[field]) || 0;
  //         return item.costType === 'perPerson' ? cost * parseInt(item.people) : cost;
  //       }).filter(v => v > 0);
  //       if (values.length === 0) return null;
  //       const sum = values.reduce((a, b) => a + b, 0);
  //       return { avg: sum / values.length, min: Math.min(...values), max: Math.max(...values), count: values.length };
  //     };

  //     const getProviders = (field) => {
  //       const providers = filtered.map(item => item[field]).filter(p => p && p.trim() !== '');
  //       const counts = {};
  //       providers.forEach(p => counts[p] = (counts[p] || 0) + 1);
  //       return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
  //     };

  //     const getMostRecentTimestamp = () => {
  //       const timestamps = filtered.map(item => item.timestamp).filter(t => t);
  //       return timestamps.length > 0 ? Math.max(...timestamps) : null;
  //     };

  //     const elec = calculateStats('electricityCost');
  //     const water = calculateStats('waterCost');
  //     const broad = calculateStats('broadbandCost');
  //     const gas = calculateStats('gasCost');

  //     setResults({
  //       count: filtered.length, matchType, mostRecent: getMostRecentTimestamp(),
  //       stats: { electricity: elec, water: water, broadband: broad, gas: gas },
  //       providers: {
  //         electricity: getProviders('electricityProvider'), water: getProviders('waterProvider'),
  //         broadband: getProviders('broadbandProvider'), gas: getProviders('gasProvider')
  //       },
  //       total: (elec?.avg || 0) + (water?.avg || 0) + (broad?.avg || 0) + (gas?.avg || 0),
  //       rawData: filtered
  //     });
  //   }
  //   setLoading(false);
  // };

  const handleSearch = async () => {
    if (!searchData.postcode || !searchData.bedrooms || !searchData.people) {
      alert("Please fill in all search fields");
      return;
    }

    setLoading(true);

    const postcodePrefix = searchData.postcode.trim().toUpperCase().split(" ")[0];
    const postcodeArea = postcodePrefix.replace(/\d+$/, "");
    const b = parseInt(searchData.bedrooms, 10);
    const p = parseInt(searchData.people, 10);

    const strategies: Array<"exact"|"flexible-same-area"|"nearby"|"flexible-nearby"> =
      ["exact", "flexible-same-area", "nearby", "flexible-nearby"];

    let found: any[] | null = null;
    let matchType: string = "exact";

    for (const s of strategies) {
      const { data, error } = await fetchByStrategy(s, postcodePrefix, postcodeArea, b, p);
      if (error) { console.error(error); continue; }
      if (data && data.length > 0) {
        found = data.map(mapRowToFront);
        matchType = s;
        break;
      }
    }

    if (!found) {
      setResults({ count: 0, message: "No data found for these criteria. Be the first to contribute!" });
      setLoading(false);
      return;
    }

    // 统计函数复用你原本的口径（perPerson 时乘以 people）
    const calculateStats = (field: string) => {
      const values = found!
        .map((item) => {
          const cost = parseFloat(item[field]) || 0;
          return item.costType === "perPerson" ? cost * parseInt(item.people) : cost;
        })
        .filter((v) => v > 0);
      if (values.length === 0) return null;
      const sum = values.reduce((a, b) => a + b, 0);
      return { avg: sum / values.length, min: Math.min(...values), max: Math.max(...values), count: values.length };
    };

    const getProviders = (field: string) => {
      const providers = found!.map((item) => item[field]).filter((p) => p && String(p).trim() !== "");
      const counts: Record<string, number> = {};
      providers.forEach((p: string) => (counts[p] = (counts[p] || 0) + 1));
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
    };

    const getMostRecentTimestamp = () => {
      const timestamps = found!.map((item) => item.timestamp).filter(Boolean);
      return timestamps.length > 0 ? Math.max(...(timestamps as number[])) : null;
    };

    const elec = calculateStats("electricityCost");
    const water = calculateStats("waterCost");
    const broad = calculateStats("broadbandCost");
    const gas = calculateStats("gasCost");

    setResults({
      count: found.length,
      matchType,
      mostRecent: getMostRecentTimestamp(),
      stats: { electricity: elec, water, broadband: broad, gas },
      providers: {
        electricity: getProviders("electricityProvider"),
        water: getProviders("waterProvider"),
        broadband: getProviders("broadbandProvider"),
        gas: getProviders("gasProvider"),
      },
      total: (elec?.avg || 0) + (water?.avg || 0) + (broad?.avg || 0) + (gas?.avg || 0),
      rawData: found,
    });

    setLoading(false);
  };


  // const handleReport = async (entry) => {
  //   const reason = prompt('Please describe why you think this data is incorrect:');
  //   if (!reason) return;
  //   try {
  //     const reportKey = `report:${entry.storageKey}_${Date.now()}`;
  //     await window.storage.set(reportKey, JSON.stringify({ dataKey: entry.storageKey, reason, timestamp: Date.now(), reportedData: entry }));
  //     alert('Thank you for your report. We will review this data.');
  //     setShowReportModal(false);
  //   } catch (error) {
  //     alert('Error submitting report. Please try again.');
  //   }
  // };

  const handleReport = async (entry: any) => {
    const reason = prompt("Please describe why you think this data is incorrect:");
    if (!reason) return;

    // entry 是我们刚才 map 过的前端行对象，其中含有 id
    const payload = {
      bill_id: entry.id,                 // 需要你在 Supabase 有 reports.bill_id 外键
      reason,
      reported_payload: entry,           // 便于后台审核查看原始字段
    };

    const { error } = await supabase.from("reports").insert(payload);
    if (error) {
      console.error(error);
      alert("Error submitting report. Please try again.");
      return;
    }

    alert("Thank you for your report. We will review this data.");
    setShowReportModal(false);
  };


  // const handleSubmit = async () => {
  //   if (!submitData.postcode || !submitData.bedrooms || !submitData.people) {
  //     alert('Please fill in postcode, bedrooms, and number of people');
  //     return;
  //   }
  //   if (!Object.values(selectedBills).some(v => v)) {
  //     alert('Please select at least one bill type to contribute');
  //     return;
  //   }

  //   const validationErrors = [];
  //   if (selectedBills.electricity && submitData.electricityCost && !validateCost('electricityCost', submitData.electricityCost)) {
  //     validationErrors.push(`Electricity: £${validationRanges.electricityCost.min}-£${validationRanges.electricityCost.max}`);
  //   }
  //   if (selectedBills.water && submitData.waterCost && !validateCost('waterCost', submitData.waterCost)) {
  //     validationErrors.push(`Water: £${validationRanges.waterCost.min}-£${validationRanges.waterCost.max}`);
  //   }
  //   if (selectedBills.broadband && submitData.broadbandCost && !validateCost('broadbandCost', submitData.broadbandCost)) {
  //     validationErrors.push(`Broadband: £${validationRanges.broadbandCost.min}-£${validationRanges.broadbandCost.max}`);
  //   }
  //   if (selectedBills.gas && submitData.gasCost && !validateCost('gasCost', submitData.gasCost)) {
  //     validationErrors.push(`Gas: £${validationRanges.gasCost.min}-£${validationRanges.gasCost.max}`);
  //   }
  //   if (validationErrors.length > 0) {
  //     alert('Please check the following:\n\n' + validationErrors.join('\n'));
  //     return;
  //   }

  //   try {
  //     const timestamp = Date.now();
  //     const key = `bill:${submitData.postcode.replace(/\s+/g, '')}_${timestamp}`;
  //     const dataToSubmit = { postcode: submitData.postcode, bedrooms: submitData.bedrooms, people: submitData.people, costType: submitData.costType, timestamp };
  //     if (selectedBills.electricity && submitData.electricityCost) {
  //       dataToSubmit.electricityCost = submitData.electricityCost;
  //       dataToSubmit.electricityProvider = submitData.electricityProvider;
  //     }
  //     if (selectedBills.water && submitData.waterCost) {
  //       dataToSubmit.waterCost = submitData.waterCost;
  //       dataToSubmit.waterProvider = submitData.waterProvider;
  //     }
  //     if (selectedBills.broadband && submitData.broadbandCost) {
  //       dataToSubmit.broadbandCost = submitData.broadbandCost;
  //       dataToSubmit.broadbandProvider = submitData.broadbandProvider;
  //     }
  //     if (selectedBills.gas && submitData.gasCost) {
  //       dataToSubmit.gasCost = submitData.gasCost;
  //       dataToSubmit.gasProvider = submitData.gasProvider;
  //     }
  //     await window.storage.set(key, JSON.stringify(dataToSubmit));
  //     setSubmitSuccess(true);
  //     setTimeout(() => setSubmitSuccess(false), 3000);
  //     setSubmitData({ postcode: '', bedrooms: '', people: '', electricityCost: '', electricityProvider: '', waterCost: '', waterProvider: '', broadbandCost: '', broadbandProvider: '', gasCost: '', gasProvider: '', costType: 'total' });
  //     setSelectedBills({ electricity: false, water: false, broadband: false, gas: false });
  //     await loadAllData();
  //   } catch (error) {
  //     alert('Error submitting data. Please try again.');
  //   }
  // };

  const handleSubmit = async () => {
    if (!submitData.postcode || !submitData.bedrooms || !submitData.people) {
      alert("Please fill in postcode, bedrooms, and number of people");
      return;
    }
    if (!Object.values(selectedBills).some((v) => v)) {
      alert("Please select at least one bill type to contribute");
      return;
    }

    // 维持你原本的校验
    const validationErrors: string[] = [];
    if (selectedBills.electricity && submitData.electricityCost && !(parseFloat(submitData.electricityCost) >= 10 && parseFloat(submitData.electricityCost) <= 500)) {
      validationErrors.push("Electricity: £10-£500");
    }
    if (selectedBills.water && submitData.waterCost && !(parseFloat(submitData.waterCost) >= 10 && parseFloat(submitData.waterCost) <= 200)) {
      validationErrors.push("Water: £10-£200");
    }
    if (selectedBills.broadband && submitData.broadbandCost && !(parseFloat(submitData.broadbandCost) >= 15 && parseFloat(submitData.broadbandCost) <= 150)) {
      validationErrors.push("Broadband: £15-£150");
    }
    if (selectedBills.gas && submitData.gasCost && !(parseFloat(submitData.gasCost) >= 10 && parseFloat(submitData.gasCost) <= 500)) {
      validationErrors.push("Gas: £10-£500");
    }
    if (validationErrors.length) {
      alert("Please check the following:\n\n" + validationErrors.join("\n"));
      return;
    }

    // 构造与数据库列对齐的 payload
    const payload: any = {
      postcode: submitData.postcode.trim(),
      bedrooms: Number(submitData.bedrooms),
      people: Number(submitData.people),
      cost_type: submitData.costType, // 'total' | 'perPerson'
    };

    if (selectedBills.electricity && submitData.electricityCost) {
      payload.electricity_cost = Number(submitData.electricityCost);
      payload.electricity_provider = submitData.electricityProvider || null;
    }
    if (selectedBills.water && submitData.waterCost) {
      payload.water_cost = Number(submitData.waterCost);
      payload.water_provider = submitData.waterProvider || null;
    }
    if (selectedBills.broadband && submitData.broadbandCost) {
      payload.broadband_cost = Number(submitData.broadbandCost);
      payload.broadband_provider = submitData.broadbandProvider || null;
    }
    if (selectedBills.gas && submitData.gasCost) {
      payload.gas_cost = Number(submitData.gasCost);
      payload.gas_provider = submitData.gasProvider || null;
    }

    const { error } = await supabase.from("bills").insert(payload);
    if (error) {
      console.error(error);
      alert("Error submitting data. Please try again.");
      return;
    }

    setSubmitSuccess(true);
    setTimeout(() => setSubmitSuccess(false), 3000);

    setSubmitData({
      postcode: "",
      bedrooms: "",
      people: "",
      electricityCost: "",
      electricityProvider: "",
      waterCost: "",
      waterProvider: "",
      broadbandCost: "",
      broadbandProvider: "",
      gasCost: "",
      gasProvider: "",
      costType: "total",
    });
    setSelectedBills({ electricity: false, water: false, broadband: false, gas: false });

    await loadAllData(); // 刷新计数
  };


  const getMatchTypeMessage = (matchType) => {
    switch (matchType) {
      case 'exact': return 'Exact match for your criteria';
      case 'flexible-same-area': return 'Similar properties in your postcode area (±1 bedroom/person)';
      case 'nearby': return 'Exact match from nearby postcodes';
      case 'flexible-nearby': return 'Similar properties from nearby postcodes (±1 bedroom/person)';
      default: return '';
    }
  };

  const BillCard = ({ title, icon: Icon, color, stats, providers }) => (
    <div className={`p-6 bg-gradient-to-br ${color} rounded-lg ${!stats && 'opacity-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="text-gray-800" size={24} />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {stats && <p className="text-2xl font-bold text-gray-900">£{stats.avg.toFixed(2)}</p>}
      </div>
      {stats ? (
        <>
          <div className="mt-2">
            <p className="text-sm text-gray-700">Range: <span className="font-semibold">£{stats.min.toFixed(2)} - £{stats.max.toFixed(2)}</span></p>
            <p className="text-xs text-gray-600 mt-1">Based on {stats.count} household{stats.count > 1 ? 's' : ''}</p>
          </div>
          {providers && providers.length > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              <p className="font-medium">Top providers:</p>
              {providers.map((p, i) => <p key={i}>• {p.name} ({p.count})</p>)}
            </div>
          )}
        </>
      ) : <p className="text-sm text-gray-600 mt-2">No data available</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">UK Bills Comparison</h1>
          <p className="text-gray-600">Compare household bills across the UK and find fair pricing</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button onClick={() => setActiveTab('search')} className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${activeTab === 'search' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Search className="inline mr-2" size={20} />Search Bills
          </button>
          <button onClick={() => setActiveTab('submit')} className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${activeTab === 'submit' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Upload className="inline mr-2" size={20} />Contribute Data
          </button>
        </div>

        {activeTab === 'search' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Average Bills in Your Area</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postcode</label>
                <input type="text" placeholder="e.g., SW1A 1AA" value={searchData.postcode} onChange={(e) => setSearchData({...searchData, postcode: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                <input type="number" placeholder="e.g., 2" value={searchData.bedrooms} onChange={(e) => setSearchData({...searchData, bedrooms: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">People Living There</label>
                <input type="number" placeholder="e.g., 3" value={searchData.people} onChange={(e) => setSearchData({...searchData, people: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <button onClick={handleSearch} disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400">
              {loading ? 'Searching...' : 'Search'}
            </button>

            {results && (
              <div className="mt-8">
                {results.count === 0 ? (
                  <div className="text-center py-8"><p className="text-gray-600 text-lg">{results.message}</p></div>
                ) : (
                  <>
                    <div className="mb-6 space-y-3">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600"><span className="font-bold text-blue-600">{results.count}</span> household(s) found <span className="mx-2">•</span> {getMatchTypeMessage(results.matchType)}</p>
                      </div>
                      {results.mostRecent && (
                        <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2 text-sm text-gray-600">
                          <Clock size={16} /><span>Last updated: {getTimeSince(results.mostRecent)}</span>
                        </div>
                      )}
                      <button onClick={() => setShowReportModal(true)} className="w-full p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2">
                        <AlertTriangle size={16} />See suspicious data? Report it here
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <BillCard title="Electricity" icon={Zap} color="from-yellow-50 to-yellow-100" stats={results.stats.electricity} providers={results.providers.electricity} />
                      <BillCard title="Water" icon={Droplets} color="from-blue-50 to-blue-100" stats={results.stats.water} providers={results.providers.water} />
                      <BillCard title="Broadband" icon={Wifi} color="from-purple-50 to-purple-100" stats={results.stats.broadband} providers={results.providers.broadband} />
                      <BillCard title="Gas" icon={Flame} color="from-orange-50 to-orange-100" stats={results.stats.gas} providers={results.providers.gas} />
                    </div>
                    {results.total > 0 && (
                      <div className="p-6 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg">
                        <h3 className="text-xl font-bold mb-2">Total Average Monthly Bills</h3>
                        <p className="text-4xl font-bold">£{results.total.toFixed(2)}</p>
                        <p className="text-sm mt-2 opacity-90">For utilities with available data</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'submit' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Contribute Your Bills Data</h2>
            <p className="text-gray-600 mb-6">Help others by sharing your household bills. Select only the bills you want to contribute.</p>
            {submitSuccess && <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">✓ Thank you! Your data has been submitted successfully.</div>}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Property Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postcode *</label>
                  <input type="text" placeholder="e.g., SW1A 1AA" value={submitData.postcode} onChange={(e) => setSubmitData({...submitData, postcode: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms *</label>
                  <input type="number" placeholder="e.g., 2" value={submitData.bedrooms} onChange={(e) => setSubmitData({...submitData, bedrooms: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">People Living There *</label>
                  <input type="number" placeholder="e.g., 3" value={submitData.people} onChange={(e) => setSubmitData({...submitData, people: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost Type</label>

                <div className="flex gap-4">
                  <label className="flex items-center text-gray-800"><input type="radio" value="total" checked={submitData.costType === 'total'} onChange={(e) => setSubmitData({...submitData, costType: e.target.value})} className="mr-2 accent-blue-600 text-gray-400" />Total household cost</label>
                  <label className="flex items-center text-gray-800"><input type="radio" value="perPerson" checked={submitData.costType === 'perPerson'} onChange={(e) => setSubmitData({...submitData, costType: e.target.value})} className="mr-2 accent-blue-600 text-gray-400" />Per person cost</label>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { key: 'electricity', icon: Zap, label: 'Electricity', color: 'text-yellow-600', field: 'electricityCost', provider: 'electricityProvider' },
                { key: 'water', icon: Droplets, label: 'Water', color: 'text-blue-600', field: 'waterCost', provider: 'waterProvider' },
                { key: 'broadband', icon: Wifi, label: 'Broadband', color: 'text-purple-600', field: 'broadbandCost', provider: 'broadbandProvider' },
                { key: 'gas', icon: Flame, label: 'Gas', color: 'text-orange-600', field: 'gasCost', provider: 'gasProvider' }
              ].map(({ key, icon: Icon, label, color, field, provider }) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <label className="flex items-center mb-4 cursor-pointer">
                    <input type="checkbox" checked={selectedBills[key]} onChange={(e) => setSelectedBills({...selectedBills, [key]: e.target.checked})} className="mr-3 w-5 h-5" />
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Icon className={color} size={20} />{label}</h3>
                  </label>
                  {selectedBills[key] && (
                    <div className="pl-8">
                      <p className="text-xs text-gray-700 mb-3">Valid range: £{validationRanges[field].min}-£{validationRanges[field].max} per month</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Cost (£)</label>
                          <input type="number" step="0.01" placeholder="e.g., 85.50" value={submitData[field]} onChange={(e) => setSubmitData({...submitData, [field]: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Provider (optional)</label>
                          <input type="text" placeholder="e.g., British Gas" value={submitData[provider]} onChange={(e) => setSubmitData({...submitData, [provider]: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={handleSubmit} className="w-full mt-8 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">Submit Data</button>
            <p className="mt-4 text-sm text-gray-500 text-center">Your data helps the community make informed decisions. All submissions are anonymous.</p>
          </div>
        )}

        {showReportModal && results && results.rawData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-96 overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Report Suspicious Data</h3>
                <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Click on any entry that looks incorrect:</p>
              <div className="space-y-2">
                {results.rawData.map((entry, idx) => (
                  <button key={idx} onClick={() => handleReport(entry)} className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left text-sm">
                    <p className="font-medium">{entry.postcode} • {entry.bedrooms} bed • {entry.people} people</p>
                    <p className="text-gray-600 text-xs mt-1">
                      {entry.electricityCost && `Elec: £${entry.electricityCost} `}
                      {entry.waterCost && `Water: £${entry.waterCost} `}
                      {entry.broadbandCost && `Broad: £${entry.broadbandCost} `}
                      {entry.gasCost && `Gas: £${entry.gasCost}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Total households in database: <span className="font-bold text-blue-600">{allData.length}</span></p>
        </div>
      </div>
    </div>
  );
}