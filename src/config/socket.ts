import { Server as HttpServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../middlewares/authMiddlewares";
import { MensajeChat } from "../models/MensajeChat";
import { Usuario } from "../models/Usuario";
import { Paciente } from "../models/Paciente";

let io: IOServer;

export function initSocket(httpServer: HttpServer) {
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ];

  io = new IOServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // ── Autenticación via token en handshake ──────────────────────────────────
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No autenticado"));
    try {
      const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as any;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user;

    // ── Unirse a sala ─────────────────────────────────────────────────────
    socket.on("join_room", (sala: string) => {
      socket.join(sala);
    });

    // ── Enviar mensaje ────────────────────────────────────────────────────
    socket.on("send_message", async (data: { sala: string; texto: string; tipo: "ADMIN_STAFF" | "ADMIN_PACIENTE" }) => {
      if (!data.sala || !data.texto?.trim()) return;

      try {
        const msg = await MensajeChat.create({
          sala:        data.sala,
          tipo:        data.tipo,
          autorId:     user.id ?? user._id ?? "",
          autorNombre: `${user.nombres} ${user.apellidos}`,
          autorRol:    user.rol,
          texto:       data.texto.trim(),
        });

        io.to(data.sala).emit("new_message", {
          _id:         msg._id,
          sala:        msg.sala,
          autorId:     msg.autorId,
          autorNombre: msg.autorNombre,
          autorRol:    msg.autorRol,
          texto:       msg.texto,
          creadoEn:    msg.creadoEn,
        });
      } catch (err) {
        socket.emit("error_msg", "No se pudo enviar el mensaje.");
      }
    });

    // ── Marcar mensajes como leídos ───────────────────────────────────────
    socket.on("mark_read", async (sala: string) => {
      await MensajeChat.updateMany(
        { sala, autorId: { $ne: user.id ?? user._id ?? "" }, leido: false },
        { leido: true }
      );
    });
  });

  return io;
}

// ── REST: historial de sala ───────────────────────────────────────────────────
export async function historialSala(sala: string, limite = 50) {
  return MensajeChat.find({ sala }).sort({ creadoEn: 1 }).limit(limite).lean();
}

// ── REST: listado de conversaciones para el admin ─────────────────────────────
export async function conversacionesAdmin() {
  // Salas de staff (recepcionistas)
  const staff = await Usuario.find({ rol: "RECEPCIONISTA", activo: true })
    .select("_id nombres apellidos correo").lean();

  const staffConv = await Promise.all(staff.map(async (u) => {
    const sala = `staff-${u._id}`;
    const ultimo = await MensajeChat.findOne({ sala }).sort({ creadoEn: -1 }).lean();
    const noLeidos = await MensajeChat.countDocuments({ sala, autorId: { $ne: String(u._id) }, leido: false });
    return { sala, tipo: "ADMIN_STAFF" as const, nombre: `${u.nombres} ${u.apellidos}`, correo: u.correo, userId: String(u._id), ultimo, noLeidos };
  }));

  // Salas de pacientes (los que han escrito algún mensaje)
  const salasP = await MensajeChat.distinct("sala", { tipo: "ADMIN_PACIENTE" });
  const pacConv = await Promise.all(salasP.map(async (sala: string) => {
    const pacienteId = sala.replace("paciente-", "");
    const pac = await Paciente.findById(pacienteId).select("nombres apellidos").lean();
    const ultimo = await MensajeChat.findOne({ sala }).sort({ creadoEn: -1 }).lean();
    const noLeidos = await MensajeChat.countDocuments({ sala, autorRol: { $ne: "ADMINISTRADOR" }, leido: false });
    return { sala, tipo: "ADMIN_PACIENTE" as const, nombre: pac ? `${(pac as any).nombres} ${(pac as any).apellidos}` : "Paciente", pacienteId, ultimo, noLeidos };
  }));

  return { staff: staffConv, pacientes: pacConv };
}

export function getIO() { return io; }
