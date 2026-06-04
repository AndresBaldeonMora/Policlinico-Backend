import PDFDocument from "pdfkit";

export interface CitaResumen {
  fecha: string;       // ISO date
  hora?: string;
  tipo: string;
  estado: string;
  doctor?: string;
  especialidad?: string;
}

export interface DatosRecordatorio {
  paciente: { nombres: string; apellidos: string; dni: string };
  citas: CitaResumen[];
}

const teal     = "#0d9488";
const dark     = "#1f2937";
const gray     = "#6b7280";
const border   = "#e5e7eb";
const rowAlt   = "#f9fafb";

const TIPO_LABEL: Record<string, string> = {
  CONSULTA:      "Consulta",
  LABORATORIO:   "Laboratorio",
  REMOTA:        "Teleconsulta",
  DOMICILIO:     "Domicilio",
  INTERCONSULTA: "Interconsulta",
};

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:    "Pendiente",
  ASISTIO:      "Asistió",
  ATENDIDA:     "Atendida",
  CANCELADA:    "Cancelada",
  REPROGRAMADA: "Reprogramada",
};

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });

export const generarPDFRecordatorio = (datos: DatosRecordatorio): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left  = 50;
    const pageW = doc.page.width - 100;

    // ── Encabezado ──────────────────────────────────────────────────────────
    doc.rect(left, 50, pageW, 60).fill(teal);
    doc.fontSize(16).fillColor("#ffffff").font("Helvetica-Bold")
      .text("Policlínico Parroquial San José", left, 62, { align: "center", width: pageW });
    doc.fontSize(10).font("Helvetica")
      .text("Recordatorio de Citas Médicas", left, 83, { align: "center", width: pageW });

    // ── Datos del paciente ───────────────────────────────────────────────────
    let y = 130;
    doc.rect(left, y, pageW, 50).fillAndStroke("#f0fdfa", border);
    doc.fontSize(10).fillColor(dark).font("Helvetica-Bold")
      .text("Paciente:", left + 10, y + 8);
    doc.font("Helvetica")
      .text(`${datos.paciente.nombres} ${datos.paciente.apellidos}`, left + 70, y + 8);
    doc.font("Helvetica-Bold").text("DNI:", left + 10, y + 26);
    doc.font("Helvetica").text(datos.paciente.dni, left + 70, y + 26);
    doc.font("Helvetica-Bold").text("Fecha de emisión:", left + 200, y + 8);
    doc.font("Helvetica")
      .text(new Date().toLocaleDateString("es-PE", { timeZone: "America/Lima" }), left + 310, y + 8);

    // ── Título tabla ─────────────────────────────────────────────────────────
    y += 65;
    doc.fontSize(12).font("Helvetica-Bold").fillColor(dark)
      .text("Listado de Citas", left, y);
    y += 18;

    // ── Cabecera de la tabla ──────────────────────────────────────────────────
    const cols = { fecha: 0, hora: 110, tipo: 160, estado: 225, doctor: 295 };
    const colW = { fecha: 105, hora: 45, tipo: 60, estado: 65, doctor: pageW - 295 };
    const rowH = 20;

    doc.rect(left, y, pageW, rowH).fill(teal);
    doc.fontSize(9).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("Fecha",       left + cols.fecha  + 4, y + 5, { width: colW.fecha  });
    doc.text("Hora",        left + cols.hora   + 4, y + 5, { width: colW.hora   });
    doc.text("Tipo",        left + cols.tipo   + 4, y + 5, { width: colW.tipo   });
    doc.text("Estado",      left + cols.estado + 4, y + 5, { width: colW.estado });
    doc.text("Médico / Ref.", left + cols.doctor + 4, y + 5, { width: colW.doctor });
    y += rowH;

    // ── Filas ─────────────────────────────────────────────────────────────────
    doc.fontSize(8).font("Helvetica").fillColor(dark);
    datos.citas.forEach((c, i) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }
      const bg = i % 2 === 0 ? "#ffffff" : rowAlt;
      doc.rect(left, y, pageW, rowH).fillAndStroke(bg, border);
      doc.fillColor(dark);
      doc.text(fmtFecha(c.fecha),                     left + cols.fecha  + 4, y + 5, { width: colW.fecha  });
      doc.text(c.hora ?? "—",                          left + cols.hora   + 4, y + 5, { width: colW.hora   });
      doc.text(TIPO_LABEL[c.tipo]   ?? c.tipo,         left + cols.tipo   + 4, y + 5, { width: colW.tipo   });
      doc.text(ESTADO_LABEL[c.estado] ?? c.estado,     left + cols.estado + 4, y + 5, { width: colW.estado });
      const docText = c.doctor
        ? `${c.doctor}${c.especialidad ? ` — ${c.especialidad}` : ""}`
        : c.especialidad ?? "—";
      doc.text(docText, left + cols.doctor + 4, y + 5, { width: colW.doctor });
      y += rowH;
    });

    if (datos.citas.length === 0) {
      doc.rect(left, y, pageW, rowH).fillAndStroke("#ffffff", border);
      doc.fillColor(gray).text("No hay citas registradas.", left + 4, y + 5, { width: pageW });
      y += rowH;
    }

    // ── Pie ──────────────────────────────────────────────────────────────────
    y += 20;
    doc.fontSize(8).fillColor(gray).font("Helvetica")
      .text("Este documento es informativo. Comuníquese con el Policlínico para reprogramar o cancelar una cita.",
        left, y, { width: pageW, align: "center" });

    doc.end();
  });
};
