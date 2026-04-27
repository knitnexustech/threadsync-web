
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { DeliveryChallan, Invoice, Company } from '../types';
import { shareFile } from '../capacitorUtils';
import { resolveFrom, resolveTo } from './partnerUtils';

/**
 * DocumentEngine.ts
 * Generates "Traditional Formal" PDFs for Delivery Challans and Sales Invoices.
 * Light Blue Theme, A5 Landscape (DC) and A4 Portrait (Invoice).
 */

const BLUE_LIGHT = '#3b82f6';
const BLUE_DARK = '#1d4ed8';

export const generateDocumentPDF = async (
    type: 'DC' | 'SALES_INVOICE',
    data: any,
    company: Company,
    returnBase64 = false
) => {
    // 1. Create a hidden container for rendering
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = type === 'DC' ? '210mm' : '210mm'; // Width is same, landscape/portrait differs
    container.style.background = '#fff';
    container.style.fontFamily = 'Inter, sans-serif';
    document.body.appendChild(container);

    const isA5 = type === 'DC';
    const docTitle = isA5 ? 'DELIVERY CHALLAN' : 'TAX INVOICE';
    const docNumber = data.dc_number || data.invoice_number;

    const fromPartner = resolveFrom(data);
    const toPartner = resolveTo(data);

    // 2. Build the HTML content
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; padding: 15px 20px; border: 1.2px solid ${BLUE_LIGHT}; margin: 8px; box-sizing: border-box; min-height: ${isA5 ? '132mm' : '276mm'}; color: #1f2937; background: #fff; font-size: 9.5px; line-height: 1.2;">
            
            <!-- 1. Header: Compact Title -->
            <div style="text-align: center; margin-bottom: 4px; padding-bottom: 8px;">
                <h1 style="font-size: 14px; font-weight: 800; color: #d89864ff; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${docTitle}</h1>
            </div>

            <!-- 2. From & To: Slim Columns -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
                <div style="padding: 8px 10px; background: ${BLUE_DARK}04; border-radius: 5px; border: 1px solid #adc5f7ff;">
                    <span style="font-size: 12px; font-weight: 800; color: ${BLUE_LIGHT}; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">From</span>
                    <p style="font-size: 11px; font-weight: 800; margin: 0; color: ${BLUE_DARK};">${fromPartner?.name || company.name}</p>
                    <p style="font-size: 11px; color: #383c42ff; margin: 2px 0 0; line-height: 1.3; white-space: pre-wrap;">${fromPartner?.address || company.address || 'Address Not Found'}</p>
                    ${(fromPartner?.gst || company.gst_number) ? `<p style="font-size: 11px; font-weight: 700; color: ${BLUE_LIGHT}; margin: 4px 0 0;">GSTIN: ${fromPartner?.gst || company.gst_number}</p>` : ''}
                </div>
                <div style="padding: 8px 10px; background: ${BLUE_DARK}04; border-radius: 5px; border: 1px solid #adc5f7ff;">
                    <span style="font-size: 12px; font-weight: 800; color: ${BLUE_LIGHT}; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">To</span>
                    <p style="font-size: 11px; font-weight: 800; margin: 0; color: ${BLUE_DARK};">${toPartner?.name || 'Contact Name Not Found'}</p>
                    <p style="font-size: 11px; color: #383c42ff; margin: 2px 0 0; line-height: 1.3; white-space: pre-wrap;">${toPartner?.address || 'Address Not Found'}</p>
                    ${toPartner?.gst ? `<p style="font-size: 11px; font-weight: 700; color: ${BLUE_LIGHT}; margin: 4px 0 0;">GSTIN: ${toPartner.gst}</p>` : ''}
                </div>
            </div>

            <!-- 3. Document Metadata: Slim Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; margin-bottom: 8px; padding: 6px; border: 1px solid #adc5f7ff; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 10px;">
                    <span style="font-weight: 700; color: #6b7280;">DC No:</span>
                    <span style="font-weight: 800; color: #1f2937;">${docNumber}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px;">
                    <span style="font-weight: 700; color: #6b7280;">Date:</span>
                    <span style="font-weight: 800; color: #1f2937;">${new Date(data.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px;">
                    <span style="font-weight: 700; color: #6b7280;">Order Ref:</span>
                    <span style="font-weight: 800; color: #1f2937;">${data.ref_order_number || '—'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px;">
                    <span style="font-weight: 700; color: #6b7280;">User Order No:</span>
                    <span style="font-weight: 800; color: #1f2937;">${data.parent_order?.order_number || data.order_number || '—'}</span>
                </div>
            </div>

            <!-- 4. Items Table -->
            <div style="flex: 1;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed;">
                    <thead>
                        <tr style="background: ${BLUE_DARK}; color: white;">
                            <th style="padding: 8px; text-align: center; justify-content: center; border: 1px solid ${BLUE_DARK}; font-size: 10 px; font-weight: 800; width: 35px;">SL.</th>
                            <th style="padding: 8px; text-align: left; justify-content: center; border: 1px solid ${BLUE_DARK}; font-size: 10px; font-weight: 800;">DESCRIPTION</th>
                            <th style="padding: 8px; text-align: center; justify-content: center; border: 1px solid ${BLUE_DARK}; font-size: 10px; font-weight: 800; width: 50px;">QTY</th>
                            <th style="padding: 8px; text-align: center; justify-content: center; border: 1px solid ${BLUE_DARK}; font-size: 10px; font-weight: 800; width: 50px;">UNIT</th>
                            ${!isA5 ? `
                                <th style="padding: 8px; text-align: right; justify-content: center; border: 1px solid ${BLUE_DARK}; font-size: 10px; font-weight: 800; width: 70px;">RATE</th>
                                <th style="padding: 8px; text-align: right; justify-content: center; border: 1px solid ${BLUE_DARK}; font-size: 10px; font-weight: 800; width: 90px;">AMOUNT</th>
                            ` : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${(data.items || data.items_received || []).map((it: any, idx: number) => `
                            <tr>
                                <td style="padding: 6px 8px; border: 1px solid #f3f4f6; font-size: 10px; text-align: center;">${idx + 1}</td>
                                <td style="padding: 6px 8px; border: 1px solid #f3f4f6; font-size: 10px; font-weight: 700; color: #111827;">${it.description}</td>
                                <td style="padding: 6px 8px; border: 1px solid #f3f4f6; font-size: 10px; text-align: center; font-weight: 800;">${it.quantity}</td>
                                <td style="padding: 6px 8px; border: 1px solid #f3f4f6; font-size: 10px; text-align: center; color: #6b7280;">${it.unit}</td>
                                ${!isA5 ? `
                                    <td style="padding: 6px 8px; border: 1px solid #f3f4f6; font-size: 10px; text-align: right;">${it.rate?.toLocaleString() || '0'}</td>
                                    <td style="padding: 6px 8px; border: 1px solid #f3f4f6; font-size: 10px; text-align: right; font-weight: 800;">${it.amount?.toLocaleString() || '0'}</td>
                                ` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- Totals (Only for Invoices) -->
                ${!isA5 ? `
                    <div style="width: 200px; margin-left: auto; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 9px; color: #6b7280;">
                            <span>Subtotal</span>
                            <span style="font-weight: 700; color: #1f2937;">₹${data.subtotal?.toLocaleString() || '0'}</span>
                        </div>
                        ${data.gst_amount ? `
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 9px; color: #6b7280;">
                                <span>GST (${data.gst_rate}%)</span>
                                <span style="font-weight: 700; color: #1f2937;">₹${data.gst_amount.toLocaleString()}</span>
                            </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: ${BLUE_DARK}; color: white; border-radius: 6px; font-size: 10px; font-weight: 800; margin-top: 6px;">
                            <span>TOTAL</span>
                            <span>₹${data.total_amount?.toLocaleString() || '0'}</span>
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- 5. Footer: Signature & Receiver & Notes -->
            <div style="margin-top: auto; padding-top: 15px; display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; width: 100%;">
                
                <!-- Receiver Details -->
                <div style="display: flex; gap: 12px; align-items: center; width: 220px; flex-shrink: 0;">
                    ${data.driver_photo_url ? `
                        <img src="${data.driver_photo_url}" style="width: 50px; height: 65px; object-fit: cover; border: 1.2px solid ${BLUE_LIGHT}; border-radius: 4px;" />
                    ` : `
                        <div style="width: 50px; height: 65px; background: #f9fafb; border: 1px dashed #e5e7eb; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8px; color: #9ca3af; text-transform: uppercase;">
                            <span>Photo</span>
                        </div>
                    `}
                    <div>
                        <p style="font-size: 8px; font-weight: 800; color: ${BLUE_LIGHT}; text-transform: uppercase; margin-bottom: 2px;">Receiver Details</p>
                        <p style="font-size: 11px; font-weight: 800; margin: 0; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${data.driver_name || 'N/A'}</p>
                        <p style="font-size: 9px; color: #6b7280; margin: 1px 0 0; white-space: nowrap;">${data.driver_phone || 'Contact N/A'}</p>
                        <div style="margin-top: 8px; border-bottom: 1.2px solid #f3f4f6; width: 120px; height: 16px; position: relative;">
                            <span style="position: absolute; bottom: -12px; left: 0; font-size: 8px; font-weight: 700; color: #9ca3af; text-transform: uppercase;">Sign Here</span>
                        </div>
                    </div>
                </div>

                <!-- Notes Section -->
                <div style="flex: 1; padding-bottom: 8px;">
                    ${data.notes ? `
                        <div style="padding: 8px 10px; background: #f9fafb; border: 1px dashed #adc5f7; border-radius: 6px;">
                            <span style="font-size: 8px; font-weight: 800; color: ${BLUE_LIGHT}; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 3px;">Notes / Instructions</span>
                            <p style="font-size: 9px; color: #374151; margin: 0; white-space: pre-wrap; line-height: 1.3;">${data.notes}</p>
                        </div>
                    ` : ``}
                </div>

                <!-- Sender Signature -->
                <div style="text-align: right; width: 180px; flex-shrink: 0; padding-bottom: 4px;">
                    <span style="font-size: 8px; font-weight: 700; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: 30px;">For ${company.name}</span>
                    <div style="border-top: 1.2px solid #111827; padding-top: 4px; display: inline-block; min-width: 140px;">
                        <p style="font-size: 8px; font-weight: 800; color: ${BLUE_DARK}; text-transform: uppercase; margin: 0;">Authorized Signatory</p>
                    </div>
                </div>
            </div>

        </div>
    `;

    // 3. Render and Generate
    try {
        const canvas = await html2canvas(container, {
            scale: 2.5, // Even higher resolution
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
            orientation: isA5 ? 'landscape' : 'portrait',
            unit: 'mm',
            format: isA5 ? 'a5' : 'a4'
        });

        const pageContentWidth = 210;
        const pageContentHeight = isA5 ? 148 : 297;

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // If it fits on one page, good. If it's longer, scaling it down is the fallback for single-page formats.
        // For A5 landscape, 148mm is the height limit.
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

        const fileName = `${type}_${docNumber}.pdf`;
        const base64 = pdf.output('datauristring').split(',')[1];

        if (returnBase64) return base64;

        await shareFile(fileName, base64, `Share ${docTitle}`);

    } finally {
        document.body.removeChild(container);
    }
};
