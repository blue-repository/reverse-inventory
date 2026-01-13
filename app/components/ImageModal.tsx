"use client";

import Image from "next/image";

type ImageModalProps = {
  imageUrl: string;
  productName: string;
  onClose: () => void;
};

export default function ImageModal({ imageUrl, productName, onClose }: ImageModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-4xl bg-white rounded-xl p-4 shadow-2xl my-8"
          onClick={(e) => e.stopPropagation()}
        >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-slate-900 p-2 text-white hover:bg-slate-700 transition-colors"
          aria-label="Cerrar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <h3 className="mb-4 text-base sm:text-lg font-semibold text-slate-900">{productName}</h3>
          <div className="relative h-[250px] sm:h-[350px] md:h-[450px] lg:h-[550px] w-full overflow-hidden rounded-lg">
            <Image
              src={imageUrl}
              alt={productName}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 896px"
            />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
