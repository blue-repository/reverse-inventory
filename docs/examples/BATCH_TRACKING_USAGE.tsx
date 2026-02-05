/**
 * Ejemplos de Uso: Sistema de Rastreo de Lotes en Movimientos
 * 
 * Este archivo muestra cómo usar las nuevas funcionalidades de rastreo de lotes
 * desde tu código de aplicación.
 */

import React from "react";
import { supabase } from "@/app/lib/conections/supabase";
import type {
  MovementBatchDetail,
  MovementWithBatchDetails,
  MovementBatchBreakdown,
  BatchMovementHistory,
} from "@/app/types/product";

// ============================================================
// EJEMPLO 1: Obtener movimientos con sus lotes (usando la vista)
// ============================================================

/**
 * Obtiene movimientos recientes con detalles de lotes
 */
export async function getMovementsWithBatches(limit: number = 20) {
  const { data, error } = await supabase
    .from("movement_details_with_batches")
    .select("*")
    .order("movement_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching movements with batches:", error);
    return { data: null, error: error.message };
  }

  return { data: data as MovementWithBatchDetails[], error: null };
}

/**
 * Obtiene movimientos de un producto específico con detalles de lotes
 */
export async function getProductMovementsWithBatches(productId: string) {
  const { data, error } = await supabase
    .from("movement_details_with_batches")
    .select("*")
    .eq("product_id", productId)
    .order("movement_date", { ascending: false });

  if (error) {
    console.error("Error fetching product movements:", error);
    return { data: null, error: error.message };
  }

  return { data: data as MovementWithBatchDetails[], error: null };
}

// ============================================================
// EJEMPLO 2: Obtener desglose de lotes para un movimiento
// ============================================================

/**
 * Obtiene qué lotes fueron afectados por un movimiento específico
 * usando la función de PostgreSQL
 */
export async function getMovementBatchBreakdown(movementId: string) {
  const { data, error } = await supabase.rpc("get_movement_batch_breakdown", {
    p_movement_id: movementId,
  });

  if (error) {
    console.error("Error fetching movement breakdown:", error);
    return { data: null, error: error.message };
  }

  return { data: data as MovementBatchBreakdown[], error: null };
}

/**
 * Alternativa: Obtener detalles directamente de la tabla
 */
export async function getMovementBatchDetailsRaw(movementId: string) {
  const { data, error } = await supabase
    .from("movement_batch_details")
    .select(
      `
      *,
      product_batches (
        batch_number,
        expiration_date,
        shelf,
        drawer,
        section
      )
    `
    )
    .eq("movement_id", movementId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching movement details:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============================================================
// EJEMPLO 3: Obtener historial de un lote
// ============================================================

/**
 * Obtiene todos los movimientos que afectaron un lote específico
 * usando la función de PostgreSQL
 */
export async function getBatchMovementHistory(batchId: string) {
  const { data, error } = await supabase.rpc("get_batch_movement_history", {
    p_batch_id: batchId,
  });

  if (error) {
    console.error("Error fetching batch history:", error);
    return { data: null, error: error.message };
  }

  return { data: data as BatchMovementHistory[], error: null };
}

// ============================================================
// EJEMPLO 4: Consultas analíticas
// ============================================================

/**
 * Identifica salidas que usaron múltiples lotes
 */
export async function getMultiBatchMovements() {
  const { data, error } = await supabase.rpc("get_multi_batch_movements");

  // Si no existe la función, usar query directo
  if (error) {
    // Query manual alternativo
    const query = `
      SELECT 
        m.id AS movement_id,
        p.name AS product_name,
        m.movement_type,
        m.quantity AS total_quantity,
        m.created_at AS movement_date,
        COUNT(mbd.batch_id) AS batch_count,
        STRING_AGG(pb.batch_number, ', ') AS batches_used
      FROM inventory_movements m
      JOIN products p ON m.product_id = p.id
      LEFT JOIN movement_batch_details mbd ON m.id = mbd.movement_id
      LEFT JOIN product_batches pb ON mbd.batch_id = pb.id
      WHERE m.movement_type = 'salida'
      GROUP BY m.id, p.name, m.movement_type, m.quantity, m.created_at
      HAVING COUNT(mbd.batch_id) > 1
      ORDER BY m.created_at DESC
    `;

    const { data: rawData, error: rawError } = await supabase.rpc(
      "execute_sql_query",
      { query }
    );

    return { data: rawData, error: rawError?.message };
  }

  return { data, error: null };
}

/**
 * Verifica integridad de datos (la suma de lotes debe coincidir con el total del movimiento)
 */
export async function verifyMovementIntegrity(movementId?: string) {
  let query = supabase
    .from("inventory_movements")
    .select(
      `
      id,
      quantity,
      product:products(name),
      batch_details:movement_batch_details(quantity)
    `
    )
    .in("movement_type", ["entrada", "salida"]);

  if (movementId) {
    query = query.eq("id", movementId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  // Calcular diferencias
  const results = data.map((movement: any) => {
    const batchSum = movement.batch_details.reduce(
      (sum: number, detail: any) => sum + detail.quantity,
      0
    );
    return {
      movement_id: movement.id,
      product_name: movement.product?.name,
      movement_quantity: movement.quantity,
      batch_sum: batchSum,
      difference: movement.quantity - batchSum,
      is_valid: movement.quantity === batchSum,
    };
  });

  return { data: results, error: null };
}

// ============================================================
// EJEMPLO 5: Uso en componentes React
// ============================================================

/**
 * Hook de ejemplo para usar en componentes
 */
export function useMovementBatches(movementId: string | null) {
  const [batches, setBatches] = React.useState<MovementBatchBreakdown[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!movementId) return;
    const safeMovementId = movementId;

    async function fetchBatches() {
      setLoading(true);
      const { data, error } = await getMovementBatchBreakdown(safeMovementId);

      if (error) {
        setError(error);
      } else {
        setBatches(data || []);
      }

      setLoading(false);
    }

    fetchBatches();
  }, [movementId]);

  return { batches, loading, error };
}

/**
 * Componente de ejemplo que muestra los lotes de un movimiento
 */
export function MovementBatchesDisplay({ movementId }: { movementId: string }) {
  const { batches, loading, error } = useMovementBatches(movementId);

  if (loading) return <div>Cargando lotes...</div>;
  if (error) return <div>Error: {error}</div>;
  if (batches.length === 0) return <div>Sin lotes asociados</div>;

  return (
    <div className="movement-batches">
      <h3>Lotes Afectados</h3>
      <table>
        <thead>
          <tr>
            <th>Lote</th>
            <th>Cantidad</th>
            <th>Stock Antes</th>
            <th>Stock Después</th>
            <th>Vencimiento</th>
            <th>Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.batch_id}>
              <td>{batch.batch_number}</td>
              <td>{batch.quantity}</td>
              <td>{batch.stock_before}</td>
              <td>{batch.stock_after}</td>
              <td>{new Date(batch.expiration_date).toLocaleDateString()}</td>
              <td>{batch.location || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// EJEMPLO 6: Reportes
// ============================================================

/**
 * Genera un reporte de trazabilidad completa de un lote
 */
export async function generateBatchTraceabilityReport(batchId: string) {
  // 1. Obtener información del lote
  const { data: batch, error: batchError } = await supabase
    .from("product_batches")
    .select("*, product:products(name)")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    return { data: null, error: "Lote no encontrado" };
  }

  // 2. Obtener historial de movimientos
  const { data: history, error: historyError } =
    await getBatchMovementHistory(batchId);

  if (historyError) {
    return { data: null, error: historyError };
  }

  // 3. Compilar reporte
  const report = {
    batch_info: {
      batch_number: batch.batch_number,
      product_name: batch.product.name,
      initial_stock: batch.initial_stock,
      current_stock: batch.stock,
      expiration_date: batch.expiration_date,
      created_at: batch.created_at,
    },
    movements: history,
    summary: {
      total_movements: history?.length || 0,
      total_in: history
        ?.filter((h) => h.movement_type === "entrada")
        .reduce((sum, h) => sum + h.quantity, 0),
      total_out: history
        ?.filter((h) => h.movement_type === "salida")
        .reduce((sum, h) => sum + h.quantity, 0),
    },
  };

  return { data: report, error: null };
}

/**
 * Genera reporte de movimientos con lotes para un rango de fechas
 */
export async function generateMovementsBatchReport(
  startDate: string,
  endDate: string,
  productId?: string
) {
  let query = supabase
    .from("movement_details_with_batches")
    .select("*")
    .gte("movement_date", startDate)
    .lte("movement_date", endDate);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query.order("movement_date", {
    ascending: false,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  // Agrupar por movimiento
  const groupedData = (data as MovementWithBatchDetails[]).reduce(
    (acc, row) => {
      if (!acc[row.movement_id]) {
        acc[row.movement_id] = {
          movement: {
            id: row.movement_id,
            product_name: row.product_name,
            movement_type: row.movement_type,
            total_quantity: row.total_quantity,
            reason: row.reason,
            movement_date: row.movement_date,
            recorded_by: row.recorded_by,
          },
          batches: [],
        };
      }

      if (row.batch_id) {
        acc[row.movement_id].batches.push({
          batch_number: row.batch_number!,
          quantity: row.batch_quantity!,
          stock_before: row.batch_stock_before!,
          stock_after: row.batch_stock_after!,
          expiration_date: row.batch_expiration_date!,
        });
      }

      return acc;
    },
    {} as Record<string, any>
  );

  return { data: Object.values(groupedData), error: null };
}

// ============================================================
// TIPS DE USO
// ============================================================

/**
 * TIPS:
 * 
 * 1. Usa la vista 'movement_details_with_batches' para mostrar listados
 * 2. Usa las funciones RPC para detalles específicos (más rápido)
 * 3. Para reportes complejos, considera crear funciones SQL adicionales
 * 4. Cachea resultados cuando sea apropiado (React Query, SWR, etc.)
 * 5. Para exportar a PDF/Excel, usa los datos de los reportes generados
 * 
 * RENDIMIENTO:
 * 
 * - La vista está optimizada con joins internos
 * - Los índices cubren las consultas más comunes
 * - Para tablas muy grandes (>100k registros), considera paginación
 * 
 * SEGURIDAD:
 * 
 * - Verifica permisos RLS si aplica
 * - Valida IDs antes de hacer queries
 * - No expongas datos sensibles en logs
 */
