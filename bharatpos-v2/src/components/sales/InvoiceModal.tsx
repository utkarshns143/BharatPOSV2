import React from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { useDataStore } from '../../store/useDataStore';
import type { Sale } from '../../types';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, sale }) => {
  const customers = useDataStore((state) => state.customers);

  if (!isOpen || !sale) return null;

  // Lookup customer details
  const customer = customers.find(c => c.id === sale.customerId);

  const handlePrint = () => {
    // A simple, clean way to print just the receipt in React
    const printContent = document.getElementById('printable-invoice');
    const windowPrint = window.open('', '', 'width=600,height=800');
    if (windowPrint && printContent) {
      windowPrint.document.write(`
        <html>
          <head>
            <title>Print Invoice ${sale.id}</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 12px; }
              .inv-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
              .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
              .inv-table th { border-bottom: 1px dashed #000; padding: 5px 0; text-align: left; }
              .inv-table td { padding: 8px 0; vertical-align: top; border-bottom: 1px dotted #ccc; }
              .inv-right { text-align: right; }
              .inv-totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
              .inv-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      windowPrint.document.close();
      windowPrint.focus();
      windowPrint.print();
      windowPrint.close();
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#f1f5f9', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* Printable Area */}
        <div id="printable-invoice" style={{ backgroundColor: 'white', padding: '1.5rem', fontFamily: 'monospace', fontSize: '12px', color: '#000', border: '1px solid #ccc', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>BHARAT POS</h2>
            <div>Bill No: {sale.id}</div>
            <div>Date: {new Date(sale.timestamp).toLocaleString()}</div>
            {customer && (
              <div style={{ marginTop: '5px' }}>Customer: {customer.name} ({customer.phone})</div>
            )}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px dashed #000', textAlign: 'left', paddingBottom: '5px' }}>Item</th>
                <th style={{ borderBottom: '1px dashed #000', textAlign: 'center', paddingBottom: '5px' }}>Qty</th>
                <th style={{ borderBottom: '1px dashed #000', textAlign: 'right', paddingBottom: '5px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc' }}>
                    <strong>{item.name}</strong><br/>
                    <small>{item.variantName}</small>
                  </td>
                  <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc', textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ padding: '8px 0', borderBottom: '1px dotted #ccc', textAlign: 'right' }}>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #000', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
              <span>Grand Total:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            
            {/* Split Payments Details */}
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#555' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Mode:</span>
                <strong>{sale.paymentMethod}</strong>
              </div>
              {sale.split && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cash Paid:</span><span>{formatCurrency(sale.split.cash)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Online Paid:</span><span>{formatCurrency(sale.split.online)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                    <span>Udhaar (Pending):</span><span>{formatCurrency(sale.split.udhaar)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons (Not Printed) */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="primary" style={{ flex: 1 }} onClick={handlePrint}>🖨️ Print Receipt</Button>
          <Button variant="outline" style={{ flex: 1 }} onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};