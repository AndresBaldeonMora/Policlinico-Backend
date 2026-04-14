import nodemailer from "nodemailer";
import { generarPDFResultados } from "./pdfResultados";

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

  // Mensaje simple
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

export default transporter;
