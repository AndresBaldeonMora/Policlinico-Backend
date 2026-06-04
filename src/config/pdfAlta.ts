import PDFDocument from "pdfkit";

export interface MedicamentoAlta {
  nombre: string;
  concentracion?: string;
  frecuencia?: string;
  duracion?: string;
  dosis?: string;
}

export interface DatosAlta {
  fecha: string; // ISO
  hora?: string;
  paciente: {
    nombres: string;
    apellidos: string;
    dni: string;
    fechaNacimiento?: string;
  };
  doctor: {
    nombres: string;
    apellidos: string;
    cmp?: string;
  };
  especialidad?: string;
  diagnosticos: { codigo: string; descripcion: string; tipo?: string }[];
  medicamentos: MedicamentoAlta[];
  indicaciones: string[];        // medidas no farmacológicas seleccionadas
  otrasIndicaciones?: string;    // texto libre de "otras indicaciones"
  criteriosAlarma?: string;      // criterios de alarma de sección P
  proximaCita?: string;          // ISO date, opcional
  tiempoSeguimiento?: string;
}

const teal     = "#0d9488";
const darkTeal = "#0f766e";
const gray     = "#6b7280";
const dark     = "#1f2937";
const border   = "#e5e7eb";

const formatFecha = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "UTC",
  });
};

const calcEdad = (fechaNac?: string): string => {
  if (!fechaNac) return "";
  const diff = Date.now() - new Date(fechaNac).getTime();
  const años = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return `${años} años`;
};

export const generarPDFAlta = (datos: DatosAlta): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width - 100;
    const left  = 50;

    // ── Encabezado ──────────────────────────────────────────────
    doc.rect(left, 50, pageW, 64).fill(teal);
    doc.fontSize(17).fillColor("#ffffff").font("Helvetica-Bold")
      .text("Policlínico Parroquial San José", left, 62, { align: "center", width: pageW });
    doc.fontSize(9).fillColor("#99f6e4").font("Helvetica")
      .text("Lima, Perú  ·  Consulta Externa", left, 84, { align: "center", width: pageW });
    doc.fontSize(8).fillColor("#ccfbf1").font("Helvetica")
      .text("RESUMEN DE ATENCIÓN — ALTA MÉDICA", left, 97, { align: "center", width: pageW });

    // ── Fecha y hora ─────────────────────────────────────────────
    let y = 124;
    doc.fillColor(gray).font("Helvetica").fontSize(10)
      .text(
        `Fecha: ${formatFecha(datos.fecha)}${datos.hora ? `  ·  Hora: ${datos.hora}` : ""}`,
        left, y, { align: "right", width: pageW - 4 }
      );
    y += 22;

    // ── Helper: título de sección ─────────────────────────────────
    const sectionTitle = (txt: string, yy: number) => {
      doc.fillColor(teal).font("Helvetica-Bold").fontSize(10).text(txt, left + 4, yy);
      doc
        .moveTo(left + 4, yy + 13)
        .lineTo(left + pageW - 4, yy + 13)
        .strokeColor(border).lineWidth(0.5).stroke();
      return yy + 22;
    };

    // ── Datos del paciente ────────────────────────────────────────
    y = sectionTitle("DATOS DEL PACIENTE", y);
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(10)
      .text("Nombre: ", left + 4, y, { continued: true })
      .font("Helvetica")
      .text(`${datos.paciente.nombres} ${datos.paciente.apellidos}`);
    doc.font("Helvetica-Bold")
      .text("DNI: ", left + pageW * 0.62, y, { continued: true })
      .font("Helvetica").text(datos.paciente.dni);
    y += 17;

    const edad = calcEdad(datos.paciente.fechaNacimiento);
    if (edad) {
      doc.fillColor(dark).font("Helvetica-Bold").fontSize(10)
        .text("Edad: ", left + 4, y, { continued: true })
        .font("Helvetica").text(edad);
      y += 17;
    }

    // ── Médico ────────────────────────────────────────────────────
    y += 6;
    y = sectionTitle("MÉDICO TRATANTE", y);
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(10)
      .text("Médico: ", left + 4, y, { continued: true })
      .font("Helvetica")
      .text(`Dr(a). ${datos.doctor.nombres} ${datos.doctor.apellidos}`);
    if (datos.doctor.cmp) {
      doc.font("Helvetica-Bold")
        .text("CMP: ", left + pageW * 0.62, y, { continued: true })
        .font("Helvetica").text(datos.doctor.cmp);
    }
    y += 17;
    if (datos.especialidad) {
      doc.fillColor(dark).font("Helvetica-Bold").fontSize(10)
        .text("Especialidad: ", left + 4, y, { continued: true })
        .font("Helvetica").text(datos.especialidad);
      y += 17;
    }

    // ── Diagnósticos ──────────────────────────────────────────────
    if (datos.diagnosticos.length > 0) {
      y += 6;
      y = sectionTitle("DIAGNÓSTICO", y);
      datos.diagnosticos.forEach((dx) => {
        if (y > 700) { doc.addPage(); y = 60; }
        const tipotxt = dx.tipo === "confirmado" ? "[Confirmado]" : dx.tipo === "presuntivo" ? "[Presuntivo]" : "";
        doc.fillColor(dark).font("Helvetica-Bold").fontSize(10)
          .text(`${dx.codigo} — `, left + 4, y, { continued: true })
          .font("Helvetica").text(`${dx.descripcion} `, { continued: !!tipotxt })
          .fillColor(gray).font("Helvetica").text(tipotxt);
        y += 15;
      });
    }

    // ── Medicamentos ──────────────────────────────────────────────
    if (datos.medicamentos.length > 0) {
      y += 10;
      y = sectionTitle("MEDICAMENTOS PRESCRITOS", y);
      datos.medicamentos.forEach((m, i) => {
        if (y > 700) { doc.addPage(); y = 60; }
        const linea = [
          m.concentracion,
          m.dosis    && `dosis: ${m.dosis}`,
          m.frecuencia,
          m.duracion && `durante ${m.duracion}`,
        ].filter(Boolean).join(" · ");

        doc.fillColor(teal).font("Helvetica-Bold").fontSize(10)
          .text(`${i + 1}. `, left + 4, y, { continued: true })
          .fillColor(dark).font("Helvetica-Bold")
          .text(`${m.nombre} `, { continued: !!linea })
          .font("Helvetica").fillColor(gray).text(linea || "");
        y += 16;
      });
    }

    // ── Indicaciones ──────────────────────────────────────────────
    const todasLasIndicaciones = [
      ...datos.indicaciones,
      ...(datos.otrasIndicaciones ? [datos.otrasIndicaciones] : []),
    ];

    if (todasLasIndicaciones.length > 0) {
      y += 10;
      y = sectionTitle("INDICACIONES", y);
      todasLasIndicaciones.forEach((ind, i) => {
        if (y > 700) { doc.addPage(); y = 60; }
        doc.fillColor(dark).font("Helvetica").fontSize(10)
          .text(`${i + 1}. ${ind}`, left + 4, y, { width: pageW - 8 });
        y += 15;
      });
    }

    // ── Criterios de alarma ───────────────────────────────────────
    if (datos.criteriosAlarma?.trim()) {
      y += 10;
      y = sectionTitle("SEÑALES DE ALARMA", y);
      doc.fillColor(dark).font("Helvetica").fontSize(10)
        .text(datos.criteriosAlarma.trim(), left + 4, y, { width: pageW - 8 });
      y += doc.heightOfString(datos.criteriosAlarma.trim(), { width: pageW - 8 }) + 8;
    }

    // ── Próxima cita ──────────────────────────────────────────────
    if (datos.proximaCita || datos.tiempoSeguimiento) {
      y += 10;
      doc.rect(left, y, pageW, 34).fill("#f0fdfa");
      doc.rect(left, y, 3, 34).fill(teal);

      doc.fillColor(teal).font("Helvetica-Bold").fontSize(10)
        .text("PRÓXIMA CITA:", left + 12, y + 9, { continued: true })
        .fillColor(dark).font("Helvetica")
        .text(
          datos.proximaCita
            ? `  ${formatFecha(datos.proximaCita)}${datos.tiempoSeguimiento ? `  ·  ${datos.tiempoSeguimiento}` : ""}`
            : `  ${datos.tiempoSeguimiento}`
        );
      y += 42;
    }

    // ── Nota legal ────────────────────────────────────────────────
    y += 10;
    doc.rect(left, y, pageW, 36).fill("#f9fafb");
    doc.rect(left, y, 3, 36).fill(gray);
    doc.fillColor(gray).font("Helvetica").fontSize(8)
      .text(
        "Este resumen no reemplaza a la receta médica. Para retirar medicamentos en farmacia, presente la receta correspondiente.",
        left + 10, y + 8,
        { width: pageW - 16 }
      );
    y += 44;

    // ── Firma ─────────────────────────────────────────────────────
    if (y > 660) { doc.addPage(); y = 60; }
    y += 20;
    const firmaX = left + pageW - 200;
    doc.moveTo(firmaX, y).lineTo(firmaX + 196, y)
      .strokeColor(gray).lineWidth(0.7).stroke();
    y += 5;
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(10)
      .text(
        `Dr(a). ${datos.doctor.nombres} ${datos.doctor.apellidos}`,
        firmaX, y, { width: 196, align: "center" }
      );
    y += 14;
    doc.fillColor(gray).font("Helvetica").fontSize(9)
      .text(`CMP ${datos.doctor.cmp || "—"}`, firmaX, y, { width: 196, align: "center" });
    if (datos.especialidad) {
      y += 12;
      doc.fillColor(gray).font("Helvetica").fontSize(9)
        .text(datos.especialidad, firmaX, y, { width: 196, align: "center" });
    }

    // ── Footer ────────────────────────────────────────────────────
    // footY debe ser tal que footY + 20 <= page.height - margin(50) = 791.89
    // Usamos page.height - 80 → footY ≈ 761, footY+20 ≈ 781 (dentro del área útil)
    const footY = doc.page.height - 80;
    doc
      .moveTo(left, footY).lineTo(left + pageW, footY)
      .strokeColor(border).lineWidth(0.5).stroke();
    doc.fillColor("#9ca3af").font("Helvetica").fontSize(8)
      .text("Policlínico Parroquial San José — Lima, Perú", left, footY + 8, {
        align: "center", width: pageW,
      });
    doc.fillColor("#9ca3af").font("Helvetica").fontSize(7.5)
      .text(
        "Documento emitido conforme a NTS-022 MINSA — Sección de indicaciones al egreso en consulta externa.",
        left, footY + 20, { align: "center", width: pageW }
      );

    doc.end();
  });
};