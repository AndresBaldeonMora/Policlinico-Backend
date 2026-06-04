import nodemailer from "nodemailer";
import { generarPDFResultados } from "./pdfResultados";
import { generarPDFReceta, DatosReceta } from "./pdfReceta";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface DatosCorreoResultados {
  correo: string;
  paciente: { nombres: string; apellidos: string; dni: string; fechaNacimiento?: string; sexo?: string };
  doctor: { nombres: string; apellidos: string; cmp?: string };
  especialidad: string;
  codigoOrden: string;
  fechaOrden: string;
  examenes: { nombre: string; tipo: string; valor: string; unidad?: string; archivoUrl?: string }[];
  observaciones?: string;
}

export const enviarCorreoResultados = async (datos: DatosCorreoResultados) => {
  const { correo, paciente, codigoOrden, examenes, doctor, especialidad, fechaOrden, observaciones } = datos;

  // Generar PDF de resultados
  const pdfBuffer = await generarPDFResultados({
    paciente, doctor, especialidad, codigoOrden, fechaOrden, examenes, observaciones,
  });

  const adjuntos: { filename: string; content: Buffer; contentType?: string }[] = [
    { filename: `Resultados_${codigoOrden}.pdf`, content: pdfBuffer, contentType: "application/pdf" },
  ];

  // Descargar archivos de Cloudinary y adjuntarlos
  for (const ex of examenes) {
    if (ex.archivoUrl) {
      try {
        const res = await fetch(ex.archivoUrl);
        if (!res.ok) continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "application/octet-stream";
        const urlExt = ex.archivoUrl.split("/").pop()?.split("?")[0]?.split(".").pop();
        const ctMap: Record<string, string> = {
          "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
          "application/pdf": "pdf",
          "application/msword": "doc",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
          "application/vnd.ms-excel": "xls",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        };
        const ext = ctMap[contentType] || urlExt || "file";
        if (ext !== "file") {
          adjuntos.push({
            filename: `${ex.nombre.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "_")}.${ext}`,
            content: buffer,
            contentType,
          });
        }
      } catch {
        console.error(`No se pudo descargar archivo de ${ex.nombre}`);
      }
    }
  }

  const html = `
    <p>Estimado(a) <strong>${paciente.nombres} ${paciente.apellidos}</strong>,</p>
    <p>Sus resultados de laboratorio / imagen de la orden <strong>${codigoOrden}</strong> están listos.</p>
    <p>Encontrará los detalles en los archivos adjuntos.</p>
    <br>
    <p>Atentamente,<br><strong>Policlínico Parroquial San José</strong></p>
    <p style="color:#999;font-size:12px">Este es un correo automático, por favor no responda a este mensaje.</p>
  `;

  await transporter.sendMail({
    from: `"Policlínico San José" <${process.env.SMTP_USER}>`,
    to: correo,
    subject: `Resultados de Laboratorio / Imagen — ${codigoOrden} | Policlínico San José`,
    html,
    attachments: adjuntos,
  });
};

export const enviarCorreoReceta = async (correo: string, datos: DatosReceta) => {
  const pdfBuffer = await generarPDFReceta(datos);
  const paciente = datos.paciente;
  const html = `
    <p>Estimado(a) <strong>${paciente.nombres} ${paciente.apellidos}</strong>,</p>
    <p>Adjunto encontrará su receta médica (N° ${datos.numeroReceta}) emitida el ${new Date(datos.fecha).toLocaleDateString("es-PE", { timeZone: "UTC" })}.</p>
    <p>Preséntela en la farmacia para la dispensación de sus medicamentos.</p>
    <br>
    <p>Atentamente,<br><strong>Policlínico Parroquial San José</strong></p>
    <p style="color:#999;font-size:12px">Este es un correo automático, por favor no responda a este mensaje.</p>
  `;

  await transporter.sendMail({
    from: `"Policlínico San José" <${process.env.SMTP_USER}>`,
    to: correo,
    subject: `Receta Médica N° ${datos.numeroReceta} | Policlínico San José`,
    html,
    attachments: [
      { filename: `Receta_${datos.numeroReceta}.pdf`, content: pdfBuffer, contentType: "application/pdf" },
    ],
  });
};

export const enviarCorreoAlta = async (
  correo: string,
  paciente: { nombres: string; apellidos: string },
  pdfBuffer: Buffer
) => {
  const html = `
    <p>Estimado(a) <strong>${paciente.nombres} ${paciente.apellidos}</strong>,</p>
    <p>Gracias por atenderse en el <strong>Policlínico Parroquial San José</strong>. Esperamos que se encuentre bien.</p>
    <p>Adjunto encontrará el resumen de su atención médica, el cual incluye los diagnósticos, indicaciones, medicamentos prescritos y recomendaciones de seguimiento emitidos durante su consulta.</p>
    <p>Le recordamos guardar este documento para futuras referencias o consultas con otros profesionales de salud.</p>
    <br>
    <p>Atentamente,<br><strong>Policlínico Parroquial San José</strong></p>
    <p style="color:#999;font-size:12px">Este es un correo automático, por favor no responda a este mensaje.</p>
  `;

  await transporter.sendMail({
    from: `"Policlínico San José" <${process.env.SMTP_USER}>`,
    to: correo,
    subject: "Resumen de su atención médica | Policlínico San José",
    html,
    attachments: [
      { filename: "Resumen_Atencion.pdf", content: pdfBuffer, contentType: "application/pdf" },
    ],
  });
};

interface DatosCorreoReclamacion {
  correo: string;
  paciente: { nombres: string; apellidos: string; dni: string };
  tipo: "QUEJA" | "RECLAMO";
  descripcion: string;
  fecha: Date;
  codigoReclamacion: string;
}

export const enviarCorreoReclamacion = async (datos: DatosCorreoReclamacion) => {
  const { correo, paciente, tipo, descripcion, fecha, codigoReclamacion } = datos;
  const fechaStr = fecha.toLocaleString("es-PE", { timeZone: "America/Lima" });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Confirmación de Libro de Reclamaciones Virtual</h2>
      <p>Estimado(a) <strong>${paciente.nombres} ${paciente.apellidos}</strong>,</p>
      <p>Confirmamos que hemos recibido su registro en nuestro Libro de Reclamaciones Virtual.</p>

      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 5px 0;"><strong>Código de Registro:</strong> ${codigoReclamacion}</p>
        <p style="margin: 5px 0;"><strong>Tipo:</strong> ${tipo === "QUEJA" ? "Queja" : "Reclamo"}</p>
        <p style="margin: 5px 0;"><strong>Fecha de Registro:</strong> ${fechaStr}</p>
        <p style="margin: 5px 0;"><strong>Descripción:</strong></p>
        <p style="margin: 5px 0; white-space: pre-wrap; color: #334155; font-style: italic;">"${descripcion}"</p>
      </div>

      <p>De acuerdo con la normativa del Código de Protección al Consumidor (Ley 29571), procederemos a evaluar y dar respuesta a su requerimiento en el plazo legal correspondiente.</p>

      <br>
      <p>Atentamente,<br><strong>Policlínico Parroquial San José</strong></p>
      <p style="color:#999;font-size:12px;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;">Este es un correo automático, por favor no responda a este mensaje.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Policlínico San José" <${process.env.SMTP_USER}>`,
    to: correo,
    subject: `Confirmación de Libro de Reclamaciones — ${codigoReclamacion} | Policlínico San José`,
    html,
  });
};

export const enviarCorreoRecordatorio = async (
  correo: string,
  paciente: { nombres: string; apellidos: string },
  proxima?: { fecha?: string; hora?: string }
) => {
  const detalle = proxima?.fecha
    ? `<p>Su próxima cita está programada para el <strong>${proxima.fecha}</strong>${proxima.hora ? ` a las <strong>${proxima.hora}</strong>` : ""}.</p>`
    : "";

  const html = `
    <p>Estimado(a) <strong>${paciente.nombres} ${paciente.apellidos}</strong>,</p>
    <p>Le recordamos que tiene una cita pendiente en el <strong>Policlínico Parroquial San José</strong>.</p>
    ${detalle}
    <p>Por favor, confirme su asistencia o comuníquese con nosotros si necesita reprogramar.</p>
    <br>
    <p>Atentamente,<br><strong>Policlínico Parroquial San José</strong></p>
    <p style="color:#999;font-size:12px">Este es un correo automático, por favor no responda a este mensaje.</p>
  `;

  await transporter.sendMail({
    from: `"Policlínico San José" <${process.env.SMTP_USER}>`,
    to: correo,
    subject: "Recordatorio de cita | Policlínico San José",
    html,
  });
};

export default transporter;
