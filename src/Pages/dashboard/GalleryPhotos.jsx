import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { Image, Plus, Trash2, X, AlertCircle, Sliders } from "lucide-react";

export const getPhotoPosition = (url) => {
  if (!url) return 50;
  const match = url.match(/#pos=([a-zA-Z0-9%_-]+)/);
  if (!match) return 50;
  const val = match[1];
  if (val === "top") return 15;
  if (val === "center") return 50;
  if (val === "bottom") return 85;
  const num = parseInt(val, 10);
  return isNaN(num) ? 50 : num;
};

export default function GalleryPhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [posPercent, setPosPercent] = useState(50); // Posisi vertikal (0 = atas, 100 = bawah)
  const [tableMissing, setTableMissing] = useState(false);

  // Edit existing photo position
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [editPosPercent, setEditPosPercent] = useState(50);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "PGRST205" || error.message?.includes("gallery_photos")) {
          setTableMissing(true);
        }
        console.warn("Supabase error:", error);
      } else if (data) {
        setPhotos(data);
        setTableMissing(false);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPosPercent(50); // Default tengah
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setSaving(true);
    try {
      const fileName = `${Date.now()}-${selectedFile.name.replace(/\s+/g, "-")}`;
      const { error: uploadError } = await supabase.storage
        .from("project-images")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("project-images")
        .getPublicUrl(fileName);

      // Simpan URL bersama posisi crop (#pos=X)
      const publicUrl = urlData.publicUrl;
      const finalUrl = `${publicUrl}#pos=${posPercent}`;

      const { error: insertError } = await supabase
        .from("gallery_photos")
        .insert([{ image_url: finalUrl }]);

      if (insertError) throw insertError;

      await fetchPhotos();
      setModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setPosPercent(50);
    } catch (err) {
      console.error("Error adding photo:", err);
      alert(
        `Gagal menambahkan foto: ${
          err.message || "Unknown error"
        }.\n\nPastikan tabel 'gallery_photos' dan bucket storage 'project-images' sudah dibuat di Supabase.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePosition = async (e) => {
    e.preventDefault();
    if (!editingPhoto) return;

    setSaving(true);
    try {
      const cleanUrl = editingPhoto.image_url.replace(/#pos=[^#]*/, "");
      const newUrl = `${cleanUrl}#pos=${editPosPercent}`;

      const { error } = await supabase
        .from("gallery_photos")
        .update({ image_url: newUrl })
        .eq("id", editingPhoto.id);

      if (error) throw error;

      await fetchPhotos();
      setEditingPhoto(null);
      alert("✅ Posisi foto berhasil diperbarui!");
    } catch (err) {
      console.error("Error updating position:", err);
      alert(`Gagal menyimpan posisi: ${err.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (photo) => {
    if (!window.confirm("Yakin ingin menghapus foto ini?")) return;

    try {
      let query = supabase.from("gallery_photos").delete();
      if (photo.id) query = query.eq("id", photo.id);
      else if (photo.image_url) query = query.eq("image_url", photo.image_url);

      const { error } = await query;
      if (error) throw error;
      await fetchPhotos();
    } catch (err) {
      console.error("Error deleting photo:", err);
      alert(`Gagal menghapus foto: ${err.message || "Unknown error"}`);
    }
  };

  return (
    <div className="relative z-50 space-y-6 w-full h-full min-h-[500px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Image className="w-6 h-6 text-blue-400" />
            Gallery Photos
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Kelola foto-foto untuk 3D Coverflow Carousel di halaman utama. Kamu bisa mengatur posisi fokus foto agar kepala/badan tidak terpotong.
          </p>
        </div>
        <button
          onClick={() => {
            setModalOpen(true);
            setPosPercent(50);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 font-medium text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Photo
        </button>
      </div>

      {/* Info jika tabel belum ada */}
      {tableMissing && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Tabel Supabase 'gallery_photos' belum dibuat</p>
            <p className="text-xs text-amber-200/80 mt-1">
              Saat ini carousel di halaman depan menampilkan foto demo fallback. Untuk menyimpan foto sendiri ke Supabase, jalankan SQL berikut di Supabase SQL Editor:
            </p>
            <pre className="mt-2 p-2.5 bg-black/40 rounded-lg text-xs font-mono text-amber-100 overflow-x-auto select-all">
{`CREATE TABLE public.gallery_photos (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select" ON public.gallery_photos FOR SELECT TO public USING (true);
CREATE POLICY "Auth insert" ON public.gallery_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth delete" ON public.gallery_photos FOR DELETE TO authenticated USING (true);`}
            </pre>
          </div>
        </div>
      )}

      {/* Grid Photos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-50">
        {loading ? (
          <p className="text-gray-400 col-span-full">Loading photos...</p>
        ) : photos.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white/5 border border-white/10 rounded-2xl">
            <Image className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Belum ada foto yang diupload.</p>
            <p className="text-gray-500 text-sm mt-1">
              (Halaman utama saat ini menampilkan foto demo kenangan secara default).
            </p>
          </div>
        ) : (
          photos.map((photo, idx) => {
            const currentPos = getPhotoPosition(photo.image_url);
            return (
              <div key={photo.id || idx} className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3c84f6] to-[#06b6d4] rounded-2xl blur opacity-10 group-hover:opacity-25 transition duration-500" />
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/12 rounded-2xl h-full p-4 flex flex-col">
                  {/* Square Aspect Ratio - Sesuai Tampilan Carousel di Web */}
                  <div className="w-full aspect-square rounded-xl mb-4 border border-white/10 overflow-hidden bg-white/5 relative">
                    <img
                      src={photo.image_url}
                      alt="Gallery Photo"
                      className="w-full h-full object-cover transition-[object-position] duration-300"
                      style={{ objectPosition: `center ${currentPos}%` }}
                      onError={(e) => {
                        e.target.src =
                          "https://via.placeholder.com/400x400?text=Image+Error";
                      }}
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md border border-white/10 text-[10px] text-gray-300 font-mono">
                      Posisi: {currentPos}%
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 mt-auto">
                    <button
                      onClick={() => {
                        setEditingPhoto(photo);
                        setEditPosPercent(currentPos);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20 text-xs font-medium cursor-pointer"
                      title="Atur Posisi Fokus Foto"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Atur Posisi</span>
                    </button>

                    <button
                      onClick={() => handleDelete(photo)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20 cursor-pointer"
                      title="Delete photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Photo */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-[#0a0a1a] border border-white/10 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Add New Photo</h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-blue-300/70 uppercase tracking-wider font-medium">
                  Upload Photo
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-[#0d0d22] border border-white/10 border-dashed rounded-xl px-4 py-6 text-center transition-all group-hover:border-blue-500/50 group-hover:bg-blue-500/5 flex flex-col items-center justify-center gap-2">
                    <Image className="w-8 h-8 text-gray-500 group-hover:text-blue-400 transition-colors" />
                    <p className="text-sm text-gray-400 group-hover:text-blue-300">
                      {selectedFile
                        ? selectedFile.name
                        : "Klik atau seret file gambar ke sini"}
                    </p>
                  </div>
                </div>
              </div>

              {previewUrl && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs text-blue-300/70 uppercase tracking-wider font-medium flex justify-between items-center">
                    <span>Pratinjau Posisi (Square 1:1)</span>
                    <span className="text-blue-400 font-mono font-semibold">{posPercent}%</span>
                  </label>

                  {/* Square Box Preview (Mirip Carousel Asli) */}
                  <div className="w-full max-w-[260px] mx-auto rounded-2xl border-2 border-blue-500/30 overflow-hidden bg-black/40 aspect-square relative shadow-lg">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover transition-[object-position] duration-150"
                      style={{ objectPosition: `center ${posPercent}%` }}
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPosPercent(15)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        posPercent <= 25
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      ⬆️ Atas / Wajah
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosPercent(50)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        posPercent > 25 && posPercent < 75
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      🎯 Tengah
                    </button>
                    <button
                      type="button"
                      onClick={() => setPosPercent(85)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        posPercent >= 75
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      ⬇️ Bawah / Kaki
                    </button>
                  </div>

                  {/* Fine-tuning Slider */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>Atas (0%)</span>
                      <span className="text-gray-300 font-medium">Geser untuk pas-kan posisi</span>
                      <span>Bawah (100%)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={posPercent}
                      onChange={(e) => setPosPercent(Number(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors text-sm font-medium border border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Uploading..." : "Save Photo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Existing Photo Position */}
      {editingPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingPhoto(null)}
          />
          <div className="relative w-full max-w-lg bg-[#0a0a1a] border border-white/10 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingPhoto(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-400" />
              Atur Posisi Fokus Foto
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Sesuaikan posisi crop agar kepala/wajah atau bagian penting tidak terpotong saat tampil di website.
            </p>

            <form onSubmit={handleUpdatePosition} className="space-y-4">
              <div className="space-y-3">
                <label className="text-xs text-blue-300/70 uppercase tracking-wider font-medium flex justify-between items-center">
                  <span>Pratinjau Tampilan (Square 1:1)</span>
                  <span className="text-blue-400 font-mono font-semibold">{editPosPercent}%</span>
                </label>

                {/* Square Box Preview (Mirip Carousel Asli) */}
                <div className="w-full max-w-[280px] mx-auto rounded-2xl border-2 border-blue-500/30 overflow-hidden bg-black/40 aspect-square relative shadow-lg">
                  <img
                    src={editingPhoto.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover transition-[object-position] duration-150"
                    style={{ objectPosition: `center ${editPosPercent}%` }}
                  />
                </div>

                {/* Quick Preset Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditPosPercent(15)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                      editPosPercent <= 25
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    ⬆️ Atas / Wajah
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPosPercent(50)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                      editPosPercent > 25 && editPosPercent < 75
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    🎯 Tengah
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPosPercent(85)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                      editPosPercent >= 75
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    ⬇️ Bawah / Kaki
                  </button>
                </div>

                {/* Fine-tuning Slider */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Atas (0%)</span>
                    <span className="text-gray-300 font-medium">Geser untuk naik/turun</span>
                    <span>Bawah (100%)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editPosPercent}
                    onChange={(e) => setEditPosPercent(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors text-sm font-medium border border-white/10 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 text-sm font-medium disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Posisi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

