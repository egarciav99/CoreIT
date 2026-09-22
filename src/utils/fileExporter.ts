/**
 * File Generation & Download Helper for n8n Webhook Automations & Binary Files
 */

/**
 * Downloads a binary file (e.g. .xlsx, .pdf, .zip, .csv) by creating a temporary DOM <a> link
 * with URL.createObjectURL and automatically revoking the object URL after triggering.
 */
export function downloadBinaryFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateAndDownloadExcel(
  fileName: string = 'Reporte_Extraido_n8n.csv',
  sourceFileName: string = 'Documento.pdf',
  customData?: Record<string, unknown>[]
) {
  // Sample extracted data from PDF by n8n workflow
  const defaultRows = [
    {
      'ID_Registro': 'EXT-9801',
      'Fecha_Documento': new Date().toLocaleDateString('es-ES'),
      'Archivo_Origen': sourceFileName,
      'Entidad_Emisora': 'Acme Corp S.L.',
      'NIF_CIF': 'B-84920192',
      'Concepto_Extraido': 'Servicios de Consultoría y Desarrollo Web',
      'Unidades': 1,
      'Precio_Unitario': '1.250,00 €',
      'Base_Imponible': '1.250,00 €',
      'Tipo_IVA': '21%',
      'Cuota_IVA': '262,50 €',
      'Total_Factura': '1.512,50 €',
      'Metodo_Pago': 'Transferencia Bancaria',
      'IBAN_Detectado': 'ES91 2100 0418 4502 0005 1234',
      'Confianza_OCR_n8n': '99.8%',
      'Estado_Flujo': 'Procesado con Éxito por n8n'
    },
    {
      'ID_Registro': 'EXT-9802',
      'Fecha_Documento': new Date().toLocaleDateString('es-ES'),
      'Archivo_Origen': sourceFileName,
      'Entidad_Emisora': 'Cloud Infrastructure Ltd',
      'NIF_CIF': 'N-04928172',
      'Concepto_Extraido': 'Servidores Dedicados y Ancho de Banda',
      'Unidades': 4,
      'Precio_Unitario': '85,00 €',
      'Base_Imponible': '340,00 €',
      'Tipo_IVA': '21%',
      'Cuota_IVA': '71,40 €',
      'Total_Factura': '411,40 €',
      'Metodo_Pago': 'Tarjeta Crédito',
      'IBAN_Detectado': 'N/A',
      'Confianza_OCR_n8n': '98.5%',
      'Estado_Flujo': 'Procesado con Éxito por n8n'
    },
    {
      'ID_Registro': 'EXT-9803',
      'Fecha_Documento': new Date().toLocaleDateString('es-ES'),
      'Archivo_Origen': sourceFileName,
      'Entidad_Emisora': 'Papelería & Suministros Pro',
      'NIF_CIF': 'B-12849102',
      'Concepto_Extraido': 'Material de Oficina y Licencias',
      'Unidades': 10,
      'Precio_Unitario': '12,50 €',
      'Base_Imponible': '125,00 €',
      'Tipo_IVA': '21%',
      'Cuota_IVA': '26,25 €',
      'Total_Factura': '151,25 €',
      'Metodo_Pago': 'Domiciliación',
      'IBAN_Detectado': 'ES44 0049 1500 0512 3456 7890',
      'Confianza_OCR_n8n': '99.1%',
      'Estado_Flujo': 'Procesado con Éxito por n8n'
    }
  ];

  const dataToExport = customData || defaultRows;
  if (dataToExport.length === 0) return;

  const headers = Object.keys(dataToExport[0]);
  
  // Format as CSV with semicolon delimiter (Standard Excel in Spanish/European locales)
  const csvRows: string[] = [];
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'));

  for (const row of dataToExport) {
    const values = headers.map(header => {
      const val = (row as Record<string, unknown>)[header];
      const strVal = val === null || val === undefined ? '' : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(';'));
  }

  // Add UTF-8 BOM (\uFEFF) so Excel opens accented Spanish letters properly
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const finalName = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') 
    ? fileName.replace(/\.xlsx$/i, '.csv')
    : `${fileName}.csv`;

  downloadBinaryFile(blob, finalName);
}

