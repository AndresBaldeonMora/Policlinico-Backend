import PDFDocument from "pdfkit";

interface DatosPDF {
  paciente: { nombres: string; apellidos: string; dni: string; fechaNacimiento?: string; sexo?: string };
  doctor: { nombres: string; apellidos: string; cmp?: string };
  especialidad: string;
  codigoOrden: string;
  fechaOrden: string;
  examenes: { nombre: string; tipo: string; valor: string; unidad?: string }[];
  observaciones?: string;
}

const formatFecha = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
};

export const generarPDFResultados = (datos: DatosPDF): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - 100; // margins
    const teal = "#0d9488";
    const darkTeal = "#0f766e";
    const gray = "#6b7280";
    const dark = "#1f2937";

    // ── Header ──
    doc.rect(50, 50, pageWidth, 70).fill(teal);
    doc.fontSize(18).fillColor("#ffffff").font("Helvetica-Bold")
      .text("Policlínico Parroquial San José", 50, 65, { align: "center", width: pageWidth });
    doc.fontSize(10).fillColor("#99f6e4").font("Helvetica")
      .text("Lima, Perú", 50, 90, { align: "center", width: pageWidth });

    // ── Línea decorativa ──
    doc.rect(50, 120, pageWidth, 3).fill(darkTeal);

    // ── Código y fecha ──
    doc.fillColor(teal).font("Helvetica-Bold").fontSize(11)
      .text(datos.codigoOrden, 60, 135);
    doc.fillColor(gray).font("Helvetica").fontSize(10)
      .text(`Fecha: ${formatFecha(datos.fechaOrden)}`, 50, 135, { align: "right", width: pageWidth });

    // ── Título ──
    doc.moveDown(1);
    const tituloY = 165;
    doc.fillColor(dark).font("Helvetica-Bold").fontSize(14)
      .text("RESULTADOS DE LABORATORIO", 50, tituloY, { align: "center", width: pageWidth });
    doc.rect(50 + pageWidth / 2 - 30, tituloY + 20, 60, 2).fill(teal);

    // ── Datos del paciente ──
    let y = tituloY + 40;
    doc.fillColor(teal).font("Helvetica-Bold").fontSize(10)
      .text("DATOS DEL PACIENTE", 60, y);
    y += 4;
    doc.moveTo(60, y + 12).lineTo(50 + pageWidth - 10, y + 12).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 20;

    doc.fillColor(dark).font("Helvetica").fontSize(10);
    doc.font("Helvetica-Bold").text("Nombre: ", 60, y, { continued: true })
      .font("Helvetica").text(`${datos.paciente.nombres} ${datos.paciente.apellidos}`);
    doc.font("Helvetica-Bold").text("DNI: ", 350, y, { continued: true })
      .font("Helvetica").text(datos.paciente.dni);
    y += 18;

    if (datos.paciente.fechaNacimiento) {
      doc.font("Helvetica-Bold").text("Fecha Nac.: ", 60, y, { continued: true })
        .font("Helvetica").text(formatFecha(datos.paciente.fechaNacimiento));
      const sexoLabel = datos.paciente.sexo === "M" ? "Masculino" : datos.paciente.sexo === "F" ? "Femenino" : "";
      if (sexoLabel) {
        doc.font("Helvetica-Bold").text("Sexo: ", 350, y, { continued: true })
          .font("Helvetica").text(sexoLabel);
      }
      y += 18;
    }

    // ── Datos del médico ──
    y += 10;
    doc.fillColor(teal).font("Helvetica-Bold").fontSize(10)
      .text("MÉDICO SOLICITANTE", 60, y);
    y += 4;
    doc.moveTo(60, y + 12).lineTo(50 + pageWidth - 10, y + 12).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 20;

    doc.fillColor(dark).font("Helvetica-Bold").fontSize(10)
      .text("Nombre: ", 60, y, { continued: true })
      .font("Helvetica").text(`Dr. ${datos.doctor.nombres} ${datos.doctor.apellidos}`);
    if (datos.doctor.cmp) {
      doc.font("Helvetica-Bold").text("CMP: ", 350, y, { continued: true })
        .font("Helvetica").text(datos.doctor.cmp);
    }
    y += 18;
    doc.font("Helvetica-Bold").text("Especialidad: ", 60, y, { continued: true })
      .font("Helvetica").text(datos.especialidad);
    y += 28;

    // ── Tabla de resultados ──
    doc.fillColor(teal).font("Helvetica-Bold").fontSize(10)
      .text("RESULTADOS DE EXÁMENES", 60, y);
    y += 4;
    doc.moveTo(60, y + 12).lineTo(50 + pageWidth - 10, y + 12).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 20;

    // Header de tabla
    const colX = [60, 100, 280, 380];
    const colW = [40, 180, 100, 120];

    doc.rect(55, y - 4, pageWidth - 10, 22).fill("#f9fafb");
    doc.fillColor(gray).font("Helvetica-Bold").fontSize(9);
    doc.text("#", colX[0], y, { width: colW[0], align: "center" });
    doc.text("EXAMEN", colX[1], y, { width: colW[1] });
    doc.text("TIPO", colX[2], y, { width: colW[2] });
    doc.text("RESULTADO", colX[3], y, { width: colW[3] });
    y += 22;

    // Filas
    datos.examenes.forEach((ex, i) => {
      if (y > 700) {
        doc.addPage();
        y = 60;
      }
      doc.fillColor(dark).font("Helvetica").fontSize(10);
      doc.fillColor(gray).text(`${i + 1}`, colX[0], y, { width: colW[0], align: "center" });
      doc.fillColor(dark).font("Helvetica").text(ex.nombre, colX[1], y, { width: colW[1] });
      doc.fillColor(gray).text(ex.tipo, colX[2], y, { width: colW[2] });
      doc.fillColor(teal).font("Helvetica-Bold").text(`${ex.valor} ${ex.unidad || ""}`, colX[3], y, { width: colW[3] });
      y += 18;
      doc.moveTo(60, y - 2).lineTo(50 + pageWidth - 10, y - 2).strokeColor("#e5e7eb").lineWidth(0.3).stroke();
    });

    // ── Observaciones ──
    if (datos.observaciones) {
      y += 15;
      doc.fillColor(teal).font("Helvetica-Bold").fontSize(10)
        .text("OBSERVACIONES", 60, y);
      y += 16;
      doc.fillColor(dark).font("Helvetica").fontSize(10)
        .text(datos.observaciones, 60, y, { width: pageWidth - 20 });
      y += 25;
    }

    // ── Nota ──
    y += 15;
    doc.rect(55, y, pageWidth - 10, 35).fill("#f0fdfa");
    doc.rect(55, y, 3, 35).fill(teal);
    doc.fillColor(dark).font("Helvetica").fontSize(9)
      .text("Para más detalles sobre sus resultados, acérquese al policlínico o consulte con su médico tratante.", 68, y + 10, { width: pageWidth - 30 });

    // ── Footer ──
    y += 55;
    doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor("#e5e7eb").lineWidth(0.5).stroke();
    y += 10;
    doc.fillColor("#9ca3af").font("Helvetica").fontSize(8)
      .text("Policlínico Parroquial San José — Lima, Perú", 50, y, { align: "center", width: pageWidth });
    doc.text("Documento generado automáticamente", 50, y + 12, { align: "center", width: pageWidth });

    doc.end();
  });
};
