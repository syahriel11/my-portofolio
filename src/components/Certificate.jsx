import React, { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Maximize2, X, FileText, ExternalLink } from "lucide-react"
import { isPdfFile } from "../utils/pdfHelper"

const Certificate = ({ ImgSertif }) => {
  const [open, setOpen] = useState(false)
  const isPdf = isPdfFile(ImgSertif)

  const handleOpen = () => setOpen(true)
  const handleClose = useCallback(() => setOpen(false), [])

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === "Escape") handleClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, handleClose])

  // Cegah scroll saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <div className="w-full">
      {/* Thumbnail */}
      <div
        className="relative overflow-hidden rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)]"
        onClick={handleOpen}
      >
        {/* Dark overlay on top of image */}
        <div className="absolute inset-0 bg-black/10 z-[1] pointer-events-none" />

        <div 
          className="w-full bg-gray-900 flex items-center justify-center overflow-hidden"
          style={{ aspectRatio: "4/3" }}
        >
          {isPdf ? (
            <div className="w-full h-full bg-gradient-to-br from-[#0c0d24] to-[#15173c] flex flex-col items-center justify-center p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-7 h-7 text-red-400" />
              </div>
              <span className="text-xs font-semibold text-gray-200">
                Dokumen PDF
              </span>
              <span className="text-[11px] text-gray-400 mt-1">
                Klik untuk melihat
              </span>
            </div>
          ) : (
            <img
              src={ImgSertif}
              alt="Certificate"
              loading="lazy"
              className="certificate-image w-full h-full object-cover transition-[filter] duration-300"
              style={{
                filter: "contrast(1.10) brightness(0.9) saturate(1.1)",
              }}
            />
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[2] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-white text-center transition-all duration-400 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100">
            <Maximize2 className="w-10 h-10 drop-shadow-md" />
            <span className="text-base font-semibold drop-shadow-md">
              {isPdf ? "View PDF Certificate" : "View Certificate"}
            </span>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(5px)" }}
          onClick={handleClose}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full text-white bg-black/60 hover:bg-black/80 hover:scale-110 transition-all duration-200"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {isPdf ? (
            <div 
              className="w-full max-w-4xl h-[85vh] flex flex-col bg-[#0a0a1a] border border-white/15 rounded-2xl overflow-hidden shadow-2xl p-3"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`${ImgSertif}#toolbar=1`}
                title="Certificate PDF"
                className="w-full flex-1 rounded-xl bg-white border border-white/10"
              />
              <div className="mt-3 flex items-center justify-end gap-3 px-1">
                <a
                  href={ImgSertif}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg"
                >
                  <ExternalLink className="w-4 h-4" /> Buka di Tab Baru / Download
                </a>
              </div>
            </div>
          ) : (
            <img
              src={ImgSertif}
              alt="Certificate Full View"
              className="max-w-full max-h-[90vh] object-contain mx-auto rounded-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>,
        document.body
      )}
    </div>
  )
}

export default Certificate
