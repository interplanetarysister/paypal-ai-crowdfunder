import { useEffect, useMemo, useRef, useState } from "react";
import { money } from "./api";

type FinanceOrder = {
  id: string;
  purpose: string;
  amount_cents: number;
  status: string;
  reconciliation: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  created_at: string;
};
type ReceiptRef = { id: string; capture_id: string };
type GridRow = FinanceOrder & { receipt_id: string | null };

type GridApi = { destroy(): void };
type GridNamespace = {
  createGrid(element: HTMLElement, options: Record<string, unknown>): GridApi;
};
type GridWindow = Window & { agGrid?: GridNamespace };

const GRID_URL =
  "https://cdn.jsdelivr.net/npm/ag-grid-community@36.3.0/dist/ag-grid-community.min.js";
let loadingGrid: Promise<void> | null = null;

function loadCommunityGrid(): Promise<void> {
  if ((window as GridWindow).agGrid?.createGrid) return Promise.resolve();
  if (!loadingGrid) {
    loadingGrid = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = GRID_URL;
      script.onload = () => (window as GridWindow).agGrid?.createGrid
        ? resolve()
        : reject(Error("AG Grid Community did not initialize"));
      script.onerror = () => reject(Error("AG Grid Community could not be loaded"));
      document.head.appendChild(script);
    }).catch((e: unknown) => {
      loadingGrid = null;
      throw e;
    });
  }
  return loadingGrid;
}

export function FinanceGrid({
  orders,
  receipts,
}: {
  orders: FinanceOrder[];
  receipts: ReceiptRef[];
}) {
  const target = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");
  const rows = useMemo<GridRow[]>(() => {
    const byCapture = new Map(receipts.map((r) => [r.capture_id, r.id]));
    return orders.map((order) => ({
      ...order,
      receipt_id: order.paypal_capture_id
        ? byCapture.get(order.paypal_capture_id) || null
        : null,
    }));
  }, [orders, receipts]);

  useEffect(() => {
    let active = true;
    let grid: GridApi | null = null;
    loadCommunityGrid().then(() => {
      if (!active || !target.current) return;
      const api = (window as GridWindow).agGrid;
      if (!api) throw Error("AG Grid Community unavailable");
      grid = api.createGrid(target.current, {
        rowData: rows,
        columnDefs: [
          {
            headerName: "Contribution",
            field: "purpose",
            minWidth: 155,
            valueFormatter: (p: { value?: string }) =>
              p.value === "platform_support" ? "Platform support" : "Campaign donation",
          },
          {
            headerName: "Amount",
            field: "amount_cents",
            minWidth: 108,
            valueFormatter: (p: { value?: number }) => money(p.value || 0),
          },
          { headerName: "Status", field: "status", minWidth: 120 },
          { headerName: "Reconciliation", field: "reconciliation", minWidth: 145,
            valueFormatter: (p: { value?: string }) => (p.value || "").replaceAll("_", " ") },
          {
            headerName: "Created",
            field: "created_at",
            minWidth: 190,
            valueFormatter: (p: { value?: string }) =>
              p.value ? new Date(p.value).toLocaleString() : "",
          },
          { headerName: "PayPal order", field: "paypal_order_id", minWidth: 185 },
          { headerName: "Capture", field: "paypal_capture_id", minWidth: 185 },
          {
            headerName: "Receipt",
            field: "receipt_id",
            minWidth: 130,
            sortable: false,
            filter: false,
            cellRenderer: (p: { value?: string }) => {
              if (!p.value) return "Unverified";
              const link = document.createElement("a");
              link.href = "/receipts/" + encodeURIComponent(p.value);
              link.textContent = "View receipt";
              link.setAttribute("aria-label", "View verified sandbox payment receipt");
              return link;
            },
          },
        ],
        defaultColDef: { sortable: true, filter: true, resizable: true, flex: 1 },
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizeSelector: [10, 25, 50],
        domLayout: "autoHeight",
        suppressCellFocus: false,
        animateRows: false,
        getRowId: (p: { data: GridRow }) => p.data.id,
      });
      setState("ready");
    }).catch(() => {
      if (active) setState("fallback");
    });
    return () => {
      active = false;
      grid?.destroy();
    };
  }, [rows]);

  return (
    <div className="finance-grid-shell">
      <p className="meta">AG Grid Community · free, read-only financial records from the isolated PayPal Sandbox ledger. Use column filters, sorting and pagination.</p>
      {state === "loading" && <p role="status">Loading AG Grid Community…</p>}
      {state === "fallback" && (
        <p role="status">The interactive grid could not load. Expand the accessible transaction and receipt list below.</p>
      )}
      <div
        ref={target}
        className="finance-ag-grid"
        role="region"
        aria-label="Verified sandbox transaction history, sortable and filterable"
      />
    </div>
  );
}
