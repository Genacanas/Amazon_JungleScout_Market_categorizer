"use client";

import { useEffect, useState } from "react";
import { Plus, Tag, ChevronRight, X, ImageIcon, Star, ShoppingCart } from "lucide-react";

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
    }
  };

  const assignLabel = async (asin: string, label_id: string | null) => {
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
    }
  };
  
  const handleQuickUnassign = (e: React.MouseEvent, asin: string) => {
    e.stopPropagation(); // Prevent opening modal
    if (window.confirm("Are you sure you want to unassign this product?")) {
      assignLabel(asin, null);
    }
  };

  const uncategorizedCount = products.filter(p => !p.label_id).length;
  
  // Filter products based on active label
  const displayedProducts = activeFilterLabel === 'unassigned'
    ? products.filter(p => !p.label_id)
    : activeFilterLabel 
      ? products.filter(p => p.label_id === activeFilterLabel)
      : products;
      
  const activeLabelObj = activeFilterLabel && activeFilterLabel !== 'unassigned' 
    ? labels.find(l => l.id === activeFilterLabel) 
    : null;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading market data from Neon DB...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Left Panel: Products */}
      <div className="w-2/3 border-r bg-white flex flex-col h-full">
        <div className="p-4 border-b flex flex-col justify-center bg-gray-50">
          <div className="flex justify-between items-center w-full">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Tag className="text-indigo-600" /> Market Categorizer
            </h1>
            <div 
              onClick={() => setActiveFilterLabel(activeFilterLabel === 'unassigned' ? null : 'unassigned')}
              className={`cursor-pointer px-3 py-1 rounded-full text-sm font-semibold transition border-2 
                ${activeFilterLabel === 'unassigned' ? 'bg-amber-500 text-white border-amber-600 shadow-md' : 'bg-amber-100 text-amber-800 border-transparent hover:bg-amber-200'}`}
              title="Click to view unassigned products"
            >
              {uncategorizedCount} Unassigned
            </div>
          </div>
          
          {/* Breadcrumb / Current View Indicator */}
          <div className="mt-4 flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current View:</span>
            {activeFilterLabel === 'unassigned' ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-md border border-amber-200">Unassigned Products Only</span>
                <button 
                  onClick={() => setActiveFilterLabel(null)}
                  className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> View All
                </button>
              </div>
            ) : activeFilterLabel && activeLabelObj ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: activeLabelObj.color }}></div>
                  <span className="font-bold text-indigo-900">{activeLabelObj.name}</span>
                </div>
                <button 
                  onClick={() => setActiveFilterLabel(null)}
                  className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> View All
                </button>
              </div>
            ) : (
              <span className="font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-md">All Products</span>
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
              <p className="text-xs text-gray-500">Real-time statistics for {displayedProducts.length} items</p>
            </div>
            
            <div className="flex gap-6">
              <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Revenue</p>
                <p className="text-lg font-bold text-indigo-700">
                  €{displayedProducts.reduce((sum, p) => sum + (p.est_revenue || 0), 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                </p>
              </div>
              <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Price</p>
                <p className="text-lg font-bold text-emerald-600">
                  €{(displayedProducts.length > 0 ? displayedProducts.reduce((sum, p) => sum + (p.price || 0), 0) / displayedProducts.length : 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 text-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Reviews</p>
                <p className="text-lg font-bold text-amber-600">
                  {displayedProducts.reduce((sum, p) => sum + (p.num_reviews || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedProducts.map(p => {
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
                onClick={() => setSelectedProduct(p)}
                style={{ borderColor: borderColor }}
                className={`group border-2 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition bg-white flex flex-col relative
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
                  {p.label_id && (
                    <div className="absolute top-2 right-2 bg-green-500 w-4 h-4 rounded-full border-2 border-white shadow-md"></div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-1 flex justify-between pointer-events-none">
                  <span className="font-mono bg-gray-100 px-1 rounded">{p.asin}</span>
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
          </div>
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
                className={`bg-white border-2 rounded-xl p-3 shadow-sm flex items-center justify-between cursor-pointer transition-all duration-200
                  ${isActiveFilter ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-[1.02]' : 'border-transparent'}
                  ${isDragTarget ? 'border-indigo-400 bg-indigo-100 scale-[1.05] shadow-lg ring-4 ring-indigo-200' : 'hover:border-gray-300 hover:shadow-md'}
                `}
              >
                <div className="flex items-center gap-3 pointer-events-none">
                  <div className="w-5 h-5 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: l.color }}></div>
                  <span className={`text-sm ${isActiveFilter ? 'font-bold text-indigo-900' : 'font-medium text-gray-800'}`}>{l.name}</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full pointer-events-none transition-colors ${isActiveFilter || isDragTarget ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>
                  {count}
                </span>
              </div>
            )
          })}
          
          {labels.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-10 border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50/50">
              No labels created yet.
            </div>
          )}
          
          {/* Unassigned Dropzone (only visible while dragging) */}
          <div className={`mt-6 border-2 border-dashed rounded-xl p-4 flex justify-center items-center font-bold text-sm transition-all duration-300
              ${draggedAsin ? 'opacity-100 h-16 border-red-400 bg-red-50 text-red-600 shadow-inner' : 'opacity-0 h-0 p-0 border-transparent overflow-hidden'}
              ${dragHoverLabelId === 'unassign' ? 'scale-[1.05] bg-red-100 border-red-500 shadow-lg' : ''}
            `}
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
          >
            {draggedAsin && (
              <span className="pointer-events-none">❌ Drop here to Unassign</span>
            )}
          </div>
        </div>
      </div>
        
        {/* 
        <div className="p-4 border-t bg-white">
          <button 
            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition shadow flex justify-center items-center gap-2"
            onClick={() => alert("Market Report Generation (Fase 5 y 6) will be connected soon!")}
          >
            Generate Market Report <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        */}

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
