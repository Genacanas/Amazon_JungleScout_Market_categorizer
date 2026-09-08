"use client";

import { useEffect, useState } from "react";
import { Plus, Tag, ChevronRight, X, ImageIcon, Star, ShoppingCart, Trash2, Edit2, Loader2, MousePointer2 } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [runs, setRuns] = useState<any[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  
  const [products, setProducts] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [activeFilterLabel, setActiveFilterLabel] = useState<string | null>(null); // null = show all
  const [draggedAsin, setDraggedAsin] = useState<string | null>(null);
  const [dragHoverLabelId, setDragHoverLabelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkAssignTarget, setBulkAssignTarget] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(50);
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null);

  useEffect(() => {
    setVisibleCount(50);
  }, [activeFilterLabel, keywordFilter]);


  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${API_URL}/runs`)
      .then(res => res.json())
      .then(data => {
        setRuns(data);
        if (data.length > 0) {
          setRunId(data[0].id);
        } else {
          setIsLoading(false); // No runs to load
        }
      })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!runId) return;
    
    setIsLoading(true);
    Promise.all([
      fetch(`${API_URL}/runs/${runId}/products`).then(res => res.json()),
      fetch(`${API_URL}/runs/${runId}/labels`).then(res => res.json())
    ]).then(([productsData, labelsData]) => {
      setProducts(productsData);
      setLabels(labelsData);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [runId]);

  const createLabel = async () => {
    if (!newLabelName.trim() || !runId) return;
    setIsProcessing(true);
    // Optimistic UI for label creation
    const tempId = "temp-" + Date.now();
    const tempColor = "#" + Math.floor(Math.random()*16777215).toString(16);
    const newLabelObj = { id: tempId, name: newLabelName, color: tempColor, run_id: runId };
    
    setLabels([...labels, newLabelObj]);
    setNewLabelName("");
    
    try {
      const res = await fetch(`${API_URL}/runs/${runId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName, color: tempColor })
      });
      if (res.ok) {
        const dbLabel = await res.json();
        setLabels(prev => prev.map(l => l.id === tempId ? dbLabel : l));
      } else {
        throw new Error("Server rejected label creation");
      }
    } catch (err) {
      alert("Error creating label. Check your connection.");
      setLabels(prev => prev.filter(l => l.id !== tempId));
    } finally {
      setIsProcessing(false);
    }
  };

  const assignLabel = async (asin: string, label_id: string | null) => {
    setIsProcessing(true);
    // Save original state for rollback
    const originalProducts = [...products];
    
    // Optimistic UI update instantly
    setProducts(products.map(p => p.asin === asin ? { ...p, label_id } : p));
    if (selectedProduct && selectedProduct.asin === asin) {
      setSelectedProduct(null); // Close modal if open
    }
    
    // Background fetch
    try {
      const res = await fetch(`${API_URL}/categorizations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin, label_id })
      });
      if (!res.ok) throw new Error("Error en el servidor al asignar.");
    } catch (err) {
      console.error(err);
      alert("⚠️ Connection error while saving. Reverting change.");
      setProducts(originalProducts); // Rollback
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 500;
    if (bottom) {
      setVisibleCount(prev => Math.min(prev + 50, products.length));
    }
  };

  const deleteLabel = async (e: React.MouseEvent, labelId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this label? All assigned products will become Unassigned.")) return;
    setIsProcessing(true);
    // Save original state for rollback
    const originalLabels = [...labels];
    const originalProducts = [...products];
    
    // Optimistic UI update
    setLabels(labels.filter(l => l.id !== labelId));
    setProducts(products.map(p => p.label_id === labelId ? { ...p, label_id: null } : p));
    if (activeFilterLabel === labelId) {
      setActiveFilterLabel(null);
    }
    
    try {
      const res = await fetch(`${API_URL}/labels/${labelId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete label on server");
    } catch (err) {
      console.error(err);
      alert("⚠️ Connection error. Reverting change.");
      setLabels(originalLabels);
      setProducts(originalProducts);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const editLabel = async (e: React.MouseEvent, labelId: string, currentName: string) => {
    e.stopPropagation();
    const newName = window.prompt("Edit label name:", currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;
    
    setIsProcessing(true);
    const originalLabels = [...labels];
    setLabels(labels.map(l => l.id === labelId ? { ...l, name: newName } : l));
    
    try {
      const targetLabel = originalLabels.find(l => l.id === labelId);
      const res = await fetch(`${API_URL}/labels/${labelId}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, color: targetLabel.color })
      });
      if (!res.ok) throw new Error("Failed to edit label");
    } catch (err) {
      console.error(err);
      alert("⚠️ Connection error. Reverting change.");
      setLabels(originalLabels);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleQuickUnassign = (e: React.MouseEvent, asin: string) => {
    e.stopPropagation(); // Prevent opening modal
    if (window.confirm("Are you sure you want to unassign this product?")) {
      assignLabel(asin, null);
    }
  };

  const uncategorizedCount = products.filter(p => !p.label_id).length;
  

  const activeLabelObj = activeFilterLabel && activeFilterLabel !== 'unassigned' 
    ? labels.find(l => l.id === activeFilterLabel) 
    : null;

  // Prepare Chart Data
  const chartData = labels.map(l => {
    const labelProducts = products.filter(p => p.label_id === l.id);
    return {
      name: l.name,
      revenue: labelProducts.reduce((sum, p) => sum + (p.est_revenue || 0), 0),
      avgPrice: labelProducts.length > 0 ? labelProducts.reduce((sum, p) => sum + (p.price || 0), 0) / labelProducts.length : 0,
      color: l.color
    };
  }).filter(d => d.revenue > 0 || d.avgPrice > 0);

  const unassignedProducts = products.filter(p => !p.label_id);
  if (unassignedProducts.length > 0) {
    chartData.push({
      name: 'Unassigned',
      revenue: unassignedProducts.reduce((sum, p) => sum + (p.est_revenue || 0), 0),
      avgPrice: unassignedProducts.length > 0 ? unassignedProducts.reduce((sum, p) => sum + (p.price || 0), 0) / unassignedProducts.length : 0,
      color: '#fbbf24' // amber-400
    });
  }

  // Sort by revenue descending
  chartData.sort((a, b) => b.revenue - a.revenue);

  // Keyword filters
  let displayedProducts = activeFilterLabel === 'unassigned'
    ? products.filter(p => !p.label_id)
    : activeFilterLabel
      ? products.filter(p => p.label_id === activeFilterLabel)
      : products;

  if (keywordFilter) {
    displayedProducts = displayedProducts.filter((p: any) => p.found_for_keywords && p.found_for_keywords.includes(keywordFilter));
  }

  const availableKeywords: string[] = Array.from(
    new Set(products.flatMap((p: any) => p.found_for_keywords || []))
  ).filter(Boolean) as string[];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans relative">
      

      {/* Global Processing Overlay */}
      {isProcessing && (
        <div className="absolute top-4 right-1/2 translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 animate-pulse font-medium text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Saving changes...
        </div>
      )}

      {/* Bulk Assign Banner */}
      {bulkAssignTarget && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-indigo-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50 border-4 border-indigo-500 animate-bounce">
          <MousePointer2 className="w-5 h-5 text-indigo-300" />
          <span className="font-bold">
            Bulk Assign Mode: Click products to assign them to "{bulkAssignTarget === 'unassign' ? 'Unassigned' : labels.find(l => l.id === bulkAssignTarget)?.name}"
          </span>
          <button 
            onClick={() => setBulkAssignTarget(null)}
            className="bg-white text-indigo-900 px-3 py-1 rounded-full text-xs font-bold hover:bg-indigo-100 transition"
          >
            Exit Mode
          </button>
        </div>
      )}


      
      {/* Left Panel: Products */}
      <div className="w-2/3 border-r bg-white flex flex-col h-full">
        <div className="p-4 border-b flex flex-col justify-center bg-gray-50">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Tag className="text-indigo-600" /> Market Categorizer
              </h1>
              {runs.length > 1 && (
                <select
                  value={runId || ''}
                  onChange={(e) => {
                    setRunId(e.target.value);
                    setActiveFilterLabel(null);
                    setKeywordFilter(null);
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                >
                  {runs.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.keywords && r.keywords.length > 0 ? r.keywords.join(' + ') : r.run_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div 
              onClick={() => setActiveFilterLabel(activeFilterLabel === 'unassigned' ? null : 'unassigned')}
              className={`cursor-pointer px-3 py-1 rounded-full text-sm font-semibold transition border-2 
                ${activeFilterLabel === 'unassigned' ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-amber-100 text-amber-800 border-transparent hover:bg-amber-200'}`}
              title="Click to view unassigned products"
            >
              {isLoading ? "..." : uncategorizedCount} Unassigned
            </div>
          </div>
          
          {/* Breadcrumb / Current View & Filters */}
          <div className="mt-4 flex flex-col gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current View:</span>
                {activeFilterLabel === 'unassigned' ? (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-md border border-amber-200">Unassigned Only</span>
                    <button onClick={() => setActiveFilterLabel(null)} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1">
                      <X className="w-3 h-3" /> View All
                    </button>
                  </div>
                ) : activeFilterLabel && activeLabelObj ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: activeLabelObj.color }}></div>
                      <span className="font-bold text-indigo-900">{activeLabelObj.name}</span>
                    </div>
                    <button onClick={() => setActiveFilterLabel(null)} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1">
                      <X className="w-3 h-3" /> View All
                    </button>
                  </div>
                ) : (
                  <span className="font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">All Products</span>
                )}
              </div>
            </div>

            {availableKeywords.length > 0 && (
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100 overflow-x-auto pb-1">
                <span className="text-xs font-bold text-gray-400 tracking-wider mr-2 whitespace-nowrap">KEYWORDS:</span>
                <button
                  onClick={() => setKeywordFilter(null)}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold border transition ${!keywordFilter ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                  All
                </button>
                {availableKeywords.map((kw: any) => (
                  <button
                    key={kw}
                    onClick={() => setKeywordFilter(kw)}
                    className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold border transition ${keywordFilter === kw ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-100/50">
          
          {/* Analytics Dashboard */}
          <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {activeFilterLabel === 'unassigned' ? 'Unassigned Products' : activeFilterLabel ? activeLabelObj?.name : 'Market Overview'}
              </h2>
              <p className="text-xs text-gray-500">Real-time statistics for {isLoading ? '...' : displayedProducts.length} items</p>
            </div>
            
            <div className="flex gap-6">
              <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Revenue</p>
                <p className="text-lg font-bold text-indigo-700">
                  €{isLoading ? "0" : displayedProducts.reduce((sum, p) => sum + (p.est_revenue || 0), 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                </p>
              </div>
              <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Price</p>
                <p className="text-lg font-bold text-emerald-600">
                  €{isLoading ? "0.00" : (displayedProducts.length > 0 ? displayedProducts.reduce((sum, p) => sum + (p.price || 0), 0) / displayedProducts.length : 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Reviews</p>
                <p className="text-lg font-bold text-amber-600">
                  {isLoading ? "0" : displayedProducts.reduce((sum, p) => sum + (p.num_reviews || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Charts (Only visible in Market Overview) */}
          {!activeFilterLabel && chartData.length > 0 && !isLoading && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 text-center">Market Share by Revenue</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: any) => `€${Number(value).toLocaleString(undefined, {maximumFractionDigits: 0})}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold text-gray-700 mb-4 text-center">Average Price per Category</h3>
                <div className="h-56 flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                      <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{fontSize: 10}} width={40} />
                      <Tooltip formatter={(value: any) => `€${Number(value).toFixed(2)}`} />
                      <Bar dataKey="avgPrice" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20 flex-col gap-4 h-64">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium">Loading products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedProducts.slice(0, visibleCount).map(p => {
              const pLabel = p.label_id ? labels.find(l => l.id === p.label_id) : null;
              const borderColor = pLabel ? pLabel.color : '';
              
              return (
              <div 
                key={p.asin} 
                draggable
                onDragStart={(e) => {
                  setDraggedAsin(p.asin);
                  e.dataTransfer.setData("text/plain", p.asin);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDraggedAsin(null)}
                onClick={() => {
                  if (bulkAssignTarget) {
                    assignLabel(p.asin, bulkAssignTarget === 'unassign' ? null : bulkAssignTarget);
                  } else {
                    setSelectedProduct(p);
                  }
                }}
                style={{ borderColor: borderColor }}
                className={`group border-2 rounded-xl p-3 transition bg-white flex flex-col relative
                  ${bulkAssignTarget ? 'cursor-crosshair hover:ring-4 hover:ring-indigo-300' : 'cursor-grab active:cursor-grabbing hover:shadow-md'}
                  ${draggedAsin === p.asin ? 'opacity-50 ring-2 ring-indigo-500' : ''}
                  ${!p.label_id ? 'border-amber-300 border-dashed shadow-sm' : 'shadow'}`}
              >
                
                {/* Quick Unassign Button (Shows on Hover if labeled) */}
                {p.label_id && (
                  <button
                    onClick={(e) => handleQuickUnassign(e, p.asin)}
                    className="absolute top-2 left-2 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm border border-red-200 hover:border-red-600"
                    title="Unassign product"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <div className="h-32 mb-2 flex items-center justify-center overflow-hidden rounded bg-gray-50 relative pointer-events-none">
                  {p.photos && p.photos.length > 0 ? (
                    <img src={p.photos[0]} alt="product" className="object-contain h-full w-full mix-blend-multiply" />
                  ) : (
                    <ImageIcon className="text-gray-300 w-10 h-10" />
                  )}
                  {p.label_id ? (
                    <div className="absolute top-2 right-2 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5 max-w-[130px] pointer-events-none z-10">
                      <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: pLabel?.color || '#ccc' }}></div>
                      <span className="text-[11px] font-bold text-gray-700 truncate" title={pLabel?.name}>{pLabel?.name || 'Unknown'}</span>
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 bg-amber-50/95 backdrop-blur px-2.5 py-1 rounded-full border border-amber-200 shadow-sm flex items-center max-w-[130px] pointer-events-none z-10">
                      <span className="text-[11px] font-bold text-amber-700 truncate">Unassigned</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-1 flex justify-between pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-gray-100 px-1 rounded">{p.asin}</span>
                    {p.is_fba && <span className="bg-orange-100 text-orange-800 text-[9px] font-bold px-1.5 rounded uppercase tracking-wider border border-orange-200">FBA</span>}
                  </div>
                  <span className="font-semibold text-gray-700 truncate max-w-[50%] text-right">{p.brand || 'No Brand'}</span>
                </div>
                <h3 className="text-sm font-medium line-clamp-2 leading-snug flex-1 pointer-events-none text-gray-800">{p.title}</h3>
                <div className="mt-3 flex justify-between items-center text-sm border-t pt-2 pointer-events-none">
                  <span className="font-bold text-gray-900">€{p.price.toFixed(2)}</span>
                  <span className="text-amber-500 flex items-center text-xs font-bold bg-amber-50 px-1 rounded"><Star className="w-3 h-3 mr-1 fill-current" /> {p.rating}</span>
                </div>
              </div>
            );
          })}
            {displayedProducts.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400 font-medium">
                No products found in this view.
              </div>
            )}
            
            {/* Load More Button */}
            {visibleCount < displayedProducts.length && (
              <div className="col-span-full py-8 flex justify-center">
                <button 
                  onClick={() => setVisibleCount(prev => prev + 50)}
                  className="bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold py-2.5 px-8 rounded-full shadow-sm transition flex items-center gap-2"
                >
                  Load More Products ({displayedProducts.length - visibleCount} remaining)
                </button>
              </div>
            )}

          </div>
          )}
        </div>
      </div>

      {/* Right Panel: Labels */}
      <div className="w-1/3 bg-gray-50 flex flex-col h-full border-l border-gray-200 shadow-xl z-10">
        <div className="p-4 border-b bg-white">
          <h2 className="font-bold text-gray-800 mb-3 flex justify-between items-center text-lg">
            Labels
            {activeFilterLabel && (
              <button onClick={() => setActiveFilterLabel(null)} className="text-xs text-indigo-600 hover:underline font-semibold bg-indigo-50 px-2 py-1 rounded">View All</button>
            )}
          </h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newLabelName}
              onChange={e => setNewLabelName(e.target.value)}
              placeholder="e.g. Kitchen Bins"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={e => e.key === 'Enter' && createLabel()}
            />
            <button onClick={createLabel} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 shadow-sm transition">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
          
          {/* Fake "Unassigned" Label */}
          <div 
            onClick={() => setActiveFilterLabel(activeFilterLabel === 'unassigned' ? null : 'unassigned')}
            onDragEnter={() => setDragHoverLabelId('unassign')}
            onDragLeave={() => setDragHoverLabelId(null)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragHoverLabelId !== 'unassign') setDragHoverLabelId('unassign');
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragHoverLabelId(null);
              const asin = e.dataTransfer.getData("text/plain");
              if (asin) assignLabel(asin, null);
            }}
            className={`group bg-amber-50 border-2 rounded-xl p-3 shadow-sm flex items-center justify-between cursor-pointer transition-all duration-200
              ${activeFilterLabel === 'unassigned' ? 'border-amber-500 bg-amber-100 shadow-md transform scale-[1.02]' : 'border-amber-200'}
              ${dragHoverLabelId === 'unassign' ? 'border-amber-400 bg-amber-200 scale-[1.05] shadow-lg ring-4 ring-amber-100' : 'hover:border-amber-300 hover:shadow-md'}
            `}
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <div className="w-5 h-5 rounded-full shadow-sm border border-black/10 bg-amber-400 flex items-center justify-center text-white text-xs font-bold">!</div>
              <span className={`text-sm ${activeFilterLabel === 'unassigned' ? 'font-bold text-amber-900' : 'font-bold text-amber-700'}`}>Unassigned</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setBulkAssignTarget(bulkAssignTarget === 'unassign' ? null : 'unassign'); }}
                className={`transition-opacity p-1.5 rounded-md ${bulkAssignTarget === 'unassign' ? 'bg-amber-500 text-white' : 'opacity-0 group-hover:opacity-100 text-amber-500 hover:bg-amber-200'}`}
                title="Bulk Assign Mode"
              >
                <MousePointer2 className="w-4 h-4" />
              </button>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full pointer-events-none transition-colors ${activeFilterLabel === 'unassigned' || dragHoverLabelId === 'unassign' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-200 text-amber-800'}`}>
                {uncategorizedCount}
              </span>
            </div>
          </div>
          
          <hr className="border-gray-200 my-2" />

          {labels.map(l => {
            const count = products.filter(p => p.label_id === l.id).length;
            const isActiveFilter = activeFilterLabel === l.id;
            const isDragTarget = dragHoverLabelId === l.id;
            
            return (
              <div 
                key={l.id} 
                onClick={() => setActiveFilterLabel(isActiveFilter ? null : l.id)}
                onDragEnter={() => setDragHoverLabelId(l.id)}
                onDragLeave={() => setDragHoverLabelId(null)}
                onDragOver={(e) => {
                  e.preventDefault(); 
                  e.dataTransfer.dropEffect = "move";
                  if (dragHoverLabelId !== l.id) setDragHoverLabelId(l.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragHoverLabelId(null);
                  const asin = e.dataTransfer.getData("text/plain");
                  if (asin) assignLabel(asin, l.id);
                }}
                className={`group bg-white border-2 rounded-xl p-3 shadow-sm flex items-center justify-between cursor-pointer transition-all duration-200
                  ${isActiveFilter ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-[1.02]' : 'border-transparent'}
                  ${isDragTarget ? 'border-indigo-400 bg-indigo-100 scale-[1.05] shadow-lg ring-4 ring-indigo-200' : 'hover:border-gray-300 hover:shadow-md'}
                `}
              >
                <div className="flex items-center gap-3 pointer-events-none">
                  <div className="w-5 h-5 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: l.color }}></div>
                  <span className={`text-sm ${isActiveFilter ? 'font-bold text-indigo-900' : 'font-medium text-gray-800'}`}>{l.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setBulkAssignTarget(bulkAssignTarget === l.id ? null : l.id); }}
                    className={`transition-opacity p-1.5 rounded-md ${bulkAssignTarget === l.id ? 'bg-indigo-500 text-white' : 'opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-white hover:bg-indigo-400'}`}
                    title="Bulk Assign Mode"
                  >
                    <MousePointer2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => editLabel(e, l.id, l.name)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-500 rounded-md"
                    title="Edit Label"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => deleteLabel(e, l.id)}

                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-md"
                    title="Delete Label"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full pointer-events-none transition-colors ${isActiveFilter || isDragTarget ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                </div>
              </div>
            )
          })}
          
          {labels.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-10 border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50/50">
              No labels created yet.
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800 text-lg">Categorize Product</h2>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-800 bg-white border p-1 rounded">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex">
              {/* Left: Photos */}
              <div className="w-1/2 p-6 border-r bg-gray-50 overflow-y-auto space-y-4">
                {selectedProduct.photos && selectedProduct.photos.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`Photo ${i}`} className="w-full h-auto bg-white rounded-lg border shadow-sm mix-blend-multiply" />
                ))}
              </div>
              
              {/* Right: Info & Categorize */}
              <div className="w-1/2 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">{selectedProduct.asin}</span>
                  <span className="font-bold text-indigo-600 text-xl flex items-center gap-1"><ShoppingCart className="w-5 h-5"/> €{selectedProduct.price.toFixed(2)}</span>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-4 leading-tight">{selectedProduct.title}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded border text-sm">
                    <p className="text-gray-500 mb-1">Brand</p>
                    <p className="font-bold text-gray-800 truncate">{selectedProduct.brand || 'N/A'}</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded border border-amber-100 text-sm">
                    <p className="text-amber-600 mb-1">Monthly Revenue</p>
                    <p className="font-bold text-amber-900">€{selectedProduct.est_revenue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">AI Extracted Features</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex justify-between border-b pb-1"><span>Type:</span> <span className="font-semibold text-right">{selectedProduct.ai_normalized_data?.core_product_type}</span></li>
                    <li className="flex justify-between border-b pb-1"><span>Capacity:</span> <span className="font-semibold text-right">{selectedProduct.ai_normalized_data?.capacity_liters} L</span></li>
                    <li className="flex justify-between border-b pb-1"><span>Materials:</span> <span className="font-semibold text-right">{(selectedProduct.ai_normalized_data?.materials || []).join(', ')}</span></li>
                    <li className="flex justify-between pb-1"><span>Rooms:</span> <span className="font-semibold text-right">{(selectedProduct.ai_normalized_data?.intended_rooms || []).join(', ')}</span></li>
                  </ul>
                </div>

                <div className="mt-auto pt-6 border-t">
                  <h4 className="font-bold text-gray-800 mb-3">Assign to Category:</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    <button 
                      onClick={() => assignLabel(selectedProduct.asin, null)}
                      className={`p-2 rounded border text-sm text-left transition ${!selectedProduct.label_id ? 'bg-gray-800 text-white border-gray-800 shadow-inner' : 'bg-white hover:bg-gray-50 text-gray-600'}`}
                    >
                      ❌ Unassigned
                    </button>
                    {labels.map(l => (
                      <button 
                        key={l.id}
                        onClick={() => assignLabel(selectedProduct.asin, l.id)}
                        className={`p-2 rounded border text-sm flex items-center gap-2 transition text-left
                          ${selectedProduct.label_id === l.id ? 'border-2 border-indigo-600 bg-indigo-50 font-bold text-indigo-900 shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                      >
                        <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: l.color }}></div>
                        <span className="truncate">{l.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
