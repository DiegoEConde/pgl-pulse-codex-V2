"use client";
import { useMemo, useState } from "react";
import { Banknote, Boxes, CircleDollarSign, Download, FileSliders, TrendingUp, UsersRound } from "lucide-react";
import MetricCard from "@/components/ui/MetricCard/MetricCard";
import PageHeader from "@/components/ui/PageHeader/PageHeader";
import { useProgram } from "@/contexts/ProgramContext";
import { formatUsd } from "@/lib/formatters";
import { formatDate } from "@/lib/dates";
import { reportFacts, periodRange, makeReport, reportSlices, reportRanking, rankingLabels, periodLabels, pieLabels, type Period, type PieMode, type RankingMode, type Report } from "@/lib/reports";
import { exportReportPdf } from "@/lib/report-pdf";
import ReportPie from "./ReportPie";
import CustomReportBuilder from "./CustomReportBuilder";
import ReportModal from "./ReportModal";
import layout from "@/components/ui/OperationalLayout.module.css";
import styles from "./ReportsScreen.module.css";

function Metrics({report}:{report:Report}) {
 return <div className={styles.kpis}>
  <MetricCard label="Costo total" value={formatUsd(report.cost)} icon={<Banknote size={17}/>}/>
  <MetricCard label="Unidades compradas" value={String(report.units)} icon={<Boxes size={17}/>} color="var(--cyan)"/>
  <MetricCard label="Total de ventas" value={formatUsd(report.revenue)} icon={<CircleDollarSign size={17}/>} color="var(--violet)"/>
  <MetricCard label="Ganancia" value={formatUsd(report.profit)} icon={<TrendingUp size={17}/>} color="var(--green)"/>
 </div>;
}
function Charts({report,pie,ranking,top,onPie,onRanking}:{report:Report;pie:PieMode;ranking:RankingMode;top:boolean;onPie:(mode:PieMode)=>void;onRanking:(mode:RankingMode)=>void}) {
 const slices=reportSlices(report,pie,top);
 const ranks=reportRanking(report,ranking);
 return <div className={styles.charts}>
  <section className={`panel ${styles.chartPanel}`}><header className={styles.panelHead}><h2>{top?"Top 10":"Distribución"} · {pieLabels[pie]}</h2><select className="filter" aria-label="Distribución por" value={pie} onChange={e=>onPie(e.target.value as PieMode)}>{Object.entries(pieLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></header><ReportPie data={slices}/></section>
  <section className={`panel ${styles.chartPanel}`}><header className={styles.panelHead}><h2>Top 5</h2><select className="filter" aria-label="Ranking de" value={ranking} onChange={e=>onRanking(e.target.value as RankingMode)}>{Object.entries(rankingLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></header>
  <ol className={styles.ranking}>{ranks.map((r,i)=><li key={r.id}><span className={styles.place}>{i+1}</span><div><strong>{r.label}</strong></div><b title={ranking==="products"?"Costo unitario de compra (USD)":ranking==="soldProducts"?"Precio unitario de venta (USD)":"Cantidad de unidades"}>{ranking==="products"||ranking==="soldProducts"?formatUsd(r.value):r.value+" unidades"}</b></li>)}</ol>
  {!ranks.length&&<div className={styles.empty}>Sin movimientos en este período.</div>}
  </section>
 </div>;
}
function SalesDetail({report}:{report:Report}) {
 return <div className={styles.detailList}>{report.sales.length?report.sales.map(row=><article key={row.id}><div><strong>{row.product}</strong><small>#{row.id} · {formatDate(row.date)} · {row.client}</small></div><dl><div><dt>Venta</dt><dd>{formatUsd(row.revenue)}</dd></div><div><dt>Costo</dt><dd>{formatUsd(row.cost)}</dd></div><div><dt>Comisión</dt><dd>{formatUsd(row.commission)}</dd></div><div><dt>Ganancia</dt><dd>{formatUsd(row.profit)}</dd></div><div><dt>Pago</dt><dd>{row.paid?"Verificado":"Pendiente"}</dd></div><div><dt>Estado</dt><dd>{row.state==="ENTREGADA"?"Entregada":"En reparto"}</dd></div></dl></article>):<p className={styles.empty}>Sin ventas en este período.</p>}</div>;
}
export default function ReportsScreen() {
 const {raw,today,loading}=useProgram();
 const [period,setPeriod]=useState<Period>("today");
 const [pie,setPie]=useState<PieMode>("purchasedUnits");
 const [ranking,setRanking]=useState<RankingMode>("bestSellers");
 const [modal,setModal]=useState<"custom"|"sellers"|null>(null);
 const [sellerId,setSellerId]=useState("");
 const [error,setError]=useState("");
 const [exporting,setExporting]=useState(false);
 const facts=useMemo(()=>reportFacts(raw),[raw]);
 // Cada pestaña recuerda su selección; el mismo rango alimenta métricas, PDF y vendedores.
 const [selection,setSelection]=useState<Partial<Record<Period,string>>>({});
 const earliestYear=Math.min(Number(today.slice(0,4))-10,...[...facts.purchases,...facts.sales].filter(r=>r.date).map(r=>Number(r.date.slice(0,4))));
 const years=Array.from({length:Number(today.slice(0,4))-earliestYear+1},(_,index)=>String(Number(today.slice(0,4))-index));
 const range=periodRange(period,today,selection[period]);
 const report=makeReport(facts,range);
 const seller=raw.sellers.find(s=>String(s.id)===sellerId);
 const sellerReport=makeReport(facts,{...range,scope:"sales",seller:sellerId});
 const close=()=>{setModal(null);setError("");};
 async function download(value:Report,title:string,pieMode:PieMode,rank:RankingMode,top:boolean,details=false) {
  setExporting(true);setError("");
  try {await exportReportPdf(value,title,pieMode,rank,top,details);}
  catch {setError("No se pudo exportar el PDF. Volvé a intentar.");}
  finally {setExporting(false);}
 }
 return <div className={`view ${layout.page} ${styles.page}`}>
  <PageHeader title="Reportes" action={false}/>
  <div className={styles.periodRow}><div className="workspace-tablist" role="tablist" aria-label="Período del reporte">{(Object.keys(periodLabels) as Period[]).map((value,index)=><button key={value} role="tab" id={"report-tab-"+value} aria-controls="report-period-panel" aria-selected={period===value} tabIndex={period===value?0:-1} onClick={()=>setPeriod(value)} onKeyDown={event=>{const all=Object.keys(periodLabels) as Period[];const next=event.key==="ArrowRight"?(index+1)%4:event.key==="ArrowLeft"?(index+3)%4:event.key==="Home"?0:event.key==="End"?3:null;if(next!==null){event.preventDefault();setPeriod(all[next]);document.getElementById("report-tab-"+all[next])?.focus();}}}>{periodLabels[value]}</button>)}</div><label className={styles.dateSelector}><span>{period==="today"?"Fecha":period==="month"?"Mes":period==="semester"?"Mes final":"Año"}</span>{period==="year"?<select aria-label="Año del reporte" value={selection.year||today.slice(0,4)} onChange={e=>setSelection({...selection,year:e.target.value})}>{years.map(year=><option key={year} value={year}>{year}</option>)}</select>:<input aria-label={period==="today"?"Fecha del reporte":period==="month"?"Mes del reporte":"Mes final del semestre"} type={period==="today"?"date":"month"} value={selection[period]||(period==="today"?today:today.slice(0,7))} max={period==="today"?today:today.slice(0,7)} onChange={e=>{if(e.target.value&&e.target.validity.valid)setSelection({...selection,[period]:e.target.value});}}/>}</label></div>
  <div id="report-period-panel" role="tabpanel" aria-labelledby={"report-tab-"+period} className={styles.reportBody} aria-busy={loading}>
   <Metrics report={report}/>
   <Charts report={report} pie={pie} ranking={ranking} top={period!=="today"} onPie={setPie} onRanking={setRanking}/>
  </div>
  <footer className={styles.actions}>
   <button className={`primary-btn ${layout.headAction}`} onClick={()=>{setError("");setModal("custom");}} disabled={loading}><FileSliders size={16}/>Reporte personalizado</button>
   <button className={styles.secondary} disabled={loading||exporting} onClick={()=>void download(report,"Reporte · "+periodLabels[period],pie,ranking,period!=="today")}><Download size={16}/>{exporting?"Exportando…":"Exportar a PDF"}</button>
   <button className={styles.secondary} disabled={loading} onClick={()=>{setSellerId("");setError("");setModal("sellers");}}><UsersRound size={16}/>Resumen de vendedores</button>
  </footer>
  {error&&!modal&&<p role="alert" className="operation-error">{error}</p>}
  {modal==="custom"&&<ReportModal key="custom" title="Reporte personalizado" onClose={close}><CustomReportBuilder raw={raw} today={today} range={range}/></ReportModal>}
  {modal==="sellers"&&<ReportModal key="sellers" title="Resumen de vendedores" onClose={close}>
   <p className={styles.range}>{formatDate(range.start)} — {formatDate(range.end)}</p>
   <div className={styles.sellerLayout}><div className={styles.sellerList} aria-label="Vendedores">{raw.sellers.length?raw.sellers.map(s=><button key={s.id} aria-pressed={sellerId===String(s.id)} onClick={()=>setSellerId(String(s.id))}>{s.nombre}</button>):<p>No hay vendedores registrados.</p>}</div>
   <section>{seller?<><h3>{seller.nombre}</h3><dl className={styles.sellerMetrics}>{[["Ventas",String(sellerReport.soldUnits)],["Importe vendido",formatUsd(sellerReport.revenue)],["Costo vendido",formatUsd(sellerReport.soldCost)],["Ganancia",formatUsd(sellerReport.profit)],["Comisión",formatUsd(sellerReport.commission)],["Pagos verificados",sellerReport.paid+" / "+sellerReport.soldUnits],["Ticket promedio",formatUsd(sellerReport.soldUnits?sellerReport.revenue/sellerReport.soldUnits:0)],["Clientes",String(new Set(sellerReport.sales.map(r=>r.clientId)).size)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><SalesDetail report={sellerReport}/></>:<p className={styles.empty}>Seleccioná un vendedor.</p>}</section></div>
  </ReportModal>}
 </div>;
}
