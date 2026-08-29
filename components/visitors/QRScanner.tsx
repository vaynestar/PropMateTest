"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";
import Image from "next/image";
import { scanVisitorQR, checkOutVisitorById } from "@/app/admin/visitors/scan-action";

type QRScannerProps = {
  onClose: () => void;
};

// Ultra-Resilient Multi-Pass QR Decoder for uploaded image files & screenshots
async function decodeQrFromImageFile(file: File): Promise<string | null> {
  // Pass 1: Native Hardware BarcodeDetector API
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const imageBitmap = await createImageBitmap(file);
      const barcodes = await barcodeDetector.detect(imageBitmap);
      if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fall through to canvas
    }
  }

  // Load image into HTML Image object
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = document.createElement("img");
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Pass 2: Full Original Resolution Scan with jsQR (inversion attempt: both)
  try {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (code && code.data) return code.data;
  } catch {}

  // Pass 3: Multi-Scale Resampling (Downscaling large 4K phone screenshots / photos)
  const maxDimensions = [1200, 800, 500];
  for (const maxDim of maxDimensions) {
    if (img.naturalWidth > maxDim || img.naturalHeight > maxDim) {
      try {
        const scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
        canvas.width = Math.floor(img.naturalWidth * scale);
        canvas.height = Math.floor(img.naturalHeight * scale);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code && code.data) return code.data;
      } catch {}
    }
  }

  // Pass 4: Center Region Crop (focusing on middle 70% of pass slip)
  try {
    const minSide = Math.min(img.naturalWidth, img.naturalHeight);
    const cropSize = Math.floor(minSide * 0.7);
    const cropX = Math.floor((img.naturalWidth - cropSize) / 2);
    const cropY = Math.floor((img.naturalHeight - cropSize) / 2);

    canvas.width = cropSize;
    canvas.height = cropSize;
    ctx.clearRect(0, 0, cropSize, cropSize);
    ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);
    const imgData = ctx.getImageData(0, 0, cropSize, cropSize);
    const code = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (code && code.data) return code.data;
  } catch {}

  return null;
}

export default function QRScanner({ onClose }: QRScannerProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);

  const [isPending, startTransition] = useTransition();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Verification states
  const [verifiedVisitor, setVerifiedVisitor] = useState<any | null>(null);
  const [scanResultType, setScanResultType] = useState<"CHECKED_IN" | "ALREADY_CHECKED_IN" | "CHECKED_OUT" | "EXPIRED" | null>(null);

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

  // Process scanned text
  const processDecodedText = async (decodedText: string) => {
    if (isHandlingScanRef.current) return;
    isHandlingScanRef.current = true;

    setErrorMessage(null);

    // Stop camera if running
    await stopCamera();

    startTransition(async () => {
      try {
        const res = await scanVisitorQR(decodedText);

        if (res.success && res.visitor) {
          setVerifiedVisitor(res.visitor);
          setScanResultType("CHECKED_IN");
        } else if (res.isAlreadyCheckedIn && res.visitor) {
          setVerifiedVisitor(res.visitor);
          setScanResultType("ALREADY_CHECKED_IN");
          setErrorMessage(res.error || "This QR pass was already used for check-in.");
        } else if (res.isAlreadyCheckedOut && res.visitor) {
          setVerifiedVisitor(res.visitor);
          setScanResultType("EXPIRED");
          setErrorMessage(res.error || "This single-entry visitor pass has already been completed.");
        } else {
          setErrorMessage(res.error || "Invalid or unrecognized visitor QR code.");
          isHandlingScanRef.current = false;
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to verify visitor QR pass in database.");
        isHandlingScanRef.current = false;
      }
    });
  };

  // Start live camera
  const startCamera = async (cameraIdOrFacing?: string | { facingMode: string }) => {
    setCameraError(null);
    setErrorMessage(null);

    try {
      if (!html5QrRef.current) {
        html5QrRef.current = new Html5Qrcode(scannerElementId);
      } else if (html5QrRef.current.isScanning) {
        await html5QrRef.current.stop();
      }

      try {
        const availableDevices = await Html5Qrcode.getCameras();
        if (availableDevices && availableDevices.length > 0) {
          setCameras(availableDevices);
        }
      } catch {
        // Fallback gracefully
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
          processDecodedText(decodedText);
        },
        () => {
          // Frame ignore
        }
      );

      setIsCameraActive(true);
      isHandlingScanRef.current = false;
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setIsCameraActive(false);
      setCameraError(
        "Camera stream unavailable or permission denied. Please grant camera permission or switch to upload mode."
      );
    }
  };

  // Auto-start camera when in 'camera' tab and no active modal result
  useEffect(() => {
    if (activeTab === "camera" && !verifiedVisitor) {
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
  }, [activeTab, verifiedVisitor]);

  // Flip Camera
  const handleFlipCamera = () => {
    if (cameras.length > 1) {
      const nextIndex = (currentCameraIndex + 1) % cameras.length;
      setCurrentCameraIndex(nextIndex);
      startCamera(cameras[nextIndex].id);
    }
  };

  // Image Upload File Handler (Multi-Engine)
  const handleImageFile = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    setErrorMessage(null);
    setUploadedPreview(URL.createObjectURL(file));

    startTransition(async () => {
      try {
        const decodedText = await decodeQrFromImageFile(file);

        if (decodedText) {
          await processDecodedText(decodedText);
        } else {
          setErrorMessage("Could not detect a QR code in this image. Please ensure the QR code is clearly visible.");
        }
      } catch (err: any) {
        console.error("QR File Decode Error:", err);
        setErrorMessage("Could not parse image. Please upload a clear QR pass screenshot.");
      }
    });
  };

  // Mark visitor as checked out
  const handleCheckOutNow = async () => {
    if (!verifiedVisitor?.visitor_id) return;
    setIsCheckingOut(true);
    try {
      const res = await checkOutVisitorById(verifiedVisitor.visitor_id);
      if (res.success && res.visitor) {
        setVerifiedVisitor(res.visitor);
        setScanResultType("CHECKED_OUT");
        setErrorMessage(null);
      } else {
        setErrorMessage(res.error || "Failed to process check-out.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process check-out.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Reset Scanner
  const handleScanNext = () => {
    setVerifiedVisitor(null);
    setScanResultType(null);
    setErrorMessage(null);
    setUploadedPreview(null);
    isHandlingScanRef.current = false;
    if (activeTab === "camera") {
      setTimeout(() => startCamera(), 150);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* PERSISTENT CAMERA SCANNER DOM CONTAINER */}
      <div className={activeTab === "camera" && !verifiedVisitor ? "block" : "hidden"}>
        <div className="relative w-full aspect-square max-w-[340px] mx-auto rounded-2xl overflow-hidden bg-black border border-outline-variant shadow-inner flex items-center justify-center">
          <div
            id={scannerElementId}
            className="w-full h-full object-cover [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
          />

          {/* Reticle HUD Overlay */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-full h-full max-w-[240px] max-h-[240px] border border-primary/30 rounded-xl overflow-hidden">
                <div className="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-primary rounded-tl" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-primary rounded-tr" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-primary rounded-bl" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-primary rounded-br" />
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-laser-sweep opacity-90 shadow-[0_0_12px_#d0bcff]" />
              </div>

              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/40 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>SCANNING ACTIVE</span>
              </div>
            </div>
          )}

          {/* Flip Camera */}
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

          {/* Initializing */}
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

          {/* Camera Error */}
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
      </div>

      {/* RESULT VIEW: VERIFIED, ALREADY CHECKED-IN, OR CHECKED OUT */}
      {verifiedVisitor ? (
        <div className="flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
          {/* 1. FRESH CHECK-IN SUCCESS */}
          {scanResultType === "CHECKED_IN" && (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                  </span>
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 block uppercase">
                      Access Granted
                    </span>
                    <span className="text-sm font-bold text-white">
                      Visitor Checked In
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {new Date(verifiedVisitor.check_in_time || Date.now()).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Details */}
              <VisitorDetailsCard visitor={verifiedVisitor} />
            </div>
          )}

          {/* 2. ALREADY CHECKED IN (Warning with Check-Out Option) */}
          {scanResultType === "ALREADY_CHECKED_IN" && (
            <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col gap-3.5 shadow-xl animate-in shake-1 duration-200">
              <div className="flex items-start justify-between pb-3 border-b border-amber-500/30 gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </span>
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 block uppercase">
                      ⚠️ QR Pass Already Used
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      Visitor is Currently Inside
                    </h3>
                    <p className="text-[11px] text-amber-200/90 mt-0.5">
                      Checked in at{" "}
                      {verifiedVisitor.check_in_time
                        ? new Date(verifiedVisitor.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "earlier today"}
                      . This QR pass cannot be used for entry again.
                    </p>
                  </div>
                </div>
              </div>

              {/* Visitor Details */}
              <VisitorDetailsCard visitor={verifiedVisitor} />

              {/* Action: Mark as Checked Out */}
              <div className="pt-2 border-t border-amber-500/20 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCheckOutNow}
                  disabled={isCheckingOut}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors pressable disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isCheckingOut ? "sync" : "logout"}
                  </span>
                  <span>{isCheckingOut ? "Processing Check-Out..." : "Check Out Visitor (Grant Exit Clearance)"}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. CHECKED OUT (Exit Complete) */}
          {scanResultType === "CHECKED_OUT" && (
            <div className="p-5 rounded-2xl bg-blue-950/40 border border-blue-500/40 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-blue-500/30">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                  </span>
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 block uppercase">
                      Exit Clearance Granted
                    </span>
                    <span className="text-sm font-bold text-white">
                      Visitor Checked Out
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {new Date(verifiedVisitor.check_out_time || Date.now()).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <VisitorDetailsCard visitor={verifiedVisitor} />
            </div>
          )}

          {/* 4. EXPIRED / COMPLETED */}
          {scanResultType === "EXPIRED" && (
            <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/50 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center gap-2.5 pb-3 border-b border-rose-500/30">
                <span className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">block</span>
                </span>
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-rose-400 block uppercase">
                    Pass Expired / Completed
                  </span>
                  <span className="text-sm font-bold text-white">
                    Entry Denied
                  </span>
                </div>
              </div>
              <p className="text-xs text-rose-200">
                This single-entry visitor pass has already been used and checked out. A new pass must be registered by the resident.
              </p>
              <VisitorDetailsCard visitor={verifiedVisitor} />
            </div>
          )}

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
        /* SCANNER INTERFACE */
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

          {/* TAB 2: UPLOAD IMAGE FILE DROPZONE */}
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
                    <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-outline-variant shadow-md">
                      <Image
                        src={uploadedPreview}
                        alt="Uploaded QR Preview"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
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
          {isPending && !verifiedVisitor && (
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium flex items-center justify-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined animate-spin text-[16px]">
                progress_activity
              </span>
              <span>Scanning & verifying QR code in database...</span>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && !verifiedVisitor && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">
                error
              </span>
              <span className="flex-1 font-medium">{errorMessage}</span>
            </div>
          )}

          <p className="text-[11px] text-center text-on-surface-variant/70">
            {activeTab === "camera"
              ? "Position the visitor's QR pass directly in front of the camera lens."
              : "Upload a photo or clear screenshot of the visitor access QR pass."}
          </p>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Visitor Details Grid
function VisitorDetailsCard({ visitor }: { visitor: any }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
      <div>
        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
          Visitor & Type
        </span>
        <span className="text-sm font-bold text-white">
          {visitor.visitor_name}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-semibold text-primary px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20">
            {visitor.visitor_type || "Resident Guest"}
          </span>
        </div>
        <span className="text-[11px] text-on-surface-variant font-mono block mt-0.5">
          IC: {visitor.visitor_ic_no || "N/A"}
        </span>
        {visitor.contact_no && (
          <span className="text-[11px] text-on-surface-variant block">
            📞 {visitor.contact_no}
          </span>
        )}
      </div>

      <div>
        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
          Destination / Area
        </span>
        <span className="text-sm font-bold text-white">
          {visitor.destination || (visitor.lease?.unit ? `Unit ${visitor.lease.unit.unit_number}` : "General Property")}
        </span>
        <span className="text-[11px] text-on-surface-variant truncate block mt-0.5">
          🏢 {visitor.property?.property_name || visitor.lease?.unit?.property?.property_name || "Testing Condominium"}
        </span>
        {visitor.lease?.tenant && (
          <span className="text-[11px] text-primary truncate block mt-0.5">
            Host: {visitor.lease.tenant.user_name}
          </span>
        )}
      </div>

      {visitor.vehicle_plate && (
        <div>
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
            Vehicle Plate
          </span>
          <span className="font-mono font-bold text-amber-300 px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant/40 inline-block">
            {visitor.vehicle_plate}
          </span>
        </div>
      )}

      {visitor.visit_purpose && (
        <div className={`${visitor.vehicle_plate ? "" : "col-span-2"} text-[11px] text-on-surface-variant bg-surface-container-high/60 p-2 rounded-lg border border-outline-variant/30`}>
          <span className="font-semibold text-on-surface">Purpose:</span>{" "}
          {visitor.visit_purpose}
        </div>
      )}
    </div>
  );
}
