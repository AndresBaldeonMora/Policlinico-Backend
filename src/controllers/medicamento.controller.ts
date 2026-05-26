import { Request, Response } from "express";
import { Medicamento } from "../models/Medicamento";
import { AuthRequest } from "../middlewares/authMiddlewares";
import { registrarAuditoria } from "../utils/auditoria";

// Listar medicamentos.
//   - Por defecto (uso clínico) solo devuelve activos y aplica búsqueda por nombre.
//   - Con ?todos=true (panel admin) devuelve también los inactivos.
export const listarMedicamentos = async (req: Request, res: Response) => {
  try {
    const { q, todos } = req.query;
    const filtro: Record<string, unknown> = {};
    if (todos !== "true") filtro.activo = true;
    if (q) filtro.nombre = { $regex: String(q), $options: "i" };

    const medicamentos = await Medicamento.find(filtro)
      .limit(todos === "true" ? 500 : 50)
      .sort({ nombre: 1 });
    res.json({ success: true, data: medicamentos });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const crearMedicamento = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, principioActivo, presentacion } = req.body;
    if (!nombre?.trim() || !principioActivo?.trim() || !presentacion?.trim()) {
      return res.status(400).json({ success: false, message: "nombre, principioActivo y presentacion son requeridos" });
    }
    const med = await Medicamento.create({
      nombre: nombre.trim(),
      principioActivo: principioActivo.trim(),
      presentacion: presentacion.trim(),
    });

    await registrarAuditoria({
      req,
      accion: "CREAR_MEDICAMENTO",
      entidad: "Medicamento",
      entidadId: med._id as any,
      descripcion: `Agregó el medicamento ${med.nombre} al catálogo`,
    });

    res.status(201).json({ success: true, data: med });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const actualizarMedicamento = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, principioActivo, presentacion } = req.body;
    const med = await Medicamento.findById(req.params.id);
    if (!med) return res.status(404).json({ success: false, message: "Medicamento no encontrado" });

    if (nombre?.trim())          med.nombre = nombre.trim();
    if (principioActivo?.trim()) med.principioActivo = principioActivo.trim();
    if (presentacion?.trim())    med.presentacion = presentacion.trim();
    await med.save();

    await registrarAuditoria({
      req,
      accion: "ACTUALIZAR_MEDICAMENTO",
      entidad: "Medicamento",
      entidadId: med._id as any,
      descripcion: `Actualizó el medicamento ${med.nombre}`,
    });

    res.json({ success: true, data: med });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleActivoMedicamento = async (req: AuthRequest, res: Response) => {
  try {
    const med = await Medicamento.findById(req.params.id);
    if (!med) return res.status(404).json({ success: false, message: "Medicamento no encontrado" });

    med.activo = !med.activo;
    await med.save();

    await registrarAuditoria({
      req,
      accion: med.activo ? "ACTIVAR_MEDICAMENTO" : "DESACTIVAR_MEDICAMENTO",
      entidad: "Medicamento",
      entidadId: med._id as any,
      estadoNuevo: med.activo ? "activo" : "inactivo",
      descripcion: `Cambió el estado del medicamento ${med.nombre} a ${med.activo ? "activo" : "inactivo"}`,
    });

    res.json({ success: true, data: med });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
