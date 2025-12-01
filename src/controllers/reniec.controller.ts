import { Request, Response } from "express";
import axios from "axios";

const APISPERU_URL = "https://dniruc.apisperu.com/api/v1/dni/";
const APISPERU_TOKEN = process.env.APISPERU_TOKEN || "";

interface ApisPeruDNIResponse {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  codVerifica: string;
}
 
export const buscarDNI = async (req: Request, res: Response) => {
    console.log("🔍 Endpoint /api/reniec llamado con DNI:", req.params.dni);
  const { dni } = req.params;

  if (!dni || dni.length !== 8) {
    return res.status(400).json({ 
      success: false,
      message: "DNI inválido. Debe tener 8 dígitos" 
    });
  }

  try {
    const { data } = await axios.get<ApisPeruDNIResponse>(
      `${APISPERU_URL}${dni}?token=${APISPERU_TOKEN}`
    );

    if (!data || !data.nombres) {
      return res.status(404).json({ 
        success: false,
        message: "No se encontraron datos para el DNI ingresado" 
      });
    }

    res.json({
      success: true,
      data: {
        dni: data.dni,
        nombres: data.nombres,
        apellidoPaterno: data.apellidoPaterno,
        apellidoMaterno: data.apellidoMaterno,
        nombreCompleto: `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`,
      },
    });
  } catch (error: any) {
    console.error("Error consultando RENIEC:", error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        success: false,
        message: "DNI no encontrado en RENIEC" 
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Error al consultar RENIEC. Intente nuevamente." 
    });
  }
};