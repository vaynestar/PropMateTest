"use client";

import { QRCodeSVG } from "qrcode.react";

export default function VisitorQRCode({ value }: { value: string }) {
  return (
    <div className="bg-white p-2 rounded-lg shadow-sm border border-outline-variant inline-block">
      <QRCodeSVG
        value={value}
        size={80}
        bgColor={"#ffffff"}
        fgColor={"#000000"}
        level={"L"}
        includeMargin={false}
      />
    </div>
  );
}
