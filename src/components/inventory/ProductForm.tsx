// File: src/components/inventory/ProductForm.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useDataStore } from '../../store/useDataStore';
import type { Product, ProductVariant } from '../../types';

import './ProductForm.css';

declare const Quagga: any;

interface FormBrand {
  id: string;
  brandName: string;
  baseQty: number;
  baseUnit: string;
  price: number | '';
  stock: number | '';
  barcode: string;
  costPrice: number | '';
  expiryDate: string;
}

interface FormType {
  id: string;
  typeName: string;
  brands: FormBrand[];
}

interface ProductFormProps {
  initialData?: Product | null;
  onCancel?: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, onCancel }) => {
  const addProduct = useDataStore((state) => state.addProduct);
  const updateProduct = useDataStore((state) => state.updateProduct);
  
  // --- FORM STATE ---
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [hsn, setHsn] = useState('');
  const [gstRate, setGstRate] = useState<number | ''>('');
  const [priceType, setPriceType] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [isLoose, setIsLoose] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [reorderPoint, setReorderPoint] = useState<number | ''>('');

  const [types, setTypes] = useState<FormType[]>([{
    id: `type_${Date.now()}`,
    typeName: '',
    brands: [{ id: `brand_${Date.now()}`, brandName: '', baseQty: 1, baseUnit: 'pcs', price: '', stock: '', barcode: '', costPrice: '', expiryDate: '' }]
  }]);

  // --- UI TOGGLE STATE ---
  const [showAdvFields, setShowAdvFields] = useState(localStorage.getItem('cfg_adv_fields') === 'true');
  const [showBatch] = useState(localStorage.getItem('cfg_batch') === 'true');
  const [showGst, setShowGst] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- AI LENS & CAMERA STATE ---
  const [isAIScanning, setIsAIScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [isBarcodeScanning, setIsBarcodeScanning] = useState(false);

  // ════════════════════════════════════════════════════════════
  // 0. LOAD INITIAL DATA (EDIT MODE) - LOOSE LOGIC FIXED
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCategory(initialData.category || '');
      setHsn(initialData.hsn || '');
      setGstRate(
        initialData.gstRate !== undefined && initialData.gstRate !== null && initialData.gstRate !== ''
          ? Number(initialData.gstRate)
          : ''
      );
      setPriceType(initialData.priceType || 'inclusive');
      setIsLoose(initialData.isLoose || false);
      setBatchId(initialData.batchId || '');
      setReorderPoint(
        initialData.reorderPoint !== undefined && initialData.reorderPoint !== null && initialData.reorderPoint !== ''
          ? Number(initialData.reorderPoint)
          : ''
      );

      if (initialData.hsn || initialData.gstRate) setShowGst(true);
      if (initialData.batchId || initialData.reorderPoint !== '') setShowAdvFields(true);

      // Un-flatten the database variants back into the UI state
      const typeMap: Record<string, FormType> = {};
      
      initialData.variants.forEach((v, i) => {
        const typeName = v.type || 'Standard';
        if (!typeMap[typeName]) {
          typeMap[typeName] = { id: `type_${Date.now()}_${i}`, typeName, brands: [] };
        }
        
        // 🛑 EXACT JS LOOSE LOGIC: Reverse the multiplication for the UI
        let formPrice: number | '' = v.price;
        if (initialData.isLoose && v.baseQty) {
          formPrice = Number((v.price / v.baseQty).toFixed(2));
        }

        const parsedCostPrice = v.costPrice === '' || v.costPrice === null || v.costPrice === undefined
          ? ''
          : Number(v.costPrice);

        typeMap[typeName].brands.push({
          id: `brand_${Date.now()}_${i}`,
          brandName: v.brandName || '',
          baseQty: v.baseQty || 1,
          baseUnit: v.baseUnit || 'pcs',
          price: formPrice,
          stock: v.stock || 0,
          barcode: v.barcode || '',
          costPrice: Number.isNaN(parsedCostPrice) ? '' : parsedCostPrice,
          expiryDate: v.expiryDate || ''
        });
      });

      setTypes(Object.values(typeMap));
    }
  }, [initialData]);

  // ════════════════════════════════════════════════════════════
  // 1. VARIANT ENGINE LOGIC
  // ════════════════════════════════════════════════════════════
  const handleAddType = () => {
    setTypes([...types, {
      id: `type_${Date.now()}`, typeName: '',
      brands: [{ id: `brand_${Date.now()}`, brandName: '', baseQty: 1, baseUnit: 'pcs', price: '', stock: '', barcode: '', costPrice: '', expiryDate: '' }]
    }]);
  };

  const handleRemoveType = (typeId: string) => {
    setTypes(types.filter(t => t.id !== typeId));
  };

  const handleAddBrand = (typeId: string) => {
    setTypes(types.map(t => {
      if (t.id === typeId) {
        return { ...t, brands: [...t.brands, { id: `brand_${Date.now()}`, brandName: '', baseQty: 1, baseUnit: 'pcs', price: '', stock: '', barcode: '', costPrice: '', expiryDate: '' }] };
      }
      return t;
    }));
  };

  const handleRemoveBrand = (typeId: string, brandId: string) => {
    setTypes(types.map(t => {
      if (t.id === typeId) return { ...t, brands: t.brands.filter(b => b.id !== brandId) };
      return t;
    }));
  };

  const updateBrand = (typeId: string, brandId: string, field: keyof FormBrand, value: any) => {
    setTypes(types.map(t => {
      if (t.id === typeId) {
        return { ...t, brands: t.brands.map(b => b.id === brandId ? { ...b, [field]: value } : b) };
      }
      return t;
    }));
  };

  // ════════════════════════════════════════════════════════════
  // 2. AI LENS ENGINE
  // ════════════════════════════════════════════════════════════
  const startAIScan = async () => {
    setIsAIScanning(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setTimeout(captureAndSendToAI, 3000);
    } catch (err) {
      alert("Camera access denied");
      setIsAIScanning(false);
    }
  };

  const stopAIScan = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
    setIsAIScanning(false);
  };

  const captureAndSendToAI = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

    stopAIScan();
    alert("✨ AI Lens analyzing...");

    try {
      const res = await fetch('https://server-xy7s.onrender.com/ai-product-scan', {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: base64 })
      });
      const data = await res.json();

      if (data && data.success && data.product) {
        const p = data.product;
        
        if (p.name) setName(p.name);
        if (p.category) setCategory(p.category);
        if (p.hsn_code) setHsn(p.hsn_code);
        if (p.gst_rate !== undefined && p.gst_rate !== null && p.gst_rate !== '') {
          setGstRate(Number(p.gst_rate));
          setShowGst(true);
        }

        setTypes(prev => {
          const newTypes = [...prev];
          if (newTypes.length > 0) {
            if (p.quantity_unit) newTypes[0].typeName = p.quantity_unit;
            if (newTypes[0].brands.length > 0) {
              const brand = newTypes[0].brands[0];
              if (p.price !== null) brand.price = p.price;
              if (p.brand) brand.brandName = p.brand;
              if (p.barcode) brand.barcode = p.barcode;
              if (p.expiry_date) brand.expiryDate = p.expiry_date;
              
              if (p.barcode || p.expiry_date) setShowAdvFields(true);
            }
          }
          return newTypes;
        });
      }
    } catch (e) {
      alert("AI Lens failed to recognize product");
    }
  };

  // ════════════════════════════════════════════════════════════
  // 3. BARCODE ENGINE
  // ════════════════════════════════════════════════════════════
  const startBarcodeScan = (typeId: string, brandId: string) => {
    setIsBarcodeScanning(true);
    
    setTimeout(() => {
      if (typeof Quagga !== 'undefined') {
        Quagga.init({
          inputStream: { name: "Live", type: "LiveStream", target: document.querySelector('#quaggaPreview'), constraints: { facingMode: "environment" } },
          decoder: { readers: ["ean_reader", "upc_reader", "code_128_reader"] }
        }, (err: any) => {
          if (err) { alert("Scanner failed"); return; }
          Quagga.start();
        });

        Quagga.onDetected((result: any) => {
          if (result.codeResult.code) {
            const code = result.codeResult.code;
            updateBrand(typeId, brandId, 'barcode', code);
            stopBarcodeScan();
          }
        });
      } else {
        alert("Quagga library not loaded.");
      }
    }, 100);
  };

  const stopBarcodeScan = () => {
    if (typeof Quagga !== 'undefined') Quagga.stop();
    setIsBarcodeScanning(false);
  };

  // ════════════════════════════════════════════════════════════
  // 4. SUBMISSION - LOOSE LOGIC FIXED
  // ════════════════════════════════════════════════════════════
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const nowIso = new Date().toISOString();
      const productId = initialData ? initialData.id : `prod_${Date.now()}`;
      
      const flattenedVariants: ProductVariant[] = [];
      
      types.forEach((t, i) => {
        t.brands.forEach((b, j) => {
          const typeVal = t.typeName.trim() || 'Standard';
          const bName = b.brandName.trim();
          const finalQuantity = bName ? `${typeVal} - ${bName}` : typeVal;
          
          // 🛑 EXACT JS LOOSE LOGIC: Multiply by baseQty for DB Storage
          let dbPrice = Number(b.price) || 0;
          if (isLoose) dbPrice = dbPrice * (Number(b.baseQty) || 1);

          flattenedVariants.push({
            id: `var_${Date.now()}_${i}_${j}`,
            type: typeVal,
            brandName: bName,
            quantity: finalQuantity,
            price: dbPrice,
            stock: Number(b.stock) || 0,
            baseQty: Number(b.baseQty) || 1,
            baseUnit: b.baseUnit.trim() || 'pcs',
            barcode: b.barcode.trim(),
            costPrice: Number(b.costPrice) || '',
            expiryDate: b.expiryDate,
            dateAdded: nowIso
          });
        });
      });

      const newProduct: Product = {
        id: productId,
        name: name.trim(),
        category: category.trim() || 'General',
        hsn: hsn.trim(),
        gstRate: gstRate === '' ? '' : Number(gstRate),
        priceType: priceType,
        isLoose: isLoose,
        batchId: batchId.trim(),
        reorderPoint: reorderPoint === '' ? '' : Number(reorderPoint),
        dateAdded: nowIso,
        variants: flattenedVariants
      };

      if (initialData) {
        await updateProduct(newProduct);
      } else {
        await addProduct(newProduct);
      }

      if (onCancel) onCancel(); // Return to list view

    } catch (err) {
      console.error(err);
      alert("Critical error saving data");
    } finally {
      setIsSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <div className="panel-title-icon blue"><i className="fa-solid fa-layer-group"></i></div>
          <span>{initialData ? 'Edit Product' : 'Product Engine'}</span>
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button id="btnStartScan" type="button" className="btn btn-scan btn-icon-only" onClick={startAIScan}>
            <i className="fa-solid fa-camera-viewfinder"></i> <span style={{ fontSize: '12px' }}>Lens</span>
          </button>
          <button id="btnOpenSettings" type="button" className="btn btn-outline btn-icon-only" onClick={() => {
            setShowAdvFields(!showAdvFields);
            localStorage.setItem('cfg_adv_fields', (!showAdvFields).toString());
          }}>
            <i className="fa-solid fa-gear"></i>
          </button>
        </div>
      </div>

      {isAIScanning && (
        <div className="scanner-box" id="scannerBox" style={{ display: 'block' }}>
          <div className="scan-laser"></div>
          <video id="cameraPreview" ref={videoRef} autoPlay playsInline></video>
          <canvas id="captureCanvas" ref={canvasRef} style={{ display: 'none' }}></canvas>
          <div style={{ position: 'absolute', bottom: '10px', width: '100%', textAlign: 'center' }}>
            <button id="btnStopScan" type="button" className="btn" onClick={stopAIScan} style={{ width: 'auto', display: 'inline-flex', padding: '7px 18px', fontSize: '12px', background: 'rgba(220,38,38,0.9)', color: 'white', borderRadius: '8px', border: 'none' }}>
              <i className="fa-solid fa-xmark"></i> Stop Lens
            </button>
          </div>
        </div>
      )}

      <form id="productForm" onSubmit={handleSaveProduct}>
        <div className="form-group">
          <input type="text" id="pName" className="form-input" placeholder=" " value={name} onChange={e => setName(e.target.value)} required autoComplete="off" />
          <label className="floating-label">Product Name</label>
        </div>

        <div id="variantEngineWrapper">
          <div id="variantEngine">
            {types.map((t, i) => (
              <div key={t.id} className={`type-box ${showAdvFields ? 'show-adv' : ''}`}>
                {types.length > 1 && (
                  <button type="button" className="btn-remove-type" onClick={() => handleRemoveType(t.id)}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <input type="text" className="form-input v-type-input" placeholder=" " value={t.typeName} onChange={e => {
                      const newTypes = [...types]; newTypes[i].typeName = e.target.value; setTypes(newTypes);
                    }} required />
                    <label className="floating-label">Type of Item (e.g. Biscuit)</label>
                  </div>
                  <button type="button" className="btn btn-dashed btn-add-brand" onClick={() => handleAddBrand(t.id)} style={{ flex: 1, marginBottom: 0, height: '46px', fontSize: '13px' }}>
                    + Add Brand
                  </button>
                </div>

                <div className="brands-container">
                  {t.brands.map((b) => {
                    const showBrandInput = t.brands.length > 1 || b.brandName !== '';
                    return (
                      <div key={b.id} className="brand-box" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1.5px dashed var(--border)', position: 'relative' }}>
                        
                        <div className="form-group brand-name-group" style={{ display: showBrandInput ? 'block' : 'none' }}>
                          <input type="text" className="form-input b-name" placeholder=" " value={b.brandName} onChange={e => updateBrand(t.id, b.id, 'brandName', e.target.value)} />
                          <label className="floating-label">Brand Name</label>
                        </div>

                        <div className="variant-grid">
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input type="number" step="0.001" className="form-input b-base-qty" placeholder="Qty" value={b.baseQty} onChange={e => updateBrand(t.id, b.id, 'baseQty', Number(e.target.value))} style={{ flex: 1 }} />
                              <input type="text" className="form-input b-base-unit" placeholder="Unit" value={b.baseUnit} onChange={e => updateBrand(t.id, b.id, 'baseUnit', e.target.value)} style={{ width: '80px' }} />
                            </div>
                            <label className="floating-label" style={{ top: '-8px', background: '#fff', fontSize: '11px', color: 'var(--primary)' }}>
                              <i className="fa-solid fa-box"></i> 1 Stock Contains
                            </label>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <input type="number" step="0.01" className="form-input b-price" placeholder=" " value={b.price} onChange={e => updateBrand(t.id, b.id, 'price', e.target.value ? Number(e.target.value) : '')} required style={{ fontSize: '16px', fontWeight: 800, color: 'var(--success)', fontFamily: "'JetBrains Mono', monospace" }} />
                            <label className="floating-label b-price-label">
                              {/* 🛑 EXACT JS LOOSE LOGIC: Dynamic Label */}
                              {isLoose ? `Amount per 1 ${b.baseUnit}` : `Amount per ${b.baseQty} ${b.baseUnit}`}
                            </label>
                          </div>
                        </div>
<div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                          <input type="number" step="0.001" className="form-input b-stock" placeholder=" " value={b.stock} onChange={e => updateBrand(t.id, b.id, 'stock', e.target.value ? Number(e.target.value) : '')} required />
                          {/* 🛑 FIX: Dynamic Stock Label based on Loose vs Packed */}
                          <label className="floating-label" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                            {isLoose ? `Total Stock (${b.baseUnit || 'units'})` : 'Total Stock (Count)'}
                          </label>
                        </div>

                        <div className="adv-only-field">
                          <div className="variant-grid">
                            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                              <input type="text" className="form-input b-barcode" placeholder=" " value={b.barcode} onChange={e => updateBrand(t.id, b.id, 'barcode', e.target.value)} />
                              <button type="button" className="btn-scan-barcode" onClick={() => startBarcodeScan(t.id, b.id)} style={{ position: 'absolute', right: '8px', top: '11px', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '16px', cursor: 'pointer' }}>
                                <i className="fa-solid fa-barcode"></i>
                              </button>
                              <label className="floating-label"><i className="fa-solid fa-barcode"></i> Barcode</label>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <input type="number" step="0.01" className="form-input b-cost" placeholder=" " value={b.costPrice} onChange={e => updateBrand(t.id, b.id, 'costPrice', e.target.value ? Number(e.target.value) : '')} />
                              <label className="floating-label"><i className="fa-solid fa-tags"></i> Cost Price</label>
                            </div>
                          </div>
                          <div className="form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                            <input type="date" className="form-input b-expiry" placeholder=" " value={b.expiryDate} onChange={e => updateBrand(t.id, b.id, 'expiryDate', e.target.value)} />
                            <label className="floating-label"><i className="fa-regular fa-calendar-xmark"></i> Expiry Date</label>
                          </div>
                        </div>

                       {/* 🛑 FIX: Positioned the Remove Button safely inside the card */}
                        {t.brands.length > 1 && (
                          <button 
                            type="button" 
                            className="btn-remove-brand" 
                            onClick={() => handleRemoveBrand(t.id, b.id)} 
                            style={{ position: 'absolute', top: '10px', right: '10px', background: '#fee2e2', border: '1px solid #fca5a5', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}
                            title="Remove Variant"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        )}
                        
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button id="btnAddVariant" type="button" className="btn btn-dashed" onClick={handleAddType} style={{ marginBottom: '18px', fontSize: '13px' }}>
          <i className="fa-solid fa-plus"></i> Add Another Type
        </button>

        <div className="form-group">
          <input type="text" id="pCategory" className="form-input" placeholder=" " value={category} onChange={e => setCategory(e.target.value)} autoComplete="off" />
          <label className="floating-label">Category</label>
        </div>

        <button type="button" className="tier-toggle" id="btnToggleGst" onClick={() => setShowGst(!showGst)} style={{ background: showGst ? 'var(--blue-50)' : '', borderColor: showGst ? 'var(--primary)' : '', color: showGst ? 'var(--primary)' : '' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--warning-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-receipt" style={{ color: 'var(--warning)', fontSize: '12px' }}></i>
            </span>
            Level 2 — GST Config
          </span>
          <i className="fa-solid fa-chevron-down chevron" style={{ color: 'var(--slate-400)', fontSize: '14px', transform: showGst ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}></i>
        </button>

        {showGst && (
          <div id="tierGst" className="tier-content" style={{ display: 'block' }}>
            <div className="variant-grid">
              <div className="form-group">
                <input type="text" id="pHSN" className="form-input" placeholder=" " value={hsn} onChange={e => setHsn(e.target.value)} />
                <label className="floating-label">HSN Code</label>
              </div>
              <div className="form-group">
                <input type="number" id="pGSTRate" className="form-input" placeholder=" " value={gstRate} onChange={e => setGstRate(e.target.value ? Number(e.target.value) : '')} />
                <label className="floating-label">GST %</label>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select id="pPriceType" className="form-select" value={priceType} onChange={e => setPriceType(e.target.value as any)}>
                <option value="inclusive">Inclusive (Rate includes Tax)</option>
                <option value="exclusive">Exclusive (Tax added on top)</option>
              </select>
              <label className="floating-label" style={{ background: '#fff', top: '-8px', fontSize: '11px', color: 'var(--primary)' }}>Tax Calculation</label>
            </div>
          </div>
        )}

        {(showAdvFields || showBatch) && (
          <div id="advancedFieldsContainer" style={{ paddingTop: '15px', marginTop: '10px', borderTop: '1.5px dashed var(--border)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px', textTransform: 'uppercase' }}>
              Advanced Global Details
            </div>
            
            <div className="form-group" id="looseInputContainer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f9f9', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', border: '1.5px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Sell By Weight / Loose</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Check this if you sell fractional amounts (e.g. 1.5kg)</div>
              </div>
              <label className="switch">
                <input type="checkbox" id="pIsLoose" checked={isLoose} onChange={e => setIsLoose(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            {showBatch && (
              <div className="form-group" id="batchInputContainer">
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input type="text" id="pBatchId" className="form-input" placeholder=" " value={batchId} onChange={e => setBatchId(e.target.value)} />
                    <label className="floating-label"><i className="fa-solid fa-layer-group" style={{ marginRight: '4px' }}></i> Batch ID (Lot No.)</label>
                  </div>
                  <button type="button" id="btnAutoBatch" className="btn btn-outline" onClick={() => setBatchId(`${category.substring(0,3).toUpperCase() || 'BAT'}-${Math.floor(1000 + Math.random() * 9000)}`)} style={{ width: 'auto', padding: '0 15px' }}>Auto</button>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <input type="number" id="pReorderPoint" className="form-input" placeholder=" " value={reorderPoint} onChange={e => setReorderPoint(e.target.value ? Number(e.target.value) : '')} />
              <label className="floating-label"><i className="fa-solid fa-bell-concierge" style={{ marginRight: '4px' }}></i> Min. Stock Alert Threshold</label>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ marginTop: '20px', fontSize: '15px' }} id="saveBtn" disabled={isSaving}>
          {isSaving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-cloud-arrow-up"></i> {initialData ? 'Update Product' : 'Save to Database'}</>}
        </button>
      </form>

      {isBarcodeScanning && (
        <div id="barcodeScannerModal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-box" style={{ borderRadius: '16px', padding: '20px', width: '90%', maxWidth: '400px', textAlign: 'center', background: '#0F172A', color: 'white' }}>
            <h4 style={{ marginTop: 0, marginBottom: '15px', fontFamily: 'var(--font-head)', fontSize: '16px' }}>
              <i className="fa-solid fa-barcode" style={{ color: '#60A5FA' }}></i> Scan Barcode
            </h4>
            <div id="quaggaPreview" style={{ width: '100%', height: '250px', background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '2px solid var(--primary)' }}>
              <div className="scan-laser"></div>
            </div>
            <button type="button" className="btn" style={{ marginTop: '20px', width: '100%', background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={stopBarcodeScan}>
              <i className="fa-solid fa-xmark"></i> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductForm;