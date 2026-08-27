"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { checkInVisitorByQR } from "@/app/admin/visitors/scan-action";

type QRScannerProps = {
  onClose: () => void;
};

export default function QRScanner({ onClose }: QRScannerProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkedInVisitor, setCheckedInVisitor] = useState<any | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const isHandlingScanRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scannerElementId = "pm-visitor-qr-viewfinder";

  // Stop camera helper
  const stopCamera = async () => {
    if (html5QrRef.current) {
      try {
        if (html5QrRef.current.isScanning) {
          await html5QrRef.current.stop();
        }
        await html5QrRef.current.clear();
      } catch (err) {
        console.warn("Error stopping QR camera:", err);
      }
      setIsCameraActive(false);
    }
  };

  // Process scanned text (from camera or image file)
  const handleDecodedText = (decodedText: string) => {
    if (isHandlingScanRef.current) return;
    isHandlingScanRef.current = true;

    setErrorMessage(null);
    startTransition(async () => {
      // Pause/Stop camera to lock on current frame
      await stopCamera();

      const res = await checkInVisitorByQR(decodedText);
      if (res.success && res.visitor) {
        setCheckedInVisitor(res.visitor);
      } else {
        setErrorMessage(res.error || "Failed to check in visitor.");
        isHandlingScanRef.current = false;
      }
    });
  };

  // Start camera on given camera ID or environment mode
  const startCamera = async (cameraIdOrFacing?: string | { facingMode: string }) => {
    setCameraError(null);
    setErrorMessage(null);

    try {
      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode(scannerElementId);
      } else if (html5QrRef.current.isScanning) {
        await html5QrRef.current.stop();
      }

      // Query available camera devices once
      try {
        const availableDevices = await Html5Qrcode.getCameras();
        if (availableDevices && availableDevices.length > 0) {
          setCameras(availableDevices);
        }
      } catch {
        // Fallback gracefully if enumeration is restricted
      }

      const cameraConfig = cameraIdOrFacing || { facingMode: "environment" };

      await html5QrRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.max(180, Math.floor(minEdge * 0.72));
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedText(decodedText);
        },
        () => {
          // Frame fail - ignore
        }
      );

      setIsCameraActive(true);
      isHandlingScanRef.current = false;
    } catch (err: any) {
      console.warn("Camera auto-start error:", err);
      setIsCameraActive(false);
      setCameraError(
        "Camera stream unavailable or permission denied. Please grant camera permission or switch to upload mode."
      );
    }
  };

  // Auto-start camera when in 'camera' tab and no active visitor pass
  useEffect(() => {
    if (activeTab === "camera" && !checkedInVisitor) {
      // Small timeout to ensure DOM container is mounted
      const t = setTimeout(() => {
        startCamera();
      }, 100);
      return () => {
        clearTimeout(t);
        stopCamera();
      };
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, checkedInVisitor]);

  // Flip Camera (if multiple cameras exist)
  const handleFlipCamera = () => {
    if (cameras.length > 1) {
      const nextIndex = (currentCameraIndex + 1) % cameras.length;
      setCurrentCameraIndex(nextIndex);
      startCamera(cameras[nextIndex].id);
    }
  };

  // Image Upload File Handler
  const handleImageFile = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    setErrorMessage(null);
    setUploadedPreview(URL.createObjectURL(file));

    startTransition(async () => {
      try {
        if (!html5QrRef.current) {
          html5QrRef.current = new Html5Qrcode(scannerElementId);
        }
        const decodedText = await html5QrRef.current.scanFile(file, false);
        handleDecodedText(decodedText);
      } catch (err: any) {
        setErrorMessage("No valid QR code was detected in the uploaded image. Please try a clearer screenshot.");
      }
    });
  };

  // Reset Scanner for Next Visitor
  const handleScanNext = () => {
    setCheckedInVisitor(null);
    setErrorMessage(null);
    setUploadedPreview(null);
    isHandlingScanRef.current = false;
    if (activeTab === "camera") {
      setTimeout(() => startCamera(), 150);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* SUCCESS STATE: VERIFIED VISITOR PASS CARD */}
      {checkedInVisitor ? (
        <div className="flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col gap-3 shadow-lg">
            {/* Header Status */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </span>
                <div>
                  <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 block uppercase">
                    Access Granted
                  </span>
                  <span className="text-sm font-bold text-white">
                    Visitor Checked In
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {new Date(checkedInVisitor.check_in_time || Date.now()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Visitor & Destination Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
                  Visitor Name
                </span>
                <span className="text-sm font-bold text-white">
                  {checkedInVisitor.visitor_name}
                </span>
                <span className="text-[11px] text-on-surface-variant font-mono block mt-0.5">
                  IC: {checkedInVisitor.visitor_ic_no || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
                  Destination Unit
                </span>
                <span className="text-sm font-bold text-primary">
                  Unit {checkedInVisitor.lease?.unit?.unit_number || "N/A"}
                </span>
                <span className="text-[11px] text-on-surface-variant truncate block mt-0.5" title={checkedInVisitor.lease?.unit?.property?.property_name}>
                  🏢 {checkedInVisitor.lease?.unit?.property?.property_name || "Testing"}
                </span>
              </div>

              {checkedInVisitor.lease?.tenant && (
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
                    Host Resident
                  </span>
                  <span className="font-semibold text-white">
                    {checkedInVisitor.lease.tenant.user_name}
                  </span>
                </div>
              )}

              {checkedInVisitor.vehicle_plate && (
                <div>
                  <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
                    Vehicle Plate
                  </span>
                  <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/40 inline-block">
                    {checkedInVisitor.vehicle_plate}
                  </span>
                </div>
              )}

              {checkedInVisitor.visit_purpose && (
                <div className="col-span-2 text-[11px] text-on-surface-variant bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/30">
                  <span className="font-semibold text-on-surface">Purpose:</span>{" "}
                  {checkedInVisitor.visit_purpose}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleScanNext}
              className="flex-1 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors pressable"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                qr_code_scanner
              </span>
              <span>Scan Next Visitor</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-primary py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-all pressable flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        /* SCANNING INTERFACE */
        <div className="flex flex-col gap-3">
          {/* Dual-Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/40">
            <button
              type="button"
              onClick={() => {
                setActiveTab("camera");
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "camera"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">photo_camera</span>
              <span>Live Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("upload");
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "upload"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">cloud_upload</span>
              <span>Upload Image</span>
            </button>
          </div>

          {/* TAB 1: LIVE CAMERA SCANNER */}
          {activeTab === "camera" && (
            <div className="relative w-full aspect-square max-w-[340px] mx-auto rounded-2xl overflow-hidden bg-black border border-outline-variant shadow-inner flex items-center justify-center">
              {/* HTML5 QR Code Hidden Target (Headless Container) */}
              <div
                id={scannerElementId}
                className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
              />

              {/* Viewfinder Security Reticle HUD Overlay */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                  {/* Square HUD Frame */}
                  <div className="relative w-full h-full max-w-[240px] max-h-[240px] border border-primary/30 rounded-xl overflow-hidden">
                    {/* Glowing Corner Brackets */}
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-primary rounded-tl" />
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-primary rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-primary rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-primary rounded-br" />

                    {/* Animated Laser Scanning Line */}
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-laser-sweep opacity-90 shadow-[0_0_12px_#d0bcff]" />
                  </div>

                  {/* Top Live Status Pill */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>SCANNING ACTIVE</span>
                  </div>
                </div>
              )}

              {/* Camera Controls Overlay (Top Right Flip Button) */}
              {isCameraActive && cameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-black/70 border border-outline-variant text-white flex items-center justify-center hover:bg-black transition-colors"
                  title="Switch Camera"
                >
                  <span className="material-symbols-outlined text-[18px]">flip_camera_ios</span>
                </button>
              )}

              {/* Camera Initializing / Error State */}
              {!isCameraActive && !cameraError && (
                <div className="absolute inset-0 bg-surface-container-lowest/90 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary animate-spin-slow">
                    progress_activity
                  </span>
                  <span className="text-xs font-semibold text-white">
                    Accessing Camera...
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Please allow camera permissions if prompted.
                  </span>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 bg-surface-container-lowest/95 p-6 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">videocam_off</span>
                  </div>
                  <p className="text-xs text-rose-300 font-medium leading-relaxed">
                    {cameraError}
                  </p>
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant hover:border-primary text-xs text-white font-medium flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                    <span>Retry Camera</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE FILE */}
          {activeTab === "upload" && (
            <div className="flex flex-col gap-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const files = e.dataTransfer.files;
                  if (files && files[0]) {
                    handleImageFile(files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full aspect-4/3 max-w-[340px] mx-auto rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-primary bg-primary/10"
                    : "border-outline-variant/60 hover:border-primary/50 bg-surface-container-lowest"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {uploadedPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={uploadedPreview}
                      alt="Uploaded QR Preview"
                      className="w-28 h-28 object-contain rounded-lg border border-outline-variant shadow-md"
                    />
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">image</span>
                      <span>Change Image</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px]">qr_code_2</span>
                    </div>
                    <span className="text-xs font-semibold text-white">
                      Drag & Drop QR Image / Screenshot
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      or click to browse files from device
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Decode Indicator */}
          {isPending && !checkedInVisitor && (
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin-slow text-[16px]">
                progress_activity
              </span>
              <span>Verifying visitor pass in database...</span>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                error
              </span>
              <span className="flex-1 font-medium">{errorMessage}</span>
            </div>
          )}

          <p className="text-[11px] text-center text-on-surface-variant/70">
            {activeTab === "camera"
              ? "Position the visitor's QR pass directly in front of the lens."
              : "Upload a photo or clear screenshot of the resident's generated QR pass."}
          </p>
        </div>
      )}
    </div>
  );
}
