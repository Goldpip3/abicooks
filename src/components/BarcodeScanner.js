'use client';

import { useEffect, useRef, useState } from 'react';

function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [scannedOnce, setScannedOnce] = useState(false);

  const lookupBarcode = async (barcode) => {
    if (!barcode.trim()) return;
    setLookingUp(true);
    setLookupError('');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode.trim()}.json`);
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const n = p.nutriments || {};
        onResult({
          barcode: barcode.trim(),
          name: p.product_name || '',
          per100g: {
            calories: Number(n['energy-kcal_100g'] || 0),
            protein: Number(n['proteins_100g'] || 0),
            fat: Number(n['fat_100g'] || 0),
            carbs: Number(n['carbohydrates_100g'] || 0),
          },
          servingSize: p.serving_size || '',
        });
      } else {
        setLookupError('Product not found in Open Food Facts database. Try entering details manually.');
      }
    } catch (err) {
      setLookupError('Network error looking up product: ' + err.message);
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const startScanner = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          async (result, err) => {
            if (cancelled) return;
            if (result && !scannedOnce) {
              setScannedOnce(true);
              try { controls.stop(); } catch {}
              if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(t => t.stop());
              }
              await lookupBarcode(result.getText());
            }
          }
        );
        controlsRef.current = controls;
      } catch (err) {
        if (!cancelled) setCameraError(true);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      try { if (controlsRef.current) controlsRef.current.stop(); } catch {}
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    try { if (controlsRef.current) controlsRef.current.stop(); } catch {}
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) lookupBarcode(manualBarcode.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        aria-label="Close scanner"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <h2 className="text-white text-lg font-semibold">Scan Barcode</h2>

        {cameraError ? (
          <div className="bg-gray-800 rounded-2xl p-6 w-full text-center space-y-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <p className="text-gray-300 text-sm">Camera not available. Enter barcode manually.</p>
          </div>
        ) : (
          <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-56 h-32">
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-orange-500 rounded-tl" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-orange-500 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-orange-500 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-orange-500 rounded-br" />
                  <div
                    className="absolute left-1 right-1 h-0.5 bg-orange-500 shadow-lg"
                    style={{ animation: 'scanLine 1.8s ease-in-out infinite', boxShadow: '0 0 6px 1px rgba(234, 88, 12, 0.6)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-gray-300 text-sm text-center">
          {cameraError ? '' : 'Point camera at barcode'}
        </p>

        {lookupError && (
          <div className="w-full bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
            {lookupError}
          </div>
        )}

        <div className="w-full bg-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Manual entry</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualBarcode}
              onChange={e => setManualBarcode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleManualSubmit(); }}
              placeholder="Enter barcode number..."
              className="flex-1 border border-gray-600 rounded-lg px-3 py-2 bg-gray-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
            <button
              onClick={handleManualSubmit}
              disabled={lookingUp || !manualBarcode.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {lookingUp ? (
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : 'Look up'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 4px; }
          50%  { top: calc(100% - 6px); }
          100% { top: 4px; }
        }
      `}</style>
    </div>
  );
}

export default BarcodeScanner;
