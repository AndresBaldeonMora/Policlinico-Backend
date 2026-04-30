import { Response } from "express";
import { Paciente } from "../models/Paciente";
import { Cita } from "../models/Cita";
import { OrdenExamen } from "../models/OrdenExamen";
import { AuthRequest } from "../middlewares/authMiddlewares";

// GET /api/paciente/me — datos personales del paciente autenticado
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const paciente = await Paciente.findById(req.pacienteId).select(
      "nombres apellidos dni telefono correo fechaNacimiento sexo estadoCivil direccion distrito apoderadoNombre apoderadoParentesco apoderadoTelefono"
    );
    if (!paciente) {
      return res.status(404).json({ success: false, message: "Paciente no encontrado" });
    }
    res.json({ success: true, data: paciente });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/paciente/citas — historial de citas del paciente autenticado
// Soporta ?estado=PENDIENTE&desde=2026-01-01&hasta=2026-12-31&pagina=1
export const getMyCitas = async (req: AuthRequest, res: Response) => {
  try {
    const pagina    = Math.max(parseInt(req.query.pagina as string) || 1, 1);
    const porPagina = 20;
    const filtro: any = { pacienteId: req.pacienteId };

    if (req.query.estado) filtro.estado = String(req.query.estado).toUpperCase();
    if (req.query.desde || req.query.hasta) {
      filtro.fecha = {};
      if (req.query.desde) filtro.fecha.$gte = new Date(String(req.query.desde));
      if (req.query.hasta) filtro.fecha.$lte = new Date(String(req.query.hasta));
    }

    const [citas, total] = await Promise.all([
      Cita.find(filtro)
        .select("-pago -__v") // excluye datos de pago
        .populate({
          path: "doctorId",
          select: "nombres apellidos especialidadId",
          populate: { path: "especialidadId", select: "nombre" },
        })
        .populate("medicamentosPrescritos.medicamentoId", "nombre principioActivo presentacion")
        .sort({ fecha: -1, hora: -1 })
        .skip((pagina - 1) * porPagina)
        .limit(porPagina),
      Cita.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      data: citas,
      paginacion: {
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/paciente/ordenes — órdenes de laboratorio/imagen del paciente autenticado
// Soporta ?estado=PENDIENTE&tipoOrden=LABORATORIO&pagina=1
export const getMyOrdenes = async (req: AuthRequest, res: Response) => {
  try {
    const pagina    = Math.max(parseInt(req.query.pagina as string) || 1, 1);
    const porPagina = 20;
    const filtro: any = { pacienteId: req.pacienteId };

    if (req.query.estado)    filtro.estado    = String(req.query.estado).toUpperCase();
    if (req.query.tipoOrden) filtro.tipoOrden = String(req.query.tipoOrden).toUpperCase();

    const [ordenes, total] = await Promise.all([
      OrdenExamen.find(filtro)
        .select("-__v")
        .populate("doctorId", "nombres apellidos")
        .populate("especialidadId", "nombre")
        .populate(
          "items.examenId",
          "nombre tipo unidad referenciaMin referenciaMax referenciaTexto"
        )
        .sort({ fecha: -1 })
        .skip((pagina - 1) * porPagina)
        .limit(porPagina),
      OrdenExamen.countDocuments(filtro),
    ]);

    res.json({
      success: true,
      data: ordenes,
      paginacion: {
        total,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(total / porPagina),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
