"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import PagedTable from "@/components/ui/PagedTable";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { formatUsd } from "@/lib/formatters";
import { useProgram } from "@/contexts/ProgramContext";
import { useOperation } from "@/hooks/useOperation";
import { runOperation } from "@/lib/supabase/operations";
import { formatDate } from "@/lib/dates";
import formStyles from "@/components/features/purchases/PurchasesScreen.module.css";
import layout from "@/components/ui/OperationalLayout.module.css";
import styles from "./StockScreen.module.css";

export default function StockScreen() {
  const { stock: units, raw } = useProgram();
  const { busy, error, setError, run } = useOperation();
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("TODAS");
  const [category, setCategory] = useState("TODAS");
  const [supplier, setSupplier] = useState("TODOS");
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = units.find(unit => unit.databaseId === detailId && unit.state === "STOCK");
  const rawUnit = raw.units.find(unit => unit.id === detail?.databaseId);
  const product = raw.products.find(item => item.id === rawUnit?.producto_id);
  const categoryId = product?.categoria_id ?? raw.categories?.find(item => item.nombre === product?.categoria.toLowerCase())?.id;
  const characteristicKeys = new Set((raw.categoryCharacteristics ?? []).filter(item => item.categoria_id === categoryId).map(item => item.clave));
  const needsRam = Boolean(detail && characteristicKeys.has("ram") && !detail.ram);
  const needsVariant = Boolean(detail && [...characteristicKeys].some(key => key !== "color" && key !== "ram") && !detail.variant);
  const hasMissingData = needsRam || needsVariant;
  const characteristicEntries = detail ? (raw.categoryCharacteristics ?? []).filter(item => item.categoria_id === categoryId && item.clave !== "color").map(field => ({ label: field.etiqueta, value: detail.attributes[field.clave] || (field.clave === "ram" ? detail.ram : field.clave === "rom" ? detail.attributes.rom || detail.variant : "") })).filter(item => item.value) : [];
  const characteristicSummary = (unit: typeof units[number]) => Object.values(unit.attributes).filter(Boolean).join(" · ") || [unit.ram, unit.variant].filter(Boolean).join(" · ") || "—";

  const stockUnits = units.filter((unit) => unit.state === "STOCK");
  const brands = [...new Set(stockUnits.map((unit) => unit.brand))];
  const categories = [...new Set(stockUnits.map((unit) => unit.category))];
  const suppliers = [...new Set(stockUnits.map((unit) => unit.supplier))];
  const filtered = useMemo(
    () =>
      units.filter((unit) => {
        const text =
          `${unit.product} ${unit.supplier} ${unit.variant} ${unit.ram ?? ""} ${unit.color} ${Object.values(unit.attributes).filter(Boolean).join(" ")}`.toLowerCase();
        return (
          unit.state === "STOCK" &&
          text.includes(search.toLowerCase()) &&
          (brand === "TODAS" || unit.brand === brand) &&
          (category === "TODAS" || unit.category === category) &&
          (supplier === "TODOS" || unit.supplier === supplier)
        );
      }),
    [units, search, brand, category, supplier],
  );

  return (
    <div className={`view ${layout.page}`}>
      <PageHeader
        title="Stock"
        action={
          <div className={layout.total}>
            <strong>{stockUnits.length}</strong>
            <span>Dispositivos en stock</span>
          </div>
        }
      />

      <div className={layout.toolbar}>
        <label className={layout.searchWrap}>
          <Search size={15} />
          <input
            className="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto, proveedor, característica o color…"
          />
        </label>
        <select
          className="filter"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
        >
          <option value="TODAS">Todas las marcas</option>
          {brands.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          className="filter"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="TODAS">Todas las categorías</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          className="filter"
          aria-label="Filtrar por proveedor"
          value={supplier}
          onChange={(event) => setSupplier(event.target.value)}
        >
          <option value="TODOS">Todos los proveedores</option>
          {suppliers.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <section className="panel">
        <header className="panel-head">
          <div>
            <span className="eyebrow">ACU · Existencia actual</span>
            <h2>Unidades disponibles</h2>
          </div>
          <span className="badge green">Estado STOCK</span>
        </header>
        <div className="table-wrap">
          {filtered.length ? (
            <PagedTable>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Características</th>
                  <th>Color</th>
                  <th>Pedido de origen</th>
                  <th>Proveedor</th>
                  <th>Costo</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((unit) => (
                  <tr key={unit.id} onClick={() => setDetailId(unit.databaseId)}>
                    <td className="product-cell">
                      <strong>{unit.product}</strong>
                    </td>
                    <td className="product-cell"><strong>{characteristicSummary(unit)}</strong></td>
                    <td>{unit.color}</td>
                    <td>Pedido #{unit.purchaseOrder}</td>
                    <td>{unit.supplier}</td>
                    <td className={styles.price}><strong>{formatUsd(unit.costUsd)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </PagedTable>
          ) : (
            <div className={styles.empty}>
              No hay unidades que coincidan con los filtros.
            </div>
          )}
        </div>
      </section>

      {detail && (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (!busy && event.target === event.currentTarget) setDetailId(null);
          }}
        >
          <section className={styles.modal} role="dialog" aria-modal="true">
            <header className={styles.modalHeader}>
              <div>
                <span className="eyebrow">Detalle de stock</span>
                <h2>{detail.product}</h2>
              </div>
              <button className={styles.close} aria-label="Cerrar stock" disabled={busy} onClick={() => { setDetailId(null); setError(""); }}>
                <X size={20} />
              </button>
            </header>
            <div className={styles.detailGrid}>
              {[
                [
                  "Estado",
                  <span key="state" className="badge green">
                    STOCK
                  </span>,
                ],
                ["Proveedor", detail.supplier],
                ["Color", detail.color],
                ["Costo", formatUsd(detail.costUsd)],
                ["Ingreso a stock", formatDate(detail.receivedAt)],
                ...characteristicEntries.map(item => [item.label, item.value]),
              ].map(([label, value]) => (
                <div className={styles.detailItem} key={String(label)}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <form onSubmit={event => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(() => runOperation("pgl_update_stock", { p_id: detail.databaseId, p_code: detail.code,
                p_variant: needsVariant ? String(form.get("variant") ?? "") : detail.variant, p_ram: needsRam ? String(form.get("ram") ?? "") : detail.ram,
                p_suggested: detail.salePriceUsd ?? undefined }), () => setDetailId(null));
            }}><fieldset className="form-fields" disabled={busy}><div className={formStyles.form}><h3>Completar datos de la unidad</h3>{hasMissingData ? <><div className={formStyles.formGrid}>
              {needsVariant && <div className={formStyles.field}><label htmlFor="stock-variant">Variante / almacenamiento</label><input id="stock-variant" name="variant" maxLength={120} /></div>}
              {needsRam && <div className={formStyles.field}><label htmlFor="stock-ram">RAM</label><input id="stock-ram" name="ram" maxLength={60} /></div>}
            </div>{error && <p role="alert" className="operation-error">{error}</p>}<button className="primary-btn" type="submit">{busy ? "Guardando…" : "Guardar unidad"}</button></> : <p className={styles.complete}>La unidad ya tiene todos sus datos completos.</p>}</div></fieldset></form>
          </section>
        </div>
      )}

    </div>
  );
}
