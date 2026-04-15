"use client";

import { useState, useEffect, useRef } from "react";
import React from "react";
import ReportBatchesModal, { ReportBatch } from "./ReportBatchesModal";

interface ReportData {
  [key: string]: any;
  lotes?: ReportBatch[];
}

interface ReportSummary {
  totalRecords: number;
  totalQuantity: number;
  fromDate: string;
  toDate: string;
}

type ReportType = "egresos" | "ingresos" | "notas-egreso";

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ReportType;
}

export default function ReportsModal({ isOpen, onClose, initialType = "egresos" }: ReportsModalProps) {
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [useTodayFilter, setUseTodayFilter] = useState(false);
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<ReportBatch[]>([]);
  const [selectedProductName, setSelectedProductName] = useState("");
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReportType(initialType);
      setExpandedRows(new Set());
      setSearchTerm("");
    }
  }, [isOpen, initialType]);

  // Actualizar fechas cuando se activa el filtro de hoy
  useEffect(() => {
    if (useTodayFilter) {
      // Usar fecha local sin problemas de timezone
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      setFromDate(todayStr);
      setToDate(todayStr);
    }
  }, [useTodayFilter]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escuchar ESC solo cuando el modal de lotes no está abierto
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !showBatchesModal) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, onClose, showBatchesModal]);

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleShowBatches = (batches: ReportBatch[] | undefined, productName: string) => {
    if (!batches) return;
    setSelectedBatches(batches);
    setSelectedProductName(productName);
    setShowBatchesModal(true);
  };

  const handleGenerateReport = async () => {
    if (!fromDate || !toDate) {
      setError("Por favor selecciona ambas fechas");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setError("La fecha inicial debe ser menor a la fecha final");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const endpoint = `/api/reports/${reportType}?fromDate=${fromDate}&toDate=${toDate}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error("Error al generar el reporte");
      }

      const result = await response.json();
      setReportData(result.data || []);
      setSummary(result.summary || null);
      setExpandedRows(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el reporte");
      setReportData([]);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    // Columnas base (sin incluir lotes directamente)
    const baseHeaders = Object.keys(reportData[0]).filter(key => key !== 'lotes');
    let csv = "";

    // Crear CSV con dos secciones: datos principales y lotes detallados
    csv += "DATOS PRINCIPALES\n";
    csv += baseHeaders.join(";") + "\n";
    
    reportData.forEach((row) => {
      const values = baseHeaders.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) {
          return "";
        }
        const stringValue = String(value);
        if (
          stringValue.includes(";") ||
          stringValue.includes('"') ||
          stringValue.includes("\n")
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csv += values.join(";") + "\n";
    });

    // Agregar sección de lotes
    csv += "\n\nDETALLE DE LOTES\n";
    csv += "Producto;Lote;Stock Actual;Stock Inicial;Vencimiento;Estante;Cajón;Sección;Notas Ubicación\n";
    
    reportData.forEach((row) => {
      if (row.lotes && row.lotes.length > 0) {
        row.lotes.forEach((batch: ReportBatch) => {
          const batchRow = [
            row.producto,
            batch.batch_number,
            batch.stock,
            batch.initial_stock,
            new Date(batch.expiration_date).toLocaleDateString("es-EC"),
            batch.shelf || "",
            batch.drawer || "",
            batch.section || "",
            batch.location_notes || "",
          ];
          csv += batchRow.map((val) => {
            const stringVal = String(val);
            if (stringVal.includes(";") || stringVal.includes('"') || stringVal.includes("\n")) {
              return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
          }).join(";") + "\n";
        });
      }
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `reporte-${reportType}-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleExportExcel = async () => {
    if (reportData.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    try {
      // Importar ExcelJS dinámicamente
      const ExcelJS = (await import('exceljs')).default;

      const workbook = new ExcelJS.Workbook();
      
      // Hoja principal con datos
      const sheetName = reportType === 'egresos' ? 'Egresos' : reportType === 'notas-egreso' ? 'Notas de Egreso' : 'Ingresos';
      const mainSheet = workbook.addWorksheet(sheetName);
      const columns = reportType === "egresos" ? egressColumns : reportType === "notas-egreso" ? notasEgresoColumns : ingressColumns;

      // Configurar columnas (sin la columna lotes)
      const mainColumns = columns.filter(col => col.key !== 'lote');
      mainSheet.columns = mainColumns.map(col => ({
        header: col.label,
        key: col.key,
        width: 15
      }));

      // Estilo del header
      mainSheet.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF334155' } // slate-700
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 11
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF64748B' } },
          left: { style: 'thin', color: { argb: 'FF64748B' } },
          bottom: { style: 'thin', color: { argb: 'FF64748B' } },
          right: { style: 'thin', color: { argb: 'FF64748B' } }
        };
      });

      // Agregar datos con estilo alternado
      reportData.forEach((row, index) => {
        const excelRow = mainSheet.addRow(
          mainColumns.reduce((acc, col) => {
            acc[col.key] = row[col.key] ?? '';
            return acc;
          }, {} as any)
        );

        // Alternar colores de filas
        const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC'; // blanco / slate-50

        excelRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
          };
          cell.font = {
            size: 10,
            color: { argb: 'FF1E293B' } // slate-800
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left'
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      });

      mainSheet.getRow(1).height = 25;

      // Crear hoja de lotes
      const batchSheet = workbook.addWorksheet('Detalle de Lotes');
      
      const batchColumns = [
        { header: 'Producto', key: 'producto', width: 25 },
        { header: 'Lote', key: 'batch_number', width: 20 },
        { header: 'Stock Actual', key: 'stock', width: 12 },
        { header: 'Stock Inicial', key: 'initial_stock', width: 12 },
        { header: 'Vencimiento', key: 'expiration_date', width: 15 },
        { header: 'Estante', key: 'shelf', width: 12 },
        { header: 'Cajón', key: 'drawer', width: 12 },
        { header: 'Sección', key: 'section', width: 12 },
        { header: 'Notas Ubicación', key: 'location_notes', width: 25 },
      ];

      batchSheet.columns = batchColumns;

      // Estilo header de lotes
      batchSheet.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF059669' } // green-600
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 11
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF10B981' } },
          left: { style: 'thin', color: { argb: 'FF10B981' } },
          bottom: { style: 'thin', color: { argb: 'FF10B981' } },
          right: { style: 'thin', color: { argb: 'FF10B981' } }
        };
      });

      // Agregar lotes
      let batchIndex = 0;
      reportData.forEach((row) => {
        if (row.lotes && row.lotes.length > 0) {
          row.lotes.forEach((batch: ReportBatch) => {
            const batchRow = batchSheet.addRow({
              producto: row.producto,
              batch_number: batch.batch_number,
              stock: batch.stock,
              initial_stock: batch.initial_stock,
              expiration_date: new Date(batch.expiration_date).toLocaleDateString("es-EC"),
              shelf: batch.shelf || "",
              drawer: batch.drawer || "",
              section: batch.section || "",
              location_notes: batch.location_notes || "",
            });

            const bgColor = batchIndex % 2 === 0 ? 'FFFFFFFF' : 'FFF0FDF4'; // blanco / green-50

            batchRow.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgColor }
              };
              cell.font = {
                size: 10,
                color: { argb: 'FF1E293B' }
              };
              cell.alignment = {
                vertical: 'middle',
                horizontal: 'left',
                wrapText: true
              };
              cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1FAE5' } },
                left: { style: 'thin', color: { argb: 'FFD1FAE5' } },
                bottom: { style: 'thin', color: { argb: 'FFD1FAE5' } },
                right: { style: 'thin', color: { argb: 'FFD1FAE5' } }
              };
            });

            batchIndex++;
          });
        }
      });

      batchSheet.getRow(1).height = 25;

      // Generar y descargar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte-${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportMenu(false);
    } catch (error) {
      console.error("Error al generar Excel:", error);
      alert("Error al generar el archivo Excel");
    }
  };

  const handleExportPDF = async () => {
    if (reportData.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    try {
      // Importar jsPDF y autotable dinámicamente
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const columns = reportType === "egresos" ? egressColumns : reportType === "notas-egreso" ? notasEgresoColumns : ingressColumns;
      const mainColumns = columns.filter(col => col.key !== 'lote');
      const headers = mainColumns.map(col => col.label);
      const data = reportData.map(row => 
        mainColumns.map(col => row[col.key] ?? '')
      );

      // Página 1: Datos principales
      // Título
      doc.setFontSize(14);
      const pdfTitle = reportType === 'egresos' ? 'Egresos Generales' : reportType === 'notas-egreso' ? 'Notas de Egreso' : 'Ingresos';
      doc.text(`Reporte de ${pdfTitle}`, 14, 15);
      
      if (summary) {
        doc.setFontSize(9);
        doc.text(`Período: ${new Date(summary.fromDate).toLocaleDateString('es-EC')} - ${new Date(summary.toDate).toLocaleDateString('es-EC')}`, 14, 22);
        doc.text(`Total registros: ${summary.totalRecords} | Total cantidad: ${summary.totalQuantity}`, 14, 27);
      }

      // Tabla con letras pequeñas usando autoTable importado
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 32,
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
        },
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { top: 32, right: 8, bottom: 8, left: 8 },
      });

      // Página 2: Detalle de lotes (si existen)
      const batchesData: any[] = [];
      reportData.forEach((row) => {
        if (row.lotes && row.lotes.length > 0) {
          row.lotes.forEach((batch: ReportBatch) => {
            batchesData.push([
              row.producto,
              batch.batch_number,
              batch.stock,
              batch.initial_stock,
              new Date(batch.expiration_date).toLocaleDateString("es-EC"),
              batch.shelf || "-",
              batch.drawer || "-",
              batch.section || "-",
              batch.location_notes || "-",
            ]);
          });
        }
      });

      if (batchesData.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Detalle de Lotes", 14, 15);
        doc.setFontSize(9);
        doc.text(`Total lotes: ${batchesData.length}`, 14, 22);

        autoTable(doc, {
          head: [["Producto", "Lote", "Stock Act.", "Stock Inic.", "Vencimiento", "Estante", "Cajón", "Sección", "Notas"]],
          body: batchesData,
          startY: 27,
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
          },
          headStyles: {
            fillColor: [5, 150, 105],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7,
          },
          alternateRowStyles: {
            fillColor: [240, 253, 244],
          },
          margin: { top: 27, right: 8, bottom: 8, left: 8 },
        });
      }

      doc.save(`reporte-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el archivo PDF");
    }
  };

  const egressColumns = [
    { key: "fecha", label: "Fecha", main: true },
    { key: "hora", label: "Hora", main: true },
    { key: "codigo", label: "Código", main: true },
    { key: "producto", label: "Producto", main: true },
    { key: "cantidad", label: "Cant.", main: true },
    { key: "lote", label: "Lote", main: true },
    { key: "paciente", label: "Paciente", main: true },
    { key: "categoria", label: "Categoría", main: false },
    { key: "especialidad", label: "Especialidad", main: false },
    { key: "unidad", label: "Unidad", main: false },
    { key: "motivo", label: "Motivo", main: false },
    { key: "codigoReceta", label: "Código Receta", main: false },
    { key: "fechaReceta", label: "Fecha Receta", main: false },
    { key: "prescriptor", label: "Prescriptor", main: false },
    { key: "codigoCIE", label: "Código CIE", main: false },
    { key: "usuario", label: "Usuario", main: false },
  ];

  const notasEgresoColumns = [
    { key: "codigo", label: "Código", main: true },
    { key: "producto", label: "Producto", main: true },
    { key: "cantidad", label: "Cant.", main: true },
    { key: "unidad", label: "Unidad", main: true },
    { key: "motivo", label: "Motivo", main: true },
    { key: "codigoNotaSuministro", label: "Código Nota Suministro", main: true },
    { key: "fecha", label: "Fecha", main: true },
    { key: "hora", label: "Hora", main: false },
    { key: "notas", label: "Notas", main: false },
  ];

  const ingressColumns = [
    { key: "fecha", label: "Fecha", main: true },
    { key: "hora", label: "Hora", main: true },
    { key: "codigo", label: "Código", main: true },
    { key: "producto", label: "Producto", main: true },
    { key: "cantidad", label: "Cant.", main: true },
    { key: "lote", label: "Lote", main: true },
    { key: "fechaVencimiento", label: "Vencimiento", main: true },
    { key: "categoria", label: "Categoría", main: false },
    { key: "especialidad", label: "Especialidad", main: false },
    { key: "unidad", label: "Unidad", main: false },
    { key: "fechaEmision", label: "Fecha Emisión", main: false },
    { key: "motivo", label: "Motivo", main: false },
    { key: "ubicacion", label: "Ubicación", main: false },
    { key: "usuario", label: "Usuario", main: false },
  ];

  const columns = reportType === "egresos" ? egressColumns : reportType === "notas-egreso" ? notasEgresoColumns : ingressColumns;
  const mainColumns = columns.filter(col => col.main);
  const detailColumns = columns.filter(col => !col.main);

  // Filtrar datos por término de búsqueda
  const filteredData = reportData.filter(row => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return columns.some(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchLower);
    });
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full h-full sm:h-[96vh] max-w-[98%] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Reportes de Inventario</h2>
            <p className="text-xs text-slate-600 mt-0.5">Genera reportes detallados con filtro de fechas</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
            title="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {/* Filtros */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-3 mb-3 border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
              {/* Tipo de reporte */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Tipo
                </label>
                <select
                  value={reportType}
                  onChange={(e) => {
                    setReportType(e.target.value as ReportType);
                    setReportData([]);
                    setSummary(null);
                  }}
                  className="w-full h-[34px] px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="egresos">Egresos Generales</option>
                  <option value="notas-egreso">Notas de Egreso</option>
                  <option value="ingresos">Ingresos</option>
                </select>
              </div>

              {/* Rango de Fechas Unificado */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-semibold text-slate-700 mb-1 uppercase tracking-wide">
                  Rango de Fechas
                </label>
                <div className="flex gap-0 border border-slate-300 rounded bg-white overflow-hidden h-[34px]">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setUseTodayFilter(false);
                    }}
                    disabled={useTodayFilter}
                    className="flex-1 px-2 py-1.5 text-xs focus:outline-none focus:ring-0 border-0 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    style={{ minWidth: '120px' }}
                  />
                  <div className="flex items-center px-1.5 bg-slate-100 text-slate-500 text-xs">→</div>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setUseTodayFilter(false);
                    }}
                    disabled={useTodayFilter}
                    className="flex-1 px-2 py-1.5 text-xs focus:outline-none focus:ring-0 border-0 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    style={{ minWidth: '120px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setUseTodayFilter(!useTodayFilter)}
                    className={`px-3 text-xs font-semibold transition-colors border-l border-slate-300 ${
                      useTodayFilter 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Solo hoy"
                  >
                    📅 Hoy
                  </button>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2">
                {/* Botón generar */}
                <button
                  onClick={handleGenerateReport}
                  disabled={isLoading}
                  className="flex-1 h-[34px] px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
                >
                  {isLoading ? "⏳" : "🔍 Generar"}
                </button>

                {/* Dropdown de exportación */}
                <div className="relative flex-1" ref={exportMenuRef}>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={reportData.length === 0}
                    className="w-full h-[34px] px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    📥 Exportar {showExportMenu ? '▲' : '▼'}
                  </button>
                  
                  {showExportMenu && reportData.length > 0 && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                      <button
                        onClick={handlePrint}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-2 border-b border-slate-100"
                      >
                        <span className="text-base">🖨️</span>
                        <span>Imprimir</span>
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-2 border-b border-slate-100"
                      >
                        <span className="text-base">📄</span>
                        <span>Descargar CSV</span>
                      </button>
                      <button
                        onClick={handleExportExcel}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-2 border-b border-slate-100"
                      >
                        <span className="text-base">📊</span>
                        <span>Descargar Excel</span>
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700 flex items-center gap-2"
                      >
                        <span className="text-base">📕</span>
                        <span>Descargar PDF</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Errores */}
          {error && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Resumen */}
          {summary && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded px-3 py-2 border border-blue-200">
                  <p className="text-[9px] text-blue-600 uppercase font-bold tracking-wide">Registros</p>
                  <p className="text-xl font-bold text-blue-900">{summary.totalRecords}</p>
                </div>
                <div className="bg-white rounded px-3 py-2 border border-blue-200">
                  <p className="text-[9px] text-blue-600 uppercase font-bold tracking-wide">Cantidad</p>
                  <p className="text-xl font-bold text-blue-900">{summary.totalQuantity}</p>
                </div>
                <div className="bg-white rounded px-3 py-2 border border-blue-200">
                  <p className="text-[9px] text-blue-600 uppercase font-bold tracking-wide">Desde</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {new Date(summary.fromDate).toLocaleDateString("es-EC")}
                  </p>
                </div>
                <div className="bg-white rounded px-3 py-2 border border-blue-200">
                  <p className="text-[9px] text-blue-600 uppercase font-bold tracking-wide">Hasta</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {new Date(summary.toDate).toLocaleDateString("es-EC")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buscador de resultados */}
          {reportData.length > 0 && (
            <div className="mb-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar en los resultados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 border-2 border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchTerm && filteredData.length !== reportData.length && (
                <p className="text-xs text-slate-600 mt-1.5 ml-1">
                  Mostrando {filteredData.length} de {reportData.length} registros
                </p>
              )}
            </div>
          )}

          {/* Tabla */}
          {filteredData.length > 0 ? (
            <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
                      <th className="w-8 px-2 py-2.5 text-center font-semibold border-r border-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 mx-auto">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </th>
                      {mainColumns.map((col, idx) => (
                        <th
                          key={col.key}
                          className={`px-2.5 py-2.5 text-left font-semibold uppercase tracking-wide ${
                            idx < mainColumns.length - 1 ? 'border-r border-slate-500' : ''
                          }`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, idx) => (
                      <React.Fragment key={idx}>
                        <tr
                          className={`cursor-pointer transition-colors ${
                            idx % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-slate-50 hover:bg-blue-50"
                          } ${expandedRows.has(idx) ? "bg-blue-100 hover:bg-blue-100" : ""} border-b border-slate-200`}
                          onClick={() => toggleRow(idx)}
                        >
                          <td className="px-2 py-2 text-center border-r border-slate-200">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2.5}
                              stroke="currentColor"
                              className={`w-3.5 h-3.5 mx-auto transition-transform ${
                                expandedRows.has(idx) ? "rotate-180" : ""
                              }`}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </td>
                          {mainColumns.map((col, colIdx) => (
                            <td
                              key={col.key}
                              className={`px-2.5 py-2 text-slate-800 font-medium ${
                                colIdx < mainColumns.length - 1 ? 'border-r border-slate-200' : ''
                              } ${col.key === 'producto' ? 'font-semibold text-slate-900' : ''}`}
                            >
                              {col.key === 'lote' && row.lotes && row.lotes.length > 0 ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowBatches(row.lotes, row.producto);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-semibold text-xs"
                                  title="Ver lotes disponibles"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span>{row.lotes.length} lote{row.lotes.length > 1 ? 's' : ''}</span>
                                </button>
                              ) : (
                                row[col.key] || "-"
                              )}
                            </td>
                          ))}
                        </tr>
                        {expandedRows.has(idx) && (
                          <tr key={`${idx}-detail`} className="bg-slate-100 border-b border-slate-300">
                            <td colSpan={mainColumns.length + 1} className="p-0">
                              <div className="px-4 py-3">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                  {detailColumns.map((col) => (
                                    <div key={col.key} className="bg-white rounded px-3 py-2 border border-slate-200">
                                      <p className="text-[9px] text-slate-500 uppercase font-semibold tracking-wide mb-0.5">
                                        {col.label}
                                      </p>
                                      <p className="text-[11px] text-slate-900 font-medium">
                                        {row[col.key] || "-"}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : reportData.length > 0 ? (
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 mx-auto mb-3 text-yellow-500"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-slate-700 font-medium">No se encontraron resultados para "{searchTerm}"</p>
              <p className="text-slate-500 text-sm mt-1">Intenta con otros términos de búsqueda</p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
              >
                Limpiar búsqueda
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
                className="w-16 h-16 mx-auto mb-4 text-slate-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="text-slate-500 text-sm">
                {summary
                  ? "No hay registros para el período seleccionado"
                  : "Selecciona un rango de fechas y haz clic en 'Generar' para ver el reporte"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Lotes */}
      <ReportBatchesModal
        isOpen={showBatchesModal}
        onClose={() => setShowBatchesModal(false)}
        batches={selectedBatches}
        productName={selectedProductName}
      />
    </div>
  );
}
