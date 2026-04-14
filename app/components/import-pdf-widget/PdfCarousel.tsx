"use client";

import { useEffect, useMemo } from "react";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { PdfSummary } from "@/app/components/import-pdf-widget/types";
import { PdfCard } from "@/app/components/import-pdf-widget/PdfCard";
import { Button } from "@/app/components/ui/button";

interface PdfCarouselProps {
  items: PdfSummary[];
  activePdfId: string | null;
  onSelectPdf: (pdfId: string | null) => void;
  onRemovePdf: (pdfId: string) => void;
  onOpenPdf: (pdfId: string) => void;
  onToggleExpanded: () => void;
  onMinimize: () => void;
  isExpanded: boolean;
  onAddMore: () => void;
}

export function PdfCarousel({
  items,
  activePdfId,
  onSelectPdf,
  onRemovePdf,
  onOpenPdf,
  onToggleExpanded,
  onMinimize,
  isExpanded,
  onAddMore,
}: PdfCarouselProps) {
  const initialIndex = useMemo(() => {
    if (!activePdfId) return 0;
    const idx = items.findIndex((item) => item.id === activePdfId);
    return idx >= 0 ? idx : 0;
  }, [activePdfId, items]);

  const [sliderRef, slider] = useKeenSlider<HTMLDivElement>({
    initial: initialIndex,
    mode: "free-snap",
    slides: {
      perView: "auto",
      spacing: 12,
    },
  });

  useEffect(() => {
    if (!slider.current) return;
    slider.current.moveToIdx(initialIndex);
  }, [initialIndex, slider]);

  const onWheelScroll: React.WheelEventHandler<HTMLDivElement> = (event) => {
    if (!slider.current) return;
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    slider.current.moveToIdx(slider.current.track.details.abs + direction);
  };

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur">
        <h3 className="text-sm font-semibold text-slate-900">Carrusel de PDFs</h3>
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="outline" onClick={onMinimize} title="Minimizar">
            <Minus className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={onToggleExpanded}>
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onSelectPdf(null)}>
            Ver todos
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={() => slider.current?.prev()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={() => slider.current?.next()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={sliderRef} className="keen-slider p-3" onWheel={onWheelScroll}>
        {items.map((pdf) => (
          <div className="keen-slider__slide !w-[170px] !min-w-[170px] !max-w-[170px] !shrink-0" key={pdf.id}>
            <PdfCard
              pdf={pdf}
              isActive={activePdfId === pdf.id}
              onClick={() => onSelectPdf(activePdfId === pdf.id ? null : pdf.id)}
              onRemove={() => onRemovePdf(pdf.id)}
              onOpen={() => onOpenPdf(pdf.id)}
            />
          </div>
        ))}
        {/* Card para agregar más PDFs */}
        <div className="keen-slider__slide !w-[170px] !min-w-[170px] !max-w-[170px] !shrink-0" key="add-more">
          <button
            type="button"
            onClick={onAddMore}
            className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-slate-400 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-500"
            title="Agregar más archivos PDF"
          >
            <Plus className="h-8 w-8" />
            <span className="text-xs font-medium">Agregar PDFs</span>
          </button>
        </div>
      </div>
    </div>
  );
}
