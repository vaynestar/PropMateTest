import { notFound } from "next/navigation";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { QRCodeSVG } from "qrcode.react";
import PrintHelper from "../../invoice/[id]/PrintHelper";
import VisitorPrintToolbar from "./VisitorPrintToolbar";

export default async function PrintVisitorPassPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const visitorId = resolvedParams.id;

  const visitor = await prisma.visitor.findUnique({
    where: { visitor_id: visitorId },
    include: {
      property: true,
      lease: {
        include: {
          unit: { include: { property: true } },
          tenant: { select: { user_name: true, phone_number: true } },
        },
      },
    },
  });

  if (!visitor) {
    notFound();
  }

  const property =
    visitor.property ||
    visitor.lease?.unit?.property || {
      property_name: "PropMate Management",
      address: "100 Jalan Ampang",
      city: "Kuala Lumpur",
      state: "Wilayah Persekutuan",
      postal_code: "50450",
      country: "Malaysia",
    };

  const formattedVisitDate = visitor.visit_date
    ? new Date(visitor.visit_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Valid Today";

  const destination =
    visitor.destination ||
    (visitor.lease?.unit ? `Unit ${visitor.lease.unit.unit_number}` : "General Property");

  return (
    <div className="max-w-[180mm] mx-auto bg-white text-black p-8 min-h-screen text-xs font-sans print:p-0 print:max-w-full">
      <PrintHelper />

      {/* Screen-Only Control Toolbar */}
      <VisitorPrintToolbar />

      {/* Printable Physical Pass Card Frame */}
      <div className="border-2 border-dashed border-gray-400 p-6 rounded-2xl bg-white shadow-sm print:shadow-none print:border-black">
        {/* Pass Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="PropMate Logo"
              width={48}
              height={48}
              className="w-12 h-12 object-contain rounded-lg"
            />
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-gray-900 leading-none">
                {property.property_name}
              </h1>
              <p className="text-gray-600 text-[11px] mt-0.5">
                {property.address ? `${property.address}, ` : ""}
                {property.city || "Kuala Lumpur"}, {property.state || "MY"}
              </p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest rounded">
                Official Access Permit
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-gray-500 uppercase block font-semibold">
              Pass ID
            </span>
            <span className="font-mono text-xs font-bold text-gray-900">
              #{visitor.visitor_id.substring(0, 8).toUpperCase()}
            </span>
            <div className="mt-1 font-semibold text-[11px] text-emerald-700">
              ● {visitor.status?.toUpperCase() || "APPROVED"}
            </div>
          </div>
        </div>

        {/* Center QR Code & Primary Badge */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4 px-2 border-b border-gray-200 mb-4 bg-gray-50/80 rounded-xl print:bg-transparent">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Classification
            </span>
            <span className="text-lg font-black text-gray-900 mt-0.5">
              {visitor.visitor_type || "Resident Guest"}
            </span>
            <div className="text-xs font-semibold text-indigo-700 mt-1">
              Destination: <span className="text-gray-900 font-bold">{destination}</span>
            </div>
            <div className="text-[11px] text-gray-600 mt-1">
              Authorized Date: <span className="font-bold text-gray-900">{formattedVisitDate}</span>
            </div>
          </div>

          <div className="flex flex-col items-center p-3 bg-white border border-gray-300 rounded-xl shadow-xs print:border-black">
            <QRCodeSVG
              value={visitor.visitor_id}
              size={130}
              level="H"
              includeMargin={false}
            />
            <span className="text-[9px] font-mono font-bold text-gray-600 mt-1.5 tracking-wider">
              SCAN AT BOOM GATE
            </span>
          </div>
        </div>

        {/* Detailed Particulars Table */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs mb-5">
          <div className="border-b border-gray-100 pb-1.5">
            <span className="text-gray-500 text-[10px] uppercase font-bold block">
              Visitor / Contractor Name
            </span>
            <span className="font-bold text-gray-900 text-sm">{visitor.visitor_name}</span>
          </div>

          <div className="border-b border-gray-100 pb-1.5">
            <span className="text-gray-500 text-[10px] uppercase font-bold block">
              IC / Passport Number
            </span>
            <span className="font-mono font-bold text-gray-900">{visitor.visitor_ic_no}</span>
          </div>

          <div className="border-b border-gray-100 pb-1.5">
            <span className="text-gray-500 text-[10px] uppercase font-bold block">
              Contact Phone
            </span>
            <span className="font-medium text-gray-800">{visitor.contact_no || "N/A"}</span>
          </div>

          <div className="border-b border-gray-100 pb-1.5">
            <span className="text-gray-500 text-[10px] uppercase font-bold block">
              Vehicle Registration No.
            </span>
            <span className="font-mono font-bold text-gray-900">
              {visitor.vehicle_plate || "Walk-in / None"}
            </span>
          </div>

          {visitor.lease?.tenant && (
            <div className="border-b border-gray-100 pb-1.5">
              <span className="text-gray-500 text-[10px] uppercase font-bold block">
                Resident Host
              </span>
              <span className="font-medium text-gray-900">
                {visitor.lease.tenant.user_name}
                {visitor.lease.tenant.phone_number ? ` (${visitor.lease.tenant.phone_number})` : ""}
              </span>
            </div>
          )}

          {visitor.visit_purpose && (
            <div className={`${visitor.lease?.tenant ? "" : "col-span-2"} border-b border-gray-100 pb-1.5`}>
              <span className="text-gray-500 text-[10px] uppercase font-bold block">
                Visit Purpose / Work Scope
              </span>
              <span className="font-medium text-gray-800">{visitor.visit_purpose}</span>
            </div>
          )}
        </div>

        {/* Security Rules & Terms */}
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-[10px] text-gray-600 mb-4 print:bg-transparent print:border-gray-300">
          <span className="font-bold text-gray-800 block mb-1">
            SECURITY & BUILDING ACCESS REGULATIONS:
          </span>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Pass must be presented to Security Guard upon entry and exit.</li>
            <li>Park only in designated visitor parking bays. Clamping penalty applies for unauthorized bays.</li>
            <li>Contractors must wear appropriate PPE and register at Guardhouse before commencing work.</li>
            <li>This digital pass is non-transferable and valid strictly for authorized areas.</li>
          </ul>
        </div>

        {/* Guard Verification Box */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t-2 border-gray-200 text-[10px]">
          <div className="border border-gray-300 rounded p-2 text-center h-16 flex flex-col justify-between">
            <span className="text-gray-500 font-semibold uppercase">Guard Entry Stamp / Sign</span>
            <span className="text-gray-400">Date & Time: __________________</span>
          </div>
          <div className="border border-gray-300 rounded p-2 text-center h-16 flex flex-col justify-between">
            <span className="text-gray-500 font-semibold uppercase">Guard Exit Clearance</span>
            <span className="text-gray-400">Date & Time: __________________</span>
          </div>
        </div>
      </div>
    </div>
  );
}
