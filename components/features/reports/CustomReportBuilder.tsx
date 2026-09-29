"use client";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { BarChart3, ChartColumn, ChartLine, ChartPie, ListOrdered, Download, ArrowLeft } from "lucide-react";
import type { Snapshot } from "@/types/operations";
import { reportFacts, makeReport, customSeries, metricLabels, dimensionLabels, chartLabels, purchaseMetric, moneyMetric, type CustomOptions, type CustomChart, type CustomMetric, type CustomDimension, type ReportFilter } from "@/lib/reports";
import { formatUsd } from "@/lib/formatters";
import { exportCustomReportPdf } from "@/lib/custom-report-pdf";
import CustomReportChart from "./CustomReportChart";
import styles from "./ReportsScreen.module.css";
const icons={bars:BarChart3,columns:ChartColumn,line:ChartLine,pie:ChartPie,list:ListOrdered};
const hints={bars:"Comparar dispositivos, personas o importes.",columns:"Comparar cantidades con columnas verticales.",line:"Ver la evolución por día o mes.",pie:"Ver la participación de cada grupo en el total.",list:"Ordenar resultados y consultar sus valores exactos."};
type Result={title:string;filter:ReportFilter;options:CustomOptions;details:boolean;context:string[]};
export default function CustomReportBuilder({raw,today,range}:{raw:Snapshot;today:string;range:{start:string;end:string}}) {
 const [step,setStep]=useState<"format"|"type"|"configure">("format");
 const [kind,setKind]=useState<"chart"|"list"|null>(null);
 const [chart,setChart]=useState<CustomChart|null>(null);
 const [metric,setMetric]=useState<CustomMetric>("soldUnits");
 const [dimension,setDimension]=useState<CustomDimension>("product");
 const [result,setResult]=useState<Result|null>(null);
 const [error,setError]=useState("");
 const [exporting,setExporting]=useState(false);
 const visual=useRef<HTMLDivElement>(null);
 const facts=useMemo(()=>reportFacts(raw),[raw]);
 const purchases=purchaseMetric(metric);
 const dimensions=(Object.keys(dimensionLabels) as CustomDimension[]).filter(key=>chart==="line"?key==="day"||key==="month":!purchases||key!=="client"&&key!=="seller");
 const metrics=(Object.keys(metricLabels) as CustomMetric[]).filter(key=>chart!=="pie"||key!=="profit"&&key!=="averageSale");
 const report=result?makeReport(facts,result.filter):null;
 const data=report&&result?customSeries(report,result.options):[];
 const format=(value:number)=>result&&moneyMetric(result.options.metric)?formatUsd(value):new Intl.NumberFormat("es-AR").format(value);
 function choose(value:CustomChart) {
  setChart(value);setStep("configure");setError("");
  if(value==="line")setDimension("month");
  if(value==="pie"&&(metric==="profit"||metric==="averageSale"))setMetric("soldUnits");
 }
 function generate(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();if(!chart)return;
  const form=new FormData(event.currentTarget),start=String(form.get("start")??""),end=String(form.get("end")??"");
  if(!start||!end||start>end||end>today){setError("Revisá el intervalo de fechas.");return;}
  if(!dimensions.includes(dimension)||!metrics.includes(metric)){setError("Revisá la métrica y la agrupación.");return;}
  const filter:ReportFilter={start,end,scope:purchases?"purchases":"sales",product:String(form.get("product")||""),supplier:String(form.get("supplier")||""),client:purchases?"":String(form.get("client")||""),seller:purchases?"":String(form.get("seller")||"")};
  const options:CustomOptions={chart,metric,dimension,order:chart==="line"?"label":String(form.get("order")) as CustomOptions["order"],limit:chart==="line"?0:Number(form.get("limit"))};
  const context=[purchases?"Compras confirmadas; incluye pedidos sin recibir.":"Ventas en reparto y entregadas.","Agrupación: "+dimensionLabels[dimension],"Orden: "+({desc:"Mayor a menor",asc:"Menor a mayor",label:"Alfabético / cronológico"}[options.order]),"Resultados: "+(options.limit?"Top "+options.limit:"Todos")];
  for(const [key,label,records] of [["product","Dispositivo",raw.products],["supplier","Proveedor",raw.suppliers],["client","Cliente",raw.clients],["seller","Vendedor",raw.sellers]] as const)if(filter[key])context.push(label+": "+records.find(r=>String(r.id)===filter[key])?.nombre);
  setResult({title:String(form.get("title")).trim()||"Reporte personalizado",filter,options,details:form.get("details")==="on",context});setError("");
 }
 async function download() {
  if(!result||!report)return;setExporting(true);setError("");
  try {await exportCustomReportPdf(result.title,result.context,report,result.options,data,visual.current?.querySelector("svg")??null,result.details);}
  catch {setError("No se pudo exportar el PDF. Volvé a intentar.");}finally{setExporting(false);}
 }
 return <>
 <div hidden={Boolean(result)}>
  {step!=="format"&&<div className={styles.selectionHeader}>
   <button type="button" className={styles.secondary} onClick={()=>{setStep(step==="configure"&&kind==="chart"?"type":"format");setError("");}}><ArrowLeft size={16}/>Volver</button>
   <div className={styles.selectedFormat}>{kind==="chart"?<BarChart3 size={22}/>:<ListOrdered size={22}/>}<div><strong>{kind==="chart"?"Gráfico":"Lista ordenada"}</strong>{kind==="chart"&&step==="configure"&&chart&&<small>{chartLabels[chart]}</small>}</div></div>
  </div>}
  {step==="format"&&<>
   <p className={styles.range}>1. ¿Cómo querés presentar tu informe?</p>
   <div className={styles.choiceGrid}>
    <button type="button" className={styles.choice} onClick={()=>{setKind("chart");setStep("type");}}><BarChart3 size={24}/><strong>Gráfico</strong><small>Elegí entre cuatro visualizaciones.</small></button>
    <button type="button" className={styles.choice} onClick={()=>{setKind("list");choose("list");}}><ListOrdered size={24}/><strong>Lista ordenada</strong><small>Compará resultados en una tabla.</small></button>
   </div>
  </>}
  {step==="type"&&<><p className={styles.range}>Elegí el tipo de gráfico</p><div className={styles.choiceGrid}>{(["bars","columns","line","pie"] as const).map(value=>{const Icon=icons[value];return <button key={value} type="button" className={styles.choice} aria-pressed={chart===value} onClick={()=>choose(value)}><Icon size={22}/><strong>{chartLabels[value]}</strong><small>{hints[value]}</small></button>;})}</div></>}
  {chart&&<div hidden={step!=="configure"}><form className={styles.form} onSubmit={generate}>
   <h3>2. Configurá los datos</h3>
   <div className={styles.field}><label htmlFor="report-title">Título</label><input id="report-title" name="title" required maxLength={150} defaultValue="Reporte personalizado"/></div>
   <div className={styles.formGrid}>
    <div className={styles.field}><label htmlFor="report-start">Desde</label><input id="report-start" name="start" type="date" required max={today} defaultValue={range.start}/></div>
    <div className={styles.field}><label htmlFor="report-end">Hasta</label><input id="report-end" name="end" type="date" required max={today} defaultValue={range.end}/></div>
    <div className={styles.field}><label htmlFor="report-metric">Qué medir</label><select id="report-metric" value={metric} onChange={e=>{const value=e.target.value as CustomMetric;setMetric(value);if(purchaseMetric(value)&&(dimension==="client"||dimension==="seller"))setDimension("product");}}>{metrics.map(key=><option key={key} value={key}>{metricLabels[key]}</option>)}</select></div>
    <div className={styles.field}><label htmlFor="report-dimension">Agrupar por</label><select id="report-dimension" value={dimension} onChange={e=>setDimension(e.target.value as CustomDimension)}>{dimensions.map(key=><option key={key} value={key}>{dimensionLabels[key]}</option>)}</select></div>
    <div className={styles.field}><label htmlFor="report-product">Dispositivo</label><select id="report-product" name="product"><option value="">Todos</option>{raw.products.map(p=><option key={p.id} value={p.id}>{p.marca} · {p.nombre}</option>)}</select></div>
    <div className={styles.field}><label htmlFor="report-supplier">Proveedor</label><select id="report-supplier" name="supplier"><option value="">Todos</option>{raw.suppliers.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
    {!purchases&&<><div className={styles.field}><label htmlFor="report-client">Cliente</label><select id="report-client" name="client"><option value="">Todos</option>{raw.clients.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div><div className={styles.field}><label htmlFor="report-seller">Vendedor</label><select id="report-seller" name="seller"><option value="">Todos</option>{raw.sellers.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div></>}
    {chart!=="line"&&<><div className={styles.field}><label htmlFor="report-order">Ordenar</label><select id="report-order" name="order" defaultValue="desc"><option value="desc">Mayor a menor</option><option value="asc">Menor a mayor</option><option value="label">Alfabético / cronológico</option></select></div><div className={styles.field}><label htmlFor="report-limit">Cantidad de resultados</label><select key={chart==="pie"?"pie":"other"} id="report-limit" name="limit" defaultValue="5"><option value="5">Top 5</option>{chart!=="pie"&&<><option value="10">Top 10</option><option value="20">Top 20</option><option value="0">Todos</option></>}</select></div></>}
   </div>
   <p className={styles.range}>{chart==="line"?"Se muestra todo el intervalo en orden cronológico. Los días o meses sin actividad se incluyen con cero; los promedios solo incluyen fechas con ventas.":chart==="pie"?"Se muestran cinco grupos y el resto como Otros. Los porcentajes representan el total filtrado.":"Los importes se expresan en USD. La ganancia descuenta costo, envío y comisión."}</p>
   <label className={styles.check}><input type="checkbox" name="details"/>Incluir detalle de operaciones</label>
   {error&&<p role="alert" className="operation-error">{error}</p>}
   <div className={styles.modalActions}><button type="submit" className="primary-btn">Generar reporte</button></div>
  </form></div>}
 </div>
 {result&&report&&<section className={styles.customResult} aria-label="Resultado del reporte">
  <h3>{result.title}</h3><p className={styles.range}>{result.filter.start} — {result.filter.end} · {metricLabels[result.options.metric]}</p>
  <p className={styles.range}>{result.context.join(" · ")}</p>
  <div ref={visual}><CustomReportChart data={data} chart={result.options.chart} format={format}/></div>
  {data.length>0&&<div className="table-wrap"><table><caption>{metricLabels[result.options.metric]} por {dimensionLabels[result.options.dimension].toLowerCase()}</caption><thead><tr><th>Posición</th><th>{dimensionLabels[result.options.dimension]}</th><th>{metricLabels[result.options.metric]}</th></tr></thead><tbody>{data.map((row,i)=><tr key={row.id}><td>{i+1}</td><td>{row.label}</td><td>{format(row.value)}</td></tr>)}</tbody></table></div>}
  {result.details&&<div className={styles.detailList}><h3>Detalle de operaciones</h3>{[...report.purchases,...report.sales].map(row=><article key={row.id}><strong>{row.product}</strong><small>{row.date} · {purchaseMetric(result.options.metric)?row.supplier:row.client+" · "+row.seller}</small><span>{row.quantity} unidades · Costo: {formatUsd(row.cost)}{!purchaseMetric(result.options.metric)&&" · Venta: "+formatUsd(row.revenue)+" · Ganancia: "+formatUsd(row.profit)}</span></article>)}</div>}
  {error&&<p role="alert" className="operation-error">{error}</p>}
  <div className={styles.modalActions}><button type="button" className={styles.secondary} disabled={exporting} onClick={()=>{setResult(null);setError("");}}>Editar informe</button><button type="button" className="primary-btn" disabled={exporting} onClick={()=>void download()}><Download size={16}/>{exporting?"Exportando…":"Exportar a PDF"}</button></div>
 </section>}
 </>;
}
