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

  const API_URL = "http://localhost:8000";

  useEffect(() => {
    fetch(`${API_URL}/runs`)
      .then(res => res.json())
      .then(data => {
        setRuns(data);
        if (data.length > 0) {
          setRunId(data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!runId) return;
    
    fetch(`${API_URL}/runs/${runId}/products`)
      .then(res => res.json())
      .then(data => setProducts(data));
      
    fetch(`${API_URL}/runs/${runId}/labels`)
      .then(res => res.json())
      .then(data => setLabels(data));
  }, [runId]);

  const createLabel = async () => {
    if (!newLabelName.trim() || !runId) return;
    
    const res = await fetch(`${API_URL}/runs/${runId}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLabelName, color: "#" + Math.floor(Math.random()*16777215).toString(16) })
    });
    
    if (res.ok) {
      const newLabel = await res.json();
      setLabels([...labels, newLabel]);
      setNewLabelName("");
    }
  };

  const assignLabel = async (asin: string, label_id: string | null) => {
    const res = await fetch(`${API_URL}/categorizations`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asin, label_id })
    });
    
    if (res.ok) {
      setProducts(products.map(p => p.asin === asin ? { ...p, label_id } : p));
      setSelectedProduct(null);
    }
  };

  const uncategorizedCount = products.filter(p => !p.label_id).length;

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Left Panel: Products */}
      <div className="w-2/3 border-r bg-white flex flex-col h-full">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Tag className="text-indigo-600" /> Market Categorizer</h1>
            <p className="text-sm text-gray-500 mt-1">Run: {runs.find(r => r.id === runId)?.run_name || "Loading..."}</p>
          </div>
          <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-semibold">
            {uncategorizedCount} Uncategorized
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => (
              <div 
                key={p.asin} 
                onClick={() => setSelectedProduct(p)}
                className={`border rounded-xl p-3 cursor-pointer hover:border-indigo-400 hover:shadow-md transition bg-white flex flex-col ${!p.label_id ? 'border-amber-300' : 'border-gray-200'}`}
              >
                <div className="h-32 mb-2 flex items-center justify-center overflow-hidden rounded bg-gray-50 relative">
                  {p.photos && p.photos.length > 0 ? (
                    <img src={p.photos[0]} alt="product" className="object-contain h-full w-full mix-blend-multiply" />
                  ) : (
                    <ImageIcon className="text-gray-300 w-10 h-10" />
                  )}
                  {p.label_id && (
                    <div className="absolute top-1 right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-white shadow-sm"></div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-1 flex justify-between">
                  <span className="font-mono">{p.asin}</span>
                  <span className="font-semibold text-gray-700">{p.brand || 'No Brand'}</span>
                </div>
                <h3 className="text-sm font-medium line-clamp-2 leading-snug flex-1">{p.title}</h3>
                <div className="mt-3 flex justify-between items-center text-sm border-t pt-2">
                  <span className="font-bold text-gray-900">€{p.price.toFixed(2)}</span>
                  <span className="text-amber-500 flex items-center text-xs"><Star className="w-3 h-3 mr-1 fill-current" /> {p.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Labels */}
      <div className="w-1/3 bg-gray-50 flex flex-col h-full">
        <div className="p-4 border-b bg-white">
          <h2 className="font-bold text-gray-800 mb-3">Your Labels</h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newLabelName}
              onChange={e => setNewLabelName(e.target.value)}
              placeholder="e.g. Kitchen Bins"
              className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={e => e.key === 'Enter' && createLabel()}
            />
            <button onClick={createLabel} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {labels.map(l => {
            const count = products.filter(p => p.label_id === l.id).length;
            return (
              <div key={l.id} className="bg-white border rounded-lg p-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: l.color }}></div>
                  <span className="font-medium text-sm text-gray-800">{l.name}</span>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">{count} items</span>
              </div>
            )
          })}
          {labels.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-10">No labels created yet.</div>
          )}
        </div>
        
        <div className="p-4 border-t bg-white">
          <button className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition shadow flex justify-center items-center gap-2">
            Generate Market Report <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800 text-lg">Categorize Product</h2>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-800">
                <X />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex">
              {/* Left: Photos */}
              <div className="w-1/2 p-6 border-r bg-gray-50 overflow-y-auto">
                <div className="space-y-4">
                  {selectedProduct.photos && selectedProduct.photos.map((url: string, i: number) => (
                    <img key={i} src={url} alt={`Photo ${i}`} className="w-full h-auto bg-white rounded-lg border shadow-sm mix-blend-multiply" />
                  ))}
                </div>
              </div>
              
              {/* Right: Info & Categorize */}
              <div className="w-1/2 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">{selectedProduct.asin}</span>
                  <span className="font-bold text-indigo-600 text-xl flex items-center gap-1"><ShoppingCart className="w-5 h-5"/> €{selectedProduct.price.toFixed(2)}</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{selectedProduct.title}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded border text-sm">
                    <p className="text-gray-500 mb-1">Brand</p>
                    <p className="font-bold text-gray-800">{selectedProduct.brand || 'N/A'}</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded border border-amber-100 text-sm">
                    <p className="text-amber-600 mb-1">Monthly Revenue</p>
                    <p className="font-bold text-amber-900">€{selectedProduct.est_revenue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">AI Extracted Features</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex justify-between border-b pb-1"><span>Type:</span> <span className="font-semibold">{selectedProduct.ai_normalized_data?.core_product_type}</span></li>
                    <li className="flex justify-between border-b pb-1"><span>Capacity:</span> <span className="font-semibold">{selectedProduct.ai_normalized_data?.capacity_liters} L</span></li>
                    <li className="flex justify-between border-b pb-1"><span>Materials:</span> <span className="font-semibold">{(selectedProduct.ai_normalized_data?.materials || []).join(', ')}</span></li>
                    <li className="flex justify-between pb-1"><span>Rooms:</span> <span className="font-semibold">{(selectedProduct.ai_normalized_data?.intended_rooms || []).join(', ')}</span></li>
                  </ul>
                </div>

                <div className="mt-auto pt-6 border-t">
                  <h4 className="font-bold text-gray-800 mb-3">Assign to Category:</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    <button 
                      onClick={() => assignLabel(selectedProduct.asin, null)}
                      className={`p-2 rounded border text-sm text-left transition ${!selectedProduct.label_id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white hover:bg-gray-50 text-gray-600'}`}
                    >
                      ❌ Unassigned
                    </button>
                    {labels.map(l => (
                      <button 
                        key={l.id}
                        onClick={() => assignLabel(selectedProduct.asin, l.id)}
                        className={`p-2 rounded border text-sm flex items-center gap-2 transition text-left
                          ${selectedProduct.label_id === l.id ? 'border-2 border-indigo-600 bg-indigo-50 font-bold text-indigo-900' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                      >
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }}></div>
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
